import { randomInt } from 'crypto';

/** 1=A, 2–9, 10=10, 11=J, 12=Q, 13=K */
export type Card = { rank: number; suit: number };

export type BaccaratOutcome = 'player' | 'banker' | 'tie';

const DECKS = 8;

export function cardValue(card: Card): number {
  const r = card.rank;
  if (r >= 10) return 0;
  if (r === 1) return 1;
  return r;
}

export function handTotal(cards: Card[]): number {
  const sum = cards.reduce((acc, c) => acc + cardValue(c), 0);
  return sum % 10;
}

function buildShoe(): Card[] {
  const shoe: Card[] = [];
  for (let d = 0; d < DECKS; d++) {
    for (let suit = 0; suit < 4; suit++) {
      for (let rank = 1; rank <= 13; rank++) {
        shoe.push({ rank, suit });
      }
    }
  }
  return shoe;
}

export function shuffleShoe(shoe: Card[]): void {
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }
}

function bankerDrawsThird(bankerTwoCardTotal: number, playerThirdValue: number): boolean {
  if (bankerTwoCardTotal <= 2) return true;
  if (bankerTwoCardTotal === 3) return playerThirdValue !== 8;
  if (bankerTwoCardTotal === 4) return playerThirdValue >= 2 && playerThirdValue <= 7;
  if (bankerTwoCardTotal === 5) return playerThirdValue >= 4 && playerThirdValue <= 7;
  if (bankerTwoCardTotal === 6) return playerThirdValue === 6 || playerThirdValue === 7;
  return false;
}

export interface BaccaratRoundResult {
  playerCards: Card[];
  bankerCards: Card[];
  playerTotal: number;
  bankerTotal: number;
  outcome: BaccaratOutcome;
}

/**
 * Uma mão completa de Punto Banco a partir de um sapato já embaralhado.
 * Consome do fim do array (pop) para simular retirada do topo após shuffle.
 */
export function dealRoundFromShoe(shoe: Card[]): BaccaratRoundResult {
  const draw = (): Card => {
    const c = shoe.pop();
    if (!c) throw new Error('SHOE_EMPTY');
    return c;
  };

  const playerCards: Card[] = [draw(), draw()];
  const bankerCards: Card[] = [draw(), draw()];

  let pTotal = handTotal(playerCards);
  let bTotal = handTotal(bankerCards);

  if (pTotal >= 8 || bTotal >= 8) {
    const outcome: BaccaratOutcome =
      pTotal > bTotal ? 'player' : bTotal > pTotal ? 'banker' : 'tie';
    return { playerCards, bankerCards, playerTotal: pTotal, bankerTotal: bTotal, outcome };
  }

  let playerThird: Card | undefined;
  if (pTotal <= 5) {
    playerThird = draw();
    playerCards.push(playerThird);
    pTotal = handTotal(playerCards);
  }

  const bTwo = handTotal(bankerCards.slice(0, 2));

  if (playerThird === undefined) {
    if (bTwo <= 5) {
      bankerCards.push(draw());
    }
  } else {
    const p3 = cardValue(playerThird);
    if (bankerDrawsThird(bTwo, p3)) {
      bankerCards.push(draw());
    }
  }

  bTotal = handTotal(bankerCards);
  pTotal = handTotal(playerCards);

  let outcome: BaccaratOutcome;
  if (pTotal > bTotal) outcome = 'player';
  else if (bTotal > pTotal) outcome = 'banker';
  else outcome = 'tie';

  return { playerCards, bankerCards, playerTotal: pTotal, bankerTotal: bTotal, outcome };
}

export function playRound(): BaccaratRoundResult {
  const shoe = buildShoe();
  shuffleShoe(shoe);
  return dealRoundFromShoe(shoe);
}

export type BaccaratSide = 'player' | 'banker' | 'tie';

/** Lucro do tie: 9:1 sobre a aposta (total devolvido = 10× stake). */
const TIE_ODDS = 9;

/**
 * Valor total creditado ao jogador após a rodada (inclui stake quando aplicável).
 * Arredondado a 2 casas.
 */
export function computeTotalPayout(
  side: BaccaratSide,
  outcome: BaccaratOutcome,
  betAmount: number
): number {
  const round2 = (x: number) => Math.round(x * 100) / 100;

  if (outcome === 'tie') {
    if (side === 'tie') return round2(betAmount * (1 + TIE_ODDS));
    return round2(betAmount);
  }

  if (outcome === 'player') {
    if (side === 'player') return round2(betAmount * 2);
    return 0;
  }

  if (outcome === 'banker') {
    if (side === 'banker') return round2(betAmount * (1 + 0.95));
    return 0;
  }

  return 0;
}

export interface BaccaratBetSplit {
  player: number;
  banker: number;
  tie: number;
}

/** Soma dos pagamentos por zona (apostas independentes na mesma mão). */
export function computeTotalPayoutMulti(bets: BaccaratBetSplit, outcome: BaccaratOutcome): number {
  const p = computeTotalPayout('player', outcome, bets.player);
  const b = computeTotalPayout('banker', outcome, bets.banker);
  const t = computeTotalPayout('tie', outcome, bets.tie);
  return Math.round((p + b + t) * 100) / 100;
}
