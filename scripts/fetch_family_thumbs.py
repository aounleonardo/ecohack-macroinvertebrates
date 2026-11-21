#!/usr/bin/env python3
"""Download Wikimedia thumbs for families in taxa_catalog.json (missing only)."""

from __future__ import annotations

import json
import re
import subprocess
import time
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "web" / "public" / "data" / "taxa_catalog.json"
THUMB_DIR = ROOT / "web" / "public" / "media" / "thumbs"
UA = "EcoHackDemo/1.0"


def slug(family: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", family.lower()).strip("-") or "unknown"


def curl_json(url: str) -> dict:
    out = subprocess.check_output(
        ["curl", "-sL", "-A", UA, "--max-time", "45", url],
        text=True,
    )
    if not out.strip().startswith("{"):
        raise ValueError("non-json response")
    return json.loads(out)


def search_image(queries: list[str]) -> str | None:
    for term in queries:
        q = urllib.parse.quote(term)
        api = (
            "https://commons.wikimedia.org/w/api.php?action=query&generator=search"
            f"&gsrsearch={q}&gsrnamespace=6&gsrlimit=8&prop=imageinfo"
            "&iiprop=url|mime&format=json"
        )
        try:
            data = curl_json(api)
        except Exception:
            continue
        for page in data.get("query", {}).get("pages", {}).values():
            for ii in page.get("imageinfo", []):
                mime = ii.get("mime") or ""
                if mime.startswith("image/") and "svg" not in mime:
                    return ii["url"]
    return None


def wikipedia_thumb(title: str) -> str | None:
    t = urllib.parse.quote(title.replace(" ", "_"))
    api = (
        "https://en.wikipedia.org/w/api.php?action=query&titles="
        f"{t}&prop=pageimages&piprop=thumbnail&pithumbsize=480&format=json"
    )
    try:
        data = curl_json(api)
        pages = data.get("query", {}).get("pages", {})
        for page in pages.values():
            if page.get("pageid") and page.get("thumbnail"):
                return page["thumbnail"]["source"]
    except Exception:
        return None
    return None


def queries_for(entry: dict) -> list[str]:
    fam = entry["family"]
    common = entry.get("common_name") or ""
    out = [fam, f"{fam} insect", f"{common} insect".strip()]
    if common and common != fam:
        out.append(common)
    return [x for x in out if x]


def main() -> None:
    families = json.loads(CATALOG.read_text())["families"]
    THUMB_DIR.mkdir(parents=True, exist_ok=True)
    ok, skip, fail = 0, 0, 0
    for entry in families:
        fam = entry["family"]
        s = slug(fam)
        dest = THUMB_DIR / f"{s}.jpg"
        if dest.exists() and dest.stat().st_size > 1000:
            skip += 1
            continue
        try:
            url = search_image(queries_for(entry))
            time.sleep(0.5)
        except Exception:
            fail += 1
            continue
        if not url:
            url = wikipedia_thumb(fam) or wikipedia_thumb(entry.get("common_name", ""))
            time.sleep(0.35)
        if not url:
            fail += 1
            continue
        ext = ".png" if url.lower().endswith(".png") else ".jpg"
        dest = THUMB_DIR / f"{s}{ext}"
        subprocess.check_call(["curl", "-sL", "-A", UA, "-o", str(dest), url])
        if dest.stat().st_size < 500:
            dest.unlink(missing_ok=True)
            fail += 1
        else:
            ok += 1
            print("OK", fam)
    print(f"done: {ok} new, {skip} existing, {fail} missing")


if __name__ == "__main__":
    main()