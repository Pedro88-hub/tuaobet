import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { xpFromStake, profitFromWin } from './userProgress';

describe('xpFromStake', () => {
  it('concede 1 XP por R$1 (floor)', () => {
    assert.equal(xpFromStake(10), 10);
    assert.equal(xpFromStake(1.99), 1);
    assert.equal(xpFromStake(0.5), 0);
    assert.equal(xpFromStake(0), 0);
    assert.equal(xpFromStake(-5), 0);
  });
});

describe('profitFromWin', () => {
  it('lucro líquido só quando payout > stake', () => {
    assert.equal(profitFromWin(10, 25), 15);
    assert.equal(profitFromWin(5, 5), 0);
    assert.equal(profitFromWin(8, 3), 0);
  });
});
