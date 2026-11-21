import { useState } from "react";
import type { InferenceResult } from "../lib/inference";
import { Icon } from "./Icon";

type Props = {
  src: string;
  alt: string;
  result: InferenceResult;
  isNew: (family: string) => boolean;
  common: (family: string) => string;
  hidden: Set<string>;
};

const LOW = 0.7;

/** Tray photo with a rounded box and label chip per detection. Boxes are placed in % of the image,
 *  so they track the rendered size. bbox: [x1, y1, x2, y2] in image pixels, or 0–1 normalised. */
export function DetectionOverlay({ src, alt, result, isNew, common, hidden }: Props) {
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const W = result.image_width ?? nat?.w ?? 0;
  const H = result.image_height ?? nat?.h ?? 0;

  return (
    <div className="det-photo">
      <img src={src} alt={alt} onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} />
      {W > 0 && H > 0 && result.detections.map((d, i) => {
        if (!d.bbox || hidden.has(d.family)) return null;
        const [x1, y1, x2, y2] = d.bbox;
        const norm = Math.max(x1, y1, x2, y2) <= 1.0001;
        const l = (norm ? x1 : x1 / W) * 100, t = (norm ? y1 : y1 / H) * 100;
        const w = ((norm ? x2 - x1 : (x2 - x1) / W) * 100), h = ((norm ? y2 - y1 : (y2 - y1) / H) * 100);
        const fresh = isNew(d.family);
        const low = d.confidence < LOW;
        const cls = `det-box${fresh ? " det-box--new" : ""}${low ? " det-box--low" : ""}`;
        const chipBelow = t < 7;
        const chipRight = l > 62;
        return (
          <div key={i} className={cls} title={`${d.family} · ${common(d.family)} · ${Math.round(d.confidence * 100)}%`}
            style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%`, zIndex: fresh ? 3 : low ? 1 : 2 }}>
            {fresh && <span className="det-sparkle" aria-hidden><Icon name="sparkle" size={18} strokeWidth={1.6} /></span>}
            <span className={`det-chip${chipBelow ? " det-chip--below" : ""}${chipRight ? " det-chip--right" : ""}`}>
              {fresh && <Icon name="sparkle" size={12} strokeWidth={2} />}
              {fresh ? "NEW " : ""}{d.family}{low ? "?" : ""} {Math.round(d.confidence * 100)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
