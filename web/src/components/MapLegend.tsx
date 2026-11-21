import { useState } from "react";
import { LEGEND } from "../map/mapStyle";
import { BandSwatch, StatusGlyph } from "./atoms";
import { Icon } from "./Icon";

/** Compact, collapsible legend (replaces the old explanatory paragraph). */
export function MapLegend() {
  const [open, setOpen] = useState(true);
  return (
    <aside className="legend" aria-label="Map legend">
      <div className="legend__head">
        <p className="overline">Last sampled</p>
        <button type="button" className="icon-btn icon-btn--sm" aria-expanded={open} aria-label={open ? "Collapse legend" : "Expand legend"} onClick={() => setOpen(!open)}>
          <span style={{ transform: open ? "none" : "rotate(180deg)", display: "flex" }}><Icon name="chev-down" size={16} /></span>
        </button>
      </div>
      {open && (
        <>
          <ul className="legend__list">
            {LEGEND.map(({ status, label }) => (
              <li key={status} className={status === "none" ? "legend__row legend__row--muted" : "legend__row"}>
                <BandSwatch status={status} />
                {status === "none" ? <span style={{ width: 16 }} /> : <StatusGlyph status={status} size={16} />}
                <span>{label}</span>
              </li>
            ))}
          </ul>
          <p className="caption">Bands show the stretch of river each sample stands for.</p>
        </>
      )}
    </aside>
  );
}
