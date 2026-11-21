/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_LIGHTNING_INFER_URL?: string;
  /** Optional: GPU detection endpoint (Modal / Lightning) the browser may call directly; see src/lib/inference.ts */
  readonly VITE_INFER_URL?: string;
  readonly VITE_DEMO_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}