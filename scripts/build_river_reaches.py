#!/usr/bin/env python3
"""
River map layers for Wales NRW sites.

1. wales_rivers_background.geojson — all monitoring network edges (light red-gray)
2. river_reaches.geojson — coloured subsegments along OSM; length adapts to spacing
   between nearby sites (nearly touching when clustered)

If data/osm_waterways_wales.json exists (Overpass), background also includes OSM
waterway lines (simplified). Coloured reaches snap along OSM when within 80 m.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITES_PATH = ROOT / "web" / "public" / "data" / "sites.geojson"
OSM_PATH = ROOT / "data" / "osm_waterways_wales.json"
OUT_BG = ROOT / "web" / "public" / "data" / "wales_rivers_background.geojson"
OUT_REACHES = ROOT / "web" / "public" / "data" / "river_reaches.geojson"

REACH_HALF_MIN_M = 50.0
REACH_HALF_MAX_M = 2_000.0
# Paint up to this fraction of half the gap to the nearest site (small unpainted join).
REACH_NEIGHBOR_SHARE = 0.46
NEIGHBOR_LOOK_M = 12_000.0
EDGE_MAX_M = 280.0
OSM_SNAP_MAX_M = 80.0


def haversine_m(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    r = 6_371_000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def interpolate(lon1: float, lat1: float, lon2: float, lat2: float, t: float) -> tuple[float, float]:
    return lon1 + (lon2 - lon1) * t, lat1 + (lat2 - lat1) * t


def load_sites() -> list[dict]:
    data = json.loads(SITES_PATH.read_text(encoding="utf-8"))
    out = []
    for f in data["features"]:
        props = dict(f["properties"])
        lon, lat = f["geometry"]["coordinates"]
        props["lon"], props["lat"] = lon, lat
        out.append(props)
    return out


def build_monitoring_edges(sites: list[dict]) -> list[tuple[dict, dict, float]]:
    edges: list[tuple[dict, dict, float]] = []
    seen: set[tuple[str, str]] = set()
    for i, a in enumerate(sites):
        for b in sites[i + 1 :]:
            if a.get("catchment") and a["catchment"] != b.get("catchment"):
                continue
            d = haversine_m(a["lon"], a["lat"], b["lon"], b["lat"])
            if d > EDGE_MAX_M:
                continue
            key = tuple(sorted([a["site_id"], b["site_id"]]))
            if key in seen:
                continue
            seen.add(key)
            edges.append((a, b, d))
    return edges


def subsegment_on_edge(
    lon: float, lat: float, nlon: float, nlat: float, half_m: float
) -> list[list[float]]:
    """Segment centered on (lon,lat), ±half_m along line toward neighbor."""
    total = max(haversine_m(lon, lat, nlon, nlat), 1.0)
    frac = min(half_m / total, 0.95)
    toward = interpolate(lon, lat, nlon, nlat, frac)
    away = (lon - (nlon - lon) * frac, lat - (nlat - lat) * frac)
    return [list(away), list(toward)]


def reach_half_m_for_site(site: dict, sites: list[dict]) -> float:
    best = NEIGHBOR_LOOK_M
    for other in sites:
        if other["site_id"] == site["site_id"]:
            continue
        if site.get("catchment") and other.get("catchment") != site.get("catchment"):
            continue
        d = haversine_m(site["lon"], site["lat"], other["lon"], other["lat"])
        if d < best:
            best = d
    if best >= NEIGHBOR_LOOK_M:
        half = REACH_HALF_MAX_M
    else:
        half = best * REACH_NEIGHBOR_SHARE
    return max(REACH_HALF_MIN_M, min(REACH_HALF_MAX_M, half))


def reach_along_edge(
    site: dict, neighbor: dict, props: dict, half_m: float
) -> dict:
    # Site is the anchor; edge runs site → neighbor for direction
    coords = subsegment_on_edge(
        site["lon"], site["lat"], neighbor["lon"], neighbor["lat"], half_m
    )
    if haversine_m(coords[0][0], coords[0][1], coords[1][0], coords[1][1]) < 3:
        # single point — expand using reverse
        coords = subsegment_on_edge(
            neighbor["lon"], neighbor["lat"], site["lon"], site["lat"], half_m
        )
    clean = {k: v for k, v in props.items() if k not in ("lon", "lat")}
    return {
        "type": "Feature",
        "geometry": {"type": "LineString", "coordinates": coords},
        "properties": clean,
    }


def fix_pick_neighbor(site: dict, edges: list[tuple[dict, dict, float]]) -> dict | None:
    sid = site["site_id"]
    cands: list[tuple[dict, float]] = []
    for a, b, d in edges:
        if a["site_id"] == sid:
            cands.append((b, d))
        elif b["site_id"] == sid:
            cands.append((a, d))
    if not cands:
        return None
    cands.sort(key=lambda x: x[1])
    return cands[0][0]


def nearest_site(site: dict, sites: list[dict], max_m: float = 8000.0) -> dict | None:
    best = None
    best_d = max_m
    for other in sites:
        if other["site_id"] == site["site_id"]:
            continue
        if site.get("catchment") and other.get("catchment") != site.get("catchment"):
            continue
        d = haversine_m(site["lon"], site["lat"], other["lon"], other["lat"])
        if d < best_d:
            best_d, best = d, other
    return best


def load_osm_lines() -> list[list[tuple[float, float]]]:
    if not OSM_PATH.exists():
        return []
    try:
        raw = json.loads(OSM_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []
    lines = []
    for el in raw.get("elements", []):
        if el.get("type") != "way":
            continue
        geom = el.get("geometry")
        if not geom:
            continue
        lines.append([(g["lon"], g["lat"]) for g in geom])
    return lines


def cumulative_distances(coords: list[tuple[float, float]]) -> list[float]:
    dists = [0.0]
    for i in range(1, len(coords)):
        dists.append(
            dists[-1] + haversine_m(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1])
        )
    return dists


def point_on_segment_m(
    px: float, py: float, ax: float, ay: float, bx: float, by: float
) -> tuple[float, float]:
    """Approximate closest point on segment AB to P (local equirectangular)."""
    lat0 = math.radians((ay + by) / 2)
    m_per_deg_lon = 111_320 * math.cos(lat0)
    m_per_deg_lat = 110_540.0
    axm, aym = ax * m_per_deg_lon, ay * m_per_deg_lat
    bxm, bym = bx * m_per_deg_lon, by * m_per_deg_lat
    pxm, pym = px * m_per_deg_lon, py * m_per_deg_lat
    dx, dy = bxm - axm, bym - aym
    seg2 = dx * dx + dy * dy
    t = 0.5 if seg2 < 1e-6 else max(0.0, min(1.0, ((pxm - axm) * dx + (pym - aym) * dy) / seg2))
    qxm, qym = axm + t * dx, aym + t * dy
    return qxm / m_per_deg_lon, qym / m_per_deg_lat


def segment_fraction(
    px: float, py: float, ax: float, ay: float, bx: float, by: float
) -> float:
    lat0 = math.radians((ay + by) / 2)
    m_per_deg_lon = 111_320 * math.cos(lat0)
    m_per_deg_lat = 110_540.0
    axm, aym = ax * m_per_deg_lon, ay * m_per_deg_lat
    bxm, bym = bx * m_per_deg_lon, by * m_per_deg_lat
    pxm, pym = px * m_per_deg_lon, py * m_per_deg_lat
    dx, dy = bxm - axm, bym - aym
    seg2 = dx * dx + dy * dy
    if seg2 < 1e-6:
        return 0.5
    return max(0.0, min(1.0, ((pxm - axm) * dx + (pym - aym) * dy) / seg2))


def coord_at_dist(
    coords: list[tuple[float, float]], cum: list[float], dist: float
) -> list[float]:
    if dist <= 0:
        return [coords[0][0], coords[0][1]]
    if dist >= cum[-1]:
        return [coords[-1][0], coords[-1][1]]
    for i in range(len(cum) - 1):
        if cum[i] <= dist <= cum[i + 1]:
            seg = cum[i + 1] - cum[i]
            t = 0.0 if seg < 1e-6 else (dist - cum[i]) / seg
            lon, lat = interpolate(
                coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1], t
            )
            return [lon, lat]
    return [coords[-1][0], coords[-1][1]]


def extract_osm_reach(lon: float, lat: float, ways: list[list[tuple[float, float]]], half_m: float):
    best: tuple[float, list[tuple[float, float]], float] | None = None
    for coords in ways:
        cum = cumulative_distances(coords)
        for i in range(len(coords) - 1):
            qx, qy = point_on_segment_m(
                lon, lat, coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1]
            )
            d = haversine_m(lon, lat, qx, qy)
            if best is None or d < best[0]:
                seg_len = cum[i + 1] - cum[i]
                t = segment_fraction(lon, lat, coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1])
                center_d = cum[i] + t * seg_len
                best = (d, coords, center_d)
    if not best or best[0] > OSM_SNAP_MAX_M:
        return None
    _, coords, center_d = best
    cum = cumulative_distances(coords)
    total_len = cum[-1]
    d0 = max(0.0, center_d - half_m)
    d1 = min(total_len, center_d + half_m)
    start = coord_at_dist(coords, cum, d0)
    end = coord_at_dist(coords, cum, d1)
    out: list[list[float]] = [start]
    for i, (x, y) in enumerate(coords):
        if d0 < cum[i] < d1:
            out.append([x, y])
    out.append(end)
    # de-dupe consecutive identical points
    slim: list[list[float]] = []
    for p in out:
        if not slim or p[0] != slim[-1][0] or p[1] != slim[-1][1]:
            slim.append(p)
    if len(slim) < 2:
        return None
    return slim


def main() -> None:
    if not SITES_PATH.exists():
        raise SystemExit(f"Missing {SITES_PATH}")
    sites = load_sites()
    edges = build_monitoring_edges(sites)
    osm = load_osm_lines()

    bg_features = []
    for a, b, _ in edges:
        bg_features.append(
            {
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[a["lon"], a["lat"]], [b["lon"], b["lat"]]],
                },
                "properties": {"layer": "monitoring_network"},
            }
        )
    for coords in osm:
        if len(coords) < 2:
            continue
        step = max(1, len(coords) // 80)  # simplify
        simp = [list(coords[i]) for i in range(0, len(coords), step)]
        if simp[-1] != list(coords[-1]):
            simp.append(list(coords[-1]))
        bg_features.append(
            {
                "type": "Feature",
                "geometry": {"type": "LineString", "coordinates": simp},
                "properties": {"layer": "osm_waterway"},
            }
        )

    reach_features = []
    for site in sites:
        half_m = reach_half_m_for_site(site, sites)
        props = {k: v for k, v in site.items() if k not in ("lon", "lat")}
        props["reach_half_m"] = round(half_m, 1)
        coords = None
        if osm:
            coords = extract_osm_reach(site["lon"], site["lat"], osm, half_m)
        if coords is None:
            nb = fix_pick_neighbor(site, edges) or nearest_site(site, sites)
            if nb:
                reach_features.append(reach_along_edge(site, nb, props, half_m))
            continue
        reach_features.append(
            {
                "type": "Feature",
                "geometry": {"type": "LineString", "coordinates": coords},
                "properties": props,
            }
        )

    stale_paint_order = {"stale": 0, "aging": 1, "fresh": 2, "unknown": 3}
    reach_features.sort(
        key=lambda f: stale_paint_order.get(f["properties"].get("staleness"), 9)
    )

    OUT_BG.parent.mkdir(parents=True, exist_ok=True)
    OUT_BG.write_text(
        json.dumps({"type": "FeatureCollection", "features": bg_features}),
        encoding="utf-8",
    )
    OUT_REACHES.write_text(
        json.dumps(
            {
                "type": "FeatureCollection",
                "metadata": {
                    "reach_half_min_m": REACH_HALF_MIN_M,
                    "reach_half_max_m": REACH_HALF_MAX_M,
                    "reach_neighbor_share": REACH_NEIGHBOR_SHARE,
                    "osm_ways": len(osm),
                    "monitoring_edges": len(edges),
                },
                "features": reach_features,
            }
        ),
        encoding="utf-8",
    )
    print(f"Background: {len(bg_features)} features → {OUT_BG}")
    print(f"Reaches: {len(reach_features)} → {OUT_REACHES} (OSM ways: {len(osm)})")


if __name__ == "__main__":
    main()