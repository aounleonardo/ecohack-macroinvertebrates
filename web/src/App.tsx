import { useCallback, useEffect, useMemo, useState } from "react";
import { AppHeader, type Profile } from "./components/AppHeader";
import { DexScreen } from "./components/DexScreen";
import { SiteSidebar } from "./components/SiteSidebar";
import { UploadFlow } from "./components/UploadFlow";
import { UnlockModal } from "./components/UnlockModal";
import { CoordinatorPanel } from "./components/CoordinatorPanel";
import { ROD_DEMO_SITE } from "./lib/rodDemo";
import type { CvShortcut } from "./components/DevTools";
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
/** Red site used by the computer-vision shortcuts when nothing is selected: Cwmpennar (upstream), 2013. */
const CV_DEMO_SITE = "K7b34c0ca";

type CvOpen = { siteId: string; mode: "volunteer" | "review"; autoDemo?: boolean; who?: string };

async function loadLines(path: string, hint: string): Promise<Lines> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} missing (${res.status}) — ${hint}`);
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("json") && !ct.includes("geo+json")) {
    throw new Error(`${path} returned HTML, not JSON — check Netlify deploy includes /data (avoid SPA redirect on /data/*).`);
  }
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
  const [cv, setCv] = useState<CvOpen | null>(null);
  const [unlock, setUnlock] = useState<{ families: string[]; siteName: string } | null>(null);
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
  const siteNameOf = (id: string) => formatSiteName(String(byId.get(id)?.properties.site_name ?? id));

  /** Open any computer-vision screen: gear menu, ?cv= deep link, coordinator review. */
  const openCv = useCallback((k: CvShortcut, siteId?: string, who = "Rhys") => {
    if (!data) return;
    const id = siteId ?? ((k !== "review" && selectedId) || CV_DEMO_SITE);
    setShowDex(false);
    if (k === "review") return setCv({ siteId: id, mode: "review", autoDemo: true, who });
    const f = byId.get(id);
    if (f && profile !== "coordinator") { setSelectedId(id); setCatchment(f.properties.catchment); }
    if (k === "upload") setCv({ siteId: id, mode: "volunteer" });
    if (k === "result") setCv({ siteId: id, mode: "volunteer", autoDemo: true });
    if (k === "unlock") {
      const pick = ["Heptageniidae", ...DEX_FAMILIES].find((x) => !dex.has(x)) ?? "Heptageniidae";
      setUnlock({ families: [pick], siteName: siteNameOf(id) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, byId, selectedId, profile, dex]);

  // ?cv=upload|result|unlock|review (with optional &site=<id>), once data is in
  useEffect(() => {
    const k = new URLSearchParams(window.location.search).get("cv") as CvShortcut | null;
    if (data && k && ["upload", "result", "unlock", "review"].includes(k)) {
      openCv(k, new URLSearchParams(window.location.search).get("site") ?? CV_DEMO_SITE);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const changeProfile = (p: Profile) => {
    setProfile(p);
    setCv(null);
    if (p === "coordinator") setSelectedId(null); // coordinators land on the overview
  };

  const addToDex = (families: string[]) => {
    const fresh = families.filter((f) => isDexFamily(f) && !dex.has(f));
    const next = new Set([...dex, ...families.filter(isDexFamily)]);
    setDex(next);
    saveDex(next);
    const cvSite = cv ? byId.get(cv.siteId)?.properties : undefined;
    if (cvSite?.staleness === "stale") setToast("Badge earned: Sampled a red site");
    if (fresh.length) setUnlock({ families: fresh, siteName: siteNameOf(cv?.siteId ?? "") });
    else {
      setCv(null);
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
                focusNonce={focusNonce} onSelect={setSelectedId} onOpenCv={(k) => openCv(k)}
              />
            ) : (
              <section className="map map--loading" aria-busy="true"><p className="caption">{error ?? "Loading Welsh rivers…"}</p></section>
            )}
            {site ? (
              <SiteSidebar
                key={site.site_id} site={site} profile={profile} catalog={catalog} series={series[site.site_id]} dex={dex}
                rodActive={site.site_id === ROD_DEMO_SITE}
                onClose={() => setSelectedId(null)}
                onUpload={() => setCv({ siteId: site.site_id, mode: "volunteer" })}
                onToast={setToast}
              />
            ) : profile === "coordinator" && data ? (
              <CoordinatorPanel sites={data.sites} catchment={catchment} onToast={setToast}
                onReview={(id, who) => openCv("review", id, who)}
                onSelect={(id) => { setSelectedId(id); setFocusNonce((n) => n + 1); }} />
            ) : (
              <aside className="sidebar sidebar--empty">
                <h2 className="h-display-s">Pick a river reach</h2>
                <p className="body-2">Tap a coloured band or pin on the map, or let us choose an overdue one.</p>
                <button type="button" className="btn btn--primary" onClick={assignRed}>Assign me a red site</button>
              </aside>
            )}
            {cv && byId.has(cv.siteId) && (
              <UploadFlow key={`${cv.mode}-${cv.siteId}-${cv.autoDemo ? "demo" : "pick"}`}
                siteId={cv.siteId} siteName={siteNameOf(cv.siteId)} dex={dex} common={common}
                autoDemo={cv.autoDemo} mode={cv.mode} who={cv.who}
                onClose={() => setCv(null)} onAddToDex={addToDex}
                onConfirm={() => { setToast(`IDs confirmed for ${cv.who ?? "the volunteer"}’s upload at ${siteNameOf(cv.siteId)}`); setCv(null); }} />
            )}
          </>
        )}
      </main>
      {unlock && (
        <UnlockModal families={unlock.families} siteName={unlock.siteName} catalog={catalog} common={common}
          dexCount={Math.max(dexCount, DEX_FAMILIES.filter((f) => dex.has(f) || unlock.families.includes(f)).length)}
          onClose={() => { setUnlock(null); setCv(null); }}
          onViewDex={() => { setUnlock(null); setCv(null); setShowDex(true); }} />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
