import { useEffect } from "react";
import { DEX_FAMILIES, sensitivityOf } from "../lib/families";
import type { TaxonCatalogEntry } from "../lib/taxa";
import { TradingCard } from "./TradingCard";
import { Icon } from "./Icon";

type Props = {
  families: string[];
  siteName: string;
  dexCount: number;
  catalog: Map<string, TaxonCatalogEntry> | null;
  common: (f: string) => string;
  onClose: () => void;
  onViewDex?: () => void;
};

/** The unlock moment: card flips in, glows, sparkles, Dex progress. */
export function UnlockModal({ families, siteName, dexCount, catalog, common, onClose, onViewDex }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const shown = families.slice(0, 3);
  const title = families.length === 1 ? `${common(families[0])}!` : `${families.length} new families!`;

  return (
    <div className="unlock" role="dialog" aria-modal="true" aria-label="New family recorded">
      <p className="overline" style={{ color: "var(--river-300)" }}>New to your Dex</p>
      <h1 className="unlock__title">{title}</h1>
      <div className="unlock__cards">
        {shown.map((f, i) => (
          <div key={f} className="unlock__card" style={{ animationDelay: `${i * 140}ms` }}>
            <TradingCard family={f} number={DEX_FAMILIES.indexOf(f as (typeof DEX_FAMILIES)[number]) + 1} common={common(f)}
              sensitivity={sensitivityOf(catalog?.get(f))} where={siteName} when={today} isNew width={shown.length > 1 ? 250 : 300} />
          </div>
        ))}
        {[[-30, 20, 30], [104, 6, 22], [102, 82, 34], [-26, 88, 18]].map(([x, y, s], i) => (
          <span key={i} className="unlock__sparkle" aria-hidden style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${300 + i * 60}ms` }}>
            <Icon name="sparkle" size={s} strokeWidth={1.4} />
          </span>
        ))}
      </div>
      <div className="unlock__progress">
        <span>You’ve recorded {dexCount} of {DEX_FAMILIES.length} families</span>
        <span aria-hidden className="unlock__bar"><span style={{ width: `${(dexCount / DEX_FAMILIES.length) * 100}%` }} /></span>
      </div>
      <div className="unlock__actions">
        {onViewDex && <button type="button" className="btn btn--lg unlock__primary" onClick={onViewDex}><Icon name="dex" size={18} />See it in your Dex</button>}
        <button type="button" className="btn btn--lg btn--ghost unlock__ghost" onClick={onClose}>Back to the map</button>
      </div>
    </div>
  );
}
