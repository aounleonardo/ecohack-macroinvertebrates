#!/usr/bin/env python3
"""Build static GeoJSON for the Vite app (client-side fetch, no Render hop)."""

from __future__ import annotations

import csv
import json
from collections import defaultdict
from datetime import date, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "data" / "kieco_chemistry_joined.csv"
OUT_DIR = ROOT / "web" / "public" / "data"

FRESH_YEARS = 2
AGING_YEARS = 3  # window before fresh (2–5 years from today)
STALE_GREEN_DAYS = int(365.25 * FRESH_YEARS)
STALE_AMBER_DAYS = int(365.25 * (FRESH_YEARS + AGING_YEARS))


def parse_date(s: str) -> date | None:
    if not s:
        return None
    try:
        return datetime.strptime(s[:10], "%Y-%m-%d").date()
    except ValueError:
        return None


def staleness_label(days: int | None) -> str:
    if days is None:
        return "unknown"
    if days <= STALE_GREEN_DAYS:
        return "fresh"
    if days <= STALE_AMBER_DAYS:
        return "aging"
    return "stale"


def max_taxa(rows: list[dict]) -> int:
    vals = []
    for r in rows:
        if r.get("n_taxa"):
            try:
                vals.append(int(r["n_taxa"]))
            except ValueError:
                pass
    return max(vals) if vals else 0


def row_looks_partial(row: dict, site_max: int) -> bool:
    if site_max < 8:
        return False
    if not row.get("n_taxa"):
        return False
    try:
        n = int(row["n_taxa"])
    except ValueError:
        return False
    return n <= 2


def families_for_display(rows: list[dict]) -> tuple[list[str], bool]:
    """Latest complete survey families; flag when the newest row is a sparse upload."""
    site_max = max_taxa(rows)
    latest = rows[-1]
    partial = row_looks_partial(latest, site_max)
    pick = latest
    if partial:
        for r in reversed(rows[:-1]):
            if not row_looks_partial(r, site_max):
                pick = r
                break
    families = [
        x.strip()
        for x in (pick.get("family_list") or "").split(";")
        if x.strip()
    ]
    return families, partial


def main() -> None:
    if not CSV_PATH.exists():
        raise SystemExit(f"Missing {CSV_PATH}")

    today = date.today()
    by_site: dict[str, list[dict]] = defaultdict(list)

    with CSV_PATH.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            by_site[row["site_id"]].append(row)

    features = []
    for site_id, rows in by_site.items():
        rows.sort(key=lambda r: r.get("sample_date") or "")
        latest = rows[-1]
        last_d = parse_date(latest.get("sample_date", ""))
        days_since = (today - last_d).days if last_d else None

        families, latest_partial = families_for_display(rows)

        features.append(
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [
                        float(latest["lon"]),
                        float(latest["lat"]),
                    ],
                },
                "properties": {
                    "site_id": site_id,
                    "site_name": latest.get("site_name") or site_id,
                    "catchment": latest.get("catchment") or "",
                    "last_sample_date": latest.get("sample_date"),
                    "days_since_sample": days_since,
                    "staleness": staleness_label(days_since),
                    "n_surveys": len(rows),
                    "n_taxa": int(latest["n_taxa"]) if latest.get("n_taxa") else None,
                    "n_families": int(latest["n_families"])
                    if latest.get("n_families")
                    else None,
                    "pct_ept_abundance": float(latest["pct_ept_abundance"])
                    if latest.get("pct_ept_abundance")
                    else None,
                    "families_latest": families,
                    "latest_sample_partial": latest_partial,
                    "has_chem_within_90d": latest.get("has_chem_within_90d") == "True",
                },
            }
        )

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    geojson = {"type": "FeatureCollection", "features": features}
    out_path = OUT_DIR / "sites.geojson"
    out_path.write_text(json.dumps(geojson, indent=0), encoding="utf-8")
    print(f"Wrote {len(features)} sites → {out_path}")


if __name__ == "__main__":
    main()