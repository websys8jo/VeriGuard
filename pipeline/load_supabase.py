"""Upsert processed CSVs into Supabase via the REST API (service_role key, bypasses RLS).

Usage: pipeline/.venv/Scripts/python.exe pipeline/load_supabase.py
"""
import math
import os
from pathlib import Path

import pandas as pd
import requests
from dotenv import load_dotenv

load_dotenv(".env.local")

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates",
}

OUT = Path("data/processed")


def clean(value):
    if isinstance(value, float) and math.isnan(value):
        return None
    return value


def upsert(table: str, df: pd.DataFrame, batch_size: int = 500):
    records = [{k: clean(v) for k, v in row.items()} for row in df.to_dict(orient="records")]
    n_batches = math.ceil(len(records) / batch_size)
    for i in range(n_batches):
        batch = records[i * batch_size : (i + 1) * batch_size]
        resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/{table}",
            headers=HEADERS,
            json=batch,
            timeout=60,
        )
        if resp.status_code not in (200, 201):
            raise RuntimeError(f"{table} batch {i}: HTTP {resp.status_code} {resp.text[:500]}")
        print(f"{table}: batch {i + 1}/{n_batches} ok ({len(batch)} rows)")


def main():
    rules_df = pd.read_csv(OUT / "dna_rules.csv")
    # insert order matters: parent_id is a self-FK, so majors -> mids -> minors
    for level in ["major", "mid", "minor"]:
        upsert("rules", rules_df[rules_df["level"] == level])

    texts_df = pd.read_csv(OUT / "dna_texts.csv")
    upsert("texts", texts_df)

    prosocial_path = OUT / "prosocial_texts.csv"
    if prosocial_path.exists():
        upsert("texts", pd.read_csv(prosocial_path))


if __name__ == "__main__":
    main()
