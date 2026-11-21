import { useState } from "react";
import type { Chemistry } from "../lib/series";
import { fmtDate } from "../lib/staleness";
import { Icon } from "./Icon";

const fmt = (v: number | null, d = 2) => (v == null ? "—" : Number(v.toFixed(d)).toString());

/** Chemistry paired (≤ 90 days) with the latest survey, or a graceful unavailable state. */
export function WaterQualityPanel({ chem, chemLast }: { chem: Chemistry | null; chemLast: Chemistry | null }) {
  const [showLast, setShowLast] = useState(false);
  const shown = chem ?? (showLast ? chemLast : null);
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
      {shown ? (
        <>
          <div className="wq-tiles">
            <Metric name="BOD" value={fmt(shown.bod_mg_l, 1)} unit="mg/L" sub="Biochemical oxygen demand" />
            <Metric name="Ammonia" value={fmt(shown.ammonia_n_mg_l, 3)} unit="mg/L" sub="as N" />
            <Metric name="Dissolved O₂" value={fmt(shown.do_pct_sat, 0)} unit="%" sub="saturation" />
          </div>
          <p className="caption">
            NRW station {shown.station ?? "nearby"}{shown.distance_m != null ? `, ${Math.round(shown.distance_m)} m away` : ""}.
            {shown.gap_days != null ? ` ${shown.gap_days} days from the ${fmtDate(shown.survey_date)} survey.` : ""}
            {!chem && " This is the last paired reading, not current."}
          </p>
        </>
      ) : (
        <div className="empty">
          <span className="empty__icon"><Icon name="flask" size={22} /></span>
          <p className="label">No chemistry paired with the latest survey</p>
          <p className="body-2">There’s no Natural Resources Wales water sample within 90 days of it. The invertebrate results still stand on their own.</p>
          {chemLast && (
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => setShowLast(true)}>
              Show last paired reading ({new Date(chemLast.survey_date).getFullYear()})
            </button>
          )}
        </div>
      )}
      {note}
    </section>
  );
}

function Metric({ name, value, unit, sub }: { name: string; value: string; unit: string; sub: string }) {
  return (
    <div className="wq-tile">
      <span className="wq-tile__name">{name}</span>
      <span className="wq-tile__v">{value}{value !== "—" && <small>{unit}</small>}</span>
      <span className="caption">{sub}</span>
    </div>
  );
}
