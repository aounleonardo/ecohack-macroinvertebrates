import type { Sensitivity } from "../lib/families";
import { FamilyArt, SensitivityBadge } from "./atoms";
import { Icon } from "./Icon";

type Props = {
  family: string;
  number: number;
  common: string;
  sensitivity: Sensitivity;
  where?: string;
  when?: string;
  isNew?: boolean;
  width?: number;
};

/** Trading-card style Dex entry, used by the unlock moment. */
export function TradingCard({ family, number, common, sensitivity, where, when, isNew, width = 300 }: Props) {
  return (
    <article className={`tcard${isNew ? " tcard--new" : ""}`} style={{ width }} aria-label={`Dex card: ${common}`}>
      <div className="tcard__plate">
        <span className="tcard__no">No. {String(number).padStart(2, "0")}</span>
        <span className="tcard__sens"><SensitivityBadge s={sensitivity} /></span>
        <FamilyArt family={family} size={Math.round(width * 0.62)} tile={false} label={common} />
        {isNew && <span className="tcard__new"><Icon name="sparkle" size={12} strokeWidth={2} />NEW</span>}
      </div>
      <div className="stack-2" style={{ padding: "0 6px" }}>
        <h3 className="h-display-m">{common}</h3>
        <p className="names__latin">{family}</p>
      </div>
      {where && (
        <div className="tcard__foot">
          <span><Icon name="pin" size={15} />First recorded at {where}</span>
          {when && <span className="caption">{when}</span>}
        </div>
      )}
    </article>
  );
}
