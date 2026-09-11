import type { Bets, Side } from './types.js';

export type Phase = 'BETTING' | 'DEALING' | 'RESULT';
export const BETTING_SECONDS = 12;
export const CHIP_CENTS = [50, 100, 500, 1000, 2500, 10000, 50000] as const;

export type AreaTotal = { amount: number; count: number };
export type AreaTotals = Record<Side, AreaTotal>;
export type LivePlacement = { id: string; side: Side; cents: number };
export type LiveHistoryItem = {
  roundId: number;
  winner: Side;
  playerTotal: number;
  bankerTotal: number;
  createdAt: string;
};
export type TotalsPayload = { roundId: number } & AreaTotals;
export type ChipAcceptedPayload = {
  roundId: number;
  placementId: string;
  side: Side;
  amount: number;
  bets: Record<Side, number>;
  placements: { placementId: string; side: Side; amount: number }[];
};
export type CancelledPayload = {
  roundId: number;
  refunded: number;
  bets: Record<Side, number>;
  placements: { placementId: string; side: Side; amount: number }[];
};
export type VisualChip = { id: string; cents: number; index: number };

export function emptyTotals(): AreaTotals {
  return {
    player: { amount: 0, count: 0 },
    banker: { amount: 0, count: 0 },
    tie: { amount: 0, count: 0 },
  };
}

export function emptyBetsBrl(): Record<Side, number> {
  return { player: 0, banker: 0, tie: 0 };
}

export function brlToCents(amount: number): number {
  return Math.round(amount * 100);
}

export function isStaleRound(currentRoundId: number, incomingRoundId: number | undefined): boolean {
  return incomingRoundId != null && currentRoundId !== 0 && incomingRoundId < currentRoundId;
}

export function canInteract(phase: Phase, authenticated: boolean): boolean {
  return phase === 'BETTING' && authenticated;
}

export function chipVisualIndex(cents: number): number {
  const exact = CHIP_CENTS.indexOf(cents as (typeof CHIP_CENTS)[number]);
  if (exact >= 0) return exact;
  let index = 0;
  for (let i = 0; i < CHIP_CENTS.length; i += 1) {
    if (CHIP_CENTS[i] <= cents) index = i;
  }
  return index;
}

export function placementsFromServer(
  list: { placementId: string; side: Side; amount: number }[] | undefined,
): LivePlacement[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((item) => item && typeof item.placementId === 'string' && ['player', 'banker', 'tie'].includes(item.side))
    .map((item) => ({ id: item.placementId, side: item.side, cents: brlToCents(item.amount) }));
}

export function stackFromPlacements(placements: readonly LivePlacement[], limit = 7): {
  visible: VisualChip[];
  overflow: number;
} {
  const all = placements.map((item) => ({
    id: item.id,
    cents: item.cents,
    index: chipVisualIndex(item.cents),
  }));
  if (all.length <= limit) return { visible: all, overflow: 0 };
  return { visible: all.slice(all.length - limit), overflow: all.length - limit };
}

export function applyTotals(payload: TotalsPayload | AreaTotals): AreaTotals {
  const source = payload as AreaTotals;
  return {
    player: { amount: Number(source.player?.amount) || 0, count: Number(source.player?.count) || 0 },
    banker: { amount: Number(source.banker?.amount) || 0, count: Number(source.banker?.count) || 0 },
    tie: { amount: Number(source.tie?.amount) || 0, count: Number(source.tie?.count) || 0 },
  };
}

export function betsFromLivePlacements(placements: readonly LivePlacement[]): Bets {
  return placements.reduce<Bets>(
    (bets, item) => ({ ...bets, [item.side]: bets[item.side] + item.cents }),
    { player: 0, banker: 0, tie: 0 },
  );
}

export const ERROR_MESSAGES: Record<string, string> = {
  AUTH: 'Entre na sua conta para apostar.',
  CLOSED: 'As apostas desta rodada já fecharam.',
  INVALID: 'Aposta inválida.',
  MIN_BET: 'Aposta abaixo do mínimo.',
  MAX_BET: 'Aposta acima do máximo.',
  INSUFFICIENT_BALANCE: 'Saldo insuficiente.',
  ACCOUNT_BLOCKED: 'Conta bloqueada.',
  NO_BET: 'Não há fichas para desfazer.',
};
