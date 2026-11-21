#!/usr/bin/env python3
"""Download OSM river/stream ways for Wales into data/osm_waterways_wales.json."""

from __future__ import annotations

import json
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "osm_waterways_wales.json"
UA = "EcoHackDemo/1.0 (macroinvertebrates)"

# Four tiles over Wales — keeps each Overpass query small.
BBOXES = [
    (51.35, -5.05, 51.85, -3.85),
    (51.35, -3.85, 51.85, -2.65),
    (51.85, -5.05, 53.45, -3.85),
    (51.85, -3.85, 53.45, -2.65),
]


def overpass(query: str) -> dict:
    for attempt in range(4):
        try:
            out = subprocess.check_output(
                [
                    "curl",
                    "-sS",
                    "--max-time",
                    "180",
                    "-A",
                    UA,
                    "-d",
                    query,
                    "https://overpass-api.de/api/interpreter",
                ],
                text=True,
            )
            if out.strip().startswith("{"):
                return json.loads(out)
        except (subprocess.CalledProcessError, json.JSONDecodeError):
            pass
        time.sleep(3 * (attempt + 1))
    return {}


def main() -> None:
    elements: list[dict] = []
    seen: set[int] = set()
    for s, w, n, e in BBOXES:
        q = (
            f'[out:json][timeout:120];way["waterway"~"river|stream"]({s},{w},{n},{e});'
            "out geom;"
        )
        data = overpass(q)
        for el in data.get("elements", []):
            if el.get("type") != "way":
                continue
            wid = el.get("id")
            if wid in seen:
                continue
            seen.add(wid)
            elements.append(el)
        print(f"tile ({s},{w},{n},{e}): +{len(data.get('elements', []))} ways, total {len(elements)}")
        time.sleep(2)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"elements": elements}, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {len(elements)} ways → {OUT}")


if __name__ == "__main__":
    main()