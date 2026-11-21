import { STATUS, type Status } from '../map/mapStyle';
import { FAMILIES } from '../data/demo';
import { OrderSilhouette } from './OrderSilhouette';
import { Icon } from './Icon';

/** Status glyph: circle (rod: rounded square) + check / half / ! / rod. Never colour alone. */
export function StatusGlyph({ status, size = 18, ring = true }: { status: Status; size?: number; ring?: boolean }) {
  const { fill } = STATUS[status];
  const ringProps = ring ? { stroke: 'var(--paper-raised)', strokeWidth: 2.4 } : {};
  return (
    <svg aria-hidden width={size} height={size} viewBox="-10.5 -10.5 21 21" style={{ flex: 'none', display: 'block' }}>
      {status === 'rod' ? <rect x={-8.5} y={-8.5} width={17} height={17} rx={5} fill={fill} {...ringProps} /> : <circle r={8.5} fill={fill} {...ringProps} />}
      {status === 'fresh' && <path d="M-3.4,.2 L-1,2.6 L3.6,-2.4" fill="none" stroke="#fff" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />}
      {status === 'ageing' && <><path d="M0,-4 A4,4 0 0 0 0,4 Z" fill="var(--ink)" /><circle r={4} fill="none" stroke="var(--ink)" strokeWidth={1.4} /></>}
      {status === 'stale' && <><path d="M0,-4.2 L0,1" stroke="#fff" strokeWidth={2.1} strokeLinecap="round" /><circle cy={3.6} r={1.2} fill="#fff" /></>}
      {status === 'rod' && <><path d="M0,-5 L0,5" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" /><circle cx={3.2} cy={-2.6} r={1.1} fill="#fff" /><circle cx={3.8} cy={0.8} r={0.9} fill="#fff" /></>}
    </svg>
  );
}

const STATUS_WORD: Record<Status, string> = { fresh: 'Fresh', ageing: 'Ageing', stale: 'Stale', rod: 'Rod' };

/** "Stale · 13 years" */
export function StatusPill({ status, age }: { status: Status; age: string }) {
  return (
    <span className={`pill pill--${status}`}>
      <StatusGlyph status={status} size={16} ring={false} />
      {STATUS_WORD[status]} · {age}
    </span>
  );
}

/** Legend swatch: the band as drawn on the map (fill + hatch / stitch). */
export function BandSwatch({ status }: { status: Status | 'none' }) {
  return <span aria-hidden className={`band band--${status}`} />;
}

export function PresenceDots({ seq }: { seq: number[] }) {
  const n = seq.filter(Boolean).length;
  return (
    <span className="dots" role="img" aria-label={`Found in ${n} of last ${seq.length} visits`}>
      {seq.map((v, i) => <span key={i} className={v ? 'dot dot--on' : 'dot'} />)}
    </span>
  );
}

export function TrendArrow({ trend }: { trend: 'up' | 'flat' | 'down' }) {
  const m = { up: ['arrow-up', 'Increasing', 'trend--up'], flat: ['arrow-right', 'Stable', 'trend--flat'], down: ['arrow-down', 'Decreasing', 'trend--down'] } as const;
  const [icon, label, cls] = m[trend];
  return <span className={`trend ${cls}`}><Icon name={icon} size={14} strokeWidth={2.2} />{label}</span>;
}

/** Plain SVG sparkline: polyline + faint area + end dot. */
export function Sparkline({ values, years, width = 180, height = 40 }: { values: number[]; years: number[]; width?: number; height?: number }) {
  const lo = Math.min(...values), hi = Math.max(...values), pad = 4;
  const pts = values.map((v, i) => [pad + (i * (width - 2 * pad)) / Math.max(1, values.length - 1), height - pad - ((v - lo) / (hi - lo || 1)) * (height - 2 * pad)]);
  const line = pts.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ');
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg role="img" aria-label={`From ${values[0]} in ${years[0]} to ${values[values.length - 1]} in ${years[years.length - 1]}`} width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <polygon points={`${pad},${height} ${line} ${width - pad},${height}`} fill="var(--river-700)" opacity={0.08} />
      <polyline points={line} fill="none" stroke="var(--river-700)" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r={3.2} fill="var(--river-700)" stroke="var(--paper-raised)" strokeWidth={1.5} />
    </svg>
  );
}

/** Family illustration, or its order silhouette when no art exists. Never a grey placeholder. */
export function FamilyArt({ slug, size = 48, faint = false, tile = true }: { slug: string; size?: number; faint?: boolean; tile?: boolean }) {
  const f = FAMILIES[slug];
  const inner = f?.hasArt
    ? faint
      ? <img src={`/art/family-silhouettes/${slug}.svg`} alt="" width={size - 4} height={size - 4} style={{ opacity: 0.28 }} />
      : <img src={`/art/families/${slug}.svg`} alt={`${f.common} illustration`} width={size - 4} height={size - 4} />
    : <OrderSilhouette order={f?.order ?? 'worm'} size={size - 6} title={f ? `${f.common} (${f.order} silhouette)` : undefined} />;
  return tile ? <span className="art-tile" style={{ width: size, height: size }}>{inner}</span> : inner;
}

export function SensitivityBadge({ s }: { s: 'EPT' | 'Sensitive' | 'Tolerant' | null }) {
  if (!s) return null;
  return <span className={`sens sens--${s.toLowerCase()}`}>{s}</span>;
}
