import type { BaccaratOutcome, Side } from './baccaratMath';

export type BaccaratPhase = 'BETTING' | 'DEALING' | 'RESULT';

export const BACCARAT_BETTING_SECONDS = 12;
export const BACCARAT_DEALING_MS = 5000;
export const BACCARAT_RESULT_MS = 5000;
export const BACCARAT_HISTORY_MAX = 400;

export const SIDES: readonly Side[] = ['player', 'banker', 'tie'];

export type AreaTotal = { amount: number; count: number };
export type AreaTotals = Record<Side, AreaTotal>;

export type LiveChip = {
  placementId: string;
  betId: string;
  userId: string;
  username: string;
  side: Side;
  amount: number;
};

export type SimulatedChip = {
  id: string;
  side: Side;
  amount: number;
};

export type HistoryItem = {
  roundId: number;
  winner: Side;
  playerTotal: number;
  bankerTotal: number;
  createdAt: string;
};

export type PersonalPlacements = {
  placementId: string;
  side: Side;
  amount: number;
}[];

export function emptyTotals(): AreaTotals {
  return {
    player: { amount: 0, count: 0 },
    banker: { amount: 0, count: 0 },
    tie: { amount: 0, count: 0 },
  };
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function addToTotals(totals: AreaTotals, side: Side, amount: number): AreaTotals {
  const next = {
    player: { ...totals.player },
    banker: { ...totals.banker },
    tie: { ...totals.tie },
  };
  next[side] = {
    amount: roundMoney(next[side].amount + amount),
    count: next[side].count + 1,
  };
  return next;
}

export function totalsFromChips(chips: readonly { side: Side; amount: number }[]): AreaTotals {
  return chips.reduce((totals, chip) => addToTotals(totals, chip.side, chip.amount), emptyTotals());
}

export function mergeTotals(real: AreaTotals, simulated: AreaTotals): AreaTotals {
  return {
    player: {
      amount: roundMoney(real.player.amount + simulated.player.amount),
      count: real.player.count + simulated.player.count,
    },
    banker: {
      amount: roundMoney(real.banker.amount + simulated.banker.amount),
      count: real.banker.count + simulated.banker.count,
    },
    tie: {
      amount: roundMoney(real.tie.amount + simulated.tie.amount),
      count: real.tie.count + simulated.tie.count,
    },
  };
}

export function displayTotals(real: readonly LiveChip[], simulated: readonly SimulatedChip[]): AreaTotals {
  return mergeTotals(totalsFromChips(real), totalsFromChips(simulated));
}

export function userChips(chips: readonly LiveChip[], userId: string): LiveChip[] {
  return chips.filter((chip) => chip.userId === userId);
}

export function lastUserChip(chips: readonly LiveChip[], userId: string): LiveChip | null {
  for (let index = chips.length - 1; index >= 0; index -= 1) {
    const chip = chips[index];
    if (chip?.userId === userId) return chip;
  }
  return null;
}

export function removeLastUserChip(chips: readonly LiveChip[], userId: string): {
  remaining: LiveChip[];
  removed: LiveChip | null;
} {
  const removed = lastUserChip(chips, userId);
  if (!removed) return { remaining: [...chips], removed: null };
  const remaining = [...chips];
  remaining.splice(remaining.lastIndexOf(removed), 1);
  return { remaining, removed };
}

export function removeUserChips(chips: readonly LiveChip[], userId: string): {
  remaining: LiveChip[];
  removed: LiveChip[];
} {
  const remaining: LiveChip[] = [];
  const removed: LiveChip[] = [];
  for (const chip of chips) {
    if (chip.userId === userId) removed.push(chip);
    else remaining.push(chip);
  }
  return { remaining, removed };
}

export function personalBets(chips: readonly LiveChip[], userId: string): Record<Side, number> {
  const bets: Record<Side, number> = { player: 0, banker: 0, tie: 0 };
  for (const chip of userChips(chips, userId)) {
    bets[chip.side] = roundMoney(bets[chip.side] + chip.amount);
  }
  return bets;
}

export function personalPlacements(chips: readonly LiveChip[], userId: string): PersonalPlacements {
  return userChips(chips, userId).map((chip) => ({
    placementId: chip.placementId,
    side: chip.side,
    amount: chip.amount,
  }));
}

export function canPlaceChip(phase: BaccaratPhase, bettingOpen: boolean): boolean {
  return phase === 'BETTING' && bettingOpen;
}

export function canCancelChip(phase: BaccaratPhase, bettingOpen: boolean): boolean {
  return phase === 'BETTING' && bettingOpen;
}

export function isValidSide(value: unknown): value is Side {
  return value === 'player' || value === 'banker' || value === 'tie';
}

export function nextPhase(phase: BaccaratPhase): { phase: BaccaratPhase; delayMs: number } | null {
  if (phase === 'BETTING') return { phase: 'DEALING', delayMs: BACCARAT_DEALING_MS };
  if (phase === 'DEALING') return { phase: 'RESULT', delayMs: BACCARAT_RESULT_MS };
  return null;
}

export function historyFromOutcome(roundId: number, outcome: BaccaratOutcome, createdAt = new Date()): HistoryItem {
  return {
    roundId,
    winner: outcome.winner,
    playerTotal: outcome.playerTotal,
    bankerTotal: outcome.bankerTotal,
    createdAt: createdAt.toISOString(),
  };
}

export function prependHistory(history: readonly HistoryItem[], item: HistoryItem, max = BACCARAT_HISTORY_MAX): HistoryItem[] {
  return [item, ...history.filter((entry) => entry.roundId !== item.roundId)].slice(0, max);
}

export function buildSnapshot(input: {
  phase: BaccaratPhase;
  countdown: number;
  roundId: number;
  serverSeedHash?: string;
  outcome: BaccaratOutcome | null;
  history: HistoryItem[];
  realChips: LiveChip[];
  simulatedChips: SimulatedChip[];
  userId?: string;
}) {
  const totals = displayTotals(input.realChips, input.simulatedChips);
  return {
    state: {
      phase: input.phase,
      countdown: input.phase === 'BETTING' ? input.countdown : 0,
      roundId: input.roundId,
      serverSeedHash: input.serverSeedHash,
      outcome: input.phase === 'BETTING' ? undefined : input.outcome ?? undefined,
    },
    totals: { roundId: input.roundId, ...totals },
    history: input.history,
    personal: input.userId
      ? {
          bets: personalBets(input.realChips, input.userId),
          placements: personalPlacements(input.realChips, input.userId),
        }
      : null,
  };
}
