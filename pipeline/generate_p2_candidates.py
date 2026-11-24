"""Generate p2_candidates_{dna,jigsaw}.csv: the true hierarchical-BFS final
candidate set per text at the team's chosen tau=0.02, for comparison against
the existing ShieldGemma default judgments (which used a flat top-5-minor-by-
similarity selection for DNA, both rules for Jigsaw -- see
shared_outputs/shieldgemma/README.md).

Usage: pipeline/.venv/Scripts/python.exe pipeline/generate_p2_candidates.py
"""
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from precompute_p1 import fetch_all, run_bfs

TAU = 0.02
OUT = Path("data/processed")


def main():
    rules = fetch_all("rules", "id,source,level,parent_id,rule_text")
    rules_by_parent = {}
    for r in rules:
        rules_by_parent.setdefault(r["parent_id"], []).append(r)

    texts = fetch_all("texts", "id,source,split,gold_rule_id", "&source=in.(dna,jigsaw)")
    sim_rows = fetch_all("similarity_steps", "text_id,rule_id,score")
    sim_by_text = {}
    for row in sim_rows:
        sim_by_text.setdefault(row["text_id"], {})[row["rule_id"]] = row["score"]

    for source in ["dna", "jigsaw"]:
        out_path = OUT / f"p2_candidates_{source}.csv"
        with open(out_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["text_id", "rule_id", "score", "tau"])
            n_texts = 0
            for t in texts:
                if t["source"] != source:
                    continue
                n_texts += 1
                sim_for_text = sim_by_text.get(t["id"], {})
                _, _, final_candidates, _is_fallback = run_bfs(sim_for_text, rules_by_parent, source, TAU)
                for rule, score in final_candidates:
                    writer.writerow([t["id"], rule["id"], score, TAU])
        print(f"{out_path}: {n_texts} texts")


if __name__ == "__main__":
    main()
