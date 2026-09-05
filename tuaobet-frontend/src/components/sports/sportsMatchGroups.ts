import type { CachedMatchRow } from '../../services/sportsApi';

/** Ordem tipo casa de apostas: Série A, B, Copa do Brasil (IDs API-Football). */
const BR_LEAGUE_ORDER = ['71', '72', '73'];

const LIVE = new Set(['IN_PLAY', 'PAUSED', 'LIVE']);
const UPCOMING = new Set(['SCHEDULED', 'TIMED']);
const FINISHED = new Set([
  'FINISHED',
  'AWARDED',
  'POSTPONED',
  'CANCELLED',
  'SUSPENDED',
]);

export type MatchPhase = 'live' | 'upcoming' | 'finished';

export function partitionMatchesByPhase(matches: CachedMatchRow[]): Record<
  MatchPhase,
  CachedMatchRow[]
> {
  const live: CachedMatchRow[] = [];
  const upcoming: CachedMatchRow[] = [];
  const finished: CachedMatchRow[] = [];

  for (const m of matches) {
    if (LIVE.has(m.status)) live.push(m);
    else if (UPCOMING.has(m.status)) upcoming.push(m);
    else if (FINISHED.has(m.status)) finished.push(m);
    else upcoming.push(m);
  }

  const byTime = (a: CachedMatchRow, b: CachedMatchRow) =>
    new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime();
  const byTimeDesc = (a: CachedMatchRow, b: CachedMatchRow) =>
    new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime();

  live.sort(byTime);
  upcoming.sort(byTime);
  finished.sort(byTimeDesc);

  return { live, upcoming, finished };
}

export interface CompetitionGroup {
  key: string;
  label: string;
  emblemUrl?: string | null;
  matches: CachedMatchRow[];
}

export function groupMatchesByCompetition(matches: CachedMatchRow[]): CompetitionGroup[] {
  const map = new Map<string, CachedMatchRow[]>();
  for (const m of matches) {
    const code = m.competition?.code?.trim() || '_';
    if (!map.has(code)) map.set(code, []);
    map.get(code)!.push(m);
  }

  const sortRank = (code: string) => {
    const i = BR_LEAGUE_ORDER.indexOf(code);
    return i === -1 ? 100 + code.charCodeAt(0) : i;
  };

  const entries = [...map.entries()].sort(([a], [b]) => {
    const ra = sortRank(a);
    const rb = sortRank(b);
    if (ra !== rb) return ra - rb;
    const na = map.get(a)![0].competition?.name ?? '';
    const nb = map.get(b)![0].competition?.name ?? '';
    return na.localeCompare(nb, 'pt-BR');
  });

  return entries.map(([code, list]) => {
    const sorted = [...list].sort(
      (x, y) => new Date(x.utcDate).getTime() - new Date(y.utcDate).getTime()
    );
    return {
      key: code,
      label: sorted[0].competition?.name ?? code,
      emblemUrl: sorted[0].competition?.emblemUrl,
      matches: sorted,
    };
  });
}
