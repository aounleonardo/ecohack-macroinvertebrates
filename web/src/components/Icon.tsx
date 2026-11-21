/** Stroke icons on a 24px grid, currentColor. Same set as the canvas mockups. */
const P: Record<string, string> = {
  net: '<circle cx="15" cy="9" r="5.5"/><path d="M11 13 L3.5 20.5"/><path d="M11.2 6.2 L18.8 11.8 M13 4.2 L19.8 9.6 M10.4 9 L16.6 14" stroke-width="1.1"/>',
  tray: '<path d="M3 8.5h18l-1.5 9.5h-15z"/><path d="M6 11h12" stroke-width="1.2"/>',
  board: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20.5l2-4.5M16 20.5l-2-4.5M7 8.5h7M7 11.5h4.5"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  camera: '<path d="M4 8h3.2l1.8-2.8h6L16.8 8H20a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.2" r="3.6"/>',
  'chev-down': '<path d="M6 9l6 6 6-6"/>',
  'chev-right': '<path d="M9 6l6 6-6 6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
  rod: '<path d="M12 2.5v19"/><rect x="8.5" y="12.5" width="7" height="5" rx="1.5"/><circle cx="12" cy="4.5" r="1.8"/>',
  clipboard: '<rect x="5" y="4.5" width="14" height="16.5" rx="2"/><path d="M9 4.5V3h6v1.5M8.5 10h7M8.5 13.5h7M8.5 17h4"/>',
  check: '<path d="M5 12.5l4.2 4.2L19 7"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.01" stroke-width="2"/>',
  flask: '<path d="M9 3h6M10 3v6.2L4.6 18.4A1.8 1.8 0 0 0 6.2 21h11.6a1.8 1.8 0 0 0 1.6-2.6L14 9.2V3"/><path d="M7.5 15h9" stroke-width="1.2"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 4.5v4h4"/><path d="M12 8v4.5l3 1.8"/>',
  locate: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  water: '<path d="M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11z"/>',
  shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8 7.5 9.5 4.3-1.5 7.5-4.9 7.5-9.5V6z"/>',
  'arrow-up': '<path d="M12 19V5M6 11l6-6 6 6"/>',
  'arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
  'arrow-down': '<path d="M12 5v14M6 13l6 6 6-6"/>',
  'arrow-left': '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  sparkle: '<path d="M12 3c.6 4.5 2.5 6.4 7 7-4.5.6-6.4 2.5-7 7-.6-4.5-2.5-6.4-7-7 4.5-.6 6.4-2.5 7-7z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
  dex: '<rect x="4" y="3.5" width="11" height="15" rx="2"/><path d="M8.5 7.5h2.5M18.5 6.5l1.5.4-3 13.2-8.5-2"/>',
};

export type IconName = keyof typeof P;

export function Icon({ name, size = 20, strokeWidth = 1.75, label }: { name: IconName; size?: number; strokeWidth?: number; label?: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none', display: 'block' }}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      dangerouslySetInnerHTML={{ __html: P[name] }}
    />
  );
}

export function PlayIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" style={{ flex: 'none', display: 'block' }}><path d="M7 4.5v15l12.5-7.5z" fill={color} /></svg>;
}
