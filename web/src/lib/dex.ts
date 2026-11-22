/**
 * The volunteer's Dex: which of the curated Dex families they've recorded.
 * Hackathon stand-in for a user account: stored per browser, seeded with a
 * demo set so map rows still show ticks vs "new for you".
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

/** Back to the demo seed (dev tools), so the unlock moment can be shown again. */
export function resetDex() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
