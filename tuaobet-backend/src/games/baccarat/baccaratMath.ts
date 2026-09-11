import { randomInt } from 'node:crypto';

export type Side = 'player' | 'banker' | 'tie';

export type Bets = Record<Side, number>;

export type Card = {
  rank: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
  suit: 'clubs' | 'diamonds' | 'hearts' | 'spades';
};

export type Settlement = {
  side: Side;
  amount: number;
  payout: number;
  multiplier: number;
  result: 'win' | 'loss' | 'push';
};

export type BaccaratOutcome = {
  playerCards: Card[];
  bankerCards: Card[];
  playerTotal: number;
  bankerTotal: number;
  winner: Side;
};

const ranks: readonly Card['rank'][] = [
  'A',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
];

const suits: readonly Card['suit'][] = ['clubs', 'diamonds', 'hearts', 'spades'];
const sides: readonly Side[] = ['player', 'banker', 'tie'];

export function createShoe(): Card[] {
  const shoe: Card[] = [];

  for (let deck = 0; deck < 8; deck += 1) {
    for (const suit of suits) {
      for (const rank of ranks) {
        shoe.push({ rank, suit });
      }
    }
  }

  return shoe;
}

export function shuffleShoe(
  shoe: readonly Card[],
  randomIndex: (max: number) => number = (max) => randomInt(max),
): Card[] {
  const shuffled = shoe.slice();

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const max = i + 1;
    const j = randomIndex(max);

    if (!Number.isInteger(j) || j < 0 || j >= max) {
      throw new RangeError(`Random index must be an integer from 0 through ${max - 1}`);
    }

    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

export function cardValue(card: Card): number {
  if (card.rank === 'A') return 1;
  if (card.rank === '10' || card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') {
    return 0;
  }

  return Number(card.rank);
}

export function handTotal(cards: readonly Card[]): number {
  return cards.reduce((sum, card) => sum + cardValue(card), 0) % 10;
}

export function bankerDraws(total: number, playerThird: number | null): boolean {
  if (!Number.isInteger(total) || total < 0 || total > 7) {
    throw new RangeError('Banker total must be an integer from 0 through 7');
  }

  if (playerThird === null) return total <= 5;

  if (!Number.isInteger(playerThird) || playerThird < 0 || playerThird > 9) {
    throw new RangeError('Player third-card value must be an integer from 0 through 9 or null');
  }

  if (total <= 2) return true;
  if (total === 3) return playerThird !== 8;
  if (total === 4) return playerThird >= 2 && playerThird <= 7;
  if (total === 5) return playerThird >= 4 && playerThird <= 7;
  if (total === 6) return playerThird === 6 || playerThird === 7;
  return false;
}

export function dealRound(shoe: readonly Card[]): BaccaratOutcome {
  let nextCard = 0;
  const draw = (): Card => {
    const card = shoe[nextCard];
    if (card === undefined) {
      throw new RangeError('Shoe is too short to complete the round');
    }
    nextCard += 1;
    return card;
  };

  const playerCards = [draw()];
  const bankerCards = [draw()];
  playerCards.push(draw());
  bankerCards.push(draw());

  let playerTotal = handTotal(playerCards);
  let bankerTotal = handTotal(bankerCards);
  const natural = playerTotal >= 8 || bankerTotal >= 8;

  if (!natural) {
    let playerThird: number | null = null;

    if (playerTotal <= 5) {
      const card = draw();
      playerCards.push(card);
      playerThird = cardValue(card);
      playerTotal = handTotal(playerCards);
    }

    if (bankerDraws(bankerTotal, playerThird)) {
      bankerCards.push(draw());
      bankerTotal = handTotal(bankerCards);
    }
  }

  const winner: Side = playerTotal === bankerTotal
    ? 'tie'
    : playerTotal > bankerTotal
      ? 'player'
      : 'banker';

  return { playerCards, bankerCards, playerTotal, bankerTotal, winner };
}

function cents(value: number, side: Side): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${side} bet must be a non-negative safe integer number of cents`);
  }
  return value;
}

function safePayout(value: number): number {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError('Payout exceeds the safe integer range');
  }
  return value;
}

function roundedPercentagePayout(stake: number, percentage: number): number {
  const wholeHundreds = Math.floor(stake / 100);
  const remainingCents = stake % 100;
  const payout = wholeHundreds * percentage
    + Math.floor((remainingCents * percentage + 50) / 100);
  return safePayout(payout);
}

export function settleBets(bets: Bets, winner: Side): Settlement[] {
  if (!sides.includes(winner)) {
    throw new RangeError('Winner must be player, banker, or tie');
  }

  return sides.flatMap((side): Settlement[] => {
    const stake = cents(bets[side], side);
    if (stake === 0) return [];

    const amount = stake;
    if (winner === 'tie' && side !== 'tie') {
      return [{ side, amount, payout: amount, multiplier: 1, result: 'push' }];
    }

    if (side !== winner) {
      return [{ side, amount, payout: 0, multiplier: 0, result: 'loss' }];
    }

    if (side === 'player') {
      return [{ side, amount, payout: safePayout(stake * 2), multiplier: 2, result: 'win' }];
    }

    if (side === 'banker') {
      const payout = roundedPercentagePayout(stake, 195);
      return [{ side, amount, payout, multiplier: 1.95, result: 'win' }];
    }

    return [{ side, amount, payout: safePayout(stake * 9), multiplier: 9, result: 'win' }];
  });
}
