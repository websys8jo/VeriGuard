"""Preprocess Jigsaw ACRC into rules.csv + texts.csv matching supabase/schema.sql.

Jigsaw has only 2 rules, each flat (no major/mid/minor hierarchy like DNA),
so each becomes a single `rules` row at level='major' with no parent. Spec's
"Jigsaw는 규칙 노드로 계산" (top-k accuracy computed directly on rule nodes)
matches this flat structure.

Kaggle's public test.csv has no rule_violation labels (it's the leaderboard
holdout, only 10 sample rows) so it's unusable as our evaluation test split.
Instead we split train.csv (2029 labeled rows) ourselves into dev/test with
the same placeholder hash scheme used for DNA, until the real splits.csv
arrives.

Per-row positive/negative examples are pooled per rule (deduped, capped) into
rules.examples, for the '규칙 문장 + 예시' condition in P4.

Usage: pipeline/.venv/Scripts/python.exe pipeline/preprocess_jigsaw.py
"""
import hashlib
import json
from pathlib import Path

import pandas as pd

RAW = Path("data/raw/jigsaw")
OUT = Path("data/processed")
OUT.mkdir(parents=True, exist_ok=True)

MAX_EXAMPLES_PER_RULE = 8


def slugify(text: str) -> str:
    return hashlib.md5(text.encode("utf-8")).hexdigest()[:10]


def assign_split(row_id: int) -> str:
    return "test" if int(hashlib.md5(f"jigsaw-{row_id}".encode()).hexdigest(), 16) % 5 == 0 else "dev"


def build_rules(df: pd.DataFrame) -> dict:
    rule_id = {}
    rows = []
    for rule_text in sorted(df["rule"].unique()):
        rid = f"jigsaw_rule_{slugify(rule_text)}"
        rule_id[rule_text] = rid

        subset = df[df["rule"] == rule_text]
        examples = []
        for r in subset.itertuples(index=False):
            examples.append({"text": r.positive_example_1, "label": "violation"})
            examples.append({"text": r.positive_example_2, "label": "violation"})
            examples.append({"text": r.negative_example_1, "label": "normal"})
            examples.append({"text": r.negative_example_2, "label": "normal"})
        seen = set()
        deduped = []
        for ex in examples:
            if ex["text"] not in seen:
                seen.add(ex["text"])
                deduped.append(ex)
            if len(deduped) >= MAX_EXAMPLES_PER_RULE:
                break

        rows.append(
            {
                "id": rid,
                "source": "jigsaw",
                "level": "major",
                "parent_id": None,
                "rule_text": rule_text,
                "examples": json.dumps(deduped),
            }
        )
    return pd.DataFrame(rows), rule_id


def build_texts(df: pd.DataFrame, rule_id: dict) -> pd.DataFrame:
    rows = []
    for r in df.itertuples(index=False):
        rows.append(
            {
                "id": f"jigsaw__{r.row_id}",
                "source": "jigsaw",
                "split": assign_split(r.row_id),
                "raw_text": r.body,
                "context": f"subreddit: r/{r.subreddit}",
                "human_label": "violation" if r.rule_violation == 1 else "normal",
                "response_llm": None,
                "gold_rule_id": rule_id[r.rule],
            }
        )
    return pd.DataFrame(rows)


def main():
    train = pd.read_csv(RAW / "train.csv")

    rules_df, rule_id = build_rules(train)
    texts_df = build_texts(train, rule_id)

    rules_df.to_csv(OUT / "jigsaw_rules.csv", index=False)
    texts_df.to_csv(OUT / "jigsaw_texts.csv", index=False)

    print(f"rules: {len(rules_df)}")
    print(f"texts: {len(texts_df)} (split counts: {texts_df['split'].value_counts().to_dict()})")
    print(f"human_label counts: {texts_df['human_label'].value_counts().to_dict()}")


if __name__ == "__main__":
    main()
