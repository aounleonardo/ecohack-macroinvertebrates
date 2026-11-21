import { ageLabel, fmtDate, type Status } from "../lib/staleness";
import { StatusPill } from "./atoms";
import { Icon } from "./Icon";

type Props = {
  name: string;
  rawName: string;
  siteId: string;
  catchment: string;
  status: Status;
  daysSince: number | null;
  lastDate: string | null;
  tiles: [string, string][];
  /** overrides the computed age in the pill, e.g. "day 6 of 7" for a rod site */
  ageText?: string;
  lastLabel?: string;
  onClose: () => void;
};

/** Site name in normal case, catchment + code, status pill, three stat tiles. */
export function SiteHeader({ name, rawName, siteId, catchment, status, daysSince, lastDate, tiles, ageText, lastLabel = "Last sampled", onClose }: Props) {
  return (
    <div className="site-header">
      <div className="site-header__top">
        <div className="site-header__names">
          <h1 className="site-header__name" title={`NRW site name: ${rawName}`}>{name}</h1>
          <p className="site-header__sub">{catchment} catchment<code className="code">{siteId}</code></p>
        </div>
        <button type="button" className="icon-btn" aria-label="Close site panel" onClick={onClose}><Icon name="x" size={18} /></button>
      </div>
      <div className="site-header__status">
        <StatusPill status={status} age={ageText ?? ageLabel(daysSince)} />
        <span className="caption">{lastLabel} {fmtDate(lastDate)}</span>
      </div>
      <div className="stat-tiles">
        {tiles.map(([v, l]) => <div key={l} className="stat-tile"><span className="stat-tile__v">{v}</span><span className="stat-tile__l">{l}</span></div>)}
      </div>
    </div>
  );
}
