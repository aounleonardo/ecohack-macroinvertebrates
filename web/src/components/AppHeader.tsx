import { Icon, type IconName } from "./Icon";
import { StatusGlyph } from "./atoms";

export type Profile = "kick" | "rod" | "coordinator";

const PROFILES: { id: Profile; label: string; icon: IconName }[] = [
  { id: "kick", label: "Kick kit", icon: "net" },
  { id: "rod", label: "Has rod", icon: "rod" },
  { id: "coordinator", label: "Coordinator", icon: "clipboard" },
];

/** Catchment values exactly as in the NRW data, with short labels. */
export const CATCHMENTS: { value: string; label: string }[] = [
  { value: "South East Valleys", label: "South East Valleys" },
  { value: "Carmarthen Bay and the Gower", label: "Gower" },
  { value: "Usk", label: "Usk" },
];

type Props = {
  catchment: string; onCatchment: (c: string) => void;
  profile: Profile; onProfile: (p: Profile) => void;
  dexCount: number; dexTotal: number; onDex?: () => void;
  onAssignRed: () => void;
};

export function Logo() {
  return (
    <svg aria-hidden width={36} height={36} viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="17" fill="var(--river-700)" />
      <path d="M5 23c3-2 5-2 8 0s5 2 8 0 5-2 8 0" fill="none" stroke="var(--river-300)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M5 27.5c3-2 5-2 8 0s5 2 8 0 5-2 8 0" fill="none" stroke="var(--river-300)" strokeWidth="1.6" strokeLinecap="round" opacity=".6" />
      <ellipse cx="18" cy="12.5" rx="3.1" ry="2.6" fill="var(--paper-raised)" />
      <path d="M18 14.5c-2.6 0-3.4 2-3 4.5.3 2 1.6 3 3 3s2.7-1 3-3c.4-2.5-.4-4.5-3-4.5z" fill="var(--paper-raised)" />
      <path d="M16.3 21.5l-2.2 5M18 22v5.5M19.7 21.5l2.2 5M15.3 15.5l-3.5-1.5M20.7 15.5l3.5-1.5M15.2 18l-3.8 1M20.8 18l3.8 1" stroke="var(--paper-raised)" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

export function AppHeader({ catchment, onCatchment, profile, onProfile, dexCount, dexTotal, onDex, onAssignRed }: Props) {
  const circ = 2 * Math.PI * 8;
  return (
    <header className="app-header">
      <a className="brand" href="/">
        <Logo />
        <span className="brand__text"><span className="brand__name">DarwinFlow</span><span className="brand__sub">Wales river invertebrate watch</span></span>
      </a>
      <span className="app-header__divider" aria-hidden />
      <label className="select">
        <Icon name="pin" size={17} />
        <span className="select__label">Catchment</span>
        <select value={catchment} onChange={(e) => onCatchment(e.target.value)}>
          {CATCHMENTS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <Icon name="chev-down" size={16} />
      </label>
      <div className="segmented" role="group" aria-label="Profile">
        {PROFILES.map((p) => (
          <button key={p.id} type="button" aria-pressed={profile === p.id} className="segmented__btn" onClick={() => onProfile(p.id)}>
            <Icon name={p.icon} size={17} />{p.label}
          </button>
        ))}
      </div>
      <span className="app-header__spacer" aria-hidden />
      <button type="button" className="dex-btn" onClick={onDex} aria-label={`Dex, ${dexCount} of ${dexTotal} families recorded`}>
        <svg aria-hidden width={22} height={22} viewBox="0 0 22 22">
          <circle cx="11" cy="11" r="8" fill="none" stroke="var(--line)" strokeWidth="3" />
          <circle cx="11" cy="11" r="8" fill="none" stroke="var(--moss-500)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(circ * dexCount) / dexTotal} ${circ}`} transform="rotate(-90 11 11)" />
        </svg>
        Dex <span className="dex-btn__count">{dexCount}/{dexTotal}</span>
      </button>
      <button type="button" className="btn btn--primary btn--header" onClick={onAssignRed}>
        <StatusGlyph status="stale" size={20} />Assign me a red site
      </button>
    </header>
  );
}
