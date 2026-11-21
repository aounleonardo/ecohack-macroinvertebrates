import { useEffect } from "react";
import { orderOf, sensitivityOf } from "../lib/families";
import type { SiteFamilyCard, TaxonCatalogEntry } from "../lib/taxa";
import { FamilyArt, SensitivityBadge, TrendArrow, type Trend } from "./atoms";
import { FamilyTimeline } from "./FamilyTimeline";
import { Icon } from "./Icon";

type Props = {
  catalog: TaxonCatalogEntry;
  site: SiteFamilyCard;
  siteName: string;
  onClose: () => void;
};

/** Family detail: plate, names, sensitivity, Wales-wide and site presence, year-by-year record. */
export function TaxonModal({ catalog, site, siteName, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="taxon-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="taxon-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={catalog.common_name}>
        <button type="button" className="icon-btn taxon-modal-close" aria-label="Close" onClick={onClose}><Icon name="x" size={18} /></button>
        <div className="taxon-modal__plate"><FamilyArt family={catalog.family} size={168} tile={false} label={catalog.common_name} /></div>
        <div className="stack-4">
          <div className="row-between" style={{ alignItems: "center" }}>
            <h3 className="h-display-m">{catalog.common_name}</h3>
            <SensitivityBadge s={sensitivityOf(catalog)} />
          </div>
          <p className="names__latin">{catalog.family} · {orderOf(catalog.family).replace("-", " ")}</p>
        </div>
        {catalog.description && <p className="body-2">{catalog.description}</p>}
        <dl className="taxon-dl">
          <div><dt>Across Wales</dt><dd>{catalog.wales_prevalence_pct ? `${catalog.wales_prevalence_pct}% of surveys` : "—"}</dd></div>
          <div><dt>At {siteName}</dt><dd>{site.surveys_with_family}/{site.surveys_at_site} surveys ({site.site_presence_pct}%)</dd></div>
          <div><dt>Trend here</dt><dd><TrendArrow trend={site.trend as Trend} /></dd></div>
        </dl>
        <div className="stack-8">
          <p className="overline">Year by year</p>
          <FamilyTimeline timeline={site.timeline} />
        </div>
        <p className="caption">From the NRW KiEco dataset: family presence per survey.</p>
      </div>
    </div>
  );
}
