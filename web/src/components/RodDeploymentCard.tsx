import { useState } from "react";
import { Icon } from "./Icon";
import { StepList, TaskHead } from "./InstructionCard";

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Next Saturday, as a sensible default install day. */
function nextSaturday(from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  return d;
}

/** Rod task (stale/ageing site, Has rod profile). */
export function RodDeploymentCard({ lastYear }: { lastYear: number | null }) {
  const [install, setInstall] = useState(iso(nextSaturday()));
  const retrieve = iso(new Date(new Date(install).getTime() + 7 * 86400000));
  return (
    <section className="card card--task">
      <TaskHead icon="rod" title="Deploy a camera rod here" chip="~25 min of your time" />
      <p className="body-2">
        {lastYear ? `Nobody has sampled here since ${lastYear}.` : "This reach has no sample on record."} A rod watches the riverbed for a week, so one visit to install and one to collect covers it.
      </p>
      <div className="rod-facts">
        <img src="/art/scenes/rod.svg" alt="Illustration: camera rod staked into the riverbed with a bubble sampler" width={176} height={132} />
        <ul>
          <li><Icon name="clock" size={17} />Leave installed 7 days</li>
          <li><Icon name="water" size={17} />Auto bubble bursts 2–3× a day, no volunteer in the water</li>
          <li><Icon name="camera" size={17} />Camera photographs each burst; you get a week of IDs</li>
        </ul>
      </div>
      <div className="two-col">
        <label className="field">Install<input type="date" value={install} onChange={(e) => setInstall(e.target.value)} /></label>
        <label className="field">Retrieve<input type="date" value={retrieve} readOnly /></label>
      </div>
      <div className="compare">
        <p className="label">~25 min of your time for a week of data, vs ~60 min for one kick snapshot</p>
        <div className="compare__grid">
          <span>Rod</span><span className="bar"><span style={{ width: `${(25 / 60) * 100}%`, background: "var(--river-700)" }} /></span><strong>25 min · 7 days</strong>
          <span>Kick</span><span className="bar"><span style={{ width: "100%", background: "var(--line-strong)" }} /></span><strong>60 min · 1 day</strong>
        </div>
      </div>
      <StepList steps={[
        "Push the rod into gravel in a riffle, camera facing upstream.",
        "Hold the status button until it blinks teal, then pair it in the app.",
        "Come back on the retrieve date, pull the rod and tap Finish.",
      ]} />
    </section>
  );
}
