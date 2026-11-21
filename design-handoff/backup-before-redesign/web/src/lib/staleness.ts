export function yearsSinceSample(days: number | null): string {
  if (days == null || Number.isNaN(days)) return "—";
  const years = days / 365.25;
  if (years < 0.1) return "< 0.1 years";
  return `${years.toFixed(1)} years`;
}

export function stalenessLabel(staleness: string, days: number | null): string {
  const y = yearsSinceSample(days);
  return `${staleness} (${y} since last sample)`;
}