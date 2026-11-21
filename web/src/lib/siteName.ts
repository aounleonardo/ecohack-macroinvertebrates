/**
 * NRW site names arrive in mixed formats ("U/S CWMPENNAR", "At aberamman",
 * "(TRAFLE R B) GOWERTON", "D/S CYNON AND CILFYNYDD STW"). The design wants
 * normal case with the position as a soft qualifier: "Cwmpennar (upstream)".
 */
const KEEP_UPPER = new Set(["STW", "WTW", "HEP", "RFC", "BAE", "EA", "LHB", "UK", "IMS1"]);
const LOWER = new Set(["at", "of", "and", "the", "near", "with", "from", "to", "in", "on", "by", "y", "yr", "ar", "for", "nr", "upstream", "downstream"]);

function titleWord(w: string, first: boolean): string {
  if (!w) return w;
  const up = w.toUpperCase();
  if (KEEP_UPPER.has(up) || /\d/.test(w) && /^[A-Z]\d/i.test(w)) return up; // A40, B4310
  const lw = w.toLowerCase();
  if (!first && LOWER.has(lw)) return lw;
  return lw
    .split("-")
    .map((p) => p.replace(/^([a-z])/, (c) => c.toUpperCase()).replace(/'([a-z])(?=[a-z]{2,})/, (_m, c: string) => `'${c.toUpperCase()}`))
    .join("-");
}

export function formatSiteName(raw: string): string {
  let s = (raw ?? "").trim().replace(/\s+/g, " ");
  if (!s) return "Unnamed site";
  const qualifiers: string[] = [];

  const lead = s.match(/^\(([^)]*)\)\s*(.+)$/); // "(TRAFLE R B) GOWERTON"
  if (lead) s = lead[2];

  const pos = s.match(/^(U\/S|D\/S|Us|Ds)\s+(.+)$/i);
  if (pos) {
    qualifiers.push(/^u/i.test(pos[1]) ? "upstream" : "downstream");
    s = pos[2];
  }
  if (/\s+r\.?\s?b\.?$/i.test(s)) {
    qualifiers.push("right bank");
    s = s.replace(/\s+r\.?\s?b\.?$/i, "");
  }
  s = s.replace(/^At\s+/i, "").replace(/\bU\/S\b/gi, "upstream").replace(/\bD\/S\b/gi, "downstream");

  const name = s.split(" ").map((w, i) => titleWord(w, i === 0)).join(" ");
  return qualifiers.length ? `${name} (${qualifiers.join(", ")})` : name;
}
