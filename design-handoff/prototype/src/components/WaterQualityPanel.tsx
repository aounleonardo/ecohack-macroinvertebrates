import { fmtDate, type Chemistry } from '../data/demo';
import { Icon } from './Icon';

/** Chemistry paired within 90 days, or a graceful unavailable state. */
export function WaterQualityPanel({ chem, surveyDate }: { chem: Chemistry | null | undefined; surveyDate: string }) {
  const note = (
    <p className="note note--moss"><Icon name="info" size={16} />
      <span>Invertebrates indicate water quality; they don’t cause it. Chemistry is a snapshot on one day, the animals reflect the weeks before.</span></p>
  );
  return (
    <section className="card">
      <div className="wq-head">
        <span className="wq-head__title"><Icon name="flask" size={18} /><h2 className="h-display-s">Water chemistry</h2></span>
        {chem && <span className="chip chip--river chip--sm"><Icon name="link" size={13} />Paired within 90 days</span>}
      </div>
      {chem ? (
        <>
          <div className="wq-tiles">
            <Metric name="BOD" sub="Biochemical oxygen demand" value={chem.bod.toFixed(1)} unit="mg/L" pos={chem.bod / 6} />
            <Metric name="Ammonia" sub="as N" value={chem.ammonia.toFixed(2)} unit="mg/L" pos={chem.ammonia / 0.33} />
            <Metric name="Dissolved O₂" sub="saturation" value={String(chem.doPct)} unit="%" pos={chem.doPct / 112} />
          </div>
          <p className="caption">Natural Resources Wales sample, {fmtDate(chem.sampled)}, {chem.distanceKm} km downstream. Survey: {fmtDate(surveyDate)}.</p>
        </>
      ) : (
        <div className="empty">
          <span className="empty__icon"><Icon name="flask" size={22} /></span>
          <p className="label">No chemistry paired with this survey</p>
          <p className="body-2">There’s no Natural Resources Wales water sample within 90 days and 2 km of the latest visit. The invertebrate results still stand on their own.</p>
          <button type="button" className="btn btn--secondary btn--sm">Show nearest reading</button>
        </div>
      )}
      {note}
    </section>
  );
}

function Metric({ name, sub, value, unit, pos }: { name: string; sub: string; value: string; unit: string; pos: number }) {
  return (
    <div className="wq-tile">
      <span className="wq-tile__name">{name}</span>
      <span className="wq-tile__v">{value}<small>{unit}</small></span>
      <span className="wq-tile__track" aria-hidden><span style={{ left: `calc(${Math.min(1, Math.max(0, pos)) * 100}% - 5px)` }} /></span>
      <span className="caption">{sub}</span>
    </div>
  );
}
