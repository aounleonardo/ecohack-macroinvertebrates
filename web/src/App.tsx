import { useCallback, useEffect, useMemo, useState } from "react";
import { AppHeader, type Profile } from "./components/AppHeader";
import { DexScreen } from "./components/DexScreen";
import { SiteSidebar } from "./components/SiteSidebar";
import { UploadFlow } from "./components/UploadFlow";
import { UnlockModal } from "./components/UnlockModal";
import { CoordinatorPanel } from "./components/CoordinatorPanel";
import { ROD_DEMO_SITE } from "./lib/rodDemo";
import { MapView } from "./map/MapView";
import { loadSitesGeoJSON, parseSiteProperties, type SitesFeatureCollection } from "./lib/data";
import { DEX_FAMILIES, commonName, isDexFamily } from "./lib/families";
import { loadDex, saveDex } from "./lib/dex";
import { formatSiteName } from "./lib/siteName";
import { loadSiteSeries, type SiteSeries } from "./lib/series";
import { statusOf } from "./lib/staleness";
import { loadTaxaCatalog, type TaxonCatalogEntry } from "./lib/taxa";

type Lines = GeoJSON.FeatureCollection<GeoJSON.LineString, Record<string, unknown>>;

/** Default fresh-site demo: Gelli Deg (?site=Kef508440). Gowerton (K2547a726) is stale (2013). */
const DEMO_SITE = "Kef508440";

async function loadLines(path: string, hint: string): Promise<Lines> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} missing — ${hint}`);
  return res.json() as Promise<Lines>;
}

/** OSM river linework is optional on Netlify (large; gitignored). Carto basemap still shows water. */
async function loadRiverBackground(): Promise<Lines> {
  const res = await fetch("/data/wales_rivers_background.geojson");
  if (!res.ok) return { type: "FeatureCollection", features: [] };
  return res.json() as Promise<Lines>;
}

export default function App() {
  const [data, setData] = useState<{ background: Lines; reaches: Lines; sites: SitesFeatureCollection } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<Map<string, TaxonCatalogEntry> | null>(null);
  const [series, setSeries] = useState<Record<string, SiteSeries>>({});
  const [catchment, setCatchment] = useState("South East Valleys");
  const [profile, setProfile] = useState<Profile>("kick");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);
  const [dex, setDex] = useState(loadDex);
  const [uploadFor, setUploadFor] = useState<string | null>(null);
  const [unlock, setUnlock] = useState<string[] | null>(null);
  const [showDex, setShowDex] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const dexCount = DEX_FAMILIES.filter((f) => dex.has(f)).length;

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadRiverBackground(),
      loadLines("/data/river_reaches.geojson", "run npm run etl"),
      loadSitesGeoJSON(),
    ])
      .then(([background, reaches, sites]) => {
        if (cancelled) return;
        // MOCK: one red site has a camera rod recording this week (lib/rodDemo.ts)
        for (const f of [...reaches.features, ...sites.features] as { properties: Record<string, unknown> }[]) {
          if (f.properties.site_id === ROD_DEMO_SITE) f.properties.rod_active = true;
        }
        setData({ background, reaches, sites });
        // ?site=<id> deep link (shareable), else the demo site
        const wanted = new URLSearchParams(window.location.search).get("site") ?? DEMO_SITE;
        const f = sites.features.find((x) => x.properties.site_id === wanted);
        if (f) {
          setCatchment(f.properties.catchment);
          setSelectedId(wanted);
          setFocusNonce(1);
        }
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Failed to load map data"));
    loadTaxaCatalog().then((c) => !cancelled && setCatalog(c)).catch(() => undefined);
    loadSiteSeries().then((s) => !cancelled && setSeries(s));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const byId = useMemo(() => new Map((data?.sites.features ?? []).map((f) => [f.properties.site_id, f])), [data]);
  const feature = selectedId ? byId.get(selectedId) : undefined;
  const site = feature ? parseSiteProperties(feature.properties as unknown as Record<string, unknown>) : null;

  const common = (f: string) => commonName(f, catalog);

  const changeProfile = (p: Profile) => {
    setProfile(p);
    if (p === "coordinator") setSelectedId(null); // coordinators land on the overview
  };

  const addToDex = (families: string[]) => {
    const fresh = families.filter((f) => isDexFamily(f) && !dex.has(f));
    const next = new Set([...dex, ...families.filter(isDexFamily)]);
    setDex(next);
    saveDex(next);
    if (site?.staleness === "stale") setToast("Badge earned: Sampled a red site");
    if (fresh.length) setUnlock(fresh);
    else {
      setUploadFor(null);
      setToast("Saved. No new Dex families this time.");
    }
  };

  const changeCatchment = (c: string) => {
    setCatchment(c);
    if (site && site.catchment !== c) setSelectedId(null);
  };

  /** Next overdue site in this catchment, longest-unsampled first. */
  const assignRed = useCallback(() => {
    if (!data) return;
    const red = data.sites.features
      .filter((f) => f.properties.catchment === catchment && f.properties.staleness === "stale")
      .sort((a, b) => (b.properties.days_since_sample ?? 0) - (a.properties.days_since_sample ?? 0));
    if (!red.length) return setToast("No red sites in this catchment");
    const i = red.findIndex((f) => f.properties.site_id === selectedId);
    setSelectedId(red[(i + 1) % red.length].properties.site_id);
    setFocusNonce((n) => n + 1);
  }, [data, catchment, selectedId]);

  return (
    <div className="app">
      <AppHeader
        catchment={catchment} onCatchment={changeCatchment}
        profile={profile} onProfile={changeProfile}
        dexCount={dexCount}
        dexTotal={DEX_FAMILIES.length}
        onDex={() => setShowDex(true)}
        onAssignRed={assignRed}
      />
      <main className={showDex ? "app__main app__main--dex" : "app__main"}>
        {showDex ? (
          <DexScreen dex={dex} catalog={catalog} dexCount={dexCount} onClose={() => setShowDex(false)} />
        ) : (
          <>
            {data ? (
              <MapView
                background={data.background} reaches={data.reaches} sites={data.sites}
                catchment={catchment} selectedId={selectedId}
                selectedStatus={site ? statusOf(site.staleness, site.site_id === ROD_DEMO_SITE) : null}
                selectedName={site ? formatSiteName(site.site_name) : null}
                focusNonce={focusNonce} onSelect={setSelectedId}
              />
            ) : (
              <section className="map map--loading" aria-busy="true"><p className="caption">{error ?? "Loading Welsh rivers…"}</p></section>
            )}
            {site ? (
              <SiteSidebar
                key={site.site_id} site={site} profile={profile} catalog={catalog} series={series[site.site_id]} dex={dex}
                rodActive={site.site_id === ROD_DEMO_SITE}
                onClose={() => setSelectedId(null)}
                onUpload={() => setUploadFor(site.site_id)}
                onToast={setToast}
              />
            ) : profile === "coordinator" && data ? (
              <CoordinatorPanel sites={data.sites} catchment={catchment} onToast={setToast}
                onSelect={(id) => { setSelectedId(id); setFocusNonce((n) => n + 1); }} />
            ) : (
              <aside className="sidebar sidebar--empty">
                <h2 className="h-display-s">Pick a river reach</h2>
                <p className="body-2">Tap a coloured band or pin on the map, or let us choose an overdue one.</p>
                <button type="button" className="btn btn--primary" onClick={assignRed}>Assign me a red site</button>
              </aside>
            )}
            {uploadFor && site && (
              <UploadFlow siteId={site.site_id} siteName={formatSiteName(site.site_name)} dex={dex} common={common}
                onClose={() => setUploadFor(null)} onAddToDex={addToDex} />
            )}
          </>
        )}
      </main>
      {unlock && site && (
        <UnlockModal families={unlock} siteName={formatSiteName(site.site_name)} catalog={catalog} common={common} dexCount={dexCount}
          onClose={() => { setUnlock(null); setUploadFor(null); }}
          onViewDex={() => { setUnlock(null); setUploadFor(null); setShowDex(true); }} />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
