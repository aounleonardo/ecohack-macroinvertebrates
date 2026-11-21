# Local development (DarwinFlow)

Primary workspace: `~/dev/ecohack/macroinvertebrates`

## 1. Get the commit

```bash
cd ~/dev/ecohack/macroinvertebrates
git pull origin main   # need 25cfd4f+ (tray CV + upload flow)
```

Orca feature worktree: `git fetch && git rebase origin/main` if you use that branch.

## 2. Two ways to develop locally

### A — Offline demo (fastest)

No backend, no Modal.

```bash
cd web && npm install && npm run dev
```

Open [http://localhost:5173](http://localhost:5173) → pick a site → upload flow → **Use demo tray** (precomputed boxes, instant).

### B — Full stack (your photos → Modal)

Two terminals.

**Terminal 1 — API**

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env` (do **not** commit):

```env
DEMO_PASSWORD=river2026
CORS_ORIGINS=http://localhost:5173
MODAL_TOKEN_ID=...
MODAL_TOKEN_SECRET=...
```

```bash
pip install -r requirements.txt   # includes `modal` — re-run after git pull
uvicorn app.main:app --reload --port 8000
```

`backend/.env` must include **`MODAL_TOKEN_ID`** and **`MODAL_TOKEN_SECRET`** (same as root `.env`), and you need **`modal deploy modal/insecta.py`** once. If `modal` is missing from the venv you get **502** with `No module named 'modal'`. Without tokens or deploy, you get a different 502 from Modal.

**Terminal 2 — Web (Vite proxy, not production API)**

```bash
cd web
```

`web/.env.local` — **omit** `VITE_API_URL` or leave it unset so inference goes through the dev proxy to `127.0.0.1:8000`:

```env
# VITE_API_URL=   ← do NOT point at Render if you want local API
```

```bash
npm run dev
```

Browser: [http://localhost:5173](http://localhost:5173)  
Optional: DevTools (gear) → **Demo login** (`river2026` if that’s `DEMO_PASSWORD`).

Upload: your image → `POST /api/inference` → Vite proxy → FastAPI → Modal.

### C — Frontend local, API on Render

`web/.env.local`:

```env
VITE_API_URL=https://YOUR-SERVICE.onrender.com
```

No local uvicorn; Render must have `MODAL_TOKEN_*` and `modal deploy` done.

## 3. Modal (path B local API or production)

From repo root, with `MODAL_TOKEN_*` in shell or root `.env` for the CLI:

```bash
pip install modal
git clone --depth 1 https://github.com/quarrying/quarrying-insect-id.git modal/vendor/quarrying-insect-id
modal deploy modal/insecta.py
```

Optional one-off test:

```bash
python3 -m modal run modal/insecta.py \
  --image-path data/media/tray-demo/kick-sample-tray-image01.jpg
```

See also `modal/README.md`.

## 4. Regenerate KiEco map (only when mapping rules change)

```bash
python3 scripts/build_insecta_kieco_map.py
```

Commit if `data/insecta_kieco_map.json` changed. Not required for every `npm run dev`.

## 5. Quick checks

| Check | Command / URL |
|-------|----------------|
| API up | [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health) |
| Proxy | Upload with **no** `VITE_API_URL` in `web/.env.local` |
| Demo tray | Upload flow → demo tray → instant |
| Live photo | Path B + `modal deploy` + tokens in `backend/.env` |

**CV screens without uploading:** `?cv=upload`, `?cv=result`, `?cv=unlock`, `?cv=review` (optional `&site=<site_id>`). DevTools gear shortcuts do the same.

## 6. Production (after `git push`)

- **Netlify:** `VITE_API_URL` = `https://ecohack-macroinvertebrates.onrender.com` (in `web/netlify.toml` or UI). Without it, uploads POST to the **static host** and Render never sees them — `web/netlify.toml` also proxies `/api/*` to Render as a fallback.
- **Render:** `MODAL_TOKEN_*`, `DEMO_PASSWORD`, `CORS_ORIGINS` must include your Netlify URL (e.g. `https://darwinflow.netlify.app`)
- **Modal:** `modal deploy modal/insecta.py` from the same commit as Render  

First request after idle can take **~50s** on Render free tier (cold start) before Modal runs.

Static map/taxa still ship from Netlify `prebuild` ETL; see `plan.md` client-first split.