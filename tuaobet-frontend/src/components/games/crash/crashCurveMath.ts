/**
 * Curva alinhada ao motor do crash: multiplier = e^(k·t) com t em segundos (crashEngine.ts usa k=0.06).
 * O eixo X é tempo absoluto; após VIEW_WINDOW_SEC a "câmara" desliza — grelha e segundos movem-se com o tempo.
 */
export const CRASH_SERVER_K = 0.06;

/** Segundos visíveis quando a vista começa a deslizar (efeito de scroll contínuo). */
const VIEW_WINDOW_SEC = 14;

const MIN_SPAN_EARLY_SEC = 8;

const clamp01 = (v: number) => Math.min(100, Math.max(0, v));

export type CrashGridLine = { value: number; y: number };

export type CrashTimeTick = { sec: number; leftPct: number };

export type CrashVerticalLine = { tSec: number; leftPct: number };

export type CrashCurveResult = {
  pathD: string;
  areaD: string;
  planeLeftPct: number;
  planeBottomPct: number;
  gridLines: CrashGridLine[];
  timeAxisTicks: CrashTimeTick[];
  verticalTimeLines: CrashVerticalLine[];
};

function buildGridLines(maxY: number): CrashGridLine[] {
  const lines: CrashGridLine[] = [];
  const range = maxY - 1;
  const roughStep = range / 5;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalizedStep = roughStep / magnitude;
  const step =
    normalizedStep < 1.5 ? 1 * magnitude : normalizedStep < 3.5 ? 2 * magnitude : 5 * magnitude;
  const startVal = Math.ceil(1.01 / step) * step;

  for (let val = startVal; val < maxY; val += step) {
    const yPct = ((val - 1) / (maxY - 1)) * 100;
    lines.push({ value: val, y: 100 - yPct });
  }
  return lines;
}

function timeToX(t: number, tStart: number, tSpan: number): number {
  if (tSpan <= 1e-9) return 0;
  return clamp01(((t - tStart) / tSpan) * 100);
}

/** Espaçamento entre linhas verticais de tempo (segundos absolutos). */
function pickVerticalStep(tSpan: number): number {
  if (tSpan <= 10) return 2;
  if (tSpan <= 20) return 3;
  if (tSpan <= 40) return 5;
  return 10;
}

function buildVerticalTimeLines(tStart: number, tNow: number, tSpan: number): CrashVerticalLine[] {
  const step = pickVerticalStep(tSpan);
  const lines: CrashVerticalLine[] = [];
  let t = Math.ceil((tStart - 1e-6) / step) * step;
  for (; t <= tNow + 1e-6; t += step) {
    if (t < tStart - 1e-6) continue;
    lines.push({ tSec: t, leftPct: timeToX(t, tStart, tSpan) });
  }
  return lines;
}

function buildTimeAxisTicks(tStart: number, tNow: number, tSpan: number): CrashTimeTick[] {
  const n = 5;
  if (tNow - tStart < 1e-6) {
    return [{ sec: tStart, leftPct: 50 }];
  }
  const ticks: CrashTimeTick[] = [];
  for (let j = 0; j < n; j++) {
    const sec = tStart + (tNow - tStart) * (j / (n - 1));
    ticks.push({ sec, leftPct: timeToX(sec, tStart, tSpan) });
  }
  return ticks;
}

/**
 * Gera o path SVG e posição do marcador a partir do multiplicador (já pode estar interpolado no cliente).
 */
export function buildCrashCurve(multiplier: number): CrashCurveResult {
  const m = Math.max(1, multiplier);
  const elapsedSec = Math.log(m) / CRASH_SERVER_K;
  const maxY = Math.max(2, m * 1.22);

  const tNow = elapsedSec;
  const tStart = Math.max(0, tNow - VIEW_WINDOW_SEC);
  const tSpan =
    tStart > 0 ? tNow - tStart : Math.max(MIN_SPAN_EARLY_SEC, tNow * 1.02);

  const tSample0 = Math.max(0, tStart);
  const mAt = (t: number) => Math.exp(CRASH_SERVER_K * t);

  const steps = 160;
  const pts: { x: number; y: number }[] = [];

  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const t = tSample0 + (tNow - tSample0) * u;
    const mi = mAt(t);
    const x = timeToX(t, tStart, tSpan);
    const y = clamp01(100 - ((mi - 1) / (maxY - 1)) * 100);
    pts.push({ x, y });
  }

  if (pts.length === 0) {
    return {
      pathD: 'M 0 100',
      areaD: 'M 0 100 L 0 100 Z',
      planeLeftPct: 0,
      planeBottomPct: 0,
      gridLines: buildGridLines(maxY),
      timeAxisTicks: buildTimeAxisTicks(0, 0, 1),
      verticalTimeLines: [],
    };
  }

  let pathD = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    pathD += ` L ${pts[i].x} ${pts[i].y}`;
  }

  const last = pts[pts.length - 1];
  const areaD = `${pathD} L ${last.x} 100 L ${pts[0].x} 100 Z`;

  const planeLeftPct = last.x;
  const planeBottomPct = clamp01(((m - 1) / (maxY - 1)) * 100);

  return {
    pathD,
    areaD,
    planeLeftPct,
    planeBottomPct,
    gridLines: buildGridLines(maxY),
    timeAxisTicks: buildTimeAxisTicks(tStart, tNow, tSpan),
    verticalTimeLines: buildVerticalTimeLines(tStart, tNow, tSpan),
  };
}
