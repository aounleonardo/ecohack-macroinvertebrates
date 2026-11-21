/** Client-first: KiEco map data from static ETL output (no Render hop). */

export type SiteProperties = {
  site_id: string;
  site_name: string;
  catchment: string;
  last_sample_date: string | null;
  days_since_sample: number | null;
  staleness: "fresh" | "aging" | "stale" | "unknown";
  n_surveys: number;
  families_latest: string[];
  pct_ept_abundance: number | null;
  has_chem_within_90d: boolean;
};

export type SitesFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  SiteProperties
>;

export async function loadSitesGeoJSON(): Promise<SitesFeatureCollection> {
  const res = await fetch("/data/sites.geojson");
  if (!res.ok) throw new Error(`sites.geojson ${res.status}`);
  return res.json() as Promise<SitesFeatureCollection>;
}

/** MapLibre click `feature.properties` stringifies arrays — normalize before React state. */
export function parseSiteProperties(
  raw: Record<string, unknown>,
): SiteProperties {
  let families: string[] = [];
  const fl = raw.families_latest;
  if (Array.isArray(fl)) {
    families = fl.map(String);
  } else if (typeof fl === "string") {
    try {
      const parsed = JSON.parse(fl) as unknown;
      families = Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      families = fl.split(";").map((s) => s.trim()).filter(Boolean);
    }
  }

  const days = raw.days_since_sample;
  const nSurveys = raw.n_surveys;
  const pctEpt = raw.pct_ept_abundance;

  return {
    site_id: String(raw.site_id ?? ""),
    site_name: String(raw.site_name ?? ""),
    catchment: String(raw.catchment ?? ""),
    last_sample_date:
      raw.last_sample_date != null ? String(raw.last_sample_date) : null,
    days_since_sample:
      days === "" || days == null ? null : Number(days),
    staleness: (raw.staleness as SiteProperties["staleness"]) ?? "unknown",
    n_surveys: nSurveys == null || nSurveys === "" ? 0 : Number(nSurveys),
    families_latest: families,
    pct_ept_abundance:
      pctEpt === "" || pctEpt == null ? null : Number(pctEpt),
    has_chem_within_90d:
      raw.has_chem_within_90d === true || raw.has_chem_within_90d === "True",
  };
}

export type PrecomputedDetection = {
  family: string;
  confidence: number;
  bbox: [number, number, number, number];
};

export async function loadPrecomputedInference(
  imageKey: string,
): Promise<{ detections: PrecomputedDetection[] }> {
  const res = await fetch(`/data/inference/${imageKey}.json`);
  if (!res.ok) throw new Error(`inference ${imageKey} ${res.status}`);
  return res.json() as Promise<{ detections: PrecomputedDetection[] }>;
}