/**
 * DarwinFlow map style. Every status style is data-driven from feature properties.
 *
 * Sources (from the ETL in web/public/data):
 *   rivers-bg  wales_rivers_background.geojson (thin, quiet background rivers)
 *   reaches    river_reaches.geojson  LineStrings, props { site_id, catchment, staleness, rod_active? }
 *   sites      sites.geojson          Points,      props { site_id, catchment, staleness, ... }, promoteId site_id
 * staleness: fresh | aging | stale | unknown. A truthy `rod_active` turns a reach/site into "rod".
 */
import type { ExpressionSpecification, FilterSpecification, LayerSpecification, Map as MlMap, StyleSpecification } from "maplibre-gl";
import type { Status } from "../lib/staleness";

export const BASEMAP_URL = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

export const STATUS: Record<Status, { fill: string; dark: string; tint: string; text: string; label: string }> = {
  fresh: { fill: "#2C6E43", dark: "#1D4D2E", tint: "#E2EEE4", text: "#1F5432", label: "Within 2 years" },
  aging: { fill: "#E5A93A", dark: "#9A6510", tint: "#FBEFD5", text: "#7A4E0B", label: "2–5 years ago" },
  stale: { fill: "#E06A4E", dark: "#9A3220", tint: "#FBE5DD", text: "#9A3220", label: "Over 5 years ago" },
  rod: { fill: "#1B5E66", dark: "#0E3B43", tint: "#E3EFEC", text: "#0E3B43", label: "Camera rod, recording now" },
};

export const MAP_COLORS = {
  land: "#F2EEE5", water: "#DAE7E6", river: "#7FAAB2", riverLabel: "#3D7C82", casing: "#F7F3EA", ink: "#1F2A2C",
};

/** status = rod_active ? 'rod' : staleness ('unknown' drawn as stale) */
const statusExpr = ["case", ["boolean", ["get", "rod_active"], false], "rod",
  ["match", ["get", "staleness"], "fresh", "fresh", "aging", "aging", "stale"]] as unknown as ExpressionSpecification;

const byStatus = (key: "fill" | "dark") =>
  ["match", statusExpr, "fresh", STATUS.fresh[key], "aging", STATUS.aging[key], "rod", STATUS.rod[key], STATUS.stale[key]] as unknown as ExpressionSpecification;

const z = (...stops: number[]) => ["interpolate", ["linear"], ["zoom"], ...stops] as unknown as ExpressionSpecification;

/** Layer-specific filters (combined with the catchment filter in applyCatchment). */
const BASE_FILTER: Record<string, FilterSpecification | null> = {
  "reach-casing": null, "reach-edge": null, "reach-fill": null, "reach-hit": null, "site-halo": null, sites: null,
  "reach-pattern": ["in", statusExpr, ["literal", ["aging", "stale"]]] as unknown as FilterSpecification,
  "reach-rod-stitch": ["==", statusExpr, "rod"] as unknown as FilterSpecification,
  "site-selected": ["==", ["get", "site_id"], "__none__"] as unknown as FilterSpecification,
};

export const riverBackgroundLayer: LayerSpecification = {
  id: "rivers-background", type: "line", source: "rivers-bg",
  layout: { "line-cap": "round", "line-join": "round" },
  paint: { "line-color": MAP_COLORS.river, "line-opacity": 0.75, "line-width": z(8, 0.5, 11, 1, 14, 1.6, 17, 3) },
};

/** Reach + site layers, bottom to top. */
export const overlayLayers: LayerSpecification[] = [
  { id: "reach-casing", type: "line", source: "reaches", layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": MAP_COLORS.casing, "line-opacity": 0.95, "line-width": z(8, 4, 12, 15, 15, 21) } },
  { id: "reach-edge", type: "line", source: "reaches", layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": byStatus("dark"), "line-width": z(8, 3, 12, 11, 15, 16) } },
  { id: "reach-fill", type: "line", source: "reaches", layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": byStatus("fill"), "line-width": z(8, 2.2, 12, 9, 15, 13) } },
  // Hatching = colourblind redundancy; density rises with staleness.
  { id: "reach-pattern", type: "line", source: "reaches", filter: BASE_FILTER["reach-pattern"]!, minzoom: 10,
    layout: { "line-cap": "butt", "line-join": "round" },
    paint: { "line-pattern": ["match", statusExpr, "aging", "hatch-diag", "hatch-cross"] as unknown as ExpressionSpecification, "line-width": z(10, 5, 12, 9, 15, 13) } },
  { id: "reach-rod-stitch", type: "line", source: "reaches", filter: BASE_FILTER["reach-rod-stitch"]!, layout: { "line-cap": "round" },
    paint: { "line-color": MAP_COLORS.casing, "line-width": z(9, 1, 15, 2.4), "line-dasharray": [3, 2.5] } },
  // Invisible wide hit target for clicks on reaches
  { id: "reach-hit", type: "line", source: "reaches", paint: { "line-width": 20, "line-opacity": 0 } },
  { id: "site-halo", type: "circle", source: "sites",
    paint: { "circle-radius": 22, "circle-color": byStatus("fill"),
      "circle-opacity": ["case", ["boolean", ["feature-state", "selected"], false], 0.18, 0] as unknown as ExpressionSpecification } },
  { id: "sites", type: "symbol", source: "sites", minzoom: 9.5,
    layout: { "icon-image": ["concat", "pin-", statusExpr] as unknown as ExpressionSpecification,
      "icon-size": z(9.5, 0.75, 12, 1, 15, 1.15), "icon-allow-overlap": true,
      "symbol-sort-key": ["match", statusExpr, "stale", 4, "aging", 3, "rod", 2, 1] as unknown as ExpressionSpecification } },
  { id: "site-selected", type: "symbol", source: "sites", filter: BASE_FILTER["site-selected"]!,
    layout: { "icon-image": ["concat", "pin-", statusExpr, "-selected"] as unknown as ExpressionSpecification, "icon-allow-overlap": true, "icon-ignore-placement": true } },
];

/** Show only one catchment's reaches and sites (null = all of Wales). */
export function applyCatchment(map: MlMap, catchment: string | null, selectedId: string | null) {
  for (const id of Object.keys(BASE_FILTER)) {
    if (!map.getLayer(id)) continue;
    const base = id === "site-selected" ? (["==", ["get", "site_id"], selectedId ?? "__none__"] as unknown as FilterSpecification) : BASE_FILTER[id];
    const clauses = [base, catchment ? (["==", ["get", "catchment"], catchment] as unknown as FilterSpecification) : null].filter(Boolean) as FilterSpecification[];
    map.setFilter(id, clauses.length === 0 ? null : clauses.length === 1 ? clauses[0] : (["all", ...clauses] as unknown as FilterSpecification));
  }
}

/** Positron, warmed up and quietened. We draw our own rivers, so hide the basemap's waterway lines. */
export function tuneBasemap(style: StyleSpecification): StyleSpecification {
  for (const layer of style.layers) {
    const sl = (layer as { "source-layer"?: string })["source-layer"];
    if (layer.type === "background") layer.paint = { ...layer.paint, "background-color": MAP_COLORS.land };
    if (layer.type === "fill" && sl === "water") layer.paint = { ...layer.paint, "fill-color": MAP_COLORS.water };
    if (layer.type === "line" && sl === "waterway") layer.layout = { ...layer.layout, visibility: "none" };
    if (layer.type === "symbol" && sl === "waterway")
      layer.paint = { ...layer.paint, "text-color": MAP_COLORS.riverLabel, "text-halo-color": MAP_COLORS.land, "text-halo-width": 1.5 };
  }
  return style;
}

export const fallbackStyle = (): StyleSpecification => ({
  version: 8, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": MAP_COLORS.land } }],
});

export const firstSymbolId = (map: MlMap) => map.getStyle().layers.find((l) => l.type === "symbol")?.id;

// ---------------------------------------------------------------- generated images (2x)
const PR = 2;

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w * PR;
  c.height = h * PR;
  const ctx = c.getContext("2d")!;
  ctx.scale(PR, PR);
  return { c, ctx };
}

/** 12px hatch tile on transparent ground; sits over reach-fill. */
export function makeHatch(kind: "diag" | "cross"): ImageData {
  const s = 12;
  const { c, ctx } = canvas(s, s);
  ctx.strokeStyle = kind === "diag" ? STATUS.aging.dark : STATUS.stale.dark;
  ctx.globalAlpha = kind === "diag" ? 0.75 : 0.8;
  ctx.lineWidth = kind === "diag" ? 2 : 1.6;
  const diag = (dir: 1 | -1) => {
    for (let o = -s; o <= s * 2; o += 6) {
      ctx.beginPath();
      if (dir === 1) { ctx.moveTo(o, s); ctx.lineTo(o + s, 0); } else { ctx.moveTo(o, 0); ctx.lineTo(o + s, s); }
      ctx.stroke();
    }
  };
  diag(1);
  if (kind === "cross") diag(-1);
  return ctx.getImageData(0, 0, c.width, c.height);
}

/** Pin: 17px circle (rod: rounded square), 2.4px paper ring, glyph. Selected adds an ink ring. */
export function makePin(status: Status, selected = false): ImageData {
  const size = selected ? 32 : 22;
  const { c, ctx } = canvas(size, size);
  const m = size / 2;
  const r = 8.5;
  if (selected) {
    ctx.beginPath(); ctx.arc(m, m, 14, 0, Math.PI * 2); ctx.fillStyle = MAP_COLORS.ink; ctx.fill();
    ctx.beginPath(); ctx.arc(m, m, 11.5, 0, Math.PI * 2); ctx.fillStyle = MAP_COLORS.casing; ctx.fill();
  }
  ctx.save();
  ctx.translate(m, m);
  if (selected) ctx.scale(1.25, 1.25);
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = MAP_COLORS.casing;
  ctx.fillStyle = STATUS[status].fill;
  ctx.beginPath();
  if (status === "rod") ctx.roundRect(-r, -r, r * 2, r * 2, 5);
  else ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (status === "fresh") {
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.9;
    ctx.beginPath(); ctx.moveTo(-3.4, 0.2); ctx.lineTo(-1, 2.6); ctx.lineTo(3.6, -2.4); ctx.stroke();
  } else if (status === "aging") {
    // dark glyph: white on amber fails 3:1
    ctx.fillStyle = MAP_COLORS.ink; ctx.strokeStyle = MAP_COLORS.ink; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, 0, 4, Math.PI / 2, Math.PI * 1.5); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.stroke();
  } else if (status === "stale") {
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.1;
    ctx.beginPath(); ctx.moveTo(0, -4.2); ctx.lineTo(0, 1); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 3.6, 1.2, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, 5); ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(3.2, -2.6, 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(3.8, 0.8, 0.9, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  return ctx.getImageData(0, 0, c.width, c.height);
}

export function registerImages(map: MlMap) {
  if (!map.hasImage("hatch-diag")) map.addImage("hatch-diag", makeHatch("diag"), { pixelRatio: PR });
  if (!map.hasImage("hatch-cross")) map.addImage("hatch-cross", makeHatch("cross"), { pixelRatio: PR });
  (Object.keys(STATUS) as Status[]).forEach((s) => {
    if (!map.hasImage(`pin-${s}`)) map.addImage(`pin-${s}`, makePin(s), { pixelRatio: PR });
    if (!map.hasImage(`pin-${s}-selected`)) map.addImage(`pin-${s}-selected`, makePin(s, true), { pixelRatio: PR });
  });
}

export const LEGEND: { status: Status | "none"; label: string }[] = [
  { status: "fresh", label: STATUS.fresh.label },
  { status: "aging", label: STATUS.aging.label },
  { status: "stale", label: STATUS.stale.label },
  { status: "rod", label: STATUS.rod.label },
  { status: "none", label: "No sample on record" },
];
