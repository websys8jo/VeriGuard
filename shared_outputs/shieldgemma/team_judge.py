"""Run paired ShieldGemma prompt comparisons for VeriGuard P2."""

import argparse
import json
import math
from pathlib import Path

import pandas as pd

MODEL_ID = "google/shieldgemma-2b"
BATCH_SIZE = 8
MAX_TOKENS = 2048
CONDITIONS = ("rule_sentence_only", "rule_sentence_examples", "team_revised_rule")
COLUMNS = [
    "text_id", "source", "split", "model_name", "condition", "rule_id",
    "violation_prob", "model_output", "human_label",
]


def load_jobs(input_dir, source, split, limit):
    texts = pd.read_csv(input_dir / f"{source}_texts.csv", keep_default_na=False)
    splits = pd.read_csv(input_dir / "splits.csv").query("source == @source")
    rules = pd.read_csv(input_dir / f"{source}_rules.csv")
    # 분할은 splits.csv를 따르고, 비교에는 정답 규칙을 사용한다.
    jobs = (
        texts.drop(columns="split").rename(columns={"id": "text_id", "gold_rule_id": "rule_id"})
        .merge(splits[["text_id", "split"]], on="text_id", how="left", validate="one_to_one")
        .merge(rules[["id", "rule_text"]].rename(columns={"id": "rule_id"}),
               on="rule_id", how="left", validate="many_to_one")
    )
    if jobs[["split", "rule_text"]].isna().any().any():
        raise ValueError(f"{source}: missing split or gold rule")
    jobs = jobs[jobs["split"] == split].sort_values("text_id")
    if jobs.empty:
        raise ValueError(f"{source}: no rows for split {split}")
    if limit is not None:
        jobs = jobs.head(limit)
    return jobs


def original_policy(rule_text):
    name, sep, description = " ".join(rule_text.split()).partition(":")
    description = description.strip() if sep else name
    original = f'"{name.strip()}": {description}'
    return name.strip(), original


def policies(rule_text, variant):
    name, original = original_policy(rule_text)
    examples = variant.get("examples", [])
    revised = variant.get("revised_rule")
    if (
        not isinstance(examples, list)
        or not examples
        or any(not isinstance(example, dict)
               or example.get("label") not in ("Yes", "No")
               or not isinstance(example.get("text"), str)
               or not example["text"].strip()
               for example in examples)
        or not isinstance(revised, str)
        or not revised.strip()
    ):
        raise ValueError("Each rule needs examples with text and Yes/No labels, and revised_rule")
    examples_text = "\n".join(
        f'{example["label"]}: {json.dumps(example["text"], ensure_ascii=False)}'
        for example in examples
    )
    # A: 규칙만, B: 규칙과 예시, C: 수정 규칙.
    return original, f"{original}\nExamples:\n{examples_text}", f'"{name.strip()}": {revised.strip()}'


def prepare_jobs(jobs, variants):
    missing = sorted(set(jobs.rule_id) - variants.keys())
    if missing:
        raise ValueError(f"Missing team examples and revisions for rule IDs: {', '.join(missing)}")
    return [
        (row, policies(row.rule_text, variants[row.rule_id]))
        for row in jobs.itertuples(index=False)
    ]


def prepare_excluded_jobs(jobs, input_dir, source, similarity_path):
    rules = pd.read_csv(input_dir / f"{source}_rules.csv").query("level == 'minor'")
    policies_by_id = {row.id: original_policy(row.rule_text)[1]
                      for row in rules.itertuples(index=False)}
    similarity = pd.read_csv(similarity_path, usecols=["text_id", "rule_id", "similarity"])
    similarity = similarity[
        similarity["text_id"].isin(jobs["text_id"])
        & similarity["rule_id"].isin(policies_by_id)
    ]
    if similarity.duplicated(["text_id", "rule_id"]).any() or similarity["similarity"].isna().any():
        raise ValueError("Duplicate candidates or missing similarity scores")
    top_five = (
        similarity.sort_values(["text_id", "similarity"], ascending=[True, False])
        .groupby("text_id").head(5)
    )
    candidates = top_five.groupby("text_id")["rule_id"].agg(list).to_dict()
    prepared = []
    for row in jobs.itertuples(index=False):
        rule_ids = candidates.get(row.text_id, [])
        if len(rule_ids) != min(5, len(policies_by_id)):
            raise ValueError(f"{row.text_id}: incomplete top-five candidates")
        alternatives = [rule_id for rule_id in rule_ids if rule_id != row.rule_id]
        if not alternatives:
            raise ValueError(f"{row.text_id}: no candidate remains after gold rule exclusion")
        prepared.extend(
            (row._replace(rule_id=rule_id), (policies_by_id[rule_id],))
            for rule_id in alternatives
        )
    return prepared


def encode(tokenizer, prompts):
    # 공식 템플릿이 붙인 시작 토큰은 중복해서 추가하지 않는다.
    add_special_tokens = not prompts[0].startswith(tokenizer.bos_token)
    return tokenizer(
        prompts, padding=True, return_tensors="pt", add_special_tokens=add_special_tokens,
    )


def build_prompts(tokenizer, row, guidelines):
    context = row.context
    while True:
        # DNA는 모델 응답을, Jigsaw는 사용자 댓글을 판정한다.
        if row.source == "dna":
            chat = [
                {"role": "user", "content": context},
                {"role": "assistant", "content": row.raw_text},
            ]
        else:
            chat = [{"role": "user", "content": row.raw_text}]
        prompts = [
            tokenizer.apply_chat_template(chat, guideline=policy, tokenize=False)
            for policy in guidelines
        ]
        if encode(tokenizer, prompts).input_ids.shape[1] <= MAX_TOKENS:
            return prompts
        if row.source != "dna" or not context:
            raise ValueError(f"{row.text_id} / {row.rule_id}: exceeds {MAX_TOKENS} tokens")
        # 응답은 유지하고, 세 조건의 질문 앞부분을 똑같이 줄인다.
        context = context[len(context) // 10 + 1:]


def run(jobs, output, revision, conditions):
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer

    if not torch.cuda.is_available():
        raise RuntimeError("Enable a CUDA GPU before running the judge")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, revision=revision)
    tokenizer.padding_side = "left"
    vocab = tokenizer.get_vocab()
    token_ids = [vocab["Yes"], vocab["No"]]
    if token_ids != [3553, 1294]:
        raise ValueError(f"Unexpected ShieldGemma Yes/No token IDs: {token_ids}")
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID, revision=revision, dtype=torch.float16, attn_implementation="eager",
    ).to("cuda:0").eval()

    pending = [
        (row, condition, prompt)
        for row, guidelines in jobs
        for condition, prompt in zip(conditions, build_prompts(tokenizer, row, guidelines), strict=True)
    ]
    results = []
    with torch.inference_mode():
        for start in range(0, len(pending), BATCH_SIZE):
            batch = pending[start:start + BATCH_SIZE]
            inputs = encode(tokenizer, [entry[2] for entry in batch]).to(model.device)
            logits = model(**inputs, logits_to_keep=1, use_cache=False).logits
            # 마지막 위치의 Yes/No 로짓으로 위반 점수를 계산한다.
            scores = logits[:, -1, token_ids].float().softmax(dim=-1)[:, 0].tolist()
            for (row, condition, _), score in zip(batch, scores, strict=True):
                if not math.isfinite(score) or not 0 <= score <= 1:
                    raise ValueError(f"{row.text_id} / {condition}: invalid probability")
                results.append((
                    row.text_id, row.source, row.split, "team_shieldgemma_2b", condition,
                    row.rule_id, score, "Yes" if score >= 0.5 else "No", row.human_label,
                ))
    output.parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(results, columns=COLUMNS).to_csv(output, index=False)
    print(f"{output}: {len(results)} rows")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inputs", type=Path, default=Path("shared_inputs/rule_similarity"))
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--variants", type=Path)
    mode.add_argument("--rule-excluded", action="store_true")
    parser.add_argument("--similarity", type=Path, help="Full similarity CSV for --rule-excluded")
    parser.add_argument("--source", choices=("dna", "jigsaw"), required=True)
    parser.add_argument("--split", choices=("dev", "test"), default="dev")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--revision", default="main")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if args.limit is not None and args.limit < 1:
        parser.error("--limit must be positive")
    if args.rule_excluded and args.similarity is None:
        parser.error("--rule-excluded requires --similarity")
    try:
        jobs = load_jobs(args.inputs, args.source, args.split, args.limit)
        if args.rule_excluded:
            conditions = ("rule_excluded",)
            prepared = prepare_excluded_jobs(jobs, args.inputs, args.source, args.similarity)
        else:
            conditions = CONDITIONS
            variants = json.loads(args.variants.read_text(encoding="utf-8"))
            if not isinstance(variants, dict) or any(not isinstance(value, dict) for value in variants.values()):
                parser.error("--variants must contain a JSON object keyed by rule ID")
            prepared = prepare_jobs(jobs, variants)
    except ValueError as error:
        parser.error(str(error))
    if args.dry_run:
        print(f"{len(jobs)} texts, {len(prepared)} pairs × {len(conditions)} conditions"
              f" = {len(prepared) * len(conditions)} rows")
        return
    if args.output.exists():
        parser.error(f"Output already exists: {args.output}")
    run(prepared, args.output, args.revision, conditions)


if __name__ == "__main__":
    main()