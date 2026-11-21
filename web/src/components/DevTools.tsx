import { useState } from "react";
import { login } from "../lib/api";
import { loadPrecomputedInference } from "../lib/data";
import { Icon } from "./Icon";

/** Hackathon developer tools, tucked behind a small gear (was a visible sidebar section). */
export function DevTools() {
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

  async function onPrecomputedInfer() {
    try {
      const result = await loadPrecomputedInference("kick-sampling-tray-still");
      setMsg(`${result.detections.length} families (precomputed)`);
    } catch {
      setMsg("Add web/public/data/inference/kick-sampling-tray-still.json");
    }
  }

  return (
    <div className="devtools">
      <button type="button" className="ctrl-single" aria-label="Developer tools" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon name="gear" size={18} />
      </button>
      {open && (
        <div className="devtools__panel" role="dialog" aria-label="Developer tools">
          <p className="overline">Developer tools</p>
          <button type="button" className="btn btn--secondary btn--sm" onClick={onDemoLogin}>Demo login (Render)</button>
          <button type="button" className="btn btn--secondary btn--sm" onClick={onPrecomputedInfer}>Precomputed CV (static JSON)</button>
          {msg && <p className="caption">{msg}</p>}
        </div>
      )}
    </div>
  );
}
