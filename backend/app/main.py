import io
import os
from typing import Annotated

from fastapi import Depends, FastAPI, File, Form, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from starlette.status import HTTP_401_UNAUTHORIZED

app = FastAPI(title="River macro API", version="0.1.0")

_cors = os.environ.get("CORS_ORIGINS", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _cors.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEMO_PASSWORD = os.environ.get("DEMO_PASSWORD", "river2026")
# In-memory demo sessions (hackathon); token is opaque id
_sessions: set[str] = set()
_bearer = HTTPBearer(auto_error=False)


class LoginBody(BaseModel):
    password: str


class LoginResponse(BaseModel):
    token: str
    message: str = "ok"


def require_session(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> str:
    if creds is None or creds.credentials not in _sessions:
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing session",
        )
    return creds.credentials


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/auth/login", response_model=LoginResponse)
def login(body: LoginBody) -> LoginResponse:
    if body.password != DEMO_PASSWORD:
        raise HTTPException(status_code=HTTP_401_UNAUTHORIZED, detail="Wrong password")
    import secrets

    token = secrets.token_urlsafe(32)
    _sessions.add(token)
    return LoginResponse(token=token)


@app.get("/api/auth/me")
def me(session: Annotated[str, Depends(require_session)]) -> dict[str, str]:
    return {"authenticated": "true", "session": session[:8] + "…"}


@app.post("/api/sensor/ingest")
def sensor_ingest(
    payload: dict,
    session: Annotated[str, Depends(require_session)],
) -> dict:
    """Rod / phone_demo ingest — persists later; demo echoes payload."""
    return {"received": True, "session_prefix": session[:8], "payload": payload}


# --- Tray photo -> detections -------------------------------------------------
# Default: call the deployed Modal app (modal/insecta.py, `modal deploy modal/insecta.py`).
#   Needs MODAL_TOKEN_ID / MODAL_TOKEN_SECRET in this service's environment.
# Alternative: INFER_URL = any HTTP endpoint taking multipart "file" and returning {"detections": [...]}.
# Response is always normalised for the web app (web/src/lib/inference.ts):
#   {"detections": [{"family", "confidence", "bbox": [x1, y1, x2, y2] in 0-1, ...}], "bbox_format": "xyxy_normalized", ...}
MODAL_APP = os.environ.get("MODAL_APP", "macroinvertebrate-insecta")
MODAL_CLASS = os.environ.get("MODAL_CLASS", "InsectaModel")
INFER_URL = os.environ.get("INFER_URL", "")
INFER_TOKEN = os.environ.get("INFER_TOKEN", "")
MODAL_MAX_SIDE = 1280  # insecta.py resizes the long side to this before detecting; its boxes are in that space


def _oriented_size(data: bytes) -> tuple[int, int] | None:
    """Image size after EXIF rotation (what OpenCV sees on the GPU side)."""
    try:
        from PIL import Image, ImageOps

        with Image.open(io.BytesIO(data)) as im:
            return ImageOps.exif_transpose(im).size
    except Exception:
        return None


def _normalise_boxes(dets: list[dict], size: tuple[int, int] | None, *, xywh: bool, max_side: int | None) -> list[dict]:
    """Pixel boxes -> [x1, y1, x2, y2] in 0-1 of the image, so the browser can overlay them at any size."""
    if not size or not size[0] or not size[1]:
        return dets
    w, h = float(size[0]), float(size[1])
    if max_side and max(w, h) > max_side:
        s = max_side / max(w, h)
        w, h = w * s, h * s
    out = []
    for d in dets:
        b = d.get("bbox")
        if isinstance(b, (list, tuple)) and len(b) == 4:
            x1, y1, a, c = (float(v) for v in b)
            x2, y2 = (x1 + a, y1 + c) if xywh else (a, c)
            d = {**d, "bbox": [round(x1 / w, 4), round(y1 / h, 4), round(x2 / w, 4), round(y2 / h, 4)]}
        out.append(d)
    return out


@app.post("/api/inference")
async def infer_tray_photo(file: UploadFile = File(...), site_id: str = Form("")) -> dict:
    """Upload a tray photo, get family detections back (called by the web upload flow)."""
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty upload")
    size = _oriented_size(data)

    if INFER_URL:
        import httpx

        headers = {"Authorization": f"Bearer {INFER_TOKEN}"} if INFER_TOKEN else {}
        async with httpx.AsyncClient(timeout=180) as client:
            r = await client.post(
                INFER_URL,
                files={"file": (file.filename or "tray.jpg", data, file.content_type or "image/jpeg")},
                data={"site_id": site_id},
                headers=headers,
            )
        if r.status_code >= 400:
            raise HTTPException(status_code=502, detail=f"Detection service error {r.status_code}: {r.text[:300]}")
        out = r.json()
        fmt = str(out.get("bbox_format", "xyxy"))
        dets = out.get("detections") or []
        if "normali" not in fmt:
            src = (out.get("image_width"), out.get("image_height")) if out.get("image_width") else size
            dets = _normalise_boxes(dets, src, xywh=fmt.startswith("xywh"), max_side=None)
    else:
        try:
            import modal

            model = modal.Cls.from_name(MODAL_APP, MODAL_CLASS)()
            out = await model.infer.remote.aio(data, "kick_tray")
        except Exception as e:  # noqa: BLE001 - surface the reason to the UI
            raise HTTPException(status_code=502, detail=f"Modal inference failed: {e}") from e
        dets = _normalise_boxes(out.get("detections") or [], size, xywh=True, max_side=MODAL_MAX_SIDE)

    return {
        "detections": dets,
        "bbox_format": "xyxy_normalized",
        "image_width": size[0] if size else None,
        "image_height": size[1] if size else None,
        "model": out.get("model", "unknown"),
        "site_id": site_id,
    }


@app.post("/api/inference/{upload_id}")
def run_inference(
    upload_id: str,
    session: Annotated[str, Depends(require_session)],
) -> dict:
    """Proxy only when browser cannot call Lightning/DoubleWord directly."""
    return {
        "upload_id": upload_id,
        "status": "stub",
        "hint": "Prefer Vite → precomputed JSON or VITE_LIGHTNING_INFER_URL",
        "detections": [],
    }