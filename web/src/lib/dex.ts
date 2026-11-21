/**
 * The volunteer's Dex: which of the nine families they've recorded.
 * Hackathon stand-in for a user account: stored per browser, seeded with a
 * demo set (5/9) so the "new for you" states show up straight away.
 */
const KEY = "darwinflow.dex.v1";
const DEMO_SEED = ["Chironomidae", "Baetidae", "Elmidae", "Hydropsychidae", "Gammaridae"];

export function loadDex(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {
    /* storage unavailable: fall through to the demo seed */
  }
  return new Set(DEMO_SEED);
}

export function saveDex(dex: Set<string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...dex]));
  } catch {
    /* ignore */
  }
}
