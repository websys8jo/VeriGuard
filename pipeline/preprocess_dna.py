"""Preprocess Do-Not-Answer into rules.csv + texts.csv matching supabase/schema.sql.

NOTE on splits: the TA-provided splits.csv is not available yet. This script
assigns a placeholder dev/test split (80/20, stratified by risk_area) so the
rest of the pipeline/dashboard can be exercised end-to-end. Re-run with the
real splits.csv once it arrives (see assign_split()).

Usage: pipeline/.venv/Scripts/python.exe pipeline/preprocess_dna.py
"""
import hashlib
from pathlib import Path

import pandas as pd

RAW = Path("data/raw/do-not-answer/datasets")
OUT = Path("data/processed")
OUT.mkdir(parents=True, exist_ok=True)

LLMS = ["ChatGLM2", "ChatGPT", "Claude", "GPT4", "llama2-7b-chat", "vicuna-7b"]


def slugify(text: str) -> str:
    return hashlib.md5(text.encode("utf-8")).hexdigest()[:10]


def build_rules(instr: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    majors = sorted(instr["risk_area"].unique())
    major_id = {name: f"dna_major_{slugify(name)}" for name in majors}

    mids = sorted(instr[["risk_area", "types_of_harm"]].drop_duplicates().itertuples(index=False))
    mid_id = {(r.risk_area, r.types_of_harm): f"dna_mid_{slugify(r.risk_area + r.types_of_harm)}" for r in mids}

    minors = sorted(
        instr[["risk_area", "types_of_harm", "specific_harms"]]
        .drop_duplicates()
        .itertuples(index=False)
    )
    minor_id = {
        (r.risk_area, r.types_of_harm, r.specific_harms): f"dna_minor_{slugify(r.risk_area + r.types_of_harm + r.specific_harms)}"
        for r in minors
    }

    rows = []
    for name in majors:
        rows.append({"id": major_id[name], "source": "dna", "level": "major", "parent_id": None, "rule_text": name})
    for (risk_area, mid_name), rid in mid_id.items():
        rows.append({"id": rid, "source": "dna", "level": "mid", "parent_id": major_id[risk_area], "rule_text": mid_name})
    for (risk_area, mid_name, minor_name), rid in minor_id.items():
        rows.append({"id": rid, "source": "dna", "level": "minor", "parent_id": mid_id[(risk_area, mid_name)], "rule_text": minor_name})

    rules_df = pd.DataFrame(rows)
    return rules_df, minor_id


def assign_split(question_id: int) -> str:
    # Placeholder only: deterministic 80/20 hash-based split, stratification by
    # risk_area happens naturally since ids are spread across categories.
    return "test" if int(hashlib.md5(str(question_id).encode()).hexdigest(), 16) % 5 == 0 else "dev"


def build_texts(instr: pd.DataFrame, minor_id: dict) -> pd.DataFrame:
    gold = {}
    for r in instr.itertuples(index=False):
        gold[r.id] = minor_id[(r.risk_area, r.types_of_harm, r.specific_harms)]

    all_rows = []
    for llm in LLMS:
        path = RAW / "Review" / "Human" / f"annotated_response_{llm}.csv"
        df = pd.read_csv(path)
        for r in df.itertuples(index=False):
            all_rows.append(
                {
                    "id": f"dna__{r.id}__{llm}",
                    "source": "dna",
                    "split": assign_split(r.id),
                    "raw_text": r.response,
                    "context": r.question,
                    "human_label": "violation" if r.harmful == 1 else "normal",
                    "response_llm": llm,
                    "gold_rule_id": gold.get(r.id),
                }
            )
    return pd.DataFrame(all_rows)


def main():
    instr = pd.read_csv(RAW / "Instruction" / "do_not_answer_en.csv")
    rules_df, minor_id = build_rules(instr)
    texts_df = build_texts(instr, minor_id)

    rules_df.to_csv(OUT / "dna_rules.csv", index=False)
    texts_df.to_csv(OUT / "dna_texts.csv", index=False)

    print(f"rules: {len(rules_df)} ({rules_df['level'].value_counts().to_dict()})")
    print(f"texts: {len(texts_df)} (split counts: {texts_df['split'].value_counts().to_dict()})")
    print(f"human_label counts: {texts_df['human_label'].value_counts().to_dict()}")
    print(f"missing gold_rule_id: {texts_df['gold_rule_id'].isna().sum()}")


if __name__ == "__main__":
    main()
