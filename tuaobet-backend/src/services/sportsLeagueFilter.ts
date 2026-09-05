/**
 * IDs de liga API-Football (api-sports.io) — campeonatos brasileiros principais.
 * 71: Brasileirão Série A, 72: Série B, 73: Copa do Brasil
 * @see https://www.api-football.com/documentation-v3
 */
export const DEFAULT_BRAZIL_LEAGUE_IDS = ['71', '72', '73'] as const;

/**
 * `SPORTS_LEAGUE_IDS`: lista separada por vírgulas, ou `all` para não filtrar.
 * Se não definido, usa apenas ligas em DEFAULT_BRAZIL_LEAGUE_IDS.
 */
export function sportsLeagueIdFilterSet(): Set<string> | null {
  const raw = process.env.SPORTS_LEAGUE_IDS?.trim();
  if (!raw) return new Set(DEFAULT_BRAZIL_LEAGUE_IDS);
  if (/^all$/i.test(raw)) return null;
  const ids = raw
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.length ? new Set(ids) : new Set(DEFAULT_BRAZIL_LEAGUE_IDS);
}

export function leagueIdAllowed(leagueId: number, allowed: Set<string> | null): boolean {
  if (allowed == null) return true;
  return allowed.has(String(leagueId));
}

export function fixtureCompetitionCodeAllowed(
  competitionCode: string | null | undefined,
  allowed: Set<string> | null
): boolean {
  if (allowed == null) return true;
  const c = competitionCode?.trim();
  if (!c) return false;
  return allowed.has(c);
}
