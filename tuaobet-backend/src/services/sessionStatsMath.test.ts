import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { round2, sumWonAmount, sumLostAmount } from './sessionStatsMath';

describe('round2', () => {
  it('arredonda a 2 casas', () => {
    assert.equal(round2(1.005), 1.01);
    assert.equal(round2(10.1), 10.1);
    assert.equal(round2(0), 0);
  });
});

describe('sumWonAmount', () => {
  it('soma payout - amount só quando positivo', () => {
    assert.equal(
      sumWonAmount([
        { amount: 10, payout: 25 },
        { amount: 5, payout: 5 },
        { amount: 8, payout: 3 },
        { amount: 2, payout: null },
      ]),
      15
    );
  });

  it('devolve 0 para lista vazia', () => {
    assert.equal(sumWonAmount([]), 0);
  });
});

describe('sumLostAmount', () => {
  it('soma amounts de losses', () => {
    assert.equal(sumLostAmount([{ amount: 10 }, { amount: 3.333 }]), 13.33);
  });

  it('devolve 0 para lista vazia', () => {
    assert.equal(sumLostAmount([]), 0);
  });
});
