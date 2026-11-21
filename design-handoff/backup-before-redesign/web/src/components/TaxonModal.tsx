import type { SiteFamilyCard, TaxonCatalogEntry } from "../lib/taxa";
import { FamilyTimeline } from "./FamilyTimeline";

type Props = {
  catalog: TaxonCatalogEntry;
  site: SiteFamilyCard;
  siteName: string;
  onClose: () => void;
};

export function TaxonModal({ catalog, site, siteName, onClose }: Props) {
  return (
    <div className="taxon-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="taxon-modal" onClick={(e) => e.stopPropagation()} role="dialog">
        <button type="button" className="taxon-modal-close" onClick={onClose}>
          ×
        </button>
        <img
          src={catalog.thumb_url}
          alt=""
          className="taxon-modal-img"
          onError={(e) => {
            (e.target as HTMLImageElement).src = catalog.thumb_fallback;
          }}
        />
        <h3>{catalog.common_name}</h3>
        <p className="taxon-sci">{catalog.family}</p>
        <p>{catalog.description}</p>
        <dl className="taxon-dl">
          <dt>Sensitivity (demo)</dt>
          <dd>{catalog.sensitivity}</dd>
          <dt>Wales KiEco prevalence</dt>
          <dd>{catalog.wales_prevalence_pct}% of site-surveys</dd>
          <dt>At {siteName}</dt>
          <dd>
            Present in {site.site_presence_pct}% of surveys ({site.surveys_with_family}/
            {site.surveys_at_site}); trend: <strong>{site.trend}</strong>
          </dd>
          <dt>Survey history (per year)</dt>
          <dd>
            <FamilyTimeline timeline={site.timeline} />
          </dd>
        </dl>
        <p className="taxon-demo-note">
          KiEco lists family presence per survey, not per-taxon counts — barcode only.
          Gray = no sample; green = found; red = surveyed, absent. Prevalence/trends
          from NRW KiEco CSV only.
        </p>
      </div>
    </div>
  );
}