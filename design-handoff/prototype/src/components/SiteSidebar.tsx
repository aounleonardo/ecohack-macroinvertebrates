import { FAMILIES, MY_DEX, siteStatus, type Profile, type Site } from '../data/demo';
import { Sparkline } from './atoms';
import { FamilyCard, FamilyChip, FamilyRow } from './Families';
import { Icon } from './Icon';
import { InstructionCard } from './InstructionCard';
import { RodDeploymentCard } from './RodDeploymentCard';
import { SiteHeader } from './SiteHeader';
import { WaterQualityPanel } from './WaterQualityPanel';

/**
 * Variants (derived, not passed):
 *   stale-kick  status ageing|stale + profile kick (or coordinator, read-only for now)
 *   stale-rod   status ageing|stale + profile rod
 *   fresh       status fresh|rod
 * Stale sites lead with the task; history comes second.
 */
export function SiteSidebar({ site, profile, onClose, onUpload }: { site: Site; profile: Profile; onClose: () => void; onUpload: () => void }) {
  const status = siteStatus(site);
  const overdue = status === 'stale' || status === 'ageing';
  const lastYear = new Date(site.lastSampled).getFullYear();
  const variant = overdue ? (profile === 'rod' ? 'stale-rod' : 'stale-kick') : 'fresh';

  return (
    <aside className="sidebar" aria-label="Site details" data-variant={variant}>
      <div className="sidebar__scroll">
        <SiteHeader site={site} onClose={onClose} />
        {variant === 'stale-kick' && <InstructionCard lastYear={lastYear} />}
        {variant === 'stale-rod' && <RodDeploymentCard lastYear={lastYear} />}
        {overdue && <Expected site={site} limit={variant === 'stale-rod' ? 5 : undefined} />}
        {variant === 'fresh' && <FreshBody site={site} />}
        <button type="button" className="history-row">
          <Icon name="history" size={20} />
          <span className="names"><span className="names__common">Survey history</span><span className="caption">{site.visits} visits, {site.years}</span></span>
          <Icon name="chev-right" size={18} />
        </button>
      </div>
      <div className="sidebar__actions">
        {variant === 'stale-kick' && <>
          <button type="button" className="btn btn--primary btn--lg btn--full" onClick={onUpload}><Icon name="camera" size={18} />Upload tray photo</button>
          <p className="caption center">Photo from directly above. We identify the families, you confirm.</p>
        </>}
        {variant === 'stale-rod' && <>
          <button type="button" className="btn btn--primary btn--lg btn--full"><Icon name="calendar" size={18} />Book rod deployment</button>
          <button type="button" className="btn btn--ghost btn--sm btn--full"><Icon name="net" size={18} />Do a kick sample instead (~60 min)</button>
        </>}
        {variant === 'fresh' && <button type="button" className="btn btn--secondary btn--lg btn--full" onClick={onUpload}><Icon name="camera" size={18} />Add a new sample here</button>}
      </div>
    </aside>
  );
}

function Expected({ site, limit }: { site: Site; limit?: number }) {
  const list = (site.expected ?? ['baetidae', 'chironomidae', 'gammaridae', 'elmidae']).slice(0, limit);
  return (
    <section className="card card--tight">
      <div className="stack-4">
        <h2 className="h-display-s">Families you might find</h2>
        <p className="caption">From the {new Date(site.lastSampled).getFullYear()} survey. A tick means it’s already in your Dex.</p>
      </div>
      <ul className="family-list">
        {list.map((slug) => <FamilyRow key={slug} slug={slug} state={!FAMILIES[slug].hasArt ? 'none' : MY_DEX.has(slug) ? 'dex' : 'new'} />)}
      </ul>
    </section>
  );
}

function FreshBody({ site }: { site: Site }) {
  const s = site.series;
  return (
    <>
      {site.latest && (
        <section className="card card--tight">
          <div className="row-between"><h2 className="h-display-s">Found in the latest survey</h2><span className="caption">{new Date(site.lastSampled).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
          <ul className="chips">{site.latest.map((f) => <FamilyChip key={f} slug={f} />)}{site.latestMore ? <li className="family-chip family-chip--more">+{site.latestMore} more</li> : null}</ul>
        </section>
      )}
      {s && (
        <section className="card card--tight">
          <h2 className="h-display-s">Over the years</h2>
          <SparkRow label="EPT share" hint="Pollution-sensitive mayflies, stoneflies, caddis" value={`${s.ept.at(-1)}`} unit="%" values={s.ept} years={s.years} />
          <SparkRow label="Number of taxa" hint="Families recorded per survey" value={`${s.taxa.at(-1)}`} values={s.taxa} years={s.years} />
          <SparkRow label="Abundance" hint="Individuals per 3-minute sample" value={(s.abundance.at(-1) ?? 0).toLocaleString('en-GB')} values={s.abundance} years={s.years} />
        </section>
      )}
      <WaterQualityPanel chem={site.chemistry} surveyDate={site.lastSampled} />
      {site.history && (
        <section className="card card--tight">
          <div className="stack-4"><h2 className="h-display-s">Families at this site</h2><p className="caption">Dots show the last 10 visits, newest on the right.</p></div>
          <ul className="family-cards">{site.history.map((h) => <FamilyCard key={h.slug} {...h} />)}</ul>
        </section>
      )}
    </>
  );
}

function SparkRow({ label, hint, value, unit, values, years }: { label: string; hint: string; value: string; unit?: string; values: number[]; years: number[] }) {
  return (
    <div className="spark-row">
      <div className="stack-2"><span className="label">{label}</span><span className="caption">{hint}</span><span className="spark-row__v">{value}{unit && <small>{unit}</small>}</span></div>
      <div className="stack-2"><Sparkline values={values} years={years} /><span className="row-between caption"><span>{years[0]}</span><span>{years.at(-1)}</span></span></div>
    </div>
  );
}
