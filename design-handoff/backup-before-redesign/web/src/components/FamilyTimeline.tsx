import type { SurveyYearStatus } from "../lib/taxa";

const COLORS: Record<SurveyYearStatus, string> = {
  present: "#1a7f37",
  absent: "#cf222e",
  missing: "#d0d7de",
};

type Props = {
  timeline: { year: number; status: SurveyYearStatus; count?: number | null }[];
};

function hasCounts(timeline: Props["timeline"]) {
  return timeline.some((c) => typeof c.count === "number" && c.count > 0);
}

export function FamilyTimeline({ timeline }: Props) {
  if (!timeline.length) {
    return <p className="timeline-empty">No yearly timeline for this site.</p>;
  }

  const barMode = hasCounts(timeline);
  const maxCount = barMode
    ? Math.max(...timeline.map((c) => (typeof c.count === "number" ? c.count : 0)), 1)
    : 1;

  return (
    <div className="family-timeline">
      <div className="timeline-legend">
        <span>
          <i style={{ background: COLORS.present }} /> Found
        </span>
        <span>
          <i style={{ background: COLORS.absent }} /> Not found (surveyed)
        </span>
        <span>
          <i style={{ background: COLORS.missing }} /> No survey
        </span>
      </div>
      <div className="timeline-scroll" role="list">
        {timeline.map((cell) => {
          const count = typeof cell.count === "number" ? cell.count : 0;
          const h = barMode && cell.status === "present" ? Math.max(4, (count / maxCount) * 48) : 28;
          return (
            <div
              key={cell.year}
              className={`timeline-cell${barMode ? " timeline-cell-bars" : ""}`}
              role="listitem"
              title={`${cell.year}: ${cell.status}${count ? ` (${count})` : ""}`}
              style={{
                background: barMode && cell.status === "present" ? undefined : COLORS[cell.status],
                height: barMode ? 56 : undefined,
              }}
            >
              {barMode && cell.status === "present" ? (
                <div
                  className="timeline-bar"
                  style={{ height: h, background: COLORS.present }}
                />
              ) : !barMode ? null : (
                <div
                  className="timeline-bar timeline-bar-flat"
                  style={{ background: COLORS[cell.status] }}
                />
              )}
              <span className="timeline-year">{cell.year}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}