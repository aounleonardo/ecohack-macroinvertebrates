import { useState } from "react";
import { Icon, PlayIcon, type IconName } from "./Icon";

export function TaskHead({ icon, title, chip }: { icon: IconName; title: string; chip: string }) {
  return (
    <>
      <div className="task-head">
        <span className="task-head__kind"><Icon name={icon} size={18} /><span className="overline overline--river">Your task</span></span>
        <span className="chip chip--river"><Icon name="clock" size={15} />{chip}</span>
      </div>
      <h2 className="h-display-m">{title}</h2>
    </>
  );
}

export function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="steps">
      {steps.map((s, i) => <li key={i}><span className="steps__n" aria-hidden>{i + 1}</span><span>{s}</span></li>)}
    </ol>
  );
}

const KIT: { icon: IconName; name: string; sub: string }[] = [
  { icon: "net", name: "Kick net", sub: "1 mm mesh, D-frame" },
  { icon: "tray", name: "White tray", sub: "Shallow, with river water" },
  { icon: "board", name: "Whiteboard", sub: "Site code in the photo" },
  { icon: "phone", name: "Phone", sub: "Charged, camera clean" },
];

/** Kick-sampling task (stale/ageing site, Kick kit profile). */
export function InstructionCard({ lastYear, onPlayVideo }: { lastYear: number | null; onPlayVideo?: () => void }) {
  const [kit, setKit] = useState<Record<string, boolean>>({});
  return (
    <section className="card card--task">
      <TaskHead icon="net" title="Kick-sample this reach" chip="~50–70 min" />
      <p className="body-2">
        {lastYear ? `Nobody has sampled here since ${lastYear}.` : "This reach has no sample on record."} One kick sample tells us whether the invertebrates, and the river, have changed.
      </p>
      <figure className="video">
        <img src="/art/scenes/kick-sample.svg" alt="Illustration: boots disturbing gravel just upstream of a D-frame net" />
        <button type="button" className="video__play" aria-label="Play video: how to do a 3-minute kick sample" onClick={onPlayVideo}><PlayIcon size={24} color="var(--river-700)" /></button>
        <figcaption className="video__caption"><span>Watch: the 3-minute kick sample</span></figcaption>
      </figure>
      <StepList steps={[
        "Find a riffle: shallow, fast water over gravel, safe to stand in.",
        "Stand the net on the bed, mouth facing upstream.",
        "Kick the gravel just upstream for 3 minutes, working across the riffle.",
        "Search stones and weed by hand for 1 more minute.",
        "Tip the net into the tray with a little river water. Photograph from directly above.",
      ]} />
      <div className="stack-8">
        <p className="overline">Kit checklist</p>
        <div className="kit">
          {KIT.map((k) => (
            <label key={k.name} className="kit__item">
              <input type="checkbox" checked={!!kit[k.name]} onChange={(e) => setKit({ ...kit, [k.name]: e.target.checked })} />
              <span className="kit__icon"><Icon name={k.icon} size={18} /></span>
              <span className="kit__text"><span className="kit__name">{k.name}</span><span className="kit__sub">{k.sub}</span></span>
            </label>
          ))}
        </div>
      </div>
      <p className="note-line"><Icon name="shield" size={16} />Go with a buddy. Skip it if the water is above your knees or running fast.</p>
    </section>
  );
}
