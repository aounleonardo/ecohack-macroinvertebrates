import { useState } from 'react';
import { AppHeader } from './components/AppHeader';
import { SiteSidebar } from './components/SiteSidebar';
import { MapView } from './map/MapView';
import { DEX_ORDER, MY_DEX, SITES, siteStatus, type Catchment, type Profile } from './data/demo';

/** Main screen: header + map (65%) + site sidebar (35%). CV and Dex screens are designed on the canvas. */
export default function App() {
  const [catchment, setCatchment] = useState<Catchment>('South East Valleys');
  const [profile, setProfile] = useState<Profile>('kick');
  const [selectedId, setSelectedId] = useState<string | null>('cwmpennar-us');
  const site = SITES.find((s) => s.id === selectedId) ?? null;

  const changeCatchment = (c: Catchment) => {
    setCatchment(c);
    setSelectedId(SITES.find((s) => s.catchment === c)?.id ?? null);
  };
  const assignRed = () => {
    const red = SITES.filter((s) => s.catchment === catchment && siteStatus(s) === 'stale')
      .sort((a, b) => a.lastSampled.localeCompare(b.lastSampled))[0];
    if (red) setSelectedId(red.id);
  };

  return (
    <div className="app">
      <AppHeader
        catchment={catchment} onCatchment={changeCatchment}
        profile={profile} onProfile={setProfile}
        dexCount={MY_DEX.size} dexTotal={DEX_ORDER.length}
        onAssignRed={assignRed}
      />
      <main className="app__main">
        <MapView catchment={catchment} selectedId={selectedId} onSelect={setSelectedId} />
        {site
          ? <SiteSidebar site={site} profile={profile} onClose={() => setSelectedId(null)} onUpload={() => console.info('Upload flow: see the CV screens on the canvas')} />
          : <aside className="sidebar sidebar--empty"><p className="body-2">Pick a site on the map, or press “Assign me a red site”.</p></aside>}
      </main>
    </div>
  );
}
