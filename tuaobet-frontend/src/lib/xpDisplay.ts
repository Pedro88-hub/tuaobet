/** Progressão simples para UI de nível (XP vem do backend). */
const XP_PER_LEVEL = 600;

/** Limiares de patente alinhados a tierForLevel (níveis 12 / 25 / 40). */
const TIER_THRESHOLDS = [
  { label: 'Bronze', minXp: 0 },
  { label: 'Prata', minXp: 11 * XP_PER_LEVEL }, // nível 12
  { label: 'Ouro', minXp: 24 * XP_PER_LEVEL }, // nível 25
  { label: 'Diamante', minXp: 39 * XP_PER_LEVEL }, // nível 40
] as const;

const VIP_SEGMENTS = 5;

export function levelFromXp(xp: number): number {
  return Math.max(1, 1 + Math.floor(Math.max(0, xp) / XP_PER_LEVEL));
}

export function xpProgressInLevel(xp: number): { pct: number; current: number; need: number } {
  const safe = Math.max(0, xp);
  const into = safe % XP_PER_LEVEL;
  const pct = (into / XP_PER_LEVEL) * 100;
  return { pct, current: into, need: XP_PER_LEVEL };
}

export function tierForLevel(level: number): { label: string; crownClass: string } {
  if (level >= 40) return { label: 'Diamante', crownClass: 'text-cyan-200' };
  if (level >= 25) return { label: 'Ouro', crownClass: 'text-amber-400' };
  if (level >= 12) return { label: 'Prata', crownClass: 'text-slate-300' };
  return { label: 'Bronze', crownClass: 'text-amber-700' };
}

export type VipProgress = {
  currentXp: number;
  nextXp: number;
  currentTier: string;
  nextTier: string | null;
  /** Quantidade de segmentos totalmente preenchidos (0–5). */
  filledSegments: number;
  /** Preenchimento do segmento parcial atual (0–1). */
  segmentFill: number;
};

export function vipProgressFromXp(xp: number): VipProgress {
  const safe = Math.max(0, Math.floor(xp));
  let tierIndex = 0;
  for (let i = TIER_THRESHOLDS.length - 1; i >= 0; i--) {
    if (safe >= TIER_THRESHOLDS[i].minXp) {
      tierIndex = i;
      break;
    }
  }

  const current = TIER_THRESHOLDS[tierIndex];
  const next = TIER_THRESHOLDS[tierIndex + 1] ?? null;

  if (!next) {
    return {
      currentXp: safe,
      nextXp: safe,
      currentTier: current.label,
      nextTier: null,
      filledSegments: VIP_SEGMENTS,
      segmentFill: 1,
    };
  }

  const span = next.minXp - current.minXp;
  const into = Math.min(span, Math.max(0, safe - current.minXp));
  const ratio = span > 0 ? into / span : 1;
  const exact = ratio * VIP_SEGMENTS;
  const filledSegments = Math.min(VIP_SEGMENTS, Math.floor(exact));
  const segmentFill =
    filledSegments >= VIP_SEGMENTS ? 1 : Math.min(1, Math.max(0, exact - filledSegments));

  return {
    currentXp: safe,
    nextXp: next.minXp,
    currentTier: current.label,
    nextTier: next.label,
    filledSegments,
    segmentFill,
  };
}
