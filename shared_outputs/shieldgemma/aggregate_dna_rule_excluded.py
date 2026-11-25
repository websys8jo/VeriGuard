"""Aggregate DNA rule-excluded judgments with the baseline top-five BFS flags."""
import argparse
from pathlib import Path

import pandas as pd


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("judgments", "bfs", "similarity", "output"):
        parser.add_argument(name, type=Path)
    args = parser.parse_args()

    keys = ["text_id", "rule_id"]
    rows = pd.read_csv(args.judgments, dtype={"violation_prob": str})
    bfs = pd.read_csv(args.bfs, usecols=keys + ["bfs_pass"])
    similarity = pd.read_csv(args.similarity, usecols=keys + ["similarity"])
    ranked = bfs.merge(similarity, on=keys, how="left", validate="one_to_one")
    if ranked["similarity"].isna().any() or not ranked["bfs_pass"].isin([True, False]).all():
        raise ValueError("Invalid similarity or BFS flags for original top-five candidates")
    candidates = rows.merge(ranked, on=keys, how="left", validate="one_to_one")
    if candidates["bfs_pass"].isna().any():
        raise ValueError("Judgment outside original top-five candidates")
    if not candidates.groupby("text_id").size().isin([4, 5]).all():
        raise ValueError("Expected four or five remaining candidates per text")
    candidates["probability"] = candidates["violation_prob"].astype(float)
    if not candidates["probability"].between(0, 1).all():
        raise ValueError("Invalid violation probability")
    candidates["fallback"] = ~candidates.groupby("text_id")["bfs_pass"].transform("any")
    eligible = candidates[candidates["bfs_pass"] | candidates["fallback"]].copy()
    eligible["selection_score"] = eligible["probability"].where(
        ~eligible["fallback"], eligible["similarity"]
    )
    selected = (
        eligible.sort_values(
            ["text_id", "selection_score", "similarity", "rule_id"],
            ascending=[True, False, False, True],
        )
        .drop_duplicates("text_id")
    )
    selected[list(rows.columns) + ["bfs_pass", "fallback"]].to_csv(args.output, index=False)
    print(f"{len(selected)} texts, {selected['bfs_pass'].sum()} BFS, {selected['fallback'].sum()} fallback")


if __name__ == "__main__":
    main()
