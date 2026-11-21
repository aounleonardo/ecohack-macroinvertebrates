/**
 * Tray photo → family detections.
 *
 * Contract (what any GPU service must return; the FastAPI /api/inference route normalises to this):
 *   POST multipart/form-data  field "file" = image, optional "site_id"
 *   → { "detections": [ { "family": "Baetidae", "confidence": 0.92,
 *                          "bbox": [x1, y1, x2, y2] | null,   // pixels of the uploaded image, or 0–1 normalised
 *                                                              // ("bbox_format": "xywh..." at top level = [x, y, w, h])
 *                          "count": 1 } ],                    // optional, default 1 (VLMs may return counts without boxes)
 *       "image_width": 1760, "image_height": 1200, "model": "yolo-pilot" }
 *
 * Lookup order:
 *   1. precomputed JSON in /data/inference/ by image SHA-256, then by file name (instant, for the demo)
 *   2. VITE_INFER_URL: call a GPU endpoint (Modal / Lightning) directly from the browser, if it allows CORS
 *   3. FastAPI: POST {VITE_API_URL}/api/inference, which forwards to INFER_URL server-side
 */

export type Detection = {
  family: string;
  confidence: number;
  bbox?: [number, number, number, number] | null;
  count?: number;
  /** KiEco mapping quality from insecta → catalog resolver */
  match_kind?: string;
  hint?: string | null;
  pilot_suggestion?: boolean;
  model_latin?: string;
  class_id?: number;
};

export type InferenceResult = {
  detections: Detection[];
  image_width?: number;
  image_height?: number;
  model?: string;
  source: "precomputed" | "gpu" | "api";
};

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";
const INFER_URL = import.meta.env.VITE_INFER_URL ?? import.meta.env.VITE_LIGHTNING_INFER_URL;

async function sha256(file: Blob): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function normalise(raw: unknown, source: InferenceResult["source"]): InferenceResult {
  const r = (raw ?? {}) as Record<string, unknown>;
  const xywh = String(r.bbox_format ?? "").startsWith("xywh");
  const list = (Array.isArray(r.detections) ? r.detections : Array.isArray(r.predictions) ? r.predictions : []) as Record<string, unknown>[];
  const detections: Detection[] = list
    .map((d) => {
      const family = String(d.family ?? d.label ?? d.class ?? "").trim();
      const conf = Number(d.confidence ?? d.score ?? d.conf ?? 0);
      const bb = (d.bbox ?? d.box ?? null) as number[] | null;
      const famNorm = family ? family[0].toUpperCase() + family.slice(1).toLowerCase() : "";
      return {
        family: famNorm,
        confidence: conf > 1 ? conf / 100 : conf,
        bbox: Array.isArray(bb) && bb.length === 4
          ? ((xywh ? [bb[0], bb[1], bb[0] + bb[2], bb[1] + bb[3]] : bb).map(Number) as [number, number, number, number])
          : null,
        count: d.count != null ? Number(d.count) : d.count_est != null ? Number(d.count_est) : d.approximate_count != null ? Number(d.approximate_count) : 1,
        match_kind: d.match_kind != null ? String(d.match_kind) : undefined,
        hint: d.hint != null ? String(d.hint) : undefined,
        pilot_suggestion: d.pilot_suggestion === true,
        model_latin: d.model_latin != null ? String(d.model_latin) : undefined,
        class_id: d.class_id != null ? Number(d.class_id) : undefined,
      };
    })
    .filter((d) => d.family);
  return {
    detections,
    image_width: r.image_width != null ? Number(r.image_width) : undefined,
    image_height: r.image_height != null ? Number(r.image_height) : undefined,
    model: r.model != null ? String(r.model) : undefined,
    source,
  };
}

async function tryPrecomputed(file: File): Promise<InferenceResult | null> {
  const keys = [await sha256(file), file.name.replace(/\.[^.]+$/, "")];
  for (const key of keys) {
    const res = await fetch(`/data/inference/${encodeURIComponent(key)}.json`).catch(() => null);
    if (res?.ok && res.headers.get("content-type")?.includes("json")) return normalise(await res.json(), "precomputed");
  }
  return null;
}

async function postImage(url: string, file: File, siteId: string, auth = false): Promise<unknown> {
  const body = new FormData();
  body.append("file", file, file.name);
  body.append("site_id", siteId);
  const token = auth ? sessionStorage.getItem("demo_token") : null;
  const res = await fetch(url, { method: "POST", body, headers: token ? { Authorization: `Bearer ${token}` } : undefined });
  if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => "")}`.trim());
  return res.json();
}

export async function detectFamilies(file: File, siteId: string): Promise<InferenceResult> {
  const pre = await tryPrecomputed(file);
  if (pre) return pre;
  if (INFER_URL) return normalise(await postImage(INFER_URL, file, siteId), "gpu");
  return normalise(await postImage(API_BASE ? `${API_BASE}/api/inference` : "/api/inference", file, siteId, true), "api");
}

/** Bundled demo tray (works offline): a fixture with matching precomputed boxes. */
export async function demoTrayFile(): Promise<File> {
  const blob = await (await fetch("/demo/darwinflow-demo-tray.jpg")).blob();
  return new File([blob], "darwinflow-demo-tray.jpg", { type: "image/jpeg" });
}

export const LOW_CONFIDENCE = 0.7;

/** The family was inferred (order hint, morphology or kick-sample guess), not matched exactly. */
function inferredMatch(kind?: string) {
  return !!kind && kind !== "exact" && kind !== "confirmed";
}

/** Shown dashed with a Yes/No check, and kept out of the Dex until someone says Yes. */
export function isTentative(d: { confidence: number; pilot_suggestion?: boolean; match_kind?: string }) {
  return d.confidence < LOW_CONFIDENCE || !!d.pilot_suggestion || inferredMatch(d.match_kind);
}

/** A person said Yes to this family: it counts as identified from here on. */
export function confirmFamily(result: InferenceResult, family: string): InferenceResult {
  return {
    ...result,
    detections: result.detections.map((d) =>
      d.family === family ? { ...d, confidence: Math.max(d.confidence, LOW_CONFIDENCE), pilot_suggestion: false, match_kind: "confirmed" } : d),
  };
}

/** Group detections by family: count, mean confidence. */
export function byFamily(dets: Detection[]) {
  const m = new Map<
    string,
    { family: string; count: number; conf: number; n: number; boxes: number; hint?: string; match_kind?: string; pilot: boolean }
  >();
  for (const d of dets) {
    const e = m.get(d.family) ?? { family: d.family, count: 0, conf: 0, n: 0, boxes: 0, pilot: false };
    e.count += d.count ?? 1;
    e.conf += d.confidence;
    e.n += 1;
    if (d.bbox) e.boxes += 1;
    if (d.hint && !e.hint) e.hint = d.hint;
    if (d.match_kind && !e.match_kind) e.match_kind = d.match_kind;
    if (d.pilot_suggestion || inferredMatch(d.match_kind)) e.pilot = true;
    m.set(d.family, e);
  }
  return [...m.values()].map((e) => ({
    family: e.family,
    count: e.count,
    confidence: e.conf / e.n,
    hasBoxes: e.boxes > 0,
    hint: e.hint,
    match_kind: e.match_kind,
    pilot_suggestion: e.pilot,
  }));
}
