import type { SurveyYearStatus } from "../lib/taxa";

type Props = {
  timeline: { year: number; status: SurveyYearStatus; count?: number | null }[];
};

const LABEL: Record<SurveyYearStatus, string> = { present: "Found", absent: "Not found (surveyed)", missing: "No survey" };

function hasCounts(timeline: Props["timeline"]) {
  return timeline.some((c) => typeof c.count === "number" && c.count > 0);
}

/** Year strip: solid teal = found, hollow = surveyed but not found, faint = no survey.
 *  Deliberately not red/green, so it never reads as river status. */
export function FamilyTimeline({ timeline }: Props) {
  if (!timeline.length) return <p className="caption">No yearly record for this site.</p>;
  const barMode = hasCounts(timeline);
  const maxCount = barMode ? Math.max(...timeline.map((c) => (typeof c.count === "number" ? c.count : 0)), 1) : 1;

  return (
    <div className="family-timeline">
      <div className="timeline-legend">
        {(Object.keys(LABEL) as SurveyYearStatus[]).map((s) => (
          <span key={s}><i className={`tl tl--${s}`} /> {LABEL[s]}</span>
        ))}
      </div>
      <div className="timeline-scroll" role="list">
        {timeline.map((cell) => {
          const count = typeof cell.count === "number" ? cell.count : 0;
          const h = barMode && cell.status === "present" ? Math.max(4, (count / maxCount) * 40) : undefined;
          return (
            <div key={cell.year} className="timeline-cell" role="listitem" title={`${cell.year}: ${LABEL[cell.status]}${count ? ` (${count})` : ""}`}>
              <span className={`tl tl--${cell.status}`} style={h ? { height: h, alignSelf: "flex-end" } : undefined} />
              <span className="timeline-year">{String(cell.year).slice(2)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
