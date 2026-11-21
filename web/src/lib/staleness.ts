export type Staleness = "fresh" | "aging" | "stale" | "unknown";
/** Display status. "rod" overrides recency while a camera rod is recording. */
export type Status = "fresh" | "aging" | "stale" | "rod";

export const statusOf = (s: Staleness, rodActive = false): Status =>
  rodActive ? "rod" : s === "unknown" ? "stale" : s;

export const STATUS_WORD: Record<Status, string> = { fresh: "Fresh", aging: "Ageing", stale: "Stale", rod: "Rod" };

/** "13 years", "4 months", "3 weeks" (pill text). */
export function ageLabel(days: number | null): string {
  if (days == null || Number.isNaN(days)) return "never sampled";
  if (days < 60) return `${Math.max(1, Math.round(days / 7))} weeks`;
  if (days < 365) return `${Math.round(days / 30.4)} months`;
  const y = Math.floor(days / 365.25);
  return `${y} year${y === 1 ? "" : "s"}`;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

