const API_FOOTBALL_BASE = 'https://v3.football.api-sports.io';

export class ApiSportsConfigError extends Error {
  constructor() {
    super('APISPORTS_FOOTBALL_KEY não está configurada (registro gratuito em https://dashboard.api-football.com/)');
    this.name = 'ApiSportsConfigError';
  }
}

export class ApiSportsApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiSportsApiError';
  }
}

export interface ApiFootballEnvelope<T> {
  get?: string;
  parameters?: Record<string, unknown>;
  errors?: Record<string, unknown> | unknown[] | string;
  results?: number;
  paging?: { current?: number; total?: number };
  response: T;
}

/**
 * Cliente API-Football (api-sports.io) — plano gratuito com limite diário de pedidos.
 * Header: x-apisports-key
 * @see https://www.api-football.com/documentation-v3
 */
export async function apiFootballJson<T>(
  path: string,
  query?: Record<string, string | number | boolean | undefined>
): Promise<ApiFootballEnvelope<T>> {
  const key = process.env.APISPORTS_FOOTBALL_KEY?.trim();
  if (!key) {
    throw new ApiSportsConfigError();
  }

  const normalized = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${API_FOOTBALL_BASE}${normalized}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === '') continue;
      url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    headers: { 'x-apisports-key': key },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new ApiSportsApiError(res.status, text || res.statusText || 'Erro API-Football');
  }

  let body: ApiFootballEnvelope<T>;
  try {
    body = JSON.parse(text) as ApiFootballEnvelope<T>;
  } catch {
    throw new ApiSportsApiError(502, 'Resposta inválida da API-Football');
  }

  const err = body.errors;
  const hasErr =
    err != null &&
    (typeof err === 'string'
      ? err.length > 0
      : Array.isArray(err)
        ? err.length > 0
        : typeof err === 'object' && Object.keys(err as object).length > 0);
  if (hasErr) {
    throw new ApiSportsApiError(
      400,
      typeof err === 'string' ? err : JSON.stringify(err)
    );
  }

  return body;
}

export function apiFootballTimezone(): string {
  return process.env.APISPORTS_TIMEZONE?.trim() || 'America/Sao_Paulo';
}
