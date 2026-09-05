import { prisma } from '../lib/prisma';
import { apiFootballJson, apiFootballTimezone } from './apiFootballClient';
import { settleFinishedSportBetsForQueryDate } from './sportSettlement';
import { eachDateStringInRange } from './sportsFixtureWindow';
import { leagueIdAllowed, sportsLeagueIdFilterSet } from './sportsLeagueFilter';

/** Item em `response` do GET /fixtures (v3). */
interface ApiFixtureRow {
  fixture: {
    id: number;
    date: string;
    timestamp: number;
    status: { short: string; long?: string };
  };
  league: {
    id: number;
    name: string;
    logo?: string | null;
    season?: number;
  };
  teams: {
    home: { id: number; name: string; logo?: string | null };
    away: { id: number; name: string; logo?: string | null };
  };
  goals?: { home: number | null; away: number | null };
  score?: {
    fulltime?: { home: number | null; away: number | null };
  };
}

function mapApiStatus(short: string): string {
  const s = short.toUpperCase();
  if (s === 'NS' || s === 'TBD') return 'SCHEDULED';
  if (s === 'LIVE' || s === '1H' || s === '2H' || s === 'ET' || s === 'P') return 'IN_PLAY';
  if (s === 'HT' || s === 'BT') return 'PAUSED';
  if (s === 'FT' || s === 'AET' || s === 'PEN' || s === 'WO') return 'FINISHED';
  if (s === 'PST') return 'POSTPONED';
  if (s === 'CANC') return 'CANCELLED';
  if (s === 'ABD') return 'SUSPENDED';
  if (s === 'AWD') return 'AWARDED';
  return 'SCHEDULED';
}

function readScores(row: ApiFixtureRow): { home: number | null; away: number | null } {
  const g = row.goals;
  if (g && typeof g.home === 'number' && typeof g.away === 'number') {
    return { home: g.home, away: g.away };
  }
  const ft = row.score?.fulltime;
  if (ft && typeof ft.home === 'number' && typeof ft.away === 'number') {
    return { home: ft.home, away: ft.away };
  }
  return { home: null, away: null };
}

function utcDateFromRow(row: ApiFixtureRow): Date {
  const ts = row.fixture.timestamp;
  if (typeof ts === 'number' && ts > 0) {
    return new Date(ts * 1000);
  }
  const d = Date.parse(row.fixture.date);
  return Number.isFinite(d) ? new Date(d) : new Date();
}

/** Dia local (YYYY-MM-DD) do pontapé, no fuso configurado — usado como `queryDate` na BD. */
function kickoffLocalDate(utc: Date, timeZone: string): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(utc);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;
  if (y && m && d) return `${y}-${m}-${d}`;
  return utc.toISOString().slice(0, 10);
}

async function upsertFixtureRow(row: ApiFixtureRow): Promise<boolean> {
  const fid = row.fixture?.id;
  if (fid == null || !Number.isFinite(fid)) return false;

  const tz = apiFootballTimezone();
  const utc = utcDateFromRow(row);
  const queryDate = kickoffLocalDate(utc, tz);
  const status = mapApiStatus(row.fixture.status?.short ?? 'NS');
  const { home, away } = readScores(row);
  const homeLogo =
    typeof row.teams?.home?.logo === 'string' ? row.teams.home.logo.trim() || null : null;
  const awayLogo =
    typeof row.teams?.away?.logo === 'string' ? row.teams.away.logo.trim() || null : null;
  const leagueLogo =
    typeof row.league?.logo === 'string' ? row.league.logo.trim() || null : null;
  const seasonYear =
    typeof row.league?.season === 'number' && Number.isFinite(row.league.season)
      ? row.league.season
      : null;

  await prisma.sportFixture.upsert({
    where: { externalId: fid },
    create: {
      externalId: fid,
      queryDate,
      utcDate: utc,
      status,
      homeTeamName: row.teams.home.name,
      awayTeamName: row.teams.away.name,
      homeTeamExternalId: row.teams.home.id,
      awayTeamExternalId: row.teams.away.id,
      homeTeamCrestUrl: homeLogo,
      awayTeamCrestUrl: awayLogo,
      competitionCode: String(row.league.id),
      competitionName: row.league.name,
      competitionEmblemUrl: leagueLogo,
      homeScore: home,
      awayScore: away,
      seasonYear,
    },
    update: {
      queryDate,
      utcDate: utc,
      status,
      homeTeamName: row.teams.home.name,
      awayTeamName: row.teams.away.name,
      homeTeamExternalId: row.teams.home.id,
      awayTeamExternalId: row.teams.away.id,
      homeTeamCrestUrl: homeLogo,
      awayTeamCrestUrl: awayLogo,
      competitionCode: String(row.league.id),
      competitionName: row.league.name,
      competitionEmblemUrl: leagueLogo,
      homeScore: home,
      awayScore: away,
      seasonYear,
    },
  });
  return true;
}

/**
 * Sincroniza intervalo [from, to] com um único pedido à API-Football.
 * `queryDate` em cada linha = dia local do pontapé (APISPORTS_TIMEZONE).
 */
export async function syncFixturesForRange(
  from: string,
  to: string
): Promise<{ synced: number; settledBets: number; from: string; to: string }> {
  const payload = await apiFootballJson<ApiFixtureRow[]>('/fixtures', {
    from,
    to,
    timezone: apiFootballTimezone(),
  });

  const rows = Array.isArray(payload.response) ? payload.response : [];
  const leagueFilter = sportsLeagueIdFilterSet();
  let count = 0;

  for (const row of rows) {
    const lid = row.league?.id;
    if (lid == null || !Number.isFinite(lid) || !leagueIdAllowed(lid, leagueFilter)) {
      continue;
    }
    const ok = await upsertFixtureRow(row);
    if (ok) count += 1;
  }

  let settledBets = 0;
  for (const d of eachDateStringInRange(from, to)) {
    settledBets += await settleFinishedSportBetsForQueryDate(d);
  }

  return { synced: count, settledBets, from, to };
}

/** Compat: um único dia (um pedido from=to). */
export async function syncFixturesForDate(date: string): Promise<{
  synced: number;
  settledBets: number;
}> {
  const r = await syncFixturesForRange(date, date);
  return { synced: r.synced, settledBets: r.settledBets };
}

export async function listFixturesByQueryDate(date: string) {
  return prisma.sportFixture.findMany({
    where: { queryDate: date },
    orderBy: { utcDate: 'asc' },
  });
}

export async function listFixturesByQueryDateRange(from: string, to: string) {
  return prisma.sportFixture.findMany({
    where: {
      queryDate: { gte: from, lte: to },
    },
    orderBy: { utcDate: 'asc' },
  });
}
