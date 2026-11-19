"""Load Llama Guard 3 1B and Qwen3Guard-Gen-0.6B judgments (DNA/Jigsaw/ProsocialDialog)
into Supabase `judgments`. These two models don't take rule text as input
(see spec: "조건: 우리의 윤리 규칙을 입력받지 않음"), so rule_id is always
null and condition is always 'default' -- verified in chat before loading
(all 6 files: text_id set matches texts exactly, no dupes, violation_prob
in [0,1], human_label and split match our texts table everywhere).

Usage: pipeline/.venv/Scripts/python.exe pipeline/load_judgments_guards.py
"""
from pathlib import Path

import pandas as pd

from load_supabase import upsert

OUT = Path("data/processed")

FILES = [
    "judgments_llama_guard_dna",
    "judgments_llama_guard_jigsaw",
    "judgments_llama_guard_prosocial",
    "judgments_qwen_guard_dna",
    "judgments_qwen_guard_jigsaw",
    "judgments_qwen_guard_prosocial",
]

COLUMNS = ["text_id", "model_name", "condition", "rule_id", "violation_prob", "split"]


def main():
    for name in FILES:
        df = pd.read_csv(OUT / f"{name}.csv")
        upsert("judgments", df[COLUMNS])


if __name__ == "__main__":
    main()
