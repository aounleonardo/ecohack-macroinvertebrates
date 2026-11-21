/** Render FastAPI — only auth, uploads, and server-side inference proxy. */

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";

function authHeaders(): HeadersInit {
  const token = sessionStorage.getItem("demo_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function login(password: string): Promise<void> {
  const url = API_BASE ? `${API_BASE}/api/auth/login` : "/api/auth/login";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error("Login failed");
  const data = (await res.json()) as { token: string };
  sessionStorage.setItem("demo_token", data.token);
}

export async function ingestSensor(payload: unknown): Promise<unknown> {
  const url = API_BASE
    ? `${API_BASE}/api/sensor/ingest`
    : "/api/sensor/ingest";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`ingest ${res.status}`);
  return res.json();
}

/**
 * Optional: call Lightning inference URL directly from the browser when CORS allows.
 */
export async function inferViaLightning(
  imageUrl: string,
): Promise<unknown> {
  const base = import.meta.env.VITE_LIGHTNING_INFER_URL;
  if (!base) {
    throw new Error("Set VITE_LIGHTNING_INFER_URL for client-side inference");
  }
  const res = await fetch(base, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl }),
  });
  if (!res.ok) throw new Error(`lightning ${res.status}`);
  return res.json();
}