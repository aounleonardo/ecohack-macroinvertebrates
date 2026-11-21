#!/usr/bin/env python3
"""Build class-id → KiEco family map for insecta pilot CV (demo-friendly, not NRW-certified)."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LABEL = ROOT / "data" / "quarrying_insectid_label_map.txt"
CATALOG = ROOT / "web" / "public" / "data" / "taxa_catalog.json"
OUT = ROOT / "data" / "insecta_kieco_map.json"

# Wales kick-sample orders → dex headline family for demo overlays (not biological truth).
ORDER_LATIN_TO_KIECO: dict[str, tuple[str, str]] = {
    "Ephemeroptera": ("Baetidae", "Mayfly nymph (EPT — often Baetidae or relatives in Welsh rivers)"),
    "Plecoptera": ("Leuctridae", "Stonefly nymph (EPT — often Leuctridae or Nemouridae)"),
    "Trichoptera": ("Hydropsychidae", "Caddisfly larva (EPT — often Hydropsychidae or Rhyacophilidae)"),
    "Odonata": ("Platycnemididae", "Damselfly or dragonfly nymph"),
    "Diptera": ("Chironomidae", "Aquatic fly larva (often non-biting midge in kick samples)"),
    "Coleoptera": ("Elmidae", "Aquatic beetle (riffle beetles are common in clean water)"),
    "Hemiptera": ("Aphelocheiridae", "Aquatic bug"),
    "Megoptera": ("Sialidae", "Alderfly larva"),
    "Neuroptera": ("Sialidae", "Neuropteran larva (often alderfly-like in rivers)"),
}

# Chinese order tags in the label map
ORDER_ZH_TO_LATIN: dict[str, str] = {
    "蜉蝣目": "Ephemeroptera",
    "襀翅目": "Plecoptera",
    "毛翅目": "Trichoptera",
    "蜻蜓目": "Odonata",
    "双翅目": "Diptera",
    "鞘翅目": "Coleoptera",
    "半翅目": "Hemiptera",
    "广翅目": "Megoptera",
    "脉翅目": "Neuroptera",
}

# Obvious misreads on kick trays → plausible Welsh freshwater guess + copy for volunteers.
MORPHOLOGY_GUESS: dict[str, tuple[str, str]] = {
    "Scorpiones": ("Leuctridae", "Pilot ID uncertain — shape like a stonefly or mayfly nymph in a kick sample"),
    "Araneae": ("Hydrachnidae", "Pilot ID uncertain — may be a water mite or small aquatic arthropod"),
    "Acari": ("Hydrachnidae", "Likely water mite or similar"),
    "Carabidae": ("Staphylinidae", "Ground beetle — tray may also hold rove or riffle beetles; please confirm"),
    "Curculionidae": ("Elmidae", "Weevil — if from river sample, double-check (beetle larva/nymph)"),
}

KICK_DEFAULT = (
    "Nemouridae",
    "Small aquatic invertebrate in kick sample — pilot ID; compare with stoneflies or mayflies",
)


def load_kieco_families() -> set[str]:
    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    fams = data["families"] if isinstance(data, dict) else data
    return {str(row["family"]).strip() for row in fams if row.get("family")}


def parse_label_line(line: str) -> tuple[int, str, str] | None:
    line = line.strip()
    if not line:
        return None
    parts = line.split(",")
    if len(parts) < 2:
        return None
    try:
        cid = int(parts[0].strip())
    except ValueError:
        return None
    chinese = parts[1].strip()
    latin = parts[2].strip() if len(parts) > 2 else ""
    return cid, chinese, latin


def latin_family_token(latin: str) -> str | None:
    latin = (latin or "").strip()
    if not latin:
        return None
    token = latin.split()[0].strip(",#")
    if token.endswith(("idae", "inae")):
        return token.rstrip("#")
    return None


def order_from_chinese(chinese: str) -> str | None:
    head = chinese.split("_")[0]
    for zh, lat in ORDER_ZH_TO_LATIN.items():
        if zh in head:
            return lat
    return None


def resolve_class(
    chinese: str,
    latin: str,
    kieco: set[str],
    zh_family_to_latin: dict[str, str],
) -> dict:
    model_latin = latin
    token = latin_family_token(latin)

    if token and token in kieco:
        return {
            "kieco_family": token,
            "match_kind": "exact",
            "hint": None,
            "model_latin": model_latin,
        }

    if latin in ORDER_LATIN_TO_KIECO:
        fam, hint = ORDER_LATIN_TO_KIECO[latin]
        return {
            "kieco_family": fam,
            "match_kind": "order_hint",
            "hint": hint,
            "model_latin": model_latin,
        }

    if latin in MORPHOLOGY_GUESS:
        fam, hint = MORPHOLOGY_GUESS[latin]
        return {
            "kieco_family": fam,
            "match_kind": "morphology_guess",
            "hint": hint,
            "model_latin": model_latin,
        }

  # Latin genus/species — walk Chinese path for family segment (…科)
    for seg in chinese.split("_"):
        if seg.endswith("科") and seg in zh_family_to_latin:
            fam = zh_family_to_latin[seg]
            if fam in kieco:
                return {
                    "kieco_family": fam,
                    "match_kind": "family_in_model",
                    "hint": f"Grouped with {fam} from model taxonomy",
                    "model_latin": model_latin,
                }

    order = order_from_chinese(chinese)
    if not order and token:
        for o in ORDER_LATIN_TO_KIECO:
            if o.lower() in latin.lower():
                order = o
                break

    if order and order in ORDER_LATIN_TO_KIECO:
        fam, hint = ORDER_LATIN_TO_KIECO[order]
        return {
            "kieco_family": fam,
            "match_kind": "order_hint",
            "hint": hint,
            "model_latin": model_latin,
        }

    fam, hint = KICK_DEFAULT
    return {
        "kieco_family": fam,
        "match_kind": "kick_sample_guess",
        "hint": hint,
        "model_latin": model_latin,
    }


def build_zh_family_index(rows: list[tuple[int, str, str]], kieco: set[str]) -> dict[str, str]:
    out: dict[str, str] = {}
    for _cid, chinese, latin in rows:
        fam = latin_family_token(latin)
        if not fam or fam not in kieco:
            continue
        for seg in chinese.split("_"):
            if seg.endswith("科"):
                out.setdefault(seg, fam)
    return out


def main() -> None:
    kieco = load_kieco_families()
    rows: list[tuple[int, str, str]] = []
    for line in LABEL.read_text(encoding="utf-8").splitlines():
        parsed = parse_label_line(line)
        if parsed:
            rows.append(parsed)

    zh_family_to_latin = build_zh_family_index(rows, kieco)
    by_class: dict[str, dict] = {}
    stats: dict[str, int] = {}

    for cid, chinese, latin in rows:
        row = resolve_class(chinese, latin, kieco, zh_family_to_latin)
        by_class[str(cid)] = row
        stats[row["match_kind"]] = stats.get(row["match_kind"], 0) + 1

    payload = {
        "version": 1,
        "kieco_families": sorted(kieco),
        "kieco_family_count": len(kieco),
        "class_count": len(by_class),
        "match_kind_counts": stats,
        "order_latin_to_kieco": {
            k: v[0] for k, v in ORDER_LATIN_TO_KIECO.items()
        },
        "classes": by_class,
    }
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {OUT} ({len(by_class)} classes)")
    print(json.dumps(stats, indent=2))


if __name__ == "__main__":
    main()