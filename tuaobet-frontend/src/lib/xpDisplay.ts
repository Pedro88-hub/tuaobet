/** Progressão simples para UI de nível (XP vem do backend). */
const XP_PER_LEVEL = 600;

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
