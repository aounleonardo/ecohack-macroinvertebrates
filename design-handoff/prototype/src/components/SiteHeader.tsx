import { fmtDate, siteStatus, yearsAgoLabel, type Site } from '../data/demo';
import { StatusPill } from './atoms';
import { Icon } from './Icon';

export function SiteHeader({ site, onClose }: { site: Site; onClose: () => void }) {
  const status = siteStatus(site);
  const isFresh = status === 'fresh' || status === 'rod';
  const y = new Date(site.lastSampled).getFullYear();
  const tiles: [string, string][] = isFresh
    ? [[String(site.visits), 'visits on record'], [String(site.familiesLast), `taxa in ${y}`], [site.series ? `${site.series.ept.at(-1)}%` : '–', `EPT in ${y}`]]
    : [[String(site.visits), 'visits on record'], [site.years, 'survey years'], [String(site.familiesLast), 'families last time']];
  return (
    <div className="site-header">
      <div className="site-header__top">
        <div className="site-header__names">
          <h1 className="site-header__name">{site.name}</h1>
          <p className="site-header__sub">{site.catchment} catchment{site.code && <code className="code">{site.code}</code>}</p>
        </div>
        <button type="button" className="icon-btn" aria-label="Close site panel" onClick={onClose}><Icon name="x" size={18} /></button>
      </div>
      <div className="site-header__status">
        <StatusPill status={status} age={yearsAgoLabel(site)} />
        <span className="caption">Last sampled {fmtDate(site.lastSampled)}</span>
      </div>
      <div className="stat-tiles">
        {tiles.map(([v, l]) => <div key={l} className="stat-tile"><span className="stat-tile__v">{v}</span><span className="stat-tile__l">{l}</span></div>)}
      </div>
    </div>
  );
}
