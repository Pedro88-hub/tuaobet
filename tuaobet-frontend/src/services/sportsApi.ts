import { apiFetch } from './api';

export interface CachedMatchRow {
  id: string;
  externalId: number;
  utcDate: string;
  status: string;
  homeTeam: { name: string; crestUrl?: string | null };
  awayTeam: { name: string; crestUrl?: string | null };
  competition: {
    code: string | null;
    name: string | null;
    emblemUrl?: string | null;
  };
  score: { fullTime: { home: number; away: number } } | null;
}

export type FixturesFilters = { date: string } | { from: string; to: string };

export interface FixturesResponse {
  filters: FixturesFilters;
  count: number;
  matches: CachedMatchRow[];
}

export type SyncSportsResponse =
  | { date: string; synced: number; settledBets: number }
  | { from: string; to: string; synced: number; settledBets: number };

/** Fuso alinhado ao backend (Brasil) para o calendário de jogos. */
export const SPORTS_CALENDAR_TIMEZONE = 'America/Sao_Paulo';

/** Data civil (YYYY-MM-DD) num fuso IANA — igual à lógica do backend para queryDate. */
export function calendarDateInTimeZone(d: Date, timeZone: string): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(d);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  if (y && m && day) return `${y}-${m}-${day}`;
  return d.toISOString().slice(0, 10);
}

/** “Hoje” no calendário brasileiro (independente do fuso do browser). */
export function localDateInputValue(
  d = new Date(),
  timeZone: string = SPORTS_CALENDAR_TIMEZONE
): string {
  return calendarDateInTimeZone(d, timeZone);
}

/** YYYY-MM-DD + N dias (calendário UTC). */
export function addCalendarDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Janela padrão: 7 dias a partir de `from` (inclusivo). */
export const SPORTS_WINDOW_DAYS = 6;

export function sportsWindowEnd(from: string): string {
  return addCalendarDays(from, SPORTS_WINDOW_DAYS);
}

export async function fetchCachedFixturesForRange(
  from: string,
  to: string
): Promise<FixturesResponse> {
  return apiFetch<FixturesResponse>(
    `/api/sports/fixtures?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  );
}

export async function syncSportsFixturesForRange(
  from: string,
  to: string
): Promise<SyncSportsResponse> {
  return apiFetch<SyncSportsResponse>('/api/sports/sync', {
    method: 'POST',
    body: JSON.stringify({ from, to }),
  });
}

export type Odds1x2 = { home: number; draw: number; away: number };

export async function fetch1x2Odds(): Promise<Odds1x2> {
  return apiFetch<Odds1x2>('/api/sports/odds/1x2');
}

export async function placeSportBet1x2(
  sportFixtureId: string,
  selection: 'HOME' | 'DRAW' | 'AWAY',
  amount: number
): Promise<{
  betId: string;
  selection: string;
  odds: number;
  potentialPayout: number;
  balance: number;
}> {
  return apiFetch('/api/sports/bet/1x2', {
    method: 'POST',
    body: JSON.stringify({ sportFixtureId, selection, amount }),
  });
}
