import { DEX_FAMILIES, commonName, sensitivityOf } from "../lib/families";
import type { TaxonCatalogEntry } from "../lib/taxa";
import { FamilyArt, SensitivityBadge } from "./atoms";
import { Icon } from "./Icon";

type Props = {
  dex: Set<string>;
  catalog: Map<string, TaxonCatalogEntry> | null;
  dexCount: number;
  onClose: () => void;
};

export function DexScreen({ dex, catalog, dexCount, onClose }: Props) {
  const total = DEX_FAMILIES.length;
  const circ = 2 * Math.PI * 52;

  return (
    <div className="dex-page">
      <header className="dex-page__head">
        <div className="stack-4">
          <h1 className="h-display-m">Your Dex</h1>
          <p className="body-2">
            {dexCount} of {total} common Welsh river families recorded. Kick samples and tray photos add cards here.
          </p>
        </div>
        <div className="dex-page__ring" aria-hidden>
          <svg width={120} height={120} viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--line)" strokeWidth="8" />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="var(--moss-500)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(circ * dexCount) / total} ${circ}`}
              transform="rotate(-90 60 60)"
            />
            <text x="60" y="58" textAnchor="middle" className="dex-page__ring-n">{dexCount}</text>
            <text x="60" y="78" textAnchor="middle" className="dex-page__ring-d">of {total}</text>
          </svg>
        </div>
        <button type="button" className="btn btn--secondary" onClick={onClose}>
          <Icon name="arrow-left" size={18} />
          Back to map
        </button>
      </header>

      <ul className="dex-grid">
        {DEX_FAMILIES.map((family, i) => {
          const recorded = dex.has(family);
          const entry = catalog?.get(family);
          const common = commonName(family, catalog);
          const sens = sensitivityOf(entry);
          return (
            <li key={family}>
              <article className={`dex-card${recorded ? "" : " dex-card--locked"}`} aria-label={`${common}, ${recorded ? "recorded" : "not yet recorded"}`}>
                <span className="dex-card__no">{String(i + 1).padStart(2, "0")}</span>
                <div className="dex-card__art">
                  <FamilyArt family={family} size={88} faint={!recorded} label={common} />
                </div>
                <div className="dex-card__body">
                  <h2 className="dex-card__common">{common}</h2>
                  <p className="dex-card__latin">{family}</p>
                  {sens && <SensitivityBadge s={sens} />}
                  {entry && (
                    <p className="caption">Wales dataset: {entry.wales_prevalence_pct}% of surveys</p>
                  )}
                </div>
                {recorded ? (
                  <span className="dex-card__badge dex-card__badge--ok">
                    <Icon name="check" size={14} strokeWidth={2.4} />
                    Recorded
                  </span>
                ) : (
                  <span className="dex-card__badge">Not yet</span>
                )}
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}