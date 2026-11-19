"""Precompute P1 (rule-finding) aggregate metrics over a tau grid.

Recomputing BFS for all ~7,663 DNA+Jigsaw texts against all 443k
similarity rows on every slider tick isn't practical to do live (client
or server), so this runs once offline and writes to three tables the P1
view reads from directly:

  p1_tau_grid       -- top-1/top-3 accuracy + efficiency per (tau, source, split)
  p1_node_stats     -- top-1 accuracy per (tau, rule_id) for the aggregate tree view
  p1_boundary_cases -- texts whose found-rule flips between adjacent grid tau values

Per-text BFS at an arbitrary (non-grid) tau is still done live, client-side,
from a single text's own similarity_steps rows (<=78 for DNA, 2 for Jigsaw) --
this script only covers the aggregate-over-everything views.

Usage: pipeline/.venv/Scripts/python.exe pipeline/precompute_p1.py
"""
import math
import os
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(".env.local")

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
HEADERS = {"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"}

TAU_GRID = [round(i * 0.02, 2) for i in range(31)]  # 0.00 .. 0.60


def fetch_all(table: str, select: str, filters: str = "", page_size: int = 1000) -> list[dict]:
    rows = []
    start = 0
    while True:
        url = f"{SUPABASE_URL}/rest/v1/{table}?select={select}{filters}"
        resp = requests.get(
            url,
            headers={**HEADERS, "Range-Unit": "items", "Range": f"{start}-{start + page_size - 1}"},
            timeout=60,
        )
        resp.raise_for_status()
        batch = resp.json()
        rows.extend(batch)
        if len(batch) < page_size:
            break
        start += page_size
        if start % 50000 == 0:
            print(f"  ...{table}: {start} rows fetched")
    return rows


def children_of(rules_by_parent: dict, parent_id: str | None) -> list[dict]:
    return rules_by_parent.get(parent_id, [])


def roots_of(rules_by_parent: dict, source: str, rules_by_id: dict) -> list[dict]:
    return [r for r in rules_by_parent.get(None, []) if r["source"] == source]


def run_bfs(sim_for_text: dict, rules_by_parent: dict, source: str, tau: float):
    """Returns (path_ids: list[str], nodes_visited: int, final_candidates: list[(rule_id, score)])"""
    frontier = rules_by_parent.get(None, [])
    frontier = [r for r in frontier if r["source"] == source]
    path = []
    nodes_visited = 0
    final_candidates = []

    while frontier:
        nodes_visited += len(frontier)
        scored = sorted(
            ((r, sim_for_text.get(r["id"], float("-inf"))) for r in frontier),
            key=lambda x: -x[1],
        )
        survivors = [(r, s) for r, s in scored if s >= tau]

        if not survivors:
            path.append(scored[0][0]["id"])
            final_candidates = scored
            break

        path.append(survivors[0][0]["id"])
        children = []
        for r, _ in survivors:
            children.extend(children_of(rules_by_parent, r["id"]))

        if not children:
            final_candidates = survivors
            break

        final_candidates = survivors
        frontier = children

    return path, nodes_visited, final_candidates


def upsert(table: str, records: list[dict], batch_size: int = 1000):
    if not records:
        return
    n_batches = math.ceil(len(records) / batch_size)
    for i in range(n_batches):
        batch = records[i * batch_size : (i + 1) * batch_size]
        resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/{table}",
            headers={**HEADERS, "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates"},
            json=batch,
            timeout=60,
        )
        if resp.status_code not in (200, 201):
            raise RuntimeError(f"{table} batch {i}: HTTP {resp.status_code} {resp.text[:300]}")
    print(f"  {table}: {len(records)} rows uploaded")


def main():
    print("fetching rules...")
    rules = fetch_all("rules", "id,source,level,parent_id,rule_text")
    rules_by_id = {r["id"]: r for r in rules}
    rules_by_parent: dict = {}
    for r in rules:
        rules_by_parent.setdefault(r["parent_id"], []).append(r)
    total_nodes_by_source = {
        "dna": sum(1 for r in rules if r["source"] == "dna"),
        "jigsaw": sum(1 for r in rules if r["source"] == "jigsaw"),
    }

    print("fetching texts (dna+jigsaw)...")
    texts = fetch_all("texts", "id,source,split,gold_rule_id", "&source=in.(dna,jigsaw)")
    print(f"  {len(texts)} texts")

    print("fetching similarity_steps (this is the slow part, ~444 pages)...")
    sim_rows = fetch_all("similarity_steps", "text_id,rule_id,score")
    print(f"  {len(sim_rows)} similarity rows")

    sim_by_text: dict = {}
    for row in sim_rows:
        sim_by_text.setdefault(row["text_id"], {})[row["rule_id"]] = row["score"]
    del sim_rows

    found_by_text_tau: dict = {t["id"]: {} for t in texts}  # text_id -> {tau: found_leaf_id}

    tau_grid_rows = []
    node_stats_acc: dict = {}  # (tau, rule_id) -> [n_gold, n_correct]

    for tau in TAU_GRID:
        print(f"tau={tau} ...")
        agg: dict = {}  # (source, split) -> [hits1, hits3, visited_sum, n]

        for t in texts:
            source, split, gold = t["source"], t["split"], t["gold_rule_id"]
            sim_for_text = sim_by_text.get(t["id"], {})
            path, visited, final_candidates = run_bfs(sim_for_text, rules_by_parent, source, tau)
            found_leaf = path[-1]
            found_by_text_tau[t["id"]][tau] = found_leaf

            ranked = sorted(final_candidates, key=lambda x: -x[1])
            top1 = len(ranked) >= 1 and ranked[0][0]["id"] == gold
            top3 = any(r["id"] == gold for r, _ in ranked[:3])

            key = (source, split)
            a = agg.setdefault(key, [0, 0, 0, 0])
            a[0] += int(top1)
            a[1] += int(top3)
            a[2] += visited / total_nodes_by_source[source]
            a[3] += 1

            if gold:
                ns = node_stats_acc.setdefault((tau, gold), [0, 0])
                ns[0] += 1
                ns[1] += int(found_leaf == gold)

        for (source, split), (hits1, hits3, visited_sum, n) in agg.items():
            tau_grid_rows.append(
                {
                    "tau": tau,
                    "source": source,
                    "split": split,
                    "topk1_acc": hits1 / n,
                    "topk3_acc": hits3 / n,
                    "efficiency": visited_sum / n,
                    "n": n,
                }
            )

    node_stats_rows = [
        {"tau": tau, "rule_id": rule_id, "n_gold": n_gold, "n_correct": n_correct}
        for (tau, rule_id), (n_gold, n_correct) in node_stats_acc.items()
    ]

    print("detecting boundary cases...")
    boundary_rows = []
    for text_id, by_tau in found_by_text_tau.items():
        prev_tau = None
        prev_leaf = None
        for tau in TAU_GRID:
            leaf = by_tau[tau]
            if prev_leaf is not None and leaf != prev_leaf:
                boundary_rows.append(
                    {
                        "text_id": text_id,
                        "tau_low": prev_tau,
                        "tau_high": tau,
                        "rule_id_low": prev_leaf,
                        "rule_id_high": leaf,
                    }
                )
            prev_tau, prev_leaf = tau, leaf
    print(f"  {len(boundary_rows)} boundary flips found")

    print("uploading...")
    upsert("p1_tau_grid", tau_grid_rows)
    upsert("p1_node_stats", node_stats_rows)
    upsert("p1_boundary_cases", boundary_rows)
    print("done")


if __name__ == "__main__":
    main()
