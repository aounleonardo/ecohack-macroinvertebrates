import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { SitePanel } from "./components/SitePanel";
import { login } from "./lib/api";
import {
  loadPrecomputedInference,
  loadSitesGeoJSON,
  parseSiteProperties,
  type SiteProperties,
} from "./lib/data";

const STALE_COLOR: Record<string, string> = {
  fresh: "#1a7f37",
  aging: "#9a6700",
  stale: "#cf222e",
  unknown: "#6e7781",
};

/** Default view: Cynon valley / Mountain Ash–Aberaman demo corridor */
const INITIAL_CENTER: [number, number] = [-3.415, 51.705];
const INITIAL_ZOOM = 12.8;

type ReachFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.LineString,
  Record<string, unknown>
>;

async function loadRiverReaches(): Promise<ReachFeatureCollection> {
  const res = await fetch("/data/river_reaches.geojson");
  if (!res.ok) throw new Error("river_reaches.geojson missing — run npm run etl");
  return res.json() as Promise<ReachFeatureCollection>;
}

async function loadRiverBackground(): Promise<ReachFeatureCollection> {
  const res = await fetch("/data/wales_rivers_background.geojson");
  if (!res.ok) throw new Error("wales_rivers_background.geojson missing");
  return res.json() as Promise<ReachFeatureCollection>;
}

export default function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [selected, setSelected] = useState<SiteProperties | null>(null);
  const [inferPreview, setInferPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [background, reaches, geo] = await Promise.all([
          loadRiverBackground(),
          loadRiverReaches(),
          loadSitesGeoJSON(),
        ]);
        if (cancelled || !mapContainer.current) return;

        const map = new maplibregl.Map({
          container: mapContainer.current,
          style:
            "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
          center: INITIAL_CENTER,
          zoom: INITIAL_ZOOM,
          maxBounds: [
            [-5.2, 51.25],
            [-2.4, 53.0],
          ],
        });
        mapRef.current = map;

        map.on("load", () => {
          map.addSource("rivers-bg", { type: "geojson", data: background });
          map.addLayer({
            id: "rivers-background",
            type: "line",
            source: "rivers-bg",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": "#d4a5a5",
              "line-width": [
                "interpolate",
                ["linear"],
                ["zoom"],
                8,
                2,
                12,
                4,
                15,
                6,
              ],
              "line-opacity": 0.85,
            },
          });

          map.addSource("reaches", { type: "geojson", data: reaches });
          map.addLayer({
            id: "river-reaches",
            type: "line",
            source: "reaches",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-width": [
                "interpolate",
                ["linear"],
                ["zoom"],
                8,
                4,
                12,
                10,
                15,
                14,
              ],
              "line-color": [
                "match",
                ["get", "staleness"],
                "fresh",
                STALE_COLOR.fresh,
                "aging",
                STALE_COLOR.aging,
                "stale",
                STALE_COLOR.stale,
                STALE_COLOR.unknown,
              ],
              "line-opacity": 0.92,
            },
          });

          // Invisible wider hit target for clicks
          map.addLayer({
            id: "river-reaches-hit",
            type: "line",
            source: "reaches",
            paint: {
              "line-width": 20,
              "line-opacity": 0,
            },
          });

          const hitLayer = "river-reaches-hit";
          map.on("click", hitLayer, (e) => {
            const f = e.features?.[0];
            if (!f?.properties) return;
            setSelected(
              parseSiteProperties(f.properties as Record<string, unknown>),
            );
          });
          map.on("mouseenter", hitLayer, () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", hitLayer, () => {
            map.getCanvas().style.cursor = "";
          });

          // Optional faint context for all NRW points (not primary UI)
          map.addSource("sites", { type: "geojson", data: geo });
          map.addLayer({
            id: "sites-dots",
            type: "circle",
            source: "sites",
            minzoom: 11,
            paint: {
              "circle-radius": 3,
              "circle-color": "#888",
              "circle-opacity": 0.35,
            },
          });
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load map");
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
    };
  }, []);

  async function onDemoLogin() {
    try {
      await login(import.meta.env.VITE_DEMO_PASSWORD ?? "river2026");
      setError(null);
    } catch {
      setError("Login failed — is Render API running?");
    }
  }

  async function onPrecomputedInfer() {
    try {
      const result = await loadPrecomputedInference("kick-sampling-tray-still");
      setInferPreview(`${result.detections.length} families (precomputed)`);
    } catch {
      setInferPreview("Add web/public/data/inference/kick-sampling-tray-still.json");
    }
  }

  return (
    <div className="app-shell">
      <div ref={mapContainer} className="map-wrap" />
      <aside className="sidebar">
        <h1 style={{ fontSize: "1.1rem", marginTop: 0 }}>Wales river macro monitor</h1>
        <p style={{ fontSize: "0.85rem", color: "#555" }}>
          Light red-gray lines = Welsh rivers (OpenStreetMap). Coloured reach extends
          along the river from each sample (longer when sites are far apart, nearly
          meeting the next site when they are close).
        </p>
        <details className="dev-tools">
          <summary>Developer tools (hackathon)</summary>
          <p>
            <strong>Demo login</strong> — checks password against your local Render API;
            stores a token for upload/ingest routes.
          </p>
          <button type="button" onClick={onDemoLogin}>
            Demo login (Render)
          </button>
          <p>
            <strong>Precomputed CV</strong> — loads static bbox JSON from{" "}
            <code>/data/inference/</code> (no model).
          </p>
          <button type="button" onClick={onPrecomputedInfer}>
            Precomputed CV (Vite)
          </button>
          {inferPreview && <p>{inferPreview}</p>}
        </details>
        {error && <p className="error-text">{error}</p>}
        {selected ? (
          <SitePanel site={selected} />
        ) : (
          <p>Click a coloured river reach on the map.</p>
        )}
      </aside>
    </div>
  );
}