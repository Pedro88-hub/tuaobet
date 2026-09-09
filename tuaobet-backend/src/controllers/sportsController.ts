import { Request, Response } from 'express';
import { z } from 'zod';
import {
  apiFootballJson,
  apiFootballTimezone,
  ApiSportsApiError,
  ApiSportsConfigError,
} from '../services/apiFootballClient';
import { limitFinishedMatchesPerCompetition } from '../services/sportsFixtureResponseFilter';
import {
  listFixturesByQueryDate,
  listFixturesByQueryDateRange,
  syncFixturesForRange,
} from '../services/sportFixtureSync';
import {
  fixtureCompetitionCodeAllowed,
  sportsLeagueIdFilterSet,
} from '../services/sportsLeagueFilter';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const matchesQuerySchema = z
  .object({
    date: z.string().regex(dateRegex).optional(),
    dateFrom: z.string().regex(dateRegex).optional(),
    dateTo: z.string().regex(dateRegex).optional(),
    competitions: z.string().max(200).optional(),
    league: z.string().max(20).optional(),
    status: z.string().max(24).optional(),
    live: z.enum(['all']).optional(),
    season: z.string().regex(/^\d{4}$/).optional(),
  })
  .refine(
    (q) => {
      if (q.dateFrom || q.dateTo) {
        return Boolean(q.dateFrom && q.dateTo);
      }
      return true;
    },
    { message: 'Use dateFrom e dateTo em conjunto' }
  );

const matchIdParamSchema = z.object({
  matchId: z.string().regex(/^\d+$/),
});

const syncBodySchema = z
  .object({
    date: z.string().regex(dateRegex).optional(),
    from: z.string().regex(dateRegex).optional(),
    to: z.string().regex(dateRegex).optional(),
  })
  .refine(
    (b) =>
      Boolean(b.date && !b.from && !b.to) || Boolean(b.from && b.to && !b.date),
    { message: 'Envie { "date": "YYYY-MM-DD" } ou { "from", "to" }' }
  )
  .refine((b) => {
    if (b.from && b.to) return b.from <= b.to;
    return true;
  }, { message: '"from" deve ser anterior ou igual a "to"' });

const fixturesQuerySchema = z
  .object({
    date: z.string().regex(dateRegex).optional(),
    from: z.string().regex(dateRegex).optional(),
    to: z.string().regex(dateRegex).optional(),
  })
  .refine(
    (q) =>
      Boolean(q.date && !q.from && !q.to) || Boolean(q.from && q.to && !q.date),
    { message: 'Use ?date= OU ?from=&to=' }
  )
  .refine((q) => {
    if (q.from && q.to) return q.from <= q.to;
    return true;
  });

function crestUrlOrFallback(
  stored: string | null | undefined,
  externalId: number | null | undefined
): string | null {
  if (stored?.trim()) return stored.trim();
  if (externalId != null && Number.isFinite(externalId)) {
    return `https://media.api-sports.io/football/teams/${externalId}.png`;
  }
  return null;
}

function competitionEmblemUrlOrFallback(
  stored: string | null | undefined,
  competitionCode: string | null | undefined
): string | null {
  if (stored?.trim()) return stored.trim();
  const code = competitionCode?.trim();
  if (code && /^\d+$/.test(code)) {
    return `https://media.api-sports.io/football/leagues/${code}.png`;
  }
  if (code) {
    return `https://crests.football-data.org/${code}.png`;
  }
  return null;
}

function handleSportsError(res: Response, err: unknown) {
  if (err instanceof ApiSportsConfigError) {
    return res.status(503).json({ message: err.message });
  }
  if (err instanceof ApiSportsApiError) {
    const code = err.status >= 400 && err.status < 600 ? err.status : 502;
    return res.status(code).json({
      message: 'Erro ao contatar API-Football (api-sports.io)',
      detail: err.message,
    });
  }
  console.error('[sports]', err);
  return res.status(500).json({ message: 'Erro interno' });
}

/** Ligas (temporada atual por defeito) — por defeito só competições no Brasil. */
export async function listCompetitions(req: Request, res: Response) {
  const season =
    typeof req.query.season === 'string' && /^\d{4}$/.test(req.query.season)
      ? req.query.season
      : String(new Date().getFullYear());

  const world =
    req.query.world === 'true' ||
    req.query.all === 'true' ||
    req.query.allCountries === 'true';
  const countryParam =
    typeof req.query.country === 'string' && req.query.country.trim().length > 0
      ? req.query.country.trim()
      : 'Brazil';

  try {
    const data = await apiFootballJson('/leagues', {
      season,
      current: 'true',
      ...(world ? {} : { country: countryParam }),
    });
    return res.json(data);
  } catch (err) {
    return handleSportsError(res, err);
  }
}

/**
 * Jogos num dia ou intervalo — proxy direto à API-Football.
 */
export async function listMatches(req: Request, res: Response) {
  const parsed = matchesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Parâmetros inválidos',
      issues: parsed.error.flatten(),
    });
  }

  const q = parsed.data;
  const query: Record<string, string | undefined> = {
    timezone: apiFootballTimezone(),
  };

  if (q.date) {
    query.date = q.date;
  } else if (q.dateFrom && q.dateTo) {
    query.from = q.dateFrom;
    query.to = q.dateTo;
  } else {
    query.date = new Date().toISOString().slice(0, 10);
  }

  const leagueId = q.league?.trim() || q.competitions?.split(',')[0]?.trim();
  if (leagueId) {
    query.league = leagueId;
  }
  if (q.status?.trim()) {
    query.status = q.status.trim();
  }
  if (q.live === 'all') {
    query.live = 'all';
  }
  if (q.season) {
    query.season = q.season;
  }

  try {
    const data = await apiFootballJson('/fixtures', query);
    return res.json(data);
  } catch (err) {
    return handleSportsError(res, err);
  }
}

export async function getMatch(req: Request, res: Response) {
  const parsed = matchIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ message: 'ID de jogo inválido' });
  }

  try {
    const data = await apiFootballJson('/fixtures', {
      id: parsed.data.matchId,
      timezone: apiFootballTimezone(),
    });
    return res.json(data);
  } catch (err) {
    return handleSportsError(res, err);
  }
}

/** Grava jogos: um dia (`date`) ou intervalo (`from`+`to`) — um pedido à API no intervalo. */
export async function syncFixtures(req: Request, res: Response) {
  const parsed = syncBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Corpo inválido',
      issues: parsed.error.flatten(),
    });
  }

  try {
    const b = parsed.data;
    if (b.date) {
      const r = await syncFixturesForRange(b.date, b.date);
      return res.json({
        date: b.date,
        synced: r.synced,
        settledBets: r.settledBets,
      });
    }
    const r = await syncFixturesForRange(b.from!, b.to!);
    return res.json({
      from: r.from,
      to: r.to,
      synced: r.synced,
      settledBets: r.settledBets,
    });
  } catch (err) {
    return handleSportsError(res, err);
  }
}

/** Lista jogos em cache; terminados limitados por competição (ver SPORTS_MAX_FINISHED_PER_LEAGUE). */
export async function listCachedFixtures(req: Request, res: Response) {
  const parsed = fixturesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Query inválida: use ?date= ou ?from=&to=',
      issues: parsed.error.flatten(),
    });
  }

  try {
    const q = parsed.data;
    const raw =
      q.date != null
        ? await listFixturesByQueryDate(q.date)
        : await listFixturesByQueryDateRange(q.from!, q.to!);

    const leagueFilter = sportsLeagueIdFilterSet();
    const scoped = raw.filter((r) =>
      fixtureCompetitionCodeAllowed(r.competitionCode, leagueFilter)
    );

    const rows = limitFinishedMatchesPerCompetition(scoped);

    const filters =
      q.date != null ? { date: q.date } : { from: q.from!, to: q.to! };

    return res.json({
      filters,
      count: rows.length,
      matches: rows.map((r) => ({
        id: r.id,
        externalId: r.externalId,
        utcDate: r.utcDate.toISOString(),
        status: r.status,
        homeTeam: {
          name: r.homeTeamName,
          crestUrl: crestUrlOrFallback(r.homeTeamCrestUrl, r.homeTeamExternalId),
        },
        awayTeam: {
          name: r.awayTeamName,
          crestUrl: crestUrlOrFallback(r.awayTeamCrestUrl, r.awayTeamExternalId),
        },
        competition: {
          code: r.competitionCode,
          name: r.competitionName,
          emblemUrl: competitionEmblemUrlOrFallback(
            r.competitionEmblemUrl,
            r.competitionCode
          ),
        },
        score:
          r.homeScore != null && r.awayScore != null
            ? { fullTime: { home: r.homeScore, away: r.awayScore } }
            : null,
      })),
    });
  } catch (err) {
    console.error('[sports]', err);
    return res.status(500).json({ message: 'Erro interno' });
  }
}
