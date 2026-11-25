"""Aggregate existing DNA top-five ShieldGemma scores without running the model."""
import argparse

import pandas as pd


KEYS = ["text_id", "rule_id"]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("scores", help="p2_shieldgemma_bfs_dna.csv")
    parser.add_argument("similarity", help="Original DNA similarity CSV")
    parser.add_argument("judgments", help="Original per-rule ShieldGemma judgments CSV")
    parser.add_argument("output", help="Output CSV path")
    args = parser.parse_args()

    scores = pd.read_csv(args.scores, float_precision="round_trip")
    similarity = pd.read_csv(args.similarity).query("level == 'minor'")
    ranked = similarity.sort_values(["text_id", "similarity"], ascending=[True, False])
    top_five = ranked.groupby("text_id", sort=False).head(5)
    candidates = scores.merge(top_five[KEYS + ["similarity"]], on=KEYS, how="left", validate="one_to_one", indicator=True)
    if len(scores) != len(top_five) or not candidates["_merge"].eq("both").all():
        raise ValueError("ShieldGemma scores do not match the original top-five candidates")
    if not candidates["bfs_pass"].isin([True, False]).all():
        raise ValueError("Invalid BFS pass flag")
    if not candidates["shieldgemma_violation_prob"].between(0, 1).all():
        raise ValueError("Invalid ShieldGemma probability")

    passed = candidates[candidates["bfs_pass"]]
    winners = passed.loc[passed.groupby("text_id")["shieldgemma_violation_prob"].idxmax()]
    top_one = candidates.sort_values("similarity", ascending=False, kind="stable").drop_duplicates("text_id")
    fallback = top_one[~top_one["text_id"].isin(winners["text_id"])]
    selected = pd.concat([winners, fallback])[KEYS + ["shieldgemma_violation_prob"]]

    judgments = pd.read_csv(args.judgments, dtype={"violation_prob": str}).query("condition == 'default'")
    results = selected.merge(judgments, on=KEYS, how="left", validate="one_to_one")
    if not results["violation_prob"].astype(float).eq(results["shieldgemma_violation_prob"]).all():
        raise ValueError("Selected scores do not match the original judgments")
    results[judgments.columns].sort_values("text_id").to_csv(args.output, index=False)
    print(f"{len(results)} texts, {len(winners)} BFS pass, {len(fallback)} top-one fallback")


if __name__ == "__main__":
    main()
