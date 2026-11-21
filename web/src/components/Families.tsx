import type { SiteFamilyCard } from "../lib/taxa";
import { FamilyArt, PresenceDots, TrendArrow, type Trend } from "./atoms";
import { Icon, PlayIcon } from "./Icon";

export type DexState = "dex" | "new" | "none";

/** Expected family row: art, names, Dex state, ID-guide button. */
export function FamilyRow({ family, common, state, onOpen }: { family: string; common: string; state: DexState; onOpen: () => void }) {
  return (
    <li className="family-row">
      <FamilyArt family={family} size={48} label={common} />
      <span className="names"><span className="names__common">{common}</span>{common !== family && <span className="names__latin">{family}</span>}</span>
      {state === "dex" && <span className="dex-tick" role="img" aria-label="In your Dex"><Icon name="check" size={15} strokeWidth={2.4} /></span>}
      {state === "new" && <span className="dex-new"><span>New for you</span><span className="dex-empty" role="img" aria-label="Not in your Dex yet" /></span>}
      {state === "none" && <span className="caption">Not a Dex card</span>}
      <button type="button" className="play-btn" aria-label={`ID guide: ${common}`} onClick={onOpen}><PlayIcon size={13} color="var(--river-700)" /></button>
    </li>
  );
}

export function FamilyChip({ family, common }: { family: string; common: string }) {
  return <li className="family-chip" title={family}><FamilyArt family={family} size={28} />{common}</li>;
}

/** Last N surveyed years (missing years skipped), oldest → newest. */
export function presenceOf(card: SiteFamilyCard, n = 10): boolean[] {
  return card.timeline.filter((c) => c.status !== "missing").slice(-n).map((c) => c.status === "present");
}

/** Compact history card: art, names, presence dots, trend. Wales-wide % in tooltip. */
export function FamilyCard({ card, common, walesPct, onOpen }: { card: SiteFamilyCard; common: string; walesPct?: number; onOpen: () => void }) {
  const seq = presenceOf(card);
  return (
    <li>
      <button type="button" className="family-card" onClick={onOpen} title={walesPct != null ? `Found in ${walesPct}% of surveys across Wales` : undefined}>
        <FamilyArt family={card.family} size={52} label={common} />
        <span className="names">
          <span className="names__common">{common} {common !== card.family && <span className="names__latin">{card.family}</span>}</span>
          <span className="family-card__dots"><PresenceDots seq={seq} /><span className="caption tabular">{seq.filter(Boolean).length}/{seq.length}</span></span>
        </span>
        <TrendArrow trend={card.trend as Trend} />
      </button>
    </li>
  );
}
