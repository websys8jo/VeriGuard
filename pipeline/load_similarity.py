"""Load RoBERTa rule-similarity results into Supabase `similarity_steps`.

Source: public/dna_similarity.csv (PR #1 'p1-dna-similarity', commit 8e2cc5d).
Verified before loading: 439,452 rows, no dupes, text_id/rule_id sets match
DB exactly, level tags correct, similarity in [-0.14, 0.74] with no NaNs.

CSV column `similarity` is renamed to `score` to match the `similarity_steps`
schema (see supabase/schema.sql).

Usage: pipeline/.venv/Scripts/python.exe pipeline/load_similarity.py
"""
from pathlib import Path

import pandas as pd

from load_supabase import upsert

RAW = Path("public/dna_similarity.csv")


def main():
    df = pd.read_csv(RAW).rename(columns={"similarity": "score"})
    upsert("similarity_steps", df[["text_id", "rule_id", "level", "score"]], batch_size=2000)


if __name__ == "__main__":
    main()
