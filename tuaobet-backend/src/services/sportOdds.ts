export type Odds1x2 = { home: number; draw: number; away: number };

function parseOdd(envKey: string, fallback: number): number {
  const v = Number(process.env[envKey]);
  if (!Number.isFinite(v) || v < 1.01) {
    return fallback;
  }
  return Math.round(v * 100) / 100;
}

/** Odds decimais configuráveis (MVP — substituir por feed real depois). */
export function getConfigured1x2Odds(): Odds1x2 {
  return {
    home: parseOdd('SPORT_1X2_ODDS_HOME', 1.95),
    draw: parseOdd('SPORT_1X2_ODDS_DRAW', 3.4),
    away: parseOdd('SPORT_1X2_ODDS_AWAY', 1.95),
  };
}

export function oddsForSelection(selection: 'HOME' | 'DRAW' | 'AWAY'): number {
  const o = getConfigured1x2Odds();
  if (selection === 'HOME') return o.home;
  if (selection === 'DRAW') return o.draw;
  return o.away;
}
