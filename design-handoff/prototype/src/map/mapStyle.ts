/**
 * Map style spec for MapLibre GL. Everything that encodes status is data-driven
 * from feature properties; nothing is a flat picture.
 *
 * Sources this file expects:
 *   reaches: GeoJSON LineStrings, one per sampled reach. props: { site_id, status }
 *   sites:   GeoJSON Points, one per sample site.      props: { site_id, name, status }
 *            add with { promoteId: 'site_id' } so feature-state works.
 * Background rivers come from the basemap's own `waterway` source-layer, restyled.
 */
import type { LayerSpecification, Map as MlMap, StyleSpecification } from 'maplibre-gl';

export type Status = 'fresh' | 'ageing' | 'stale' | 'rod';

export const BASEMAP_URL = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

export const STATUS: Record<Status, { fill: string; dark: string; tint: string; text: string; label: string }> = {
  fresh: { fill: '#2C6E43', dark: '#1D4D2E', tint: '#E2EEE4', text: '#1F5432', label: 'Sampled within 1 year' },
  ageing: { fill: '#E5A93A', dark: '#9A6510', tint: '#FBEFD5', text: '#7A4E0B', label: '1–3 years ago' },
  stale: { fill: '#E06A4E', dark: '#9A3220', tint: '#FBE5DD', text: '#9A3220', label: 'Over 3 years ago' },
  rod: { fill: '#1B5E66', dark: '#0E3B43', tint: '#E3EFEC', text: '#0E3B43', label: 'Camera rod, recording now' },
};

export const MAP_COLORS = {
  land: '#F2EEE5',
  water: '#DAE7E6',
  river: '#7FAAB2',
  riverLabel: '#3D7C82',
  casing: '#F7F3EA',
  ink: '#1F2A2C',
  road: '#FFFFFF',
  roadCasing: '#DDD5C5',
};

/** Days since last sample -> status. Rod sites override recency while recording. */
export function statusFor(lastSampled: Date, rodActive = false, now = new Date()): Status {
  if (rodActive) return 'rod';
  const years = (now.getTime() - lastSampled.getTime()) / (365.25 * 24 * 3600 * 1000);
  if (years <= 1) return 'fresh';
  if (years <= 3) return 'ageing';
  return 'stale';
}

const byStatus = (key: 'fill' | 'dark') =>
  ['match', ['get', 'status'],
    'fresh', STATUS.fresh[key], 'ageing', STATUS.ageing[key],
    'stale', STATUS.stale[key], 'rod', STATUS.rod[key],
    MAP_COLORS.river] as unknown as string;

const z = (...stops: number[]) => ['interpolate', ['linear'], ['zoom'], ...stops] as unknown as number;

/** Our overlay layers, bottom to top. Insert above the basemap's roads, below its labels. */
export const overlayLayers: LayerSpecification[] = [
  {
    id: 'reach-casing', type: 'line', source: 'reaches',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': MAP_COLORS.casing, 'line-opacity': 0.95, 'line-width': z(9, 7, 12, 15, 15, 21) },
  },
  {
    id: 'reach-edge', type: 'line', source: 'reaches',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': byStatus('dark'), 'line-width': z(9, 5, 12, 11, 15, 16) },
  },
  {
    id: 'reach-fill', type: 'line', source: 'reaches',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': byStatus('fill'), 'line-width': z(9, 4, 12, 9, 15, 13) },
  },
  {
    // Hatching for colourblind redundancy: density rises with staleness.
    id: 'reach-pattern', type: 'line', source: 'reaches',
    filter: ['in', ['get', 'status'], ['literal', ['ageing', 'stale']]],
    layout: { 'line-cap': 'butt', 'line-join': 'round' },
    paint: {
      'line-pattern': ['match', ['get', 'status'], 'ageing', 'hatch-diag', 'stale', 'hatch-cross', 'hatch-diag'] as unknown as string,
      'line-width': z(9, 4, 12, 9, 15, 13),
    },
  },
  {
    id: 'reach-rod-stitch', type: 'line', source: 'reaches',
    filter: ['==', ['get', 'status'], 'rod'],
    layout: { 'line-cap': 'round' },
    paint: { 'line-color': MAP_COLORS.casing, 'line-width': z(9, 1, 15, 2.4), 'line-dasharray': [3, 2.5] },
  },
  {
    id: 'site-halo', type: 'circle', source: 'sites',
    paint: {
      'circle-radius': 22,
      'circle-color': byStatus('fill'),
      'circle-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 0.18, 0] as unknown as number,
    },
  },
  {
    id: 'sites', type: 'symbol', source: 'sites',
    layout: {
      'icon-image': ['concat', 'pin-', ['get', 'status']] as unknown as string,
      'icon-size': z(8, 0.7, 12, 1, 15, 1.15),
      'icon-allow-overlap': true,
      // stale on top so overdue sites are never hidden
      'symbol-sort-key': ['match', ['get', 'status'], 'stale', 4, 'ageing', 3, 'rod', 2, 1] as unknown as number,
    },
  },
  {
    id: 'site-selected', type: 'symbol', source: 'sites',
    filter: ['==', ['get', 'site_id'], '__none__'],
    layout: { 'icon-image': ['concat', 'pin-', ['get', 'status'], '-selected'] as unknown as string, 'icon-allow-overlap': true },
  },
];

/** Restyle CARTO Positron so it recedes: warm land, pale water, thin teal rivers. */
export function tuneBasemap(style: StyleSpecification): StyleSpecification {
  for (const layer of style.layers) {
    const sl = (layer as { 'source-layer'?: string })['source-layer'];
    if (layer.type === 'background') layer.paint = { ...layer.paint, 'background-color': MAP_COLORS.land };
    if (layer.type === 'fill' && sl === 'water') layer.paint = { ...layer.paint, 'fill-color': MAP_COLORS.water };
    if (layer.type === 'line' && sl === 'waterway') {
      layer.paint = {
        ...layer.paint,
        'line-color': MAP_COLORS.river,
        'line-opacity': 0.75,
        'line-width': ['*', ['match', ['get', 'class'], 'river', 1.8, 1],
          ['interpolate', ['linear'], ['zoom'], 8, 0.5, 11, 1, 14, 1.6, 17, 3]] as unknown as number,
      };
    }
    if (layer.type === 'symbol' && sl === 'waterway') {
      layer.paint = { ...layer.paint, 'text-color': MAP_COLORS.riverLabel, 'text-halo-color': MAP_COLORS.land, 'text-halo-width': 1.5 };
    }
  }
  return style;
}

/** First basemap symbol layer id, so overlays go under labels. */
export function firstSymbolId(map: MlMap): string | undefined {
  return map.getStyle().layers.find((l) => l.type === 'symbol')?.id;
}

// ---------------------------------------------------------------- generated images
const PR = 2; // pixel ratio for crisp images

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w * PR; c.height = h * PR;
  const ctx = c.getContext('2d')!;
  ctx.scale(PR, PR);
  return { c, ctx };
}

/** 12px hatch tile, transparent ground (sits over reach-fill). */
export function makeHatch(kind: 'diag' | 'cross'): ImageData {
  const s = 12;
  const { c, ctx } = canvas(s, s);
  const col = kind === 'diag' ? STATUS.ageing.dark : STATUS.stale.dark;
  ctx.strokeStyle = col;
  ctx.globalAlpha = kind === 'diag' ? 0.75 : 0.8;
  ctx.lineWidth = kind === 'diag' ? 2 : 1.6;
  const diag = (dir: 1 | -1) => {
    for (let o = -s; o <= s * 2; o += 6) {
      ctx.beginPath();
      if (dir === 1) { ctx.moveTo(o, s); ctx.lineTo(o + s, 0); } else { ctx.moveTo(o, 0); ctx.lineTo(o + s, s); }
      ctx.stroke();
    }
  };
  diag(1);
  if (kind === 'cross') diag(-1);
  return ctx.getImageData(0, 0, c.width, c.height);
}

/** Pin image: 21px circle (rod: rounded square) with paper ring and glyph. */
export function makePin(status: Status, selected = false): ImageData {
  const size = selected ? 32 : 22;
  const { c, ctx } = canvas(size, size);
  const m = size / 2;
  const r = 8.5;
  const { fill } = STATUS[status];
  if (selected) {
    ctx.beginPath(); ctx.arc(m, m, 14, 0, Math.PI * 2); ctx.fillStyle = MAP_COLORS.ink; ctx.fill();
    ctx.beginPath(); ctx.arc(m, m, 11.5, 0, Math.PI * 2); ctx.fillStyle = MAP_COLORS.casing; ctx.fill();
  }
  ctx.save();
  ctx.translate(m, m);
  if (selected) ctx.scale(1.25, 1.25);
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = MAP_COLORS.casing;
  ctx.fillStyle = fill;
  ctx.beginPath();
  if (status === 'rod') ctx.roundRect(-r, -r, r * 2, r * 2, 5); else ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  // glyph
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (status === 'fresh') {
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.9;
    ctx.beginPath(); ctx.moveTo(-3.4, 0.2); ctx.lineTo(-1, 2.6); ctx.lineTo(3.6, -2.4); ctx.stroke();
  } else if (status === 'ageing') {
    ctx.fillStyle = MAP_COLORS.ink; ctx.strokeStyle = MAP_COLORS.ink; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, 0, 4, Math.PI / 2, Math.PI * 1.5); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.stroke();
  } else if (status === 'stale') {
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.1;
    ctx.beginPath(); ctx.moveTo(0, -4.2); ctx.lineTo(0, 1); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 3.6, 1.2, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, 5); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(3.2, -2.6, 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(3.8, 0.8, 0.9, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  return ctx.getImageData(0, 0, c.width, c.height);
}

export function registerImages(map: MlMap) {
  if (!map.hasImage('hatch-diag')) map.addImage('hatch-diag', makeHatch('diag'), { pixelRatio: PR });
  if (!map.hasImage('hatch-cross')) map.addImage('hatch-cross', makeHatch('cross'), { pixelRatio: PR });
  (Object.keys(STATUS) as Status[]).forEach((s) => {
    if (!map.hasImage(`pin-${s}`)) map.addImage(`pin-${s}`, makePin(s), { pixelRatio: PR });
    if (!map.hasImage(`pin-${s}-selected`)) map.addImage(`pin-${s}-selected`, makePin(s, true), { pixelRatio: PR });
  });
}

export const LEGEND: { status: Status | 'none'; label: string }[] = [
  { status: 'fresh', label: STATUS.fresh.label },
  { status: 'ageing', label: STATUS.ageing.label },
  { status: 'stale', label: STATUS.stale.label },
  { status: 'rod', label: STATUS.rod.label },
  { status: 'none', label: 'No sample on record' },
];
