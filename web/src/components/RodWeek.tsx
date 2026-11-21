import { ago, dayName, hm, inTime, type RodWeek as Week } from "../lib/rodDemo";
import { FamilyArt, Sparkline } from "./atoms";
import { Icon } from "./Icon";

type Props = { week: Week; lastSurveyFamilies: string[]; lastYear: number | null; common: (f: string) => string };

/** MOCK rod deployment: status, week heatmap, per-burst trend, latest burst. */
export function RodWeek({ week, lastSurveyFamilies, lastYear, common }: Props) {
  const max = Math.max(1, ...week.families.flatMap((f) => f.perDay));
  const totals = week.bursts.map((b) => Object.values(b.counts).reduce((a, c) => a + c, 0));
  const animals = totals.reduce((a, b) => a + b, 0);
  const notBefore = week.families.filter((f) => !lastSurveyFamilies.includes(f.family));
  const latest = week.bursts[week.bursts.length - 1];
  const days = Array.from({ length: 7 }, (_, i) => new Date(week.installed.getTime() + i * 86400000));

  return (
    <>
      <section className="card rod-status">
        <div className="task-head">
          <span className="task-head__kind"><Icon name="rod" size={18} /><span className="overline overline--river">Camera rod · recording</span></span>
          <span className="chip chip--river"><span className="live-dot" aria-hidden />Live</span>
        </div>
        <div className="rod-days" aria-label={`Day ${week.day} of 7`}>
          {days.map((d, i) => <span key={i} className={i + 1 < week.day ? "done" : i + 1 === week.day ? "now" : ""} title={dayName(d)} />)}
        </div>
        <div className="rod-facts-grid">
          <span><Icon name="water" size={16} />Next bubble burst {hm(week.next)} ({inTime(week.next)})</span>
          <span><Icon name="history" size={16} />Last upload {ago(week.lastUpload)}</span>
          <span><Icon name="calendar" size={16} />Installed {dayName(week.installed)} by {week.installedBy}</span>
          <span><Icon name="clock" size={16} />Collect {dayName(week.collect)} · battery {week.battery}%</span>
        </div>
      </section>

      {notBefore.length > 0 && (
        <p className="note note--moss"><Icon name="sparkle" size={16} />
          <span><strong>{notBefore.map((f) => common(f.family)).join(", ")}</strong> showed up this week. {notBefore.length === 1 ? "It wasn’t" : "They weren’t"} in the last kick sample here{lastYear ? ` (${lastYear})` : ""}.</span></p>
      )}

      <section className="card card--tight">
        <div className="row-between"><h2 className="h-display-s">This week</h2><span className="caption">{week.bursts.length} bursts · {animals} animals</span></div>
        <div className="heat" role="table" aria-label="Animals detected per family per day">
          <div className="heat__row heat__row--head" role="row">
            <span role="columnheader" />
            {days.map((d, i) => <span key={i} role="columnheader" className={i + 1 > week.day ? "future" : ""}>{d.toLocaleDateString("en-GB", { weekday: "narrow" })}</span>)}
            <span role="columnheader">Total</span>
          </div>
          {week.families.map((f) => (
            <div key={f.family} className="heat__row" role="row">
              <span role="rowheader" className="heat__fam">
                <FamilyArt family={f.family} size={26} />
                <span>{common(f.family)}</span>
                {!lastSurveyFamilies.includes(f.family) && <span className="tag-new tag-new--sm">new here</span>}
              </span>
              {f.perDay.map((n, i) => (
                <span key={i} role="cell" className={`heat__cell${i + 1 > week.day ? " future" : ""}`} title={`${n} on ${dayName(days[i])}`}
                  style={i + 1 <= week.day && n ? { background: `rgba(27, 94, 102, ${0.15 + 0.85 * (n / max)})`, color: n / max > 0.5 ? "#fff" : "var(--ink)" } : undefined}>
                  {i + 1 <= week.day ? n || "" : ""}
                </span>
              ))}
              <span role="cell" className="heat__total">{f.total}</span>
            </div>
          ))}
        </div>
        <div className="spark-row" style={{ borderTop: 0 }}>
          <div className="stack-2"><span className="label">Animals per burst</span><span className="caption">Dusk bursts catch the most drift</span></div>
          <div className="stack-2"><Sparkline values={totals} label={`Animals per burst across ${totals.length} bursts`} /><span className="row-between caption"><span>Day 1</span><span>Day {week.day}</span></span></div>
        </div>
      </section>

      {latest && (
        <section className="card card--tight">
          <div className="row-between"><h2 className="h-display-s">Latest burst</h2><span className="caption">{dayName(latest.at)}, {hm(latest.at)}</span></div>
          <ul className="chips">
            {Object.entries(latest.counts).sort((a, b) => b[1] - a[1]).map(([f, n]) => (
              <li key={f} className="family-chip"><FamilyArt family={f} size={28} />{common(f)} ×{n}</li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
