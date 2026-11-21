import { STATUS } from "../map/mapStyle";
import { hasArt, orderOf, slugOf, type Sensitivity } from "../lib/families";
import { STATUS_WORD, type Status } from "../lib/staleness";
import { Icon } from "./Icon";
import { OrderSilhouette } from "./OrderSilhouette";

/** Status glyph: circle (rod: rounded square) + check / half / ! / rod. Never colour alone. */
export function StatusGlyph({ status, size = 18, ring = true }: { status: Status; size?: number; ring?: boolean }) {
  const { fill } = STATUS[status];
  const ringProps = ring ? { stroke: "var(--paper-raised)", strokeWidth: 2.4 } : {};
  return (
    <svg aria-hidden width={size} height={size} viewBox="-10.5 -10.5 21 21" style={{ flex: "none", display: "block" }}>
      {status === "rod" ? <rect x={-8.5} y={-8.5} width={17} height={17} rx={5} fill={fill} {...ringProps} /> : <circle r={8.5} fill={fill} {...ringProps} />}
      {status === "fresh" && <path d="M-3.4,.2 L-1,2.6 L3.6,-2.4" fill="none" stroke="#fff" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />}
      {status === "aging" && <><path d="M0,-4 A4,4 0 0 0 0,4 Z" fill="var(--ink)" /><circle r={4} fill="none" stroke="var(--ink)" strokeWidth={1.4} /></>}
      {status === "stale" && <><path d="M0,-4.2 L0,1" stroke="#fff" strokeWidth={2.1} strokeLinecap="round" /><circle cy={3.6} r={1.2} fill="#fff" /></>}
      {status === "rod" && <><path d="M0,-5 L0,5" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" /><circle cx={3.2} cy={-2.6} r={1.1} fill="#fff" /><circle cx={3.8} cy={0.8} r={0.9} fill="#fff" /></>}
    </svg>
  );
}

/** "Stale · 13 years" */
export function StatusPill({ status, age }: { status: Status; age: string }) {
  return (
    <span className={`pill pill--${status}`}>
      <StatusGlyph status={status} size={16} ring={false} />
      {STATUS_WORD[status]} · {age}
    </span>
  );
}

/** Legend swatch: the band as drawn on the map. */
export function BandSwatch({ status }: { status: Status | "none" }) {
  return <span aria-hidden className={`band band--${status}`} />;
}

export function PresenceDots({ seq }: { seq: boolean[] }) {
  const n = seq.filter(Boolean).length;
  return (
    <span className="dots" role="img" aria-label={`Found in ${n} of the last ${seq.length} surveys`}>
      {seq.map((v, i) => <span key={i} className={v ? "dot dot--on" : "dot"} />)}
    </span>
  );
}

export type Trend = "increasing" | "declining" | "stable" | "unknown";
export function TrendArrow({ trend }: { trend: Trend }) {
  const m = {
    increasing: ["arrow-up", "Increasing", "trend--up"],
    declining: ["arrow-down", "Decreasing", "trend--down"],
    stable: ["arrow-right", "Stable", "trend--flat"],
    unknown: ["arrow-right", "Unclear", "trend--flat"],
  } as const;
  const [icon, label, cls] = m[trend] ?? m.unknown;
  return <span className={`trend ${cls}`}><Icon name={icon} size={14} strokeWidth={2.2} />{label}</span>;
}

/** Plain SVG sparkline: polyline + faint area + end dot. */
export function Sparkline({ values, width = 180, height = 40, label }: { values: number[]; width?: number; height?: number; label: string }) {
  if (values.length < 2) return <span className="caption">One survey only</span>;
  const lo = Math.min(...values), hi = Math.max(...values), pad = 4;
  const pts = values.map((v, i) => [pad + (i * (width - 2 * pad)) / (values.length - 1), height - pad - ((v - lo) / (hi - lo || 1)) * (height - 2 * pad)]);
  const line = pts.map((p) => p.map((n) => n.toFixed(1)).join(",")).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg role="img" aria-label={label} width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block", maxWidth: "100%" }}>
      <polygon points={`${pad},${height} ${line} ${width - pad},${height}`} fill="var(--river-700)" opacity={0.08} />
      <polyline points={line} fill="none" stroke="var(--river-700)" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r={3.2} fill="var(--river-700)" stroke="var(--paper-raised)" strokeWidth={1.5} />
    </svg>
  );
}

/** Family illustration, or its order silhouette when no plate exists. Never a grey placeholder. */
export function FamilyArt({ family, size = 48, faint = false, tile = true, label }: { family: string; size?: number; faint?: boolean; tile?: boolean; label?: string }) {
  const slug = slugOf(family);
  const inner = hasArt(family)
    ? faint
      ? <img src={`/art/family-silhouettes/${slug}.svg`} alt="" width={size - 4} height={size - 4} style={{ opacity: 0.28 }} />
      : <img src={`/art/families/${slug}.svg`} alt={label ? `${label} illustration` : ""} width={size - 4} height={size - 4} />
    : <OrderSilhouette order={orderOf(family)} size={size - 6} title={label ? `${label} (${orderOf(family)} silhouette)` : undefined} />;
  return tile ? <span className="art-tile" style={{ width: size, height: size }}>{inner}</span> : inner;
}

export function SensitivityBadge({ s }: { s: Sensitivity }) {
  if (!s) return null;
  return <span className={`sens sens--${s.toLowerCase()}`}>{s}</span>;
}
