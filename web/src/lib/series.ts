/** Per-site survey series + paired chemistry, from scripts/etl_site_series.py. */

export type Chemistry = {
  survey_date: string;
  gap_days: number | null;
  station: string | null;
  distance_m: number | null;
  bod_mg_l: number | null;
  ammonia_n_mg_l: number | null;
  do_pct_sat: number | null;
};

/** [sample_date, n_taxa, total_abundance, pct_ept_abundance], oldest first */
export type SurveyPoint = [string, number | null, number | null, number | null];

export type SiteSeries = { s: SurveyPoint[]; chem: Chemistry | null; chem_last: Chemistry | null };

let cache: Promise<Record<string, SiteSeries>> | null = null;

export function loadSiteSeries(): Promise<Record<string, SiteSeries>> {
  cache ??= fetch("/data/site_series.json")
    .then((r) => (r.ok ? (r.json() as Promise<{ sites: Record<string, SiteSeries> }>) : { sites: {} }))
    .then((d) => d.sites)
    .catch(() => ({}));
  return cache;
}
