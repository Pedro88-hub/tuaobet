import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { BaccaratOutcome } from './baccaratMath';
import {
  addToTotals,
  buildSnapshot,
  canCancelChip,
  canPlaceChip,
  displayTotals,
  emptyTotals,
  historyFromOutcome,
  lastUserChip,
  mergeTotals,
  nextPhase,
  personalBets,
  prependHistory,
  removeLastUserChip,
  removeUserChips,
  totalsFromChips,
  type LiveChip,
  type SimulatedChip,
} from './baccaratLive';

const outcome: BaccaratOutcome = {
  playerCards: [
    { rank: '9', suit: 'hearts' },
    { rank: 'K', suit: 'clubs' },
  ],
  bankerCards: [
    { rank: '3', suit: 'spades' },
    { rank: '5', suit: 'diamonds' },
  ],
  playerTotal: 9,
  bankerTotal: 8,
  winner: 'player',
};

function chip(partial: Partial<LiveChip> & Pick<LiveChip, 'placementId' | 'side' | 'amount'>): LiveChip {
  return {
    betId: partial.betId ?? `bet-${partial.placementId}`,
    userId: partial.userId ?? 'user-a',
    username: partial.username ?? 'Ana',
    ...partial,
  };
}

describe('baccarat live cycle helpers', () => {
  test('advances BETTING to DEALING then RESULT and stops', () => {
    assert.deepEqual(nextPhase('BETTING'), { phase: 'DEALING', delayMs: 5000 });
    assert.deepEqual(nextPhase('DEALING'), { phase: 'RESULT', delayMs: 5000 });
    assert.equal(nextPhase('RESULT'), null);
  });

  test('accepts chips only while betting is open', () => {
    assert.equal(canPlaceChip('BETTING', true), true);
    assert.equal(canPlaceChip('BETTING', false), false);
    assert.equal(canPlaceChip('DEALING', true), false);
    assert.equal(canCancelChip('RESULT', true), false);
    assert.equal(canCancelChip('BETTING', true), true);
  });

  test('merges real and simulated totals without mixing chip lists', () => {
    const real: LiveChip[] = [
      chip({ placementId: 'p1', side: 'player', amount: 5 }),
      chip({ placementId: 'p2', side: 'banker', amount: 10, userId: 'user-b' }),
    ];
    const simulated: SimulatedChip[] = [
      { id: 'sim:1', side: 'player', amount: 2.3 },
      { id: 'sim:2', side: 'tie', amount: 1 },
      { id: 'sim:3', side: 'player', amount: 0.5 },
    ];
    const totals = displayTotals(real, simulated);
    assert.deepEqual(totals.player, { amount: 7.8, count: 3 });
    assert.deepEqual(totals.banker, { amount: 10, count: 1 });
    assert.deepEqual(totals.tie, { amount: 1, count: 1 });
    assert.deepEqual(totalsFromChips(real).player, { amount: 5, count: 1 });
    assert.equal(real.some((item) => item.placementId.startsWith('sim:')), false);
  });

  test('undo removes only the last chip of that user and clear refunds the rest', () => {
    const chips: LiveChip[] = [
      chip({ placementId: 'a1', side: 'player', amount: 1 }),
      chip({ placementId: 'b1', side: 'tie', amount: 5, userId: 'user-b' }),
      chip({ placementId: 'a2', side: 'banker', amount: 10 }),
    ];
    const undone = removeLastUserChip(chips, 'user-a');
    assert.equal(undone.removed?.placementId, 'a2');
    assert.equal(lastUserChip(undone.remaining, 'user-a')?.placementId, 'a1');
    assert.equal(undone.remaining.some((item) => item.userId === 'user-b'), true);
    const cleared = removeUserChips(undone.remaining, 'user-a');
    assert.deepEqual(cleared.removed.map((item) => item.placementId), ['a1']);
    assert.deepEqual(cleared.remaining.map((item) => item.placementId), ['b1']);
    assert.deepEqual(personalBets(chips, 'user-a'), { player: 1, banker: 10, tie: 0 });
  });

  test('snapshot for reconnect hides cards during betting and keeps personal chips isolated from simulated volume', () => {
    const real: LiveChip[] = [chip({ placementId: 'p1', side: 'player', amount: 5 })];
    const simulated: SimulatedChip[] = [{ id: 'sim:1', side: 'player', amount: 81 }];
    const betting = buildSnapshot({
      phase: 'BETTING',
      countdown: 8,
      roundId: 4,
      serverSeedHash: 'abc',
      outcome,
      history: [historyFromOutcome(3, outcome)],
      realChips: real,
      simulatedChips: simulated,
      userId: 'user-a',
    });
    assert.equal(betting.state.outcome, undefined);
    assert.equal(betting.state.countdown, 8);
    assert.equal(betting.totals.player.amount, 86);
    assert.equal(betting.totals.player.count, 2);
    assert.deepEqual(betting.personal?.bets, { player: 5, banker: 0, tie: 0 });
    assert.equal(betting.personal?.placements.length, 1);

    const dealing = buildSnapshot({
      phase: 'DEALING',
      countdown: 8,
      roundId: 4,
      outcome,
      history: [],
      realChips: real,
      simulatedChips: simulated,
    });
    assert.equal(dealing.state.countdown, 0);
    assert.equal(dealing.state.outcome?.winner, 'player');
    assert.equal(dealing.personal, null);
  });

  test('history prepends the latest global result and keeps a bounded unique list', () => {
    const first = historyFromOutcome(1, outcome);
    const second = historyFromOutcome(2, { ...outcome, winner: 'banker', bankerTotal: 9, playerTotal: 1 });
    const history = prependHistory([first], second, 2);
    assert.deepEqual(history.map((item) => item.roundId), [2, 1]);
    assert.deepEqual(prependHistory(history, second, 2).map((item) => item.roundId), [2, 1]);
  });

  test('empty and merged totals stay at two decimal places', () => {
    const merged = mergeTotals(
      addToTotals(emptyTotals(), 'tie', 0.1),
      addToTotals(emptyTotals(), 'tie', 0.2),
    );
    assert.equal(merged.tie.amount, 0.3);
    assert.equal(merged.tie.count, 2);
  });
});
