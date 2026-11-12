"""Preprocess ProsocialDialog into texts.csv matching supabase/schema.sql.

ProsocialDialog has no fixed rule taxonomy (just free-text "rots"), so unlike
Do-Not-Answer/Jigsaw it contributes no rows to `rules` and has gold_rule_id =
NULL — it's only usable for P2 (judgment comparison), not P1/P3 which need a
gold rule path. Dataset is already English-only (HF card), so no language
filtering is needed. The 120k-row train split is skipped (not referenced by
any P1-P4 metric); only validation (-> dev) and test are used.

Usage: pipeline/.venv/Scripts/python.exe pipeline/preprocess_prosocial.py
"""
from pathlib import Path

import pandas as pd

RAW = Path("data/raw/prosocial-dialog")
OUT = Path("data/processed")
OUT.mkdir(parents=True, exist_ok=True)

SPLIT_MAP = {"validation": "dev", "test": "test"}


def to_label(safety_label: str) -> str:
    return "normal" if safety_label == "__casual__" else "violation"


def main():
    all_rows = []
    for hf_split, our_split in SPLIT_MAP.items():
        df = pd.read_parquet(RAW / f"{hf_split}.parquet")
        for r in df.itertuples(index=False):
            all_rows.append(
                {
                    "id": f"prosocial__{hf_split}__{r.dialogue_id}__{r.response_id}",
                    "source": "prosocial",
                    "split": our_split,
                    "raw_text": r.response,
                    "context": r.context,
                    "human_label": to_label(r.safety_label),
                    "response_llm": None,
                    "gold_rule_id": None,
                }
            )

    texts_df = pd.DataFrame(all_rows)
    texts_df.to_csv(OUT / "prosocial_texts.csv", index=False)
    print(f"texts: {len(texts_df)}")
    print(f"split counts: {texts_df['split'].value_counts().to_dict()}")
    print(f"human_label counts: {texts_df['human_label'].value_counts().to_dict()}")


if __name__ == "__main__":
    main()
