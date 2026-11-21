import { useEffect, useMemo, useState } from "react";
import type { SiteProperties } from "../lib/data";
import { commonName, dexFirst, isDexFamily, isInvertebrate } from "../lib/families";
import { formatSiteName } from "../lib/siteName";
import type { SiteSeries } from "../lib/series";
import { statusOf } from "../lib/staleness";
import { loadSiteTaxa, type SiteFamilyCard, type TaxonCatalogEntry } from "../lib/taxa";
import type { Profile } from "./AppHeader";
import { Sparkline } from "./atoms";
import { FamilyCard, FamilyChip, FamilyRow } from "./Families";
import { Icon } from "./Icon";
import { InstructionCard } from "./InstructionCard";
import { RodDeploymentCard } from "./RodDeploymentCard";
import { SiteHeader } from "./SiteHeader";
import { TaxonModal } from "./TaxonModal";
import { WaterQualityPanel } from "./WaterQualityPanel";

type Props = {
  site: SiteProperties;
  profile: Profile;
  catalog: Map<string, TaxonCatalogEntry> | null;
  series: SiteSeries | undefined;
  dex: Set<string>;
  onClose: () => void;
  onUpload: () => void;
  onToast: (msg: string) => void;
};

/**
 * Variants (derived):
 *   stale-kick  stale|ageing + Kick kit (Coordinator uses this too, for now)
 *   stale-rod   stale|ageing + Has rod
 *   fresh       sampled within 2 years
 * Overdue sites lead with the task; history comes second.
 */
export function SiteSidebar({ site, profile, catalog, series, dex, onClose, onUpload, onToast }: Props) {
  const [families, setFamilies] = useState<SiteFamilyCard[] | null>(null);
  const [open, setOpen] = useState<SiteFamilyCard | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFamilies(null);
    setShowAll(false);
    setHistoryOpen(false);
    loadSiteTaxa(site.site_id).then((d) => !cancelled && setFamilies(d.families)).catch(() => !cancelled && setFamilies([]));
    return () => { cancelled = true; };
  }, [site.site_id]);

  const status = statusOf(site.staleness);
  const overdue = status === "stale" || status === "aging";
  const variant = overdue ? (profile === "rod" ? "stale-rod" : "stale-kick") : "fresh";
  const name = formatSiteName(site.site_name);
  const s = series?.s ?? [];
  const lastYear = site.last_sample_date ? new Date(site.last_sample_date).getFullYear() : null;
  const yearRange = s.length ? `${s[0][0].slice(0, 4)}–${s.length > 1 ? s[s.length - 1][0].slice(2, 4) : ""}`.replace(/–$/, "") : "—";
  const latest = s[s.length - 1];
  const name_ = (f: string) => commonName(f, catalog);

  const tiles: [string, string][] = overdue
    ? [[String(site.n_surveys), "visits on record"], [yearRange, "survey years"], [site.n_families != null ? String(site.n_families) : "—", "families last time"]]
    : [[String(site.n_surveys), "visits on record"], [site.n_taxa != null ? String(site.n_taxa) : "—", `${site.n_taxa === 1 ? "taxon" : "taxa"} in ${lastYear ?? "—"}`],
       [site.pct_ept_abundance != null ? `${Math.round(site.pct_ept_abundance)}%` : "—", `EPT in ${lastYear ?? "—"}`]];

  // families present on the latest survey (invertebrates only), Dex families first
  const onLatest = useMemo(() => {
    const cards = (families ?? []).filter((f) => isInvertebrate(f.family) && (f as SiteFamilyCard & { present_on_latest?: boolean }).present_on_latest !== false);
    const fromList = families ? cards : site.families_latest.filter(isInvertebrate).map((f) => ({ family: f }) as SiteFamilyCard);
    return dexFirst([...fromList].sort((a, b) => (b.site_presence_pct ?? 0) - (a.site_presence_pct ?? 0)), (c) => c.family);
  }, [families, site.families_latest]);

  const dexState = (f: string) => (!isDexFamily(f) ? "none" : dex.has(f) ? "dex" : "new") as "dex" | "new" | "none";
  const openFamily = (f: string) => {
    const card = families?.find((c) => c.family === f);
    if (card) setOpen(card);
    else onToast("Family detail is still loading");
  };

  const expected = (
    <section className="card card--tight">
      <div className="stack-4">
        <h2 className="h-display-s">Families you might find</h2>
        <p className="caption">From the {lastYear ?? "last"} survey. A tick means it’s already in your Dex.</p>
      </div>
      <ul className="family-list">
        {(showAll ? onLatest : onLatest.slice(0, 7)).map((c) => (
          <FamilyRow key={c.family} family={c.family} common={name_(c.family)} state={dexState(c.family)} onOpen={() => openFamily(c.family)} />
        ))}
      </ul>
      {onLatest.length > 7 && (
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowAll(!showAll)}>
          {showAll ? "Show fewer" : `Show all ${onLatest.length} families`}
        </button>
      )}
    </section>
  );

  // Records with 1–2 taxa at sites that usually have many look incomplete (e.g. partial 2026 uploads): keep them out of trends.
  const maxTaxa = Math.max(0, ...s.map((p) => p[1] ?? 0));
  const looksPartial = (p: (typeof s)[number]) => p[1] != null && p[1] <= 2 && maxTaxa >= 8;
  const complete = s.filter((p) => !looksPartial(p));
  const seriesCard = complete.length > 1 && (
    <section className="card card--tight">
      <h2 className="h-display-s">Over the years</h2>
      <SparkRow label="EPT share" hint="Share of individuals that are mayflies, stoneflies, caddis" unit="%" points={complete.map((p) => [p[0], p[3]])} />
      <SparkRow label="Number of taxa" hint="Taxa recorded per survey" points={complete.map((p) => [p[0], p[1]])} />
      <SparkRow label="Abundance" hint="Individuals counted per survey" points={complete.map((p) => [p[0], p[2]])} />
      {complete.length < s.length && <p className="caption">Leaves out {s.length - complete.length} record{s.length - complete.length > 1 ? "s" : ""} that look incomplete.</p>}
    </section>
  );

  const familyCards = (list: SiteFamilyCard[]) => (
    <ul className="family-cards">
      {list.filter((c) => c.timeline).map((c) => (
        <FamilyCard key={c.family} card={c} common={name_(c.family)} walesPct={catalog?.get(c.family)?.wales_prevalence_pct} onOpen={() => setOpen(c)} />
      ))}
    </ul>
  );

  const sparse = site.latest_sample_partial || (latest != null && looksPartial(latest));

  return (
    <aside className="sidebar" aria-label="Site details" data-variant={variant}>
      <div className="sidebar__scroll">
        <SiteHeader name={name} rawName={site.site_name} siteId={site.site_id} catchment={site.catchment} status={status}
          daysSince={site.days_since_sample} lastDate={site.last_sample_date} tiles={tiles} onClose={onClose} />

        {variant === "stale-kick" && <InstructionCard lastYear={lastYear} onPlayVideo={() => onToast("The kick-sampling video is coming soon")} />}
        {variant === "stale-rod" && <RodDeploymentCard lastYear={lastYear} />}
        {overdue && expected}

        {variant === "fresh" && (
          <>
            <section className="card card--tight">
              <div className="row-between"><h2 className="h-display-s">Found in the latest survey</h2><span className="caption">{lastYear}</span></div>
              {sparse && (
                <p className="note note--warn"><Icon name="info" size={16} />
                  <span>This record lists only {latest![1]} {latest![1] === 1 ? "taxon" : "taxa"}. It may be incomplete: earlier surveys here found up to {maxTaxa}.</span></p>
              )}
              <ul className="chips">
                {dexFirst(site.families_latest.filter(isInvertebrate), (f) => f).slice(0, 8).map((f) => <FamilyChip key={f} family={f} common={name_(f)} />)}
                {site.families_latest.length > 8 && <li className="family-chip family-chip--more">+{site.families_latest.length - 8} more</li>}
              </ul>
            </section>
            {seriesCard}
            <WaterQualityPanel chem={series?.chem ?? null} chemLast={series?.chem_last ?? null} />
            {onLatest.length > 0 && families && (
              <section className="card card--tight">
                <div className="stack-4"><h2 className="h-display-s">Families at this site</h2><p className="caption">Dots show the last 10 surveyed years, newest on the right.</p></div>
                {familyCards(onLatest.slice(0, 6))}
              </section>
            )}
          </>
        )}

        <button type="button" className="history-row" aria-expanded={historyOpen} onClick={() => setHistoryOpen(!historyOpen)}>
          <Icon name="history" size={20} />
          <span className="names"><span className="names__common">Survey history</span><span className="caption">{site.n_surveys} visits{s.length ? `, ${yearRange}` : ""}</span></span>
          <span style={{ transform: historyOpen ? "rotate(90deg)" : "none", display: "flex" }}><Icon name="chev-right" size={18} /></span>
        </button>
        {historyOpen && (
          <>
            {overdue && seriesCard}
            {overdue && <WaterQualityPanel chem={series?.chem ?? null} chemLast={series?.chem_last ?? null} />}
            {families && families.length > 0 && (
              <section className="card card--tight">
                <div className="stack-4"><h2 className="h-display-s">Every family recorded here</h2><p className="caption">Tap a family for its year-by-year record.</p></div>
                {familyCards(dexFirst(families.filter((f) => isInvertebrate(f.family)), (c) => c.family))}
              </section>
            )}
          </>
        )}
      </div>

      <div className="sidebar__actions">
        {variant === "stale-kick" && (
          <>
            <button type="button" className="btn btn--primary btn--lg btn--full" onClick={onUpload}><Icon name="camera" size={18} />Upload tray photo</button>
            <p className="caption center">Photo from directly above. We identify the families, you confirm.</p>
          </>
        )}
        {variant === "stale-rod" && (
          <>
            <button type="button" className="btn btn--primary btn--lg btn--full" onClick={() => onToast("Rod booking is coming soon")}><Icon name="calendar" size={18} />Book rod deployment</button>
            <button type="button" className="btn btn--ghost btn--sm btn--full" onClick={onUpload}><Icon name="net" size={18} />Do a kick sample instead (~60 min)</button>
          </>
        )}
        {variant === "fresh" && <button type="button" className="btn btn--secondary btn--lg btn--full" onClick={onUpload}><Icon name="camera" size={18} />Add a new sample here</button>}
      </div>

      {open && (
        <TaxonModal
          catalog={catalog?.get(open.family) ?? fallbackEntry(open.family)}
          site={open}
          siteName={name}
          onClose={() => setOpen(null)}
        />
      )}
    </aside>
  );
}

function fallbackEntry(family: string): TaxonCatalogEntry {
  return { family, slug: family.toLowerCase(), common_name: family, sensitivity: "unknown", thumb_url: "", thumb_fallback: "", wales_prevalence_pct: 0, description: "" };
}

function SparkRow({ label, hint, unit, points }: { label: string; hint: string; unit?: string; points: [string, number | null][] }) {
  const pts = points.filter((p): p is [string, number] => p[1] != null);
  if (pts.length < 2) return null;
  const values = pts.map((p) => p[1]);
  const first = pts[0][0].slice(0, 4), last = pts[pts.length - 1][0].slice(0, 4);
  const v = values[values.length - 1];
  return (
    <div className="spark-row">
      <div className="stack-2">
        <span className="label">{label}</span>
        <span className="caption">{hint}</span>
        <span className="spark-row__v">{Math.round(v).toLocaleString("en-GB")}{unit && <small>{unit}</small>}</span>
      </div>
      <div className="stack-2">
        <Sparkline values={values} label={`${label}: ${Math.round(values[0])} in ${first} to ${Math.round(v)} in ${last}`} />
        <span className="row-between caption"><span>{first}</span><span>{last}</span></span>
      </div>
    </div>
  );
}
