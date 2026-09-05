/** YYYY-MM-DD + N dias (calendário UTC simples). */
export function addCalendarDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Lista inclusiva de datas YYYY-MM-DD entre from e to. */
export function eachDateStringInRange(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = from;
  while (cur <= to) {
    out.push(cur);
    cur = addCalendarDays(cur, 1);
  }
  return out;
}

export function maxFinishedPerLeagueFromEnv(): number {
  const n = parseInt(process.env.SPORTS_MAX_FINISHED_PER_LEAGUE ?? '4', 10);
  return Number.isFinite(n) && n >= 0 ? n : 4;
}
