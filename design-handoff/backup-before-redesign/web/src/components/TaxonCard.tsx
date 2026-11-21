import type { SiteFamilyCard, TaxonCatalogEntry } from "../lib/taxa";

type Props = {
  catalog: TaxonCatalogEntry;
  site: SiteFamilyCard;
  onSelect: () => void;
};

const TREND_LABEL: Record<string, string> = {
  increasing: "↑ Increasing at this site",
  declining: "↓ Declining at this site",
  stable: "→ Stable at this site",
  unknown: "Trend unclear",
};

export function TaxonCard({ catalog, site, onSelect }: Props) {
  return (
    <button type="button" className="taxon-card" onClick={onSelect}>
      <img
        src={catalog.thumb_url}
        alt=""
        onError={(e) => {
          (e.target as HTMLImageElement).src = catalog.thumb_fallback;
        }}
      />
      <div className="taxon-card-body">
        <strong>{catalog.common_name}</strong>
        <span className="taxon-sci">{catalog.family}</span>
        <span className="taxon-stat">
          Wales dataset: {catalog.wales_prevalence_pct}% of surveys
        </span>
        <span className="taxon-stat">
          This site: {site.site_presence_pct}% of visits ({site.surveys_with_family}/
          {site.surveys_at_site})
        </span>
        <span className={`taxon-trend taxon-trend-${site.trend}`}>
          {TREND_LABEL[site.trend] ?? site.trend}
        </span>
      </div>
    </button>
  );
}