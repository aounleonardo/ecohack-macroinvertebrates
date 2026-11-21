#!/usr/bin/env python3
"""Taxon catalog + per-site family trends from KiEco joined CSV."""

from __future__ import annotations

import csv
import json
import re
from collections import defaultdict
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "data" / "kieco_chemistry_joined.csv"
OUT_CATALOG = ROOT / "web" / "public" / "data" / "taxa_catalog.json"
OUT_SITE_DIR = ROOT / "web" / "public" / "data" / "sites"

# Demo copy for nine families; others use template (noted as partial mock in plan)
FAMILY_META: dict[str, dict] = {
    "Chironomidae": {"common": "Non-biting midges", "sensitivity": "tolerant"},
    "Baetidae": {"common": "Swimming mayflies", "sensitivity": "ept"},
    "Elmidae": {"common": "Riffle beetles", "sensitivity": "sensitive"},
    "Heptageniidae": {"common": "Flat-headed mayflies", "sensitivity": "ept"},
    "Leuctridae": {"common": "Stoneflies", "sensitivity": "ept"},
    "Simuliidae": {"common": "Blackflies", "sensitivity": "moderate"},
    "Rhyacophilidae": {"common": "Free-living caddisflies", "sensitivity": "ept"},
    "Hydropsychidae": {"common": "Net-spinning caddisflies", "sensitivity": "ept"},
    "Gammaridae": {"common": "Freshwater shrimp (scuds)", "sensitivity": "tolerant"},
}


def slug(family: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", family.lower()).strip("-") or "unknown"


def parse_families(s: str) -> list[str]:
    return [x.strip() for x in (s or "").split(";") if x.strip()]


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


def latest_complete_row(rows: list[dict]) -> tuple[dict, bool]:
    site_max = max_taxa(rows)
    latest = rows[-1]
    partial = row_looks_partial(latest, site_max)
    if not partial:
        return latest, False
    for r in reversed(rows[:-1]):
        if not row_looks_partial(r, site_max):
            return r, True
    return latest, partial


def build_year_timeline(site_rows: list[dict], family: str) -> list[dict]:
    by_year: dict[int, bool | None] = {}
    for row in site_rows:
        yraw = row.get("year") or (row.get("sample_date") or "")[:4]
        if not str(yraw).isdigit():
            continue
        y = int(yraw)
        by_year[y] = family in parse_families(row.get("family_list", ""))
    if not by_year:
        return []
    y0, y1 = min(by_year), max(by_year)
    timeline = []
    for y in range(y0, y1 + 1):
        if y not in by_year:
            timeline.append({"year": y, "status": "missing"})
        elif by_year[y]:
            timeline.append({"year": y, "status": "present", "count": None})
        else:
            timeline.append({"year": y, "status": "absent"})
    return timeline


def trend_label(first_rate: float, second_rate: float, n: int) -> str:
    if n < 4:
        return "unknown"
    if second_rate - first_rate > 0.15:
        return "increasing"
    if first_rate - second_rate > 0.15:
        return "declining"
    return "stable"


def main() -> None:
    rows: list[dict] = []
    with CSV_PATH.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    total_surveys = len(rows)
    global_family_surveys: defaultdict[str, int] = defaultdict(int)
    by_site: defaultdict[str, list[dict]] = defaultdict(list)

    for row in rows:
        by_site[row["site_id"]].append(row)
        for fam in parse_families(row.get("family_list", "")):
            global_family_surveys[fam] += 1

    catalog = []
    for fam, count in sorted(global_family_surveys.items(), key=lambda x: -x[1]):
        meta = FAMILY_META.get(fam, {})
        catalog.append(
            {
                "family": fam,
                "slug": slug(fam),
                "common_name": meta.get("common", fam),
                "sensitivity": meta.get("sensitivity", "unknown"),
                "thumb_url": f"/media/thumbs/{slug(fam)}.jpg",
                "thumb_fallback": "/media/placeholder-family.svg",
                "wales_prevalence_pct": round(100 * count / total_surveys, 1),
                "description": (
                    f"Common in Welsh river kick samples ({meta['common']})."
                    if meta.get("common")
                    else f"Recorded in {count} of {total_surveys} NRW site-surveys in this dataset."
                ),
                "_demo_note": "Global/world range not in CSV — prevalence is Wales KiEco only.",
            }
        )

    OUT_CATALOG.parent.mkdir(parents=True, exist_ok=True)
    OUT_CATALOG.write_text(json.dumps({"families": catalog}, indent=0), encoding="utf-8")

    OUT_SITE_DIR.mkdir(parents=True, exist_ok=True)
    for site_id, site_rows in by_site.items():
        site_rows.sort(key=lambda r: r.get("sample_date") or "")
        n = len(site_rows)
        mid = max(1, n // 2)
        first_half, second_half = site_rows[:mid], site_rows[mid:]

        site_families: defaultdict[str, list[dict]] = defaultdict(list)
        for row in site_rows:
            year = (row.get("sample_date") or "")[:4]
            for fam in parse_families(row.get("family_list", "")):
                site_families[fam].append({"year": int(year) if year.isdigit() else None, "sample_date": row.get("sample_date")})

        family_cards = []
        latest = site_rows[-1]
        display_latest, latest_partial = latest_complete_row(site_rows)
        latest_set = set(parse_families(display_latest.get("family_list", "")))
        on_true_latest = set(parse_families(latest.get("family_list", "")))

        for fam in sorted(latest_set):
            pres = site_families[fam]
            fh = sum(1 for row in first_half if fam in parse_families(row.get("family_list", "")))
            sh = sum(1 for row in second_half if fam in parse_families(row.get("family_list", "")))
            fr, sr = fh / max(len(first_half), 1), sh / max(len(second_half), 1)
            years = sorted({p["year"] for p in pres if p["year"]})
            family_cards.append(
                {
                    "family": fam,
                    "slug": slug(fam),
                    "present_on_latest": True if latest_partial else fam in on_true_latest,
                    "surveys_with_family": len(pres),
                    "surveys_at_site": n,
                    "site_presence_pct": round(100 * len(pres) / n, 1),
                    "trend": trend_label(fr, sr, n),
                    "trend_detail": {
                        "first_half_presence_rate": round(fr, 2),
                        "second_half_presence_rate": round(sr, 2),
                    },
                    "years_seen": years,
                    "timeline": build_year_timeline(site_rows, fam),
                }
            )

        path = OUT_SITE_DIR / f"{site_id}.json"
        path.write_text(
            json.dumps(
                {
                    "site_id": site_id,
                    "latest_sample_partial": latest_partial,
                    "families": family_cards,
                    "_demo_note": "Trend compares first vs second half of site's survey history in KiEco only.",
                },
                indent=0,
            ),
            encoding="utf-8",
        )

    print(f"Catalog: {len(catalog)} families → {OUT_CATALOG}")
    print(f"Site detail files: {len(by_site)} → {OUT_SITE_DIR}/")


if __name__ == "__main__":
    main()