export type TaxonCatalogEntry = {
  family: string;
  slug: string;
  common_name: string;
  sensitivity: string;
  thumb_url: string;
  thumb_fallback: string;
  wales_prevalence_pct: number;
  description: string;
  _demo_note?: string;
};

export type SurveyYearStatus = "present" | "absent" | "missing";

export type TimelineCell = {
  year: number;
  status: SurveyYearStatus;
  count?: number | null;
};

export type SiteFamilyCard = {
  family: string;
  slug: string;
  site_presence_pct: number;
  surveys_with_family: number;
  surveys_at_site: number;
  trend: "increasing" | "declining" | "stable" | "unknown";
  years_seen: number[];
  timeline: TimelineCell[];
};

export type SiteTaxaDetail = {
  site_id: string;
  families: SiteFamilyCard[];
};

let catalogCache: Map<string, TaxonCatalogEntry> | null = null;

export async function loadTaxaCatalog(): Promise<Map<string, TaxonCatalogEntry>> {
  if (catalogCache) return catalogCache;
  const res = await fetch("/data/taxa_catalog.json");
  if (!res.ok) throw new Error("taxa_catalog.json missing");
  const data = (await res.json()) as { families: TaxonCatalogEntry[] };
  catalogCache = new Map(data.families.map((f) => [f.family, f]));
  return catalogCache;
}

export async function loadSiteTaxa(siteId: string): Promise<SiteTaxaDetail> {
  const res = await fetch(`/data/sites/${encodeURIComponent(siteId)}.json`);
  if (!res.ok) throw new Error(`site taxa ${siteId}`);
  return res.json() as Promise<SiteTaxaDetail>;
}