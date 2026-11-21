#!/usr/bin/env python3
"""Per-site survey series + paired chemistry for the DarwinFlow sidebar.

Reads data/kieco_chemistry_joined.csv (one row per KiEco sample) and writes
web/public/data/site_series.json:

  { "sites": { "<site_id>": {
      "s": [[date, n_taxa, total_abundance, pct_ept_abundance], ...],   # oldest first
      "chem": {...} | null,       # chemistry paired (<= 90 days) with the LATEST survey
      "chem_last": {...} | null   # most recent survey that had paired chemistry
  } } }

Stdlib only, so it runs in the Netlify build (npm run etl).
"""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "data" / "kieco_chemistry_joined.csv"
OUT_PATH = ROOT / "web" / "public" / "data" / "site_series.json"


def num(v: str):
    if v is None or v == "":
        return None
    try:
        f = float(v)
    except ValueError:
        return None
    return int(f) if f.is_integer() else round(f, 3)


def truthy(v: str) -> bool:
    return str(v).strip().lower() in ("true", "1", "yes")


def chem_of(r: dict):
    if not truthy(r.get("has_chem_within_90d", "")):
        return None
    c = {
        "survey_date": r["sample_date"],
        "gap_days": num(r.get("chem_nearest_gap_days", "")),
        "station": (r.get("nearest_station_name") or "").strip() or None,
        "distance_m": num(r.get("nearest_station_m", "")),
        "bod_mg_l": num(r.get("bod_mg_l_nearest", "")),
        "ammonia_n_mg_l": num(r.get("ammonia_n_mg_l_nearest", "")),
        "do_pct_sat": num(r.get("do_pct_sat_nearest", "")),
    }
    if c["bod_mg_l"] is None and c["ammonia_n_mg_l"] is None and c["do_pct_sat"] is None:
        return None
    return c


def main() -> None:
    if not CSV_PATH.exists():
        # don't break the build: the sidebar just hides trends/chemistry without this file
        print(f"etl_site_series: {CSV_PATH} not found, skipping")
        return
    by_site: dict[str, list[dict]] = {}
    with CSV_PATH.open(newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r.get("site_id") and r.get("sample_date"):
                by_site.setdefault(r["site_id"], []).append(r)

    sites = {}
    for sid, rows in by_site.items():
        rows.sort(key=lambda r: r["sample_date"])
        series = [[r["sample_date"], num(r.get("n_taxa", "")), num(r.get("total_abundance", "")), num(r.get("pct_ept_abundance", ""))] for r in rows]
        chem = chem_of(rows[-1])
        chem_last = next((c for c in (chem_of(r) for r in reversed(rows)) if c), None)
        sites[sid] = {"s": series, "chem": chem, "chem_last": chem_last}

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps({"sites": sites}, separators=(",", ":")), encoding="utf-8")
    print(f"site_series.json: {len(sites)} sites -> {OUT_PATH}")


if __name__ == "__main__":
    main()
