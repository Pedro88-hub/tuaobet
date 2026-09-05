import type { SportFixture } from '@prisma/client';
import { maxFinishedPerLeagueFromEnv } from './sportsFixtureWindow';

/** Estados tratados como “já passou” para o limite por competição. */
const PAST_LIKE = new Set([
  'FINISHED',
  'AWARDED',
  'POSTPONED',
  'CANCELLED',
  'SUSPENDED',
]);

/**
 * Mantém todos os ao vivo / agendados; entre terminados, só os `maxPerLeague` mais recentes por competição (`competitionCode`).
 */
export function limitFinishedMatchesPerCompetition(
  rows: SportFixture[],
  maxPerLeague = maxFinishedPerLeagueFromEnv()
): SportFixture[] {
  if (maxPerLeague <= 0) {
    return rows.filter((r) => !PAST_LIKE.has(r.status));
  }

  const active = rows.filter((r) => !PAST_LIKE.has(r.status));
  const past = rows.filter((r) => PAST_LIKE.has(r.status));

  const byLeague = new Map<string, SportFixture[]>();
  for (const r of past) {
    const k = r.competitionCode ?? '_';
    if (!byLeague.has(k)) byLeague.set(k, []);
    byLeague.get(k)!.push(r);
  }

  const kept: SportFixture[] = [];
  for (const arr of byLeague.values()) {
    arr.sort((a, b) => b.utcDate.getTime() - a.utcDate.getTime());
    kept.push(...arr.slice(0, maxPerLeague));
  }

  const merged = [...active, ...kept];
  merged.sort((a, b) => a.utcDate.getTime() - b.utcDate.getTime());
  return merged;
}
