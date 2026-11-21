import { useEffect, useRef, useState } from "react";
import { byFamily, demoTrayFile, detectFamilies, type InferenceResult } from "../lib/inference";
import { isDexFamily } from "../lib/families";
import { FamilyArt } from "./atoms";
import { DetectionOverlay } from "./DetectionOverlay";
import { Icon, type IconName } from "./Icon";

type Props = {
  siteId: string;
  siteName: string;
  dex: Set<string>;
  common: (f: string) => string;
  onClose: () => void;
  onAddToDex: (families: string[]) => void;
};

type Step = "pick" | "working" | "result" | "error";
const LOW = 0.7;

const TIPS: [IconName, string, string][] = [
  ["camera", "Shoot from directly above", "No angle, the whole tray in frame."],
  ["water", "Shade the tray", "Glare hides small animals."],
  ["tray", "Spread them out", "A little water, animals not touching."],
  ["board", "Include the whiteboard", "Site code and date in the photo."],
];

/** Upload tray photo → detections → results → Add to my Dex. Matches the CV screens on the canvas. */
export function UploadFlow({ siteId, siteName, dex, common, onClose, onAddToDex }: Props) {
  const [step, setStep] = useState<Step>("pick");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [result, setResult] = useState<InferenceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejected, setRejected] = useState<Set<string>>(new Set());
  const [dragging, setDragging] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const run = useRef(0);

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  useEffect(() => {
    if (step !== "working") return;
    const t0 = Date.now();
    const iv = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 500);
    return () => clearInterval(iv);
  }, [step]);

  async function start(f: File) {
    const id = ++run.current;
    setFile(f);
    setUrl(URL.createObjectURL(f));
    setResult(null);
    setRejected(new Set());
    setError(null);
    setElapsed(0);
    setStep("working");
    try {
      const r = await detectFamilies(f, siteId);
      if (id !== run.current) return; // cancelled or superseded
      setResult(r);
      setStep("result");
    } catch (e) {
      if (id !== run.current) return;
      setError(e instanceof Error ? e.message : String(e));
      setStep("error");
    }
  }

  const pickFile = (files: FileList | null) => {
    const f = files?.[0];
    if (f && f.type.startsWith("image/")) start(f);
  };
  const useDemo = async () => start(await demoTrayFile());
  const cancel = () => { run.current++; setStep("pick"); };

  const fams = result ? byFamily(result.detections).filter((f) => !rejected.has(f.family)).sort((a, b) => Number(isNew(b.family)) - Number(isNew(a.family)) || b.count - a.count) : [];
  function isNew(f: string) { return isDexFamily(f) && !dex.has(f); }
  const newOnes = fams.filter((f) => isNew(f.family) && f.confidence >= LOW).map((f) => f.family);
  const animals = fams.reduce((n, f) => n + f.count, 0);
  const stepNo = step === "pick" || step === "error" ? 2 : step === "working" ? 2 : 3;

  return (
    <div className="upload-flow" role="region" aria-label="Upload tray photo">
      <div className="flow-bar">
        <button type="button" className="btn btn--ghost btn--sm flow-back" onClick={onClose}><span style={{ transform: "rotate(180deg)", display: "flex" }}><Icon name="chev-right" size={18} /></span>{siteName}</button>
        <ol className="stepper" aria-label="Progress">
          {["Sample", "Upload photo", "Check results", "Add to Dex"].map((s, i) => (
            <li key={s} className={i + 1 < stepNo ? "done" : i + 1 === stepNo ? "current" : ""} aria-current={i + 1 === stepNo ? "step" : undefined}>
              <span className="stepper__n">{i + 1 < stepNo ? <Icon name="check" size={14} strokeWidth={2.6} /> : i + 1}</span>{s}
            </li>
          ))}
        </ol>
        <span className="caption">Kick sample · {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
      </div>

      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { pickFile(e.target.files); e.target.value = ""; }} />

      {step === "pick" && (
        <div className="flow-grid">
          <section
            className={`dropzone${dragging ? " dropzone--over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files); }}
          >
            <img src="/art/scenes/tray-line.svg" alt="" width={260} height={200} />
            <h1 className="dropzone__title">Drop your tray photo here</h1>
            <p className="body-2" style={{ maxWidth: 440 }}>We’ll find each animal, suggest its family and count them. You check the result before anything is saved.</p>
            <div className="dropzone__actions">
              <button type="button" className="btn btn--primary btn--lg" onClick={() => input.current?.click()}><Icon name="camera" size={18} />Choose photo</button>
              <button type="button" className="btn btn--secondary btn--lg" onClick={useDemo}>Use the demo tray</button>
            </div>
            <p className="caption">JPG, PNG or HEIC · one tray per photo</p>
          </section>
          <section className="card tips">
            <h2 className="h-display-s">For a good ID</h2>
            <ul>
              {TIPS.map(([ic, a, b]) => (
                <li key={a}><span className="tips__icon"><Icon name={ic} size={19} /></span><span className="stack-2"><span className="label">{a}</span><span className="body-2">{b}</span></span></li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {(step === "working" || step === "error") && url && (
        <div className="flow-grid">
          <figure className="scan">
            <img src={url} alt="Your tray photo" />
            {step === "working" && <span className="scan__band" aria-hidden />}
            {step === "working" && <span className="scan__label"><Icon name="sparkle" size={15} />Identifying…</span>}
          </figure>
          <section className="card stages">
            {step === "working" ? (
              <>
                <h2 className="h-display-m">Identifying families…</h2>
                <ol>
                  <li className="done"><span className="stage__mark"><Icon name="check" size={16} strokeWidth={2.6} /></span><span className="stack-2"><span className="label">Photo ready</span><span className="caption">{file?.name} · {((file?.size ?? 0) / 1e6).toFixed(1)} MB</span></span></li>
                  <li className="now"><span className="stage__mark stage__mark--spin" aria-hidden /><span className="stack-2"><span className="label">Uploading and identifying</span><span className="caption">{elapsed}s · usually under a minute</span></span></li>
                  <li><span className="stage__mark" /><span className="label muted">Counting individuals</span></li>
                  <li><span className="stage__mark" /><span className="label muted">Ready to check</span></li>
                </ol>
                <button type="button" className="btn btn--ghost btn--sm" onClick={cancel}>Cancel</button>
              </>
            ) : (
              <>
                <h2 className="h-display-m">We couldn’t identify this photo</h2>
                <p className="body-2">The identification service didn’t answer. Check that the API is running, or try the demo tray.</p>
                <p className="code-block">{error}</p>
                <div className="stack-8">
                  <button type="button" className="btn btn--primary" onClick={() => file && start(file)}>Try again</button>
                  <button type="button" className="btn btn--secondary" onClick={() => input.current?.click()}>Choose another photo</button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={useDemo}>Use the demo tray</button>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {step === "result" && result && url && (
        <div className="flow-grid flow-grid--result">
          <div className="stack-8" style={{ minWidth: 0 }}>
            <DetectionOverlay src={url} alt="Your tray photo with animals outlined" result={result} isNew={isNew} common={common} hidden={rejected} />
            <div className="det-legend">
              <span><i className="det-key" />Identified</span>
              <span><i className="det-key det-key--new" />New to your Dex</span>
              <span><i className="det-key det-key--low" />Low confidence, please check</span>
              {!result.detections.some((d) => d.bbox) && <span>This model returns families without positions.</span>}
            </div>
          </div>
          <section className="card results" aria-label="Families found">
            <div className="stack-4">
              <h1 className="h-display-m">{fams.length ? `${fams.length} famil${fams.length === 1 ? "y" : "ies"}, ${animals} animal${animals === 1 ? "" : "s"}` : "No invertebrates found"}</h1>
              <p className="caption">{siteName} · {result.source === "precomputed" ? "precomputed demo result" : result.model ?? "identification service"}</p>
            </div>
            {fams.length === 0 && <p className="body-2">Try a sharper photo from directly above, with the animals spread out.</p>}
            <ul className="result-rows">
              {fams.map((f) => {
                const fresh = isNew(f.family);
                const low = f.confidence < LOW || f.pilot_suggestion;
                return (
                  <li key={f.family} className={fresh && !low ? "result-row result-row--new" : "result-row"}>
                    <FamilyArt family={f.family} size={44} label={common(f.family)} />
                    <span className="names">
                      <span className="names__common">{common(f.family)}{fresh && !low && <span className="tag-new"><Icon name="sparkle" size={11} strokeWidth={2} />NEW</span>}</span>
                      <span className="names__latin">{f.family}</span>
                      {f.hint && <span className="caption" style={{ maxWidth: 280 }}>{f.hint}</span>}
                      {low && (
                        <span className="confirm">Is this right?
                          <button type="button" className="btn btn--secondary btn--xs" onClick={() => setResult({ ...result, detections: result.detections.map((d) => (d.family === f.family ? { ...d, confidence: Math.max(d.confidence, LOW) } : d)) })}>Yes</button>
                          <button type="button" className="btn btn--secondary btn--xs" onClick={() => setRejected(new Set([...rejected, f.family]))}>No</button>
                        </span>
                      )}
                    </span>
                    <span className="result-row__meta">
                      <span className="result-row__count">×{f.count}</span>
                      <span className="conf"><span className="bar bar--thin"><span style={{ width: `${Math.round(f.confidence * 100)}%`, background: low ? "var(--ink-3)" : "var(--river-700)" }} /></span>{Math.round(f.confidence * 100)}%</span>
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="note"><Icon name="info" size={16} /><span><strong>Pilot classifier.</strong> IDs are suggestions until a coordinator confirms them.</span></p>
            <div className="stack-8" style={{ marginTop: "auto" }}>
              <button type="button" className="btn btn--primary btn--lg btn--full" disabled={!fams.length} onClick={() => onAddToDex(fams.filter((f) => f.confidence >= LOW).map((f) => f.family))}>
                <Icon name="dex" size={18} />Add to my Dex
              </button>
              {newOnes.length > 0 && <p className="caption center" style={{ color: "var(--moss-700)", fontWeight: 600 }}>{newOnes.length} new famil{newOnes.length === 1 ? "y" : "ies"}: {newOnes.map(common).join(", ")}</p>}
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setStep("pick")}>Upload another photo</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
