import type { Bets, Card, Placement, Round, Side } from './types.js';
export const emptyBets = (): Bets => ({ player: 0, banker: 0, tie: 0 });
export const totalCents = (bets: Bets) => bets.player + bets.banker + bets.tie;
export const canAddChip = (chip: number, remaining: number) => Number.isSafeInteger(chip) && chip >= 50 && chip <= remaining;
export function addChip(bets: Bets, side: Side, chip: number, balance: number): Bets {
  return canAddChip(chip, balance-totalCents(bets)) ? { ...bets, [side]: bets[side]+chip } : bets;
}
export function parseChipCents(value: string): number | null {
  if (!/^\d+(?:[,.]\d{1,2})?$/.test(value.trim())) return null;
  const amount = Math.round(Number(value.trim().replace(',','.'))*100);
  return Number.isSafeInteger(amount) && amount >= 50 ? amount : null;
}
export const undoPlacement = (placements: Placement[]) => placements.slice(0,-1);
export const clearPlacements = (): Placement[] => [];
export const betsFromPlacements = (placements: Placement[]) => placements.reduce((bets, item) => ({ ...bets, [item.side]: bets[item.side]+item.cents }), emptyBets());
export const canDeal = (bets: Bets, balance: number) => Object.values(bets).every(v=>Number.isSafeInteger(v) && (v===0 || v>=50)) && totalCents(bets)>0 && Number.isSafeInteger(totalCents(bets)) && totalCents(bets)<=balance;
export const money = (cents: number) => (cents/100).toLocaleString('pt-BR',{ style: 'currency',currency:'BRL' });
export const cardValue = (card: Card) => card.rank==='A' ? 1 : Number(card.rank)%10 || 0;
export const visibleTotal = (cards: Card[]) => cards.reduce((total,card)=>total+cardValue(card),0)%10;
export const revealedHistory = (rounds: Round[], hiddenRequestId: string | null) => rounds.filter(round=>round.requestId!==hiddenRequestId).slice(0,20);
export function dealSequence(round: Round): { side: 'player'|'banker'; card: Card; index: number }[] {
  const sequence = [
    {side:'player' as const,card:round.playerCards[0],index:0},
    {side:'banker' as const,card:round.bankerCards[0],index:0},
    {side:'player' as const,card:round.playerCards[1],index:1},
    {side:'banker' as const,card:round.bankerCards[1],index:1},
  ];
  if(round.playerCards[2]) sequence.push({side:'player',card:round.playerCards[2],index:2});
  if(round.bankerCards[2]) sequence.push({side:'banker',card:round.bankerCards[2],index:2});
  return sequence;
}
