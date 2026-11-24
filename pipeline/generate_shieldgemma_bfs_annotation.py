"""Annotate the ShieldGemma default candidates (top-5 minor-by-similarity for
DNA, both rules for Jigsaw -- see shared_outputs/shieldgemma/README.md) with
whether each one actually survived the true hierarchical BFS at tau=0.02, and
whether the text is a "fallback" case (nothing survived tau anywhere, so the
spec's rule applies: use the single highest-similarity candidate instead).

For DNA this produces p2_shieldgemma_bfs_dna.csv: one row per existing
ShieldGemma candidate, with bfs_pass / is_fallback / fallback_rule_id added,
so "final prob = max(prob where bfs_pass) else prob of fallback_rule_id"
tells you directly, per text, whether a supplemental ShieldGemma run is
needed (fallback_rule_id not among the already-judged candidates).

Usage: pipeline/.venv/Scripts/python.exe pipeline/generate_shieldgemma_bfs_annotation.py
"""
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from precompute_p1 import fetch_all, run_bfs

import pandas as pd

TAU = 0.02
OUT = Path("data/processed")

JIGSAW_RULE_REMAP = {
    "jigsaw_minor_560931914f54": "jigsaw_rule_560931914f",
    "jigsaw_minor_677797f76c2c": "jigsaw_rule_677797f76c",
}


def main():
    rules = fetch_all("rules", "id,source,level,parent_id,rule_text")
    rules_by_parent = {}
    for r in rules:
        rules_by_parent.setdefault(r["parent_id"], []).append(r)

    sim_rows = fetch_all("similarity_steps", "text_id,rule_id,score")
    sim_by_text = {}
    for row in sim_rows:
        sim_by_text.setdefault(row["text_id"], {})[row["rule_id"]] = row["score"]
    del sim_rows

    # --- DNA: annotate the existing 5 ShieldGemma default candidates ---
    sg_dna = pd.read_csv("shared_outputs/shieldgemma/judgments_shieldgemma_dna.csv")
    sg_dna_default = sg_dna[sg_dna.condition == "default"]

    out_path = OUT / "p2_shieldgemma_bfs_dna.csv"
    needs_rerun = []
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(
            ["text_id", "rule_id", "shieldgemma_violation_prob", "bfs_pass", "is_fallback", "fallback_rule_id"]
        )
        for text_id, group in sg_dna_default.groupby("text_id"):
            sim_for_text = sim_by_text.get(text_id, {})
            _, _, final_candidates, is_fallback = run_bfs(sim_for_text, rules_by_parent, "dna", TAU)

            if is_fallback:
                accepted = {final_candidates[0][0]["id"]}
                fallback_rule_id = final_candidates[0][0]["id"]
            else:
                accepted = {r["id"] for r, _ in final_candidates}
                fallback_rule_id = ""

            any_pass = False
            for row in group.itertuples():
                bfs_pass = row.rule_id in accepted
                any_pass = any_pass or bfs_pass
                writer.writerow([text_id, row.rule_id, row.violation_prob, bfs_pass, is_fallback, fallback_rule_id])

            if not any_pass:
                needs_rerun.append({"text_id": text_id, "fallback_rule_id": fallback_rule_id, "is_fallback": is_fallback})

    print(f"{out_path}: {sg_dna_default.text_id.nunique()} texts annotated")

    rerun_path = OUT / "p2_dna_needs_shieldgemma_rerun.csv"
    pd.DataFrame(needs_rerun).to_csv(rerun_path, index=False)
    print(f"{rerun_path}: {len(needs_rerun)} texts where none of the 5 existing candidates survived BFS")

    # --- Jigsaw: confirm the id mapping explicitly ---
    jigsaw_rules = {r["id"]: r["rule_text"] for r in rules if r["source"] == "jigsaw"}
    mapping_path = OUT / "jigsaw_id_mapping.csv"
    with open(mapping_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["shieldgemma_rule_id (stale)", "current_rule_id (rules table)", "rule_text"])
        for old_id, new_id in JIGSAW_RULE_REMAP.items():
            writer.writerow([old_id, new_id, jigsaw_rules.get(new_id, "")])
    print(f"{mapping_path} written")


if __name__ == "__main__":
    main()
