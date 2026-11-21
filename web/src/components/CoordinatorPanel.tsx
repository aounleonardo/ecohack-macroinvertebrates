import { useMemo, useState } from "react";
import type { SitesFeatureCollection } from "../lib/data";
import { ROD_DEMO_SITE, rodWeek } from "../lib/rodDemo";
import { formatSiteName } from "../lib/siteName";
import { STATUS } from "../map/mapStyle";
import { CATCHMENTS } from "./AppHeader";
import { BandSwatch } from "./atoms";
import { Icon } from "./Icon";

type Props = {
  sites: SitesFeatureCollection;
  catchment: string;
  onSelect: (siteId: string) => void;
  onToast: (msg: string) => void;
  /** opens the detection result for a volunteer's upload, in coordinator review mode */
  onReview: (siteId: string, who: string) => void;
};

/* MOCK volunteer activity. Coverage numbers and priority sites are real (NRW KiEco). */
const VOLUNTEERS = ["Ffion", "Rhys", "Cerys", "Owain", "Megan", "Tom"];
const UPLOADS = [
  { site: "K7b34c0ca", who: "Rhys", ago: "2 h ago", families: 6, check: 1 },
  { site: "Kc0ba299c", who: "Cerys", ago: "yesterday", families: 9, check: 0 },
  { site: "Kfb7dad8d", who: "Owain", ago: "2 days ago", families: 4, check: 2 },
];
type Assignment = { site: string; who: string; due: string; state: "Assigned" | "Kit collected" | "Overdue" };
const SEED_ASSIGNMENTS: Assignment[] = [
  { site: "Ke5ad7c1a", who: "Megan", due: "28 Nov", state: "Kit collected" },
  { site: "K6550766f", who: "Tom", due: "19 Nov", state: "Overdue" },
];

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

function coverage(sites: SitesFeatureCollection, catchment: string) {
  const fs = sites.features.filter((f) => f.properties.catchment === catchment);
  const c = { fresh: 0, aging: 0, stale: 0, total: fs.length };
  for (const f of fs) c[f.properties.staleness === "fresh" ? "fresh" : f.properties.staleness === "aging" ? "aging" : "stale"]++;
  return c;
}

function Stack({ c, height = 14 }: { c: ReturnType<typeof coverage>; height?: number }) {
  return (
    <span className="stack-bar" style={{ height }} aria-hidden>
      <span className="band--fresh" style={{ width: `${pct(c.fresh, c.total)}%` }} />
      <span className="band--aging" style={{ width: `${pct(c.aging, c.total)}%` }} />
      <span className="band--stale" style={{ width: `${100 - pct(c.fresh, c.total) - pct(c.aging, c.total)}%` }} />
    </span>
  );
}

/** What a catchment coordinator sees: coverage, live rods, uploads to confirm, who's going where. */
export function CoordinatorPanel({ sites, catchment, onSelect, onToast, onReview }: Props) {
  const [assignments, setAssignments] = useState<Assignment[]>(SEED_ASSIGNMENTS);
  const [pick, setPick] = useState<Record<string, string>>({});
  const byId = useMemo(() => new Map(sites.features.map((f) => [f.properties.site_id, f.properties])), [sites]);
  const name = (id: string) => formatSiteName(byId.get(id)?.site_name ?? id);
  const c = coverage(sites, catchment);
  const label = CATCHMENTS.find((x) => x.value === catchment)?.label ?? catchment;
  const rod = rodWeek();

  // Real: longest-unsampled sites with a good baseline (many families recorded), not already assigned
  const taken = new Set(assignments.map((a) => a.site));
  const priority = sites.features
    .map((f) => f.properties)
    .filter((p) => p.catchment === catchment && p.staleness === "stale" && p.n_surveys >= 3 && !taken.has(p.site_id) && p.site_id !== ROD_DEMO_SITE)
    .sort((a, b) => (b.days_since_sample ?? 0) * Math.log(2 + (b.n_families ?? 0)) - (a.days_since_sample ?? 0) * Math.log(2 + (a.n_families ?? 0)))
    .slice(0, 5);

  const assign = (site: string) => {
    const who = pick[site] ?? VOLUNTEERS[0];
    const due = new Date(Date.now() + 14 * 86400000).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    setAssignments([{ site, who, due, state: "Assigned" }, ...assignments]);
    onToast(`${name(site)} assigned to ${who}, due ${due}`);
  };

  return (
    <aside className="sidebar coord" aria-label="Coordinator overview">
      <div className="sidebar__scroll">
        <div className="stack-4">
          <p className="overline overline--river">Coordinator</p>
          <h1 className="site-header__name">{label} coverage</h1>
          <p className="site-header__sub">{c.total} NRW monitoring sites in this catchment</p>
        </div>

        <section className="card card--tight">
          <div className="coord-hero">
            <span className="coord-hero__pct">{pct(c.stale, c.total)}%</span>
            <span className="body-2">of sites are red: last sampled {STATUS.stale.label.toLowerCase()}. Only {c.fresh} {c.fresh === 1 ? "is" : "are"} fresh ({STATUS.fresh.label.toLowerCase()}).</span>
          </div>
          <Stack c={c} />
          <ul className="coord-legend">
            <li><BandSwatch status="fresh" />{STATUS.fresh.label} <strong>{c.fresh}</strong></li>
            <li><BandSwatch status="aging" />{STATUS.aging.label} <strong>{c.aging}</strong></li>
            <li><BandSwatch status="stale" />{STATUS.stale.label} <strong>{c.stale}</strong></li>
          </ul>
          <div className="coord-wales">
            <p className="overline">Across the three catchments</p>
            {CATCHMENTS.map((k) => {
              const cc = coverage(sites, k.value);
              return (
                <div key={k.value} className={k.value === catchment ? "coord-wales__row current" : "coord-wales__row"}>
                  <span>{k.label}</span><Stack c={cc} height={8} /><span className="tabular">{pct(cc.stale, cc.total)}% overdue</span>
                </div>
              );
            })}
          </div>
        </section>

        <div className="stat-tiles">
          <div className="stat-tile"><span className="stat-tile__v">6</span><span className="stat-tile__l">volunteers active this month</span></div>
          <div className="stat-tile"><span className="stat-tile__v">3</span><span className="stat-tile__l">uploads waiting for you</span></div>
          <div className="stat-tile"><span className="stat-tile__v">1</span><span className="stat-tile__l">camera rod recording</span></div>
        </div>

        <section className="card card--tight">
          <h2 className="h-display-s">Live camera rods</h2>
          <button type="button" className="coord-item" onClick={() => onSelect(ROD_DEMO_SITE)}>
            <span className="coord-item__icon coord-item__icon--rod"><Icon name="rod" size={18} /></span>
            <span className="names"><span className="names__common">{name(ROD_DEMO_SITE)}</span><span className="caption">Day {rod.day} of 7 · {rod.bursts.length} bursts · installed by {rod.installedBy}</span></span>
            <Icon name="chev-right" size={18} />
          </button>
        </section>

        <section className="card card--tight">
          <div className="row-between"><h2 className="h-display-s">Uploads to confirm</h2><span className="caption">Pilot classifier</span></div>
          <ul className="coord-list">
            {UPLOADS.filter((u) => byId.has(u.site)).map((u) => (
              <li key={u.site} className="coord-item">
                <img className="coord-item__thumb" src="/demo/darwinflow-demo-tray.jpg" alt="" />
                <span className="names"><span className="names__common">{name(u.site)}</span><span className="caption">{u.who} · {u.ago} · {u.families} families{u.check ? ` · ${u.check} to check` : ""}</span></span>
                <button type="button" className="btn btn--secondary btn--sm" onClick={() => onReview(u.site, u.who)}>Review</button>
              </li>
            ))}
          </ul>
        </section>

        <section className="card card--tight">
          <div className="stack-4"><h2 className="h-display-s">Red sites to assign</h2><p className="caption">Longest unsampled with a good baseline (3+ surveys), weighted by how many families were found.</p></div>
          <ul className="coord-list">
            {priority.map((p) => (
              <li key={p.site_id} className="coord-item coord-item--assign">
                <button type="button" className="coord-item__main" onClick={() => onSelect(p.site_id)}>
                  <span className="coord-item__icon coord-item__icon--stale"><Icon name="pin" size={16} /></span>
                  <span className="names"><span className="names__common">{formatSiteName(p.site_name)}</span>
                    <span className="caption">{Math.floor((p.days_since_sample ?? 0) / 365.25)} years since last sample · {p.n_families ?? "?"} families · {p.n_surveys} surveys</span></span>
                </button>
                <span className="coord-assign">
                  <select aria-label={`Volunteer for ${formatSiteName(p.site_name)}`} value={pick[p.site_id] ?? VOLUNTEERS[0]} onChange={(e) => setPick({ ...pick, [p.site_id]: e.target.value })}>
                    {VOLUNTEERS.map((v) => <option key={v}>{v}</option>)}
                  </select>
                  <button type="button" className="btn btn--primary btn--sm" onClick={() => assign(p.site_id)}>Assign</button>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card card--tight">
          <h2 className="h-display-s">Assignments</h2>
          <ul className="coord-list">
            {assignments.filter((a) => byId.has(a.site)).map((a) => (
              <li key={a.site} className="coord-item">
                <span className="coord-avatar" aria-hidden>{a.who[0]}</span>
                <span className="names"><span className="names__common">{name(a.site)}</span><span className="caption">{a.who} · due {a.due}</span></span>
                <span className={`state state--${a.state.replace(" ", "-").toLowerCase()}`}>{a.state}</span>
              </li>
            ))}
          </ul>
        </section>
        <p className="caption">Volunteer names, uploads and assignments are demo data. Coverage and red sites come from the NRW KiEco survey data.</p>
      </div>
    </aside>
  );
}
