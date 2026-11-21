import os
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Response
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