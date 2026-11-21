"""Map insecta classifier output → KiEco family strings used by the DarwinFlow app."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

MAP_PATH = Path(__file__).resolve().parents[1] / "data" / "insecta_kieco_map.json"
REMOTE_MAP = "/root/data/insecta_kieco_map.json"

ORDER_LATIN_TO_KIECO: dict[str, tuple[str, str]] = {
    "Ephemeroptera": ("Baetidae", "Mayfly nymph (EPT)"),
    "Plecoptera": ("Leuctridae", "Stonefly nymph (EPT)"),
    "Trichoptera": ("Hydropsychidae", "Caddisfly larva (EPT)"),
    "Odonata": ("Platycnemididae", "Damselfly or dragonfly nymph"),
    "Diptera": ("Chironomidae", "Aquatic fly larva"),
    "Coleoptera": ("Elmidae", "Aquatic beetle"),
}

MORPHOLOGY_GUESS: dict[str, tuple[str, str]] = {
    "Scorpiones": ("Leuctridae", "Pilot ID uncertain — resembles a stonefly or mayfly nymph"),
    "Araneae": ("Hydrachnidae", "Pilot ID uncertain — may be a water mite"),
    "Acari": ("Hydrachnidae", "Likely water mite or similar"),
}

KICK_DEFAULT = (
    "Nemouridae",
    "Small aquatic invertebrate in kick sample — please confirm",
)


def _latin_family_token(latin: str) -> str | None:
    latin = (latin or "").strip()
    if not latin:
        return None
    token = latin.split()[0].strip(",#")
    if token.endswith(("idae", "inae")):
        return token.rstrip("#")
    return None


class KiecoResolver:
    def __init__(self, map_path: str | Path | None = None) -> None:
        path = Path(map_path) if map_path else MAP_PATH
        if not path.is_file():
            path = Path(REMOTE_MAP)
        data = json.loads(path.read_text(encoding="utf-8"))
        self._by_class: dict[str, dict[str, Any]] = data.get("classes", {})
        self._kieco: set[str] = set(data.get("kieco_families") or [])
        if not self._kieco:
            for row in self._by_class.values():
                self._kieco.add(str(row.get("kieco_family", "")))

    def resolve(
        self,
        *,
        class_id: int | None = None,
        chinese_name: str = "",
        latin_name: str = "",
    ) -> dict[str, Any]:
        if class_id is not None and str(class_id) in self._by_class:
            row = dict(self._by_class[str(class_id)])
            row.setdefault("model_latin", latin_name)
            return row

        latin = (latin_name or "").strip()
        token = _latin_family_token(latin)

        if token and token in self._kieco:
            return {
                "kieco_family": token,
                "match_kind": "exact",
                "hint": None,
                "model_latin": latin,
            }

        if latin in ORDER_LATIN_TO_KIECO:
            fam, hint = ORDER_LATIN_TO_KIECO[latin]
            return {
                "kieco_family": fam,
                "match_kind": "order_hint",
                "hint": hint,
                "model_latin": latin,
            }

        if latin in MORPHOLOGY_GUESS:
            fam, hint = MORPHOLOGY_GUESS[latin]
            return {
                "kieco_family": fam,
                "match_kind": "morphology_guess",
                "hint": hint,
                "model_latin": latin,
            }

        for order in ORDER_LATIN_TO_KIECO:
            if re.search(rf"\b{re.escape(order)}\b", latin, re.I):
                fam, hint = ORDER_LATIN_TO_KIECO[order]
                return {
                    "kieco_family": fam,
                    "match_kind": "order_hint",
                    "hint": hint,
                    "model_latin": latin,
                }

        fam, hint = KICK_DEFAULT
        return {
            "kieco_family": fam,
            "match_kind": "kick_sample_guess",
            "hint": hint,
            "model_latin": latin or chinese_name,
        }

    def apply_to_detection(
        self,
        detection: dict[str, Any],
        class_id: int | None = None,
    ) -> dict[str, Any]:
        resolved = self.resolve(
            class_id=class_id,
            chinese_name=str(detection.get("chinese_name") or ""),
            latin_name=str(detection.get("latin_name") or ""),
        )
        family = str(resolved["kieco_family"])
        hint = resolved.get("hint")
        match_kind = str(resolved.get("match_kind", "kick_sample_guess"))
        out = dict(detection)
        out["family"] = family
        out["match_kind"] = match_kind
        if hint:
            out["hint"] = hint
        out["model_latin"] = resolved.get("model_latin") or out.get("latin_name")
        if match_kind != "exact":
            out["pilot_suggestion"] = True
        return out