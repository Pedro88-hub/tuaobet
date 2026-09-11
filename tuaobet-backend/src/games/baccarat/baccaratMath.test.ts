import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  bankerDraws,
  cardValue,
  createShoe,
  dealRound,
  handTotal,
  settleBets,
  shuffleShoe,
  type Card,
} from './baccaratMath';

const c = (rank: Card['rank'], suit: Card['suit'] = 'hearts'): Card => ({ rank, suit });

describe('baccarat card and hand values', () => {
  test('values aces as one, number cards at face value, and faces as zero', () => {
    const expected: Array<[Card['rank'], number]> = [
      ['A', 1],
      ['2', 2],
      ['3', 3],
      ['4', 4],
      ['5', 5],
      ['6', 6],
      ['7', 7],
      ['8', 8],
      ['9', 9],
      ['10', 0],
      ['J', 0],
      ['Q', 0],
      ['K', 0],
    ];

    for (const [rank, value] of expected) {
      assert.equal(cardValue(c(rank)), value, rank);
    }
  });

  test('uses only the final digit of the hand sum', () => {
    assert.equal(handTotal([]), 0);
    assert.equal(handTotal([c('9'), c('7'), c('K')]), 6);
    assert.equal(handTotal([c('8'), c('7'), c('6')]), 1);
  });
});

describe('banker third-card table', () => {
  const expectedThirdCards: ReadonlyArray<readonly number[]> = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [0, 1, 2, 3, 4, 5, 6, 7, 9],
    [2, 3, 4, 5, 6, 7],
    [4, 5, 6, 7],
    [6, 7],
    [],
  ];

  for (let total = 0; total <= 7; total += 1) {
    test(`banker total ${total} follows its explicit player-third-card set`, () => {
      for (let third = 0; third <= 9; third += 1) {
        assert.equal(
          bankerDraws(total, third),
          expectedThirdCards[total].includes(third),
          `banker ${total}, player third ${third}`,
        );
      }
    });
  }

  test('when the player stands, banker draws through five and stands on six or seven', () => {
    const decisions = Array.from({ length: 8 }, (_, total) => bankerDraws(total, null));
    assert.deepEqual(decisions, [true, true, true, true, true, true, false, false]);
  });

  test('rejects totals and third-card values outside the decision table', () => {
    assert.throws(() => bankerDraws(-1, 4), RangeError);
    assert.throws(() => bankerDraws(8, 4), RangeError);
    assert.throws(() => bankerDraws(4, 10), RangeError);
    assert.throws(() => bankerDraws(4, 2.5), RangeError);
  });
});

describe('shoe creation and shuffling', () => {
  test('creates eight copies of every rank and suit combination', () => {
    const shoe = createShoe();
    const counts = new Map<string, number>();

    for (const card of shoe) {
      const key = `${card.rank}:${card.suit}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    assert.equal(shoe.length, 416);
    assert.equal(counts.size, 52);
    assert.deepEqual(new Set(counts.values()), new Set([8]));
  });

  test('Fisher-Yates uses shrinking bounds and leaves the input untouched', () => {
    const shoe = [c('A'), c('2'), c('3'), c('4')];
    const original = shoe.map((card) => ({ ...card }));
    const maxima: number[] = [];
    const shuffled = shuffleShoe(shoe, (max) => {
      maxima.push(max);
      return 0;
    });

    assert.deepEqual(maxima, [4, 3, 2]);
    assert.deepEqual(shuffled.map(({ rank }) => rank), ['2', '3', '4', 'A']);
    assert.deepEqual(shoe, original);
    assert.notStrictEqual(shuffled, shoe);
    assert.deepEqual(
      shuffled.map(({ rank, suit }) => `${rank}:${suit}`).sort(),
      shoe.map(({ rank, suit }) => `${rank}:${suit}`).sort(),
    );
  });

  test('rejects a random index outside the requested half-open range', () => {
    assert.throws(() => shuffleShoe([c('A'), c('2')], () => -1), RangeError);
    assert.throws(() => shuffleShoe([c('A'), c('2')], (max) => max), RangeError);
    assert.throws(() => shuffleShoe([c('A'), c('2')], () => 0.5), RangeError);
  });
});

describe('round dealing', () => {
  test('stops both hands on a natural and identifies a natural tie', () => {
    const playerNatural = dealRound([c('A'), c('2'), c('7'), c('3'), c('9'), c('9')]);
    assert.equal(playerNatural.playerCards.length, 2);
    assert.equal(playerNatural.bankerCards.length, 2);
    assert.equal(playerNatural.winner, 'player');

    const tie = dealRound([c('4'), c('5'), c('4'), c('3')]);
    assert.deepEqual(
      { playerTotal: tie.playerTotal, bankerTotal: tie.bankerTotal, winner: tie.winner },
      { playerTotal: 8, bankerTotal: 8, winner: 'tie' },
    );
  });

  test('deals initial and third cards from the beginning in baccarat order', () => {
    const shoe = [c('2'), c('3'), c('3'), c('3'), c('6'), c('5')];
    const snapshot = shoe.slice();
    const result = dealRound(shoe);

    assert.deepEqual(result.playerCards.map(({ rank }) => rank), ['2', '3', '6']);
    assert.deepEqual(result.bankerCards.map(({ rank }) => rank), ['3', '3', '5']);
    assert.deepEqual(
      { playerTotal: result.playerTotal, bankerTotal: result.bankerTotal, winner: result.winner },
      { playerTotal: 1, bankerTotal: 1, winner: 'tie' },
    );
    assert.deepEqual(shoe, snapshot);
  });

  test('lets the banker draw after the player stands when banker has five', () => {
    const result = dealRound([c('4'), c('2'), c('2'), c('3'), c('4')]);

    assert.deepEqual(result.playerCards.map(({ rank }) => rank), ['4', '2']);
    assert.deepEqual(result.bankerCards.map(({ rank }) => rank), ['2', '3', '4']);
    assert.equal(result.winner, 'banker');
  });

  test('rejects a shoe as soon as the rules require a missing card', () => {
    assert.throws(() => dealRound([c('A'), c('2'), c('3')]), /shoe/i);
    assert.throws(() => dealRound([c('2'), c('3'), c('3'), c('3')]), /shoe/i);
    assert.throws(() => dealRound([c('4'), c('2'), c('2'), c('3')]), /shoe/i);
  });
});

describe('bet settlement', () => {
  test('skips zero stakes and pays banker returns with cent rounding', () => {
    for (const [stake, payout] of [[50, 98], [51, 99], [100, 195]] as const) {
      assert.deepEqual(settleBets({ player: 0, banker: stake, tie: 0 }, 'banker'), [
        { side: 'banker', amount: stake, payout, multiplier: 1.95, result: 'win' },
      ]);
    }
  });

  test('pays player and tie returns and records losing areas', () => {
    assert.deepEqual(settleBets({ player: 100, banker: 50, tie: 25 }, 'player'), [
      { side: 'player', amount: 100, payout: 200, multiplier: 2, result: 'win' },
      { side: 'banker', amount: 50, payout: 0, multiplier: 0, result: 'loss' },
      { side: 'tie', amount: 25, payout: 0, multiplier: 0, result: 'loss' },
    ]);

    assert.equal(
      settleBets({ player: 100, banker: 100, tie: 100 }, 'tie')
        .reduce((sum, settlement) => sum + settlement.payout, 0),
      1100,
    );
  });

  test('pushes player and banker stakes when the outcome is a tie', () => {
    assert.deepEqual(settleBets({ player: 50, banker: 51, tie: 0 }, 'tie'), [
      { side: 'player', amount: 50, payout: 50, multiplier: 1, result: 'push' },
      { side: 'banker', amount: 51, payout: 51, multiplier: 1, result: 'push' },
    ]);
  });

  test('rejects invalid cents and payouts outside the safe integer range', () => {
    for (const amount of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER]) {
      assert.throws(
        () => settleBets({ player: amount, banker: 0, tie: 0 }, 'player'),
        /safe integer|cents|payout/i,
      );
    }
  });
});
