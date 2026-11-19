"""Load the team's ShieldGemma judgment results (DNA + Jigsaw) into Supabase.

Source files (from PR #2 'shieldgemma-judgments', commit d95360a):
  shared_outputs/shieldgemma/judgments_shieldgemma_dna.csv
  shared_outputs/shieldgemma/judgments_shieldgemma_jigsaw.csv

Verified before loading (see pipeline/verify_shieldgemma.py output in chat):
- DNA: 33,804 rows, no dupes, default = top-5 minor rules by dna_similarity.csv
  per text, rule_sentence_only always matches gold_rule_id, human_label and
  split match our texts table exactly.
- Jigsaw: 6,087 rows, same checks pass, but rule_id uses the old 3-node
  scheme (jigsaw_minor_*) that no longer exists in `rules` (we deleted the
  duplicate major/minor hierarchy a teammate had test-inserted). Remapped
  here to our 2-node scheme (jigsaw_rule_*) by rule text before loading.

Usage: pipeline/.venv/Scripts/python.exe pipeline/load_judgments_shieldgemma.py
"""
from pathlib import Path

import pandas as pd

from load_supabase import upsert  # reuses the batched REST upsert helper

RAW = Path("shared_outputs/shieldgemma")

JIGSAW_RULE_REMAP = {
    "jigsaw_minor_560931914f54": "jigsaw_rule_560931914f",
    "jigsaw_minor_677797f76c2c": "jigsaw_rule_677797f76c",
}

COLUMNS = ["text_id", "model_name", "condition", "rule_id", "violation_prob", "split"]


def main():
    dna = pd.read_csv(RAW / "judgments_shieldgemma_dna.csv")[COLUMNS]
    upsert("judgments", dna)

    jigsaw = pd.read_csv(RAW / "judgments_shieldgemma_jigsaw.csv")
    jigsaw["rule_id"] = jigsaw["rule_id"].map(JIGSAW_RULE_REMAP)
    assert jigsaw["rule_id"].isna().sum() == 0, "unmapped jigsaw rule_id found"
    upsert("judgments", jigsaw[COLUMNS])


if __name__ == "__main__":
    main()
