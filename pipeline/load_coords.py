"""Load UMAP embedding coordinates (DNA + Jigsaw) into Supabase `text_coords`.

Source: data/processed/dna_coords.csv, jigsaw_coords.csv (from the team's
commit 4048bbc). Used for an embedding-map view; not required by any P1-P4
metric, just a visualization aid.

Usage: pipeline/.venv/Scripts/python.exe pipeline/load_coords.py
"""
from pathlib import Path

import pandas as pd

from load_supabase import upsert

OUT = Path("data/processed")


def main():
    upsert("text_coords", pd.read_csv(OUT / "dna_coords.csv"))
    upsert("text_coords", pd.read_csv(OUT / "jigsaw_coords.csv"))


if __name__ == "__main__":
    main()
