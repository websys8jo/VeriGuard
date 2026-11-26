"""Evaluate DNA and Jigsaw default judgments against the canonical split."""
import argparse
from itertools import combinations
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import (
    average_precision_score, cohen_kappa_score, f1_score,
    precision_recall_curve, roc_auc_score,
)

ROOT = Path(__file__).resolve().parents[2]
PROCESSED = ROOT / "data/processed"
SHIELDGEMMA = ROOT / "shared_outputs/shieldgemma"


def evaluate(frame):
    dev = frame[frame.split.eq("dev")]
    truth = dev.human_label.eq("violation")
    precision, recall, thresholds = precision_recall_curve(truth, dev.violation_prob)
    f1 = 2 * precision[:-1] * recall[:-1] / np.maximum(
        precision[:-1] + recall[:-1], 1e-15
    )
    raw = thresholds[np.flatnonzero(np.isclose(f1, f1.max(), rtol=0, atol=1e-12))[-1]]
    reason = "all_positive_at_dev_optimum" if raw == dev.violation_prob.min() else ""
    threshold = 0.5 if reason else raw
    frame = frame.assign(
        threshold=threshold,
        predicted_label=np.where(frame.violation_prob.ge(threshold), "violation", "normal"),
    )
    test = frame[frame.split.eq("test")]
    human = test.human_label.eq("violation")
    predicted = test.predicted_label.eq("violation")
    metrics = {
        "source": test.source.iloc[0], "model_name": test.model_name.iloc[0],
        "dev_n": len(dev), "test_n": len(test), "dev_best_threshold": raw,
        "threshold": threshold, "fallback_reason": reason,
        "dev_best_f1": f1.max(),
        "dev_applied_f1": f1_score(truth, dev.violation_prob.ge(threshold)),
        "test_f1": f1_score(human, predicted),
        "test_roc_auc": roc_auc_score(human, test.violation_prob),
        "test_pr_auc_ap": average_precision_score(human, test.violation_prob),
        "test_human_kappa": cohen_kappa_score(human, predicted),
    }
    return frame, metrics


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--team-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    splits = pd.read_csv(ROOT / "shared_inputs/rule_similarity/splits.csv")
    examples = pd.read_csv(args.team_dir / "b_example_dev_ids.csv")
    frames, metrics, pairs = [], [], []
    for source in ("dna", "jigsaw"):
        metadata = splits[splits.source.eq(source)].merge(
            pd.read_csv(PROCESSED / f"{source}_texts.csv").rename(columns={"id": "text_id"})[
                ["text_id", "human_label", "response_llm", "gold_rule_id"]
            ], on="text_id", validate="one_to_one", how="left",
        )
        excluded = examples.loc[examples.source.eq(source), "text_id"]
        metadata = metadata[~(metadata.split.eq("dev") & metadata.text_id.isin(excluded))]
        inputs = [
            pd.read_csv(PROCESSED / f"judgments_{model}_guard_{source}.csv")
            for model in ("llama", "qwen")
        ]
        inputs.append(pd.read_csv(SHIELDGEMMA / f"judgments_shieldgemma_final_{source}.csv"))
        team = pd.concat([
            pd.read_csv(args.team_dir / f"judgments_{source}_b_default_{split}.csv")
            for split in ("dev", "test")
        ])
        inputs.append(team)
        source_frames = []
        for judgments in inputs:
            columns = ["text_id", "model_name", "condition", "rule_id", "violation_prob", "human_label"]
            frame = metadata.merge(
                judgments[columns], on="text_id", suffixes=("", "_input"),
                validate="one_to_one", how="left",
            )
            if (
                not frame.human_label.isin(["normal", "violation"]).all()
                or not frame.human_label.eq(frame.human_label_input).all()
                or not frame.condition.eq("default").all()
                or not frame.violation_prob.between(0, 1).all()
            ):
                raise ValueError(f"Incomplete or inconsistent default input for {source}")
            evaluated, summary = evaluate(frame.drop(columns="human_label_input"))
            if judgments is team:
                verified = evaluated[evaluated.split.eq("test")].merge(
                    team.loc[team.split.eq("test"), ["text_id", "threshold", "predicted_label"]],
                    on="text_id", suffixes=("", "_saved"), validate="one_to_one",
                )
                if (len(verified) != summary["test_n"]
                    or not np.allclose(verified.threshold, verified.threshold_saved, rtol=0, atol=1e-12)
                    or not verified.predicted_label.eq(verified.predicted_label_saved).all()):
                    raise ValueError(f"Saved team predictions differ for {source}")
            metrics.append(summary)
            source_frames.append(evaluated)
        combined = pd.concat(source_frames, ignore_index=True)
        frames.append(combined)
        test = combined[combined.split.eq("test")]
        wide = test.pivot(index="text_id", columns="model_name", values="predicted_label")
        for a, b in combinations(wide.columns, 2):
            pairs.append({"source": source, "split": "test", "model_a": a, "model_b": b,
                          "kappa": cohen_kappa_score(wide[a], wide[b]), "n": len(wide)})
    judgments = pd.concat(frames, ignore_index=True)
    test = judgments[judgments.split.eq("test")].copy()
    test["wrong"] = test.predicted_label.ne(test.human_label)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    judgments.to_csv(args.output_dir / "judgments.csv", index=False)
    pd.DataFrame(metrics).to_csv(args.output_dir / "metrics.csv", index=False)
    pd.DataFrame(pairs).to_csv(args.output_dir / "kappa_pairs.csv", index=False)
    for name, data, group in (
        ("errors_by_rule", test, "gold_rule_id"),
        ("errors_by_response_llm", test[test.source.eq("dna")], "response_llm"),
    ):
        summary = data.groupby(["source", "model_name", group], dropna=False).wrong.agg(
            n="size", errors="sum", error_rate="mean"
        )
        summary.to_csv(args.output_dir / f"{name}.csv")


if __name__ == "__main__":
    main()
