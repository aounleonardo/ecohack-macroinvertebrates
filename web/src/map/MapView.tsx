import { useEffect, useRef, useState } from "react";
import maplibregl, { type LngLatBoundsLike, type Map as MlMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  BASEMAP_URL, STATUS, applyCatchment, fallbackStyle, firstSymbolId, overlayLayers,
  registerImages, riverBackgroundLayer, tuneBasemap,
} from "./mapStyle";
import type { SitesFeatureCollection } from "../lib/data";
import type { Status } from "../lib/staleness";
import { MapLegend } from "../components/MapLegend";
import { DevTools, type CvShortcut } from "../components/DevTools";
import { Icon } from "../components/Icon";

type Lines = GeoJSON.FeatureCollection<GeoJSON.LineString, Record<string, unknown>>;

type Props = {
  background: Lines;
  reaches: Lines;
  sites: SitesFeatureCollection;
  catchment: string;
  selectedId: string | null;
  selectedStatus: Status | null;
  selectedName: string | null;
  /** bump to fly to the selected site (assign / deep link); clicks don't move the map */
  focusNonce: number;
  onSelect: (siteId: string) => void;
  /** opens a computer-vision demo screen (gear menu shortcuts) */
  onOpenCv?: (k: CvShortcut) => void;
};

/** Default view: Cynon valley demo corridor */
const INITIAL_CENTER: [number, number] = [-3.415, 51.705];
const INITIAL_ZOOM = 12.8;

function boundsOf(sites: SitesFeatureCollection, catchment: string): LngLatBoundsLike | null {
  const pts = sites.features.filter((f) => f.properties.catchment === catchment).map((f) => f.geometry.coordinates);
  if (!pts.length) return null;
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]];
}

export function MapView({ background, reaches, sites, catchment, selectedId, selectedStatus, selectedName, focusNonce, onSelect, onOpenCv }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const [ready, setReady] = useState(false);
  const [pt, setPt] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const prevSel = useRef<string | null>(null);
  const firstCatchment = useRef(true);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // init once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const style = await fetch(BASEMAP_URL).then((r) => r.json()).then(tuneBasemap).catch(fallbackStyle);
      if (cancelled || !el.current) return;
      const map = new maplibregl.Map({
        container: el.current, style, center: INITIAL_CENTER, zoom: INITIAL_ZOOM,
        maxBounds: [[-5.2, 51.25], [-2.4, 53.0]], attributionControl: { compact: true },
      });
      mapRef.current = map;
      map.on("load", () => {
        registerImages(map);
        const before = firstSymbolId(map);
        map.addSource("rivers-bg", { type: "geojson", data: background });
        map.addLayer(riverBackgroundLayer, before);
        map.addSource("reaches", { type: "geojson", data: reaches });
        map.addSource("sites", { type: "geojson", data: sites, promoteId: "site_id" });
        overlayLayers.forEach((l) => map.addLayer(l, l.type === "symbol" || l.type === "circle" ? undefined : before));
        for (const layer of ["reach-hit", "sites"]) {
          map.on("click", layer, (e) => {
            const id = e.features?.[0]?.properties?.site_id;
            if (id) onSelectRef.current(String(id));
          });
          map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
          map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
        }
        setReady(true);
      });
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // data is loaded before MapView mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // catchment filter + fly to its extent (not on first load: keep the demo corridor view)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    applyCatchment(map, catchment, selectedId);
    if (firstCatchment.current) { firstCatchment.current = false; return; }
    const b = boundsOf(sites, catchment);
    if (b) map.fitBounds(b, { padding: 48, duration: 900, maxZoom: 11 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catchment, ready]);

  // selection: halo feature-state, selected-pin filter, connector tracking
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (prevSel.current) map.setFeatureState({ source: "sites", id: prevSel.current }, { selected: false });
    prevSel.current = selectedId;
    applyCatchment(map, catchment, selectedId);
    if (!selectedId) { setPt(null); return; }
    map.setFeatureState({ source: "sites", id: selectedId }, { selected: true });
    const f = sites.features.find((s) => s.properties.site_id === selectedId);
    if (!f) return;
    const [lng, lat] = f.geometry.coordinates;
    const update = () => {
      const p = map.project([lng, lat]);
      const c = map.getContainer();
      setPt({ x: p.x, y: p.y, w: c.clientWidth, h: c.clientHeight });
    };
    update();
    map.on("move", update);
    map.on("resize", update);
    return () => { map.off("move", update); map.off("resize", update); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, ready]);

  // programmatic focus
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !selectedId || focusNonce === 0) return;
    const f = sites.features.find((s) => s.properties.site_id === selectedId);
    if (f) map.flyTo({ center: f.geometry.coordinates as [number, number], zoom: Math.max(map.getZoom(), 13), duration: 900 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNonce, ready]);

  const show = pt && selectedStatus && pt.x >= 0 && pt.x < pt.w && pt.y >= 0 && pt.y < pt.h;

  return (
    <section className="map" aria-label="River map">
      <div ref={el} className="map__canvas" />
      {show && (
        <svg className="connector" aria-hidden style={{ left: pt.x, width: pt.w - pt.x, height: pt.h }} viewBox={`0 0 100 ${pt.h}`} preserveAspectRatio="none">
          <polygon points={`0,${pt.y} 100,14 100,${pt.h - 14}`} fill={STATUS[selectedStatus].tint} opacity={0.45} />
          <polyline points={`100,14 0,${pt.y} 100,${pt.h - 14}`} fill="none" stroke={STATUS[selectedStatus].dark} strokeOpacity={0.55} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
        </svg>
      )}
      {show && selectedName && <span className="pin-tag" style={{ left: pt.x, top: pt.y + 24 }}>{selectedName}</span>}
      <div className="map__controls">
        <div className="ctrl-group">
          <button type="button" aria-label="Zoom in" onClick={() => mapRef.current?.zoomIn()}><Icon name="plus" size={18} /></button>
          <button type="button" aria-label="Zoom out" onClick={() => mapRef.current?.zoomOut()}><Icon name="minus" size={18} /></button>
        </div>
        <div className="ctrl-group">
          <button type="button" aria-label="Show my location" onClick={() => navigator.geolocation?.getCurrentPosition((p) => mapRef.current?.flyTo({ center: [p.coords.longitude, p.coords.latitude], zoom: 13 }))}>
            <Icon name="locate" size={18} />
          </button>
        </div>
        <DevTools onOpenCv={onOpenCv} />
      </div>
      <MapLegend />
    </section>
  );
}
