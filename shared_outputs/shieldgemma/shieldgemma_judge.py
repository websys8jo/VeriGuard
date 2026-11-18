"""ShieldGemma-2B 기준 판정 (DNA·Jigsaw) — VeriGuard 팀

Kaggle 노트북 'veriguard-shieldgemma'에서 실행한 코드를 순서대로 모은 파일입니다.
- 실행 환경: Kaggle GPU T4, transformers 5.20.2, 인터넷 ON
- Kaggle Secrets에 HF_TOKEN(Hugging Face read 토큰) 필요,
  huggingface.co/google/shieldgemma-2b 에서 Gemma 라이선스 동의 필요
- 결과: /kaggle/working/judgments_shieldgemma_{dna,jigsaw}.csv, shieldgemma_run_config.json
- 설정과 근거는 같은 폴더의 README.md 참고
"""

# ══════════ 1. 재료 불러오기 ══════════
import pandas as pd

# 팀 GitHub에서 재료 불러오기 (커밋 번호로 고정 = 언제 다시 돌려도 같은 재료)
MAIN = "https://raw.githubusercontent.com/websys8jo/VeriGuard/4b23b3b961b1aee9cf784ffe087fb24075a72029/shared_inputs/rule_similarity/"
PR1  = "https://raw.githubusercontent.com/websys8jo/VeriGuard/8e2cc5d66aeb316f791301e938c2c92d07a0066d/public/"

dna_texts    = pd.read_csv(MAIN + "dna_texts.csv")
jigsaw_texts = pd.read_csv(MAIN + "jigsaw_texts.csv")
dna_rules    = pd.read_csv(MAIN + "dna_rules.csv")
jigsaw_rules = pd.read_csv(MAIN + "jigsaw_rules.csv")
splits       = pd.read_csv(MAIN + "splits.csv")
dna_sim      = pd.read_csv(PR1 + "dna_similarity.csv")   # 예린 님 점수표 (PR #1)

# ══════════ 2. 판정할 목록 만들기 ══════════
# ── 1) 규칙 문장을 '이름'과 '설명'으로 나누기 (조교님 형식: * "이름": 설명) ──
rules = pd.concat([dna_rules, jigsaw_rules], ignore_index=True)
def split_rule(t):
    t = " ".join(str(t).split())            # 줄바꿈·겹친 띄어쓰기 정리
    name, colon, desc = t.partition(":")
    if not colon:                           # ':'가 없는 규칙 8개는 문장 전체를 이름·설명 둘 다로
        return pd.Series({"rule_name": t, "rule_desc": t})
    return pd.Series({"rule_name": name.strip(), "rule_desc": desc.strip()})
rules = rules.join(rules["rule_text"].apply(split_rule))

# ── 2) 판정할 글 목록 (dev/test는 splits.csv 기준) ──
texts = pd.concat([dna_texts, jigsaw_texts], ignore_index=True)
texts = texts.drop(columns=["split"]).merge(
    splits[["text_id", "split"]], left_on="id", right_on="text_id", how="left")
assert texts["split"].notna().all(), "splits.csv에 없는 글이 있어요"

# ── 3) default 조건: DNA는 유사도 상위 5개 소분류 규칙, Jigsaw는 하위 규칙 2개 ──
minor_ids = set(rules.loc[rules.level == "minor", "id"])
top5 = (dna_sim[dna_sim.rule_id.isin(minor_ids)]
        .sort_values(["text_id", "similarity"], ascending=[True, False])
        .groupby("text_id").head(5)[["text_id", "rule_id", "similarity"]])
jig_minor = sorted(rules.loc[(rules.source == "jigsaw") & (rules.level == "minor"), "id"])
jig_default = pd.DataFrame([(t, r) for t in jigsaw_texts["id"] for r in jig_minor],
                           columns=["text_id", "rule_id"])
default_jobs = pd.concat([top5, jig_default], ignore_index=True)
default_jobs["condition"] = "default"

# ── 4) rule_sentence_only 조건: 정답 규칙 하나 ──
gold_jobs = texts[["id", "gold_rule_id"]].rename(columns={"id": "text_id", "gold_rule_id": "rule_id"})
gold_jobs["condition"] = "rule_sentence_only"

jobs = pd.concat([default_jobs, gold_jobs], ignore_index=True)
jobs = jobs.merge(texts[["id", "source", "split", "raw_text", "context", "human_label"]],
                  left_on="text_id", right_on="id", how="left").drop(columns="id")
jobs = jobs.merge(rules[["id", "rule_name", "rule_desc"]], left_on="rule_id", right_on="id", how="left").drop(columns="id")

# ── 5) 검사 ──
print("설명이 비어 있는 규칙 :", (rules.loc[rules.level=="minor","rule_desc"]=="").sum(), "(0 이어야 함)")
print("DNA default 줄 수 :", (jobs.query("source=='dna' and condition=='default'")).shape[0], "(5634×5 = 28170 이어야 함)")
print("Jigsaw default 줄 수:", (jobs.query("source=='jigsaw' and condition=='default'")).shape[0], "(2029×2 = 4058 이어야 함)")
print("정답 규칙 줄 수     :", (jobs.condition=="rule_sentence_only").sum(), "(5634+2029 = 7663 이어야 함)")
print("규칙 문장 못 찾은 줄:", jobs["rule_name"].isna().sum(), "(0 이어야 함)")
print("중복 줄             :", jobs.duplicated(["text_id","condition","rule_id"]).sum(), "(0 이어야 함)")
unique_prompts = jobs.drop_duplicates(["text_id", "rule_id"])
print("실제로 ShieldGemma가 읽을 횟수:", len(unique_prompts), "(정답 규칙이 후보 5개 안에 있으면 한 번만 계산)")

# ══════════ 3. 검사관 준비 ══════════
import torch, transformers
from kaggle_secrets import UserSecretsClient
from huggingface_hub import login
from transformers import AutoTokenizer, AutoModelForCausalLM

# ── 1) 금고에서 열쇠 꺼내서 Hugging Face 로그인 ──
login(token=UserSecretsClient().get_secret("HF_TOKEN"))

# ── 2) 토크나이저(글자 → 숫자 바꾸는 도구) 불러오기 ──
MODEL_ID = "google/shieldgemma-2b"
MAX_TOKENS = 2048
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
tokenizer.padding_side = "left"          # 조교님: 패딩은 왼쪽

YES_ID = tokenizer.convert_tokens_to_ids("Yes")
NO_ID  = tokenizer.convert_tokens_to_ids("No")
assert tokenizer.tokenize("Yes") == ["Yes"] and tokenizer.tokenize("No") == ["No"], "Yes/No가 토큰 하나가 아니에요"
print("transformers 버전:", transformers.__version__)
print("Yes 토큰 id:", YES_ID, "/ No 토큰 id:", NO_ID, " ← 실험 기록에 남길 값")

# ── 3) 공식 템플릿 = 모델 저장소에 들어 있는 chat template 그대로 사용 ──
def make_prompt(user, policy, response=None):
    chat = [{"role": "user", "content": user}]
    if response is not None:
        chat.append({"role": "assistant", "content": response})
    return tokenizer.apply_chat_template(chat, guideline=policy, tokenize=False)

def encode(prompts):
    # 템플릿이 이미 <bos>를 붙였으면 또 붙이지 않음
    add = not prompts[0].startswith(tokenizer.bos_token)
    return tokenizer(prompts, return_tensors="pt", padding=True, add_special_tokens=add)

def n_tokens(p):
    return encode([p]).input_ids.shape[1]

def build_prompt(row):
    """조교님 규칙: DNA=응답 판정(사용자=질문, 모델=응답), Jigsaw=입력 판정(사용자=댓글).
       2,048토큰을 넘으면 맥락(질문)의 앞부분부터 자르고, 판정할 글은 자르지 않음."""
    policy = f'"{row.rule_name}": {row.rule_desc}'
    text = str(row.raw_text)
    if row.source == "jigsaw":
        return make_prompt(text, policy), False
    context = "" if pd.isna(row.context) else str(row.context)
    prompt, cut = make_prompt(context, policy, response=text), False
    while n_tokens(prompt) > MAX_TOKENS and context:
        context = context[len(context) // 10 + 1:]          # 오래된(앞) 부분부터 10%씩 잘라냄
        prompt, cut = make_prompt(context, policy, response=text), True
    return prompt, cut

# ── 4) 위반 확률: 마지막 위치의 Yes/No 점수만 남겨서 softmax, 첫 값 ──
@torch.no_grad()
def violation_probs(model, prompts, batch_size=8):
    probs = []
    for i in range(0, len(prompts), batch_size):
        enc = encode(prompts[i:i + batch_size]).to(model.device)
        logits = model(**enc, logits_to_keep=1).logits[:, -1, :]      # 마지막 위치만 계산 (메모리 절약)
        yes_no = logits[:, [YES_ID, NO_ID]].float()
        probs += torch.softmax(yes_no, dim=-1)[:, 0].tolist()
    return probs

def load_model(dtype):
    return AutoModelForCausalLM.from_pretrained(
        MODEL_ID, dtype=dtype, attn_implementation="eager"     # Gemma 2 권장 설정
    ).to("cuda:0").eval()

print("GPU:", torch.cuda.get_device_name(0) if torch.cuda.is_available() else "❌ GPU 꺼져 있음")
print("준비 완료!")

# ══════════ 4. (선택) float16 확인 시험: dev 20개로 fp32와 비교 ══════════
RUN_FP16_CHECK = False   # True로 바꾸면 시험을 다시 돌림 (약 10분)
if RUN_FP16_CHECK:
    import time, gc, numpy as np
    # ── 1) 시험용 글 고르기: dev에서 위반/정상 골고루 (정답 규칙만 넣는 조건) ──
    sample = pd.concat([
        jobs.query("source=='dna' and condition=='rule_sentence_only' and split=='dev' and human_label=='violation'").sample(5, random_state=0),
        jobs.query("source=='dna' and condition=='rule_sentence_only' and split=='dev' and human_label=='normal'").sample(5, random_state=0),
        jobs.query("source=='jigsaw' and condition=='rule_sentence_only' and split=='dev' and human_label=='violation'").sample(5, random_state=0),
        jobs.query("source=='jigsaw' and condition=='rule_sentence_only' and split=='dev' and human_label=='normal'").sample(5, random_state=0),
    ], ignore_index=True)
    built = [build_prompt(r) for r in sample.itertuples()]
    prompts = [p for p, _ in built]

    # ── 2) 질문지가 공식 양식대로 만들어졌는지 눈으로 확인 ──
    print("=" * 30, "DNA 질문지 예시", "=" * 30); print(prompts[0][:1500])
    print("=" * 30, "Jigsaw 질문지 예시", "=" * 30); print(prompts[10][:1500])

    # ── 3) float32로 한 개씩 (기준값) → 여러 개 묶어서 (왼쪽 패딩 확인) ──
    m = load_model(torch.float32)
    ref = violation_probs(m, prompts, batch_size=1)
    t = time.time(); b32 = violation_probs(m, prompts, batch_size=8); sec32 = (time.time() - t) / len(prompts)
    del m; gc.collect(); torch.cuda.empty_cache()

    # ── 4) float16으로 묶어서 (빠른 설정) ──
    m = load_model(torch.float16)
    t = time.time(); b16 = violation_probs(m, prompts, batch_size=8); sec16 = (time.time() - t) / len(prompts)
    del m; gc.collect(); torch.cuda.empty_cache()

    sample["p_fp32_one"], sample["p_fp32_batch"], sample["p_fp16_batch"] = ref, b32, b16
    print(sample[["text_id", "source", "human_label", "p_fp32_one", "p_fp32_batch", "p_fp16_batch"]].round(4).to_string())

    # ── 5) 판단 근거 ──
    d_pad  = np.max(np.abs(np.array(ref) - np.array(b32)))
    d_half = np.max(np.abs(np.array(ref) - np.array(b16)))
    print(f"\n왼쪽 패딩 차이(한 개씩 vs 묶어서, fp32): {d_pad:.6f}   ← 0.001보다 작아야 함")
    print(f"정밀도 차이(fp32 vs fp16)            : {d_half:.6f}   ← 0.01보다 작으면 fp16 써도 됨")
    print("fp16에 NaN(계산 실패) 있음?          :", bool(np.isnan(b16).any()))
    print(f"글 하나당 시간  fp32: {sec32:.3f}초 / fp16: {sec16:.3f}초")
    print(f"전체 34,460개 예상  fp32: {34460*sec32/3600:.1f}시간 / fp16: {34460*sec16/3600:.1f}시간")
    print("맥락이 잘린 질문지 수:", sum(c for _, c in built))

# ══════════ 5. 전체 판정 (T4 기준 약 1시간 30분) ══════════
import numpy as np
import os, time
from tqdm.auto import tqdm

DTYPE, BATCH = torch.float16, 8            # 시험 결과로 정한 설정 (fp32와 차이 0.0044, NaN 없음)
PROGRESS = "/kaggle/working/sg_progress.csv"   # 중간 저장 파일 (끊겨도 이어서 하기 위해)

# ── 1) 실제로 물어볼 질문지 목록 (같은 글+같은 규칙은 한 번만) ──
todo = jobs.drop_duplicates(["text_id", "rule_id"]).copy()
if os.path.exists(PROGRESS):                                   # 이미 한 건 건너뛰기
    done = pd.read_csv(PROGRESS)
    todo = todo.merge(done[["text_id", "rule_id"]], how="left", indicator=True)
    todo = todo[todo["_merge"] == "left_only"].drop(columns="_merge")
print("남은 질문지:", len(todo), "/ 전체 34460")

todo["prompt"] = [build_prompt(r)[0] for r in tqdm(todo.itertuples(), total=len(todo), desc="질문지 만들기")]
todo["n_tok"] = todo["prompt"].str.len()
todo = todo.sort_values("n_tok")                               # 길이가 비슷한 것끼리 묶으면 빨라요

# ── 2) 모델 불러오기 ──
model = load_model(DTYPE)

# ── 3) 1,024개씩 판정하고 그때마다 저장 ──
CHUNK = 1024
for start in tqdm(range(0, len(todo), CHUNK), desc="판정 중 (1,024개 묶음)"):
    part = todo.iloc[start:start + CHUNK]
    probs = violation_probs(model, part["prompt"].tolist(), batch_size=BATCH)
    out = part[["text_id", "rule_id"]].assign(violation_prob=probs)
    out.to_csv(PROGRESS, mode="a", header=not os.path.exists(PROGRESS), index=False)

print("판정 끝! 저장된 줄 수:", len(pd.read_csv(PROGRESS)), "(34460 이어야 함)")

# ══════════ 6. 결과 파일 만들기 + 검사 + 실험 기록 ══════════
import json, platform

res = pd.read_csv(PROGRESS).drop_duplicates(["text_id", "rule_id"], keep="last")

# ── 1) 판정 결과를 원래 목록(조건별)에 붙이기 ──
final = jobs.merge(res, on=["text_id", "rule_id"], how="left")
final["model_name"] = "shieldgemma_2b"
final["model_output"] = np.where(final["violation_prob"] >= 0.5, "Yes", "No")   # 모델이 먼저 말할 답
COLS = ["text_id", "source", "split", "model_name", "condition", "rule_id",
        "violation_prob", "model_output", "human_label"]
final = final[COLS]

# ── 2) 검사 ──
chk = final.merge(splits[["text_id", "split"]], on="text_id", suffixes=("", "_s"))
print("확률 빠진 줄       :", final["violation_prob"].isna().sum(), "(0 이어야 함)")
print("0~1 밖의 확률      :", (~final["violation_prob"].between(0, 1)).sum(), "(0 이어야 함)")
print("중복 줄            :", final.duplicated(["text_id", "condition", "rule_id"]).sum(), "(0 이어야 함)")
print("splits.csv와 다른 split:", (chk["split"] != chk["split_s"]).sum(), "(0 이어야 함)")

# ── 3) 출처별 파일로 저장 ──
for src, n_expect in [("dna", 5634 * 5 + 5634), ("jigsaw", 2029 * 2 + 2029)]:
    part = final[final.source == src]
    path = f"/kaggle/working/judgments_shieldgemma_{src}.csv"
    part.to_csv(path, index=False)
    print(f"{path}: {len(part)}줄 ({n_expect} 이어야 함)")

# ── 4) 실험 기록 (조교님: 토큰 id 등 기록) ──
config = {
    "model": MODEL_ID, "dtype": "float16", "attn_implementation": "eager",
    "batch_size": BATCH, "padding_side": "left", "max_tokens": MAX_TOKENS,
    "truncation": "context oldest-first, judged text never truncated",
    "template": "tokenizer.apply_chat_template (official ShieldGemma chat template), guideline = '\"<rule name>\": <rule text>'",
    "dna_template": "response (user=question/context, assistant=raw_text)",
    "jigsaw_template": "prompt-only (user=comment raw_text)",
    "violation_prob": "softmax([logit_Yes, logit_No])[0] at last position",
    "yes_token_id": int(YES_ID), "no_token_id": int(NO_ID),
    "default_condition": "DNA: top-5 minor rules by dna_similarity.csv; Jigsaw: both minor rules",
    "rule_sentence_only": "gold_rule_id",
    "model_output": "Yes if violation_prob >= 0.5 else No",
    "fp16_check": "20 dev texts: max |fp32 - fp16| = 0.004399, no NaN; left-padding batch vs single diff = 0.000002",
    "inputs": {"shared_inputs_commit": "4b23b3b961b1aee9cf784ffe087fb24075a72029",
               "dna_similarity_commit": "8e2cc5d66aeb316f791301e938c2c92d07a0066d (PR #1)"},
    "versions": {"transformers": transformers.__version__, "torch": torch.__version__, "python": platform.python_version()},
    "gpu": torch.cuda.get_device_name(0),
}
json.dump(config, open("/kaggle/working/shieldgemma_run_config.json", "w"), indent=2, ensure_ascii=False)
print("실험 기록 저장 완료: /kaggle/working/shieldgemma_run_config.json")
