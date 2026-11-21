import { useState } from "react";
import { login } from "../lib/api";
import { resetDex } from "../lib/dex";
import { Icon } from "./Icon";

/** Ways into the computer-vision demo, from the gear menu or a ?cv= deep link. */
export type CvShortcut = "upload" | "result" | "unlock" | "review";

export const CV_SHORTCUTS: { id: CvShortcut; label: string; hint: string }[] = [
  { id: "upload", label: "Upload screen", hint: "?cv=upload" },
  { id: "result", label: "Detection result", hint: "?cv=result" },
  { id: "unlock", label: "Dex unlock moment", hint: "?cv=unlock" },
  { id: "review", label: "Coordinator review", hint: "?cv=review" },
];

/** Hackathon tools behind a small gear: demo shortcuts, login, reset. */
export function DevTools({ onOpenCv }: { onOpenCv?: (k: CvShortcut) => void }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onDemoLogin() {
    try {
      await login(import.meta.env.VITE_DEMO_PASSWORD ?? "river2026");
      setMsg("Logged in (token stored for upload/ingest routes).");
    } catch {
      setMsg("Login failed: is the Render API running?");
    }
  }

  return (
    <div className="devtools">
      <button type="button" className="ctrl-single" aria-label="Developer tools" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon name="gear" size={18} />
      </button>
      {open && (
        <div className="devtools__panel" role="dialog" aria-label="Developer tools">
          {onOpenCv && (
            <>
              <p className="overline">Computer vision demo</p>
              {CV_SHORTCUTS.map((s) => (
                <button key={s.id} type="button" className="btn btn--secondary btn--sm devtools__cv" onClick={() => { setOpen(false); onOpenCv(s.id); }}>
                  <span>{s.label}</span><code>{s.hint}</code>
                </button>
              ))}
            </>
          )}
          <p className="overline" style={{ marginTop: 6 }}>Developer tools</p>
          <button type="button" className="btn btn--secondary btn--sm" onClick={onDemoLogin}>Demo login (Render)</button>
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => { resetDex(); window.location.reload(); }}>Reset demo Dex</button>
          {msg && <p className="caption">{msg}</p>}
        </div>
      )}
    </div>
  );
}
