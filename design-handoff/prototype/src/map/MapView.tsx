import { useEffect, useRef, useState } from 'react';
import maplibregl, { type GeoJSONSource, type Map as MlMap, type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { BASEMAP_URL, MAP_COLORS, STATUS, firstSymbolId, overlayLayers, registerImages, tuneBasemap, type Status } from './mapStyle';
import { CATCHMENT_VIEW, SITES, reachesGeoJSON, siteStatus, sitesGeoJSON, type Catchment } from '../data/demo';
import { MapLegend } from '../components/MapLegend';
import { Icon } from '../components/Icon';

interface Props { catchment: Catchment; selectedId: string | null; onSelect: (id: string | null) => void }

/** MapLibre map + legend + controls + the connector wedge from the selected pin to the sidebar. */
export function MapView({ catchment, selectedId, onSelect }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const [ready, setReady] = useState(false);
  const [pt, setPt] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const prevSel = useRef<string | null>(null);

  // init
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Fall back to a plain paper background if the basemap can't be fetched (offline demo).
      const style = await fetch(BASEMAP_URL)
        .then((r) => r.json() as Promise<StyleSpecification>)
        .then(tuneBasemap)
        .catch((): StyleSpecification => ({ version: 8, sources: {}, layers: [{ id: 'background', type: 'background', paint: { 'background-color': MAP_COLORS.land } }] }));
      if (cancelled || !el.current) return;
      const v = CATCHMENT_VIEW[catchment];
      const m = new maplibregl.Map({ container: el.current, style, center: v.center, zoom: v.zoom, attributionControl: { compact: true } });
      map.current = m;
      m.on('load', () => {
        registerImages(m);
        m.addSource('reaches', { type: 'geojson', data: reachesGeoJSON(catchment) });
        m.addSource('sites', { type: 'geojson', data: sitesGeoJSON(catchment), promoteId: 'site_id' });
        const before = firstSymbolId(m);
        overlayLayers.forEach((l) => m.addLayer(l, l.type === 'symbol' ? undefined : before));
        m.on('click', 'sites', (e) => onSelect(String(e.features?.[0]?.properties?.site_id ?? '')));
        m.on('mouseenter', 'sites', () => (m.getCanvas().style.cursor = 'pointer'));
        m.on('mouseleave', 'sites', () => (m.getCanvas().style.cursor = ''));
        setReady(true);
      });
    })();
    return () => { cancelled = true; map.current?.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // catchment change
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    (m.getSource('reaches') as GeoJSONSource).setData(reachesGeoJSON(catchment));
    (m.getSource('sites') as GeoJSONSource).setData(sitesGeoJSON(catchment));
    const v = CATCHMENT_VIEW[catchment];
    m.flyTo({ center: v.center, zoom: v.zoom, duration: 800 });
  }, [catchment, ready]);

  // selection: feature-state halo, selected-pin filter, connector tracking
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    if (prevSel.current) m.setFeatureState({ source: 'sites', id: prevSel.current }, { selected: false });
    prevSel.current = selectedId;
    m.setFilter('site-selected', ['==', ['get', 'site_id'], selectedId ?? '__none__']);
    if (!selectedId) { setPt(null); return; }
    m.setFeatureState({ source: 'sites', id: selectedId }, { selected: true });
    const site = SITES.find((s) => s.id === selectedId);
    if (!site) return;
    const update = () => {
      const p = m.project([site.lng, site.lat]);
      const c = m.getContainer();
      setPt({ x: p.x, y: p.y, w: c.clientWidth, h: c.clientHeight });
    };
    m.easeTo({ center: [site.lng, site.lat], offset: [-60, 0], duration: 600 });
    update();
    m.on('move', update);
    m.on('resize', update);
    return () => { m.off('move', update); m.off('resize', update); };
  }, [selectedId, ready]);

  const sel = SITES.find((s) => s.id === selectedId);
  const status: Status | null = sel ? siteStatus(sel) : null;

  return (
    <section className="map" aria-label="River map">
      <div ref={el} className="map__canvas" />
      {pt && status && pt.x < pt.w && (
        <svg className="connector" aria-hidden style={{ left: pt.x, width: pt.w - pt.x, height: pt.h }} viewBox={`0 0 100 ${pt.h}`} preserveAspectRatio="none">
          <polygon points={`0,${pt.y} 100,14 100,${pt.h - 14}`} fill={STATUS[status].tint} opacity={0.45} />
          <polyline points={`100,14 0,${pt.y} 100,${pt.h - 14}`} fill="none" stroke={STATUS[status].dark} strokeOpacity={0.55} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
        </svg>
      )}
      {pt && sel && <span className="pin-tag" style={{ left: pt.x, top: pt.y + 24 }}>{sel.name}</span>}
      <div className="map__controls">
        <div className="ctrl-group">
          <button type="button" aria-label="Zoom in" onClick={() => map.current?.zoomIn()}><Icon name="plus" size={18} /></button>
          <button type="button" aria-label="Zoom out" onClick={() => map.current?.zoomOut()}><Icon name="minus" size={18} /></button>
        </div>
        <div className="ctrl-group"><button type="button" aria-label="Show my location"><Icon name="locate" size={18} /></button></div>
      </div>
      <MapLegend />
    </section>
  );
}
