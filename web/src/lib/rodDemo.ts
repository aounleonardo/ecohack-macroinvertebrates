/**
 * MOCK: one week of camera-rod data on a single red site, for the demo.
 * Nothing here is real. Dates are relative to "now", so the deployment always reads
 * "day 6 of 7" whenever the demo runs. Replace with sensor-ingest data when the rod is live.
 */
export const ROD_DEMO_SITE = "K2e95ba1f"; // D/S PENRHIWCEIBER, Cynon: last kick sample Sep 2009

export type Burst = { at: Date; day: number; counts: Record<string, number> };
export type RodWeek = {
  installed: Date;
  collect: Date;
  day: number;
  bursts: Burst[];
  next: Date;
  lastUpload: Date;
  battery: number;
  installedBy: string;
  families: { family: string; perDay: number[]; total: number }[];
};

/** expected animals per burst; Hydropsychidae was not in the 2009 survey */
const RATES: [string, number, number][] = [
  ["Gammaridae", 6.5, 1], ["Chironomidae", 5, 1], ["Baetidae", 4, 1], ["Simuliidae", 2.6, 1],
  ["Hydropsychidae", 1.6, 2], ["Elmidae", 1.1, 1], ["Heptageniidae", 0.9, 3], ["Asellidae", 0.7, 1],
];

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

function poisson(lambda: number, r: () => number) {
  let k = 0, p = 1;
  const L = Math.exp(-lambda);
  do { k++; p *= r(); } while (p > L);
  return k - 1;
}

export function rodWeek(now = new Date()): RodWeek {
  const day0 = new Date(now);
  day0.setHours(0, 0, 0, 0);
  const installed = new Date(day0.getTime() - 5 * 86400000 + (9 * 60 + 40) * 60000); // 5 days ago, 09:40
  const collect = new Date(installed.getTime() + 7 * 86400000);
  const r = rng(20260916);
  const bursts: Burst[] = [];
  for (let d = 0; d < 7; d++) {
    for (const h of [6, 12, 18]) {
      const at = new Date(installed);
      at.setHours(0, 0, 0, 0);
      at.setTime(at.getTime() + d * 86400000 + h * 3600000);
      if (at <= installed || at > now) continue;
      if (d === 3 && h === 12) continue; // a skipped burst: low flow
      const dusk = h === 18 ? 1.35 : h === 6 ? 1.1 : 0.85;
      const counts: Record<string, number> = {};
      for (const [fam, rate, fromDay] of RATES) {
        if (d + 1 < fromDay) continue;
        const n = poisson(rate * dusk, r);
        if (n) counts[fam] = n;
      }
      bursts.push({ at, day: d + 1, counts });
    }
  }
  const families = RATES.map(([family]) => {
    const perDay = Array.from({ length: 7 }, (_, i) => bursts.filter((b) => b.day === i + 1).reduce((n, b) => n + (b.counts[family] ?? 0), 0));
    return { family, perDay, total: perDay.reduce((a, b) => a + b, 0) };
  }).filter((f) => f.total > 0).sort((a, b) => b.total - a.total);
  const next = [6, 12, 18, 30].map((h) => new Date(day0.getTime() + h * 3600000)).find((t) => t > now)!;
  const last = bursts[bursts.length - 1]?.at ?? installed;
  return {
    installed, collect, day: Math.min(7, Math.floor((now.getTime() - installed.getTime()) / 86400000) + 1),
    bursts, next, lastUpload: new Date(last.getTime() + 4 * 60000), battery: 74, installedBy: "Ffion", families,
  };
}

export const hm = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
export const dayName = (d: Date) => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
export function ago(d: Date, now = new Date()) {
  const m = Math.round((now.getTime() - d.getTime()) / 60000);
  return m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`;
}
export function inTime(d: Date, now = new Date()) {
  const m = Math.max(0, Math.round((d.getTime() - now.getTime()) / 60000));
  return m < 60 ? `in ${m} min` : `in ${Math.floor(m / 60)} h ${m % 60} min`;
}
