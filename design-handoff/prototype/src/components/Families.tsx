import { FAMILIES } from '../data/demo';
import { FamilyArt, PresenceDots, TrendArrow } from './atoms';
import { Icon, PlayIcon } from './Icon';

export type DexState = 'dex' | 'new' | 'none';

/** Expected family row: art, names, Dex state, ID-video button. */
export function FamilyRow({ slug, state, onVideo }: { slug: string; state: DexState; onVideo?: () => void }) {
  const f = FAMILIES[slug];
  return (
    <li className="family-row">
      <FamilyArt slug={slug} size={48} />
      <span className="names"><span className="names__common">{f.common}</span><span className="names__latin">{f.latin}</span></span>
      {state === 'dex' && <span className="dex-tick" role="img" aria-label="In your Dex"><Icon name="check" size={15} strokeWidth={2.4} /></span>}
      {state === 'new' && <span className="dex-new"><span>New for you</span><span className="dex-empty" role="img" aria-label="Not in your Dex yet" /></span>}
      {state === 'none' && <span className="caption">Not a Dex card</span>}
      <button type="button" className="play-btn" aria-label={`Watch ID video: ${f.common}`} onClick={onVideo}><PlayIcon size={13} color="var(--river-700)" /></button>
    </li>
  );
}

export function FamilyChip({ slug }: { slug: string }) {
  const f = FAMILIES[slug];
  return <li className="family-chip" title={f.latin}><FamilyArt slug={slug} size={28} />{f.common}</li>;
}

/** Compact history card: art, names, presence dots for last 10 visits, trend. Wales-wide % in tooltip. */
export function FamilyCard({ slug, presence, trend }: { slug: string; presence: number[]; trend: 'up' | 'flat' | 'down' }) {
  const f = FAMILIES[slug];
  const n = presence.filter(Boolean).length;
  return (
    <li className="family-card" title={f.walesPct ? `Found in ${f.walesPct}% of surveys across Wales` : undefined}>
      <FamilyArt slug={slug} size={52} />
      <span className="names">
        <span className="names__common">{f.common} <span className="names__latin">{f.latin}</span></span>
        <span className="family-card__dots"><PresenceDots seq={presence} /><span className="caption tabular">{n}/{presence.length}</span></span>
      </span>
      <TrendArrow trend={trend} />
    </li>
  );
}
