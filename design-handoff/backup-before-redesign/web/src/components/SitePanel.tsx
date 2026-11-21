import { useEffect, useState } from "react";
import type { SiteProperties } from "../lib/data";
import { stalenessLabel } from "../lib/staleness";
import { loadSiteTaxa, loadTaxaCatalog, type SiteFamilyCard, type TaxonCatalogEntry } from "../lib/taxa";
import { TaxonCard } from "./TaxonCard";
import { TaxonModal } from "./TaxonModal";

type Props = {
  site: SiteProperties;
};

export function SitePanel({ site }: Props) {
  const [families, setFamilies] = useState<SiteFamilyCard[]>([]);
  const [catalog, setCatalog] = useState<Map<string, TaxonCatalogEntry> | null>(
    null,
  );
  const [selected, setSelected] = useState<{
    catalog: TaxonCatalogEntry;
    site: SiteFamilyCard;
  } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cat, detail] = await Promise.all([
          loadTaxaCatalog(),
          loadSiteTaxa(site.site_id),
        ]);
        if (cancelled) return;
        setCatalog(cat);
        setFamilies(detail.families);
        setLoadError(null);
      } catch {
        if (!cancelled) setLoadError("Could not load taxa detail — run npm run etl");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [site.site_id]);

  return (
    <section>
      <h2 className={`staleness-${site.staleness}`}>{site.site_name}</h2>
      <p>
        <strong>Staleness:</strong>{" "}
        {stalenessLabel(site.staleness, site.days_since_sample)}
      </p>
      <p>
        <strong>Last sample:</strong> {site.last_sample_date ?? "—"}
      </p>
      <p>
        <strong>Catchment:</strong> {site.catchment}
      </p>
      <h3>Macroinvertebrate families (latest survey)</h3>
      {loadError && <p className="error-text">{loadError}</p>}
      <div className="taxon-grid">
        {catalog &&
          families.map((fam) => {
            const entry = catalog.get(fam.family);
            if (!entry) return null;
            return (
              <TaxonCard
                key={fam.family}
                catalog={entry}
                site={fam}
                onSelect={() => setSelected({ catalog: entry, site: fam })}
              />
            );
          })}
      </div>
      {selected && (
        <TaxonModal
          catalog={selected.catalog}
          site={selected.site}
          siteName={site.site_name}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}