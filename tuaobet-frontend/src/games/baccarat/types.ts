export type Side = 'player' | 'banker' | 'tie';
/** Integer cents in staged bets; API money is BRL. */
export type Bets = Record<Side, number>;
export type Placement = { side: Side; cents: number };
export type Card = { rank: 'A'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'J'|'Q'|'K'; suit: 'clubs'|'diamonds'|'hearts'|'spades' };
export type Round = {
  roundId: string; requestId: string; playerCards: Card[]; bankerCards: Card[];
  playerTotal: number; bankerTotal: number; winner: Side;
  settlements: { side: Side; amount: number; payout: number; multiplier: number; result: 'win'|'loss'|'push' }[];
  totalStake: number; totalPayout: number; balance: number; createdAt: string;
};
export type Pending = { requestId: string; bets: Bets };
export type Status = 'betting'|'submitting'|'dealing'|'result'|'recovering';
export const SIDE_LABELS: Record<Side,string> = { player: 'Jogador', banker: 'Banca', tie: 'Empate' };
