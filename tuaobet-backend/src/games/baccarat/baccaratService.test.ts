import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, test } from 'node:test';

import { PrismaClient } from '@prisma/client';
import express from 'express';
import jwt from 'jsonwebtoken';

import type { BaccaratOutcome } from './baccaratMath';

type BaccaratServiceModule = typeof import('./baccaratService');

let BaccaratServiceError: BaccaratServiceModule['BaccaratServiceError'];
let createBaccaratService: BaccaratServiceModule['createBaccaratService'];
let parseBaccaratInput: BaccaratServiceModule['parseBaccaratInput'];

const testDatabaseUrl = process.env.BACCARAT_TEST_DATABASE_URL;
const db = testDatabaseUrl
  ? new PrismaClient({ datasources: { db: { url: testDatabaseUrl } } })
  : null;

before(async () => {
  if (testDatabaseUrl) process.env.DATABASE_URL = testDatabaseUrl;
  ({ BaccaratServiceError, createBaccaratService, parseBaccaratInput } = await import('./baccaratService'));
});

const playerWin: BaccaratOutcome = {
  playerCards: [
    { rank: '4', suit: 'hearts' },
    { rank: '5', suit: 'spades' },
  ],
  bankerCards: [
    { rank: '2', suit: 'clubs' },
    { rank: '3', suit: 'diamonds' },
  ],
  playerTotal: 9,
  bankerTotal: 5,
  winner: 'player',
};

const bankerWin: BaccaratOutcome = {
  playerCards: [
    { rank: '2', suit: 'hearts' },
    { rank: '3', suit: 'spades' },
  ],
  bankerCards: [
    { rank: '4', suit: 'clubs' },
    { rank: '5', suit: 'diamonds' },
  ],
  playerTotal: 5,
  bankerTotal: 9,
  winner: 'banker',
};

const tie: BaccaratOutcome = {
  playerCards: [
    { rank: '4', suit: 'hearts' },
    { rank: '4', suit: 'spades' },
  ],
  bankerCards: [
    { rank: '3', suit: 'clubs' },
    { rank: '5', suit: 'diamonds' },
  ],
  playerTotal: 8,
  bankerTotal: 8,
  winner: 'tie',
};

function assertServiceError(fn: () => unknown, code: string): void {
  assert.throws(fn, (error: unknown) => {
    assert.ok(error instanceof BaccaratServiceError);
    assert.equal(error.code, code);
    assert.equal(error.status, 400);
    return true;
  });
}

describe('baccarat input validation', () => {
  test('normalizes numeric BRL amounts to integer cents with floating representation tolerance', () => {
    const requestId = randomUUID();
    assert.deepEqual(
      parseBaccaratInput({
        requestId,
        bets: { player: 1.1 + 2.2, banker: 1.95, tie: 0 },
      }),
      { requestId, bets: { player: 330, banker: 195, tie: 0 } },
    );
  });

  test('rejects malformed request ids, objects, and non-numeric amounts with named errors', () => {
    assertServiceError(
      () => parseBaccaratInput({ requestId: 'not-a-uuid', bets: { player: 1, banker: 0, tie: 0 } }),
      'INVALID_REQUEST_ID',
    );
    assertServiceError(() => parseBaccaratInput({ requestId: randomUUID(), bets: null }), 'INVALID_BETS');
    assertServiceError(() => parseBaccaratInput({ requestId: randomUUID(), bets: {} }), 'INVALID_BETS');
    assertServiceError(
      () => parseBaccaratInput({ requestId: randomUUID(), bets: { player: '1', banker: 0, tie: 0 } }),
      'INVALID_BET_AMOUNT',
    );
    assertServiceError(
      () => parseBaccaratInput({ requestId: randomUUID(), bets: { player: 1, banker: 0, tie: 0, extra: 1 } }),
      'INVALID_BETS',
    );
  });

  test('rejects non-finite, fractional-cent, negative, empty, and below-minimum bets', () => {
    for (const amount of [Number.NaN, Number.POSITIVE_INFINITY, 1.001, 1e-10, -1]) {
      assertServiceError(
        () => parseBaccaratInput({ requestId: randomUUID(), bets: { player: amount, banker: 0, tie: 0 } }),
        'INVALID_BET_AMOUNT',
      );
    }
    assertServiceError(
      () => parseBaccaratInput({ requestId: randomUUID(), bets: { player: 0, banker: 0, tie: 0 } }),
      'BET_REQUIRED',
    );
    assertServiceError(
      () => parseBaccaratInput({ requestId: randomUUID(), bets: { player: 0.49, banker: 0, tie: 0 } }),
      'MIN_BET',
    );
  });

  test('enforces per-area, aggregate, and safe-integer configured limits', () => {
    const requestId = randomUUID();
    const limits = { minBet: 0.5, maxBet: 10 };
    assertServiceError(
      () => parseBaccaratInput({ requestId, bets: { player: 10.01, banker: 0, tie: 0 } }, limits),
      'MAX_BET',
    );
    assertServiceError(
      () => parseBaccaratInput({ requestId, bets: { player: 6, banker: 5, tie: 0 } }, limits),
      'MAX_BET',
    );
    assertServiceError(
      () => parseBaccaratInput({ requestId, bets: { player: Number.MAX_SAFE_INTEGER, banker: 0, tie: 0 } }),
      'INVALID_BET_AMOUNT',
    );
  });
});

describe('baccarat database service', { skip: !db }, () => {
  const client = db!;

  async function withUser<T>(balance: number, run: (user: { id: string; balance: number }) => Promise<T>) {
    const suffix = randomUUID();
    const user = await client.user.create({
      data: {
        email: `baccarat-${suffix}@example.test`,
        username: `bacc-${suffix}`,
        password: 'test-only',
        balance,
      },
      select: { id: true, balance: true },
    });
    try {
      return await run(user);
    } finally {
      await client.user.deleteMany({ where: { id: user.id } });
    }
  }

  test('concurrent replay creates and charges exactly one round', async () => {
    await withUser(20, async (user) => {
      const service = createBaccaratService(client, () => playerWin);
      const input = { requestId: randomUUID(), bets: { player: 1, banker: 0, tie: 0 } };
      const [a, b] = await Promise.all([
        service.playBaccarat(user.id, input),
        service.playBaccarat(user.id, input),
      ]);

      assert.equal(a.roundId, b.roundId);
      assert.equal(await client.baccaratRound.count({ where: { userId: user.id } }), 1);
      assert.equal(await client.bet.count({ where: { userId: user.id } }), 1);
      const wallet = await client.user.findUniqueOrThrow({ where: { id: user.id } });
      assert.equal(
        Math.round(wallet.balance * 100),
        Math.round((user.balance - a.totalStake + a.totalPayout) * 100),
      );
    });
  });

  test('same request id with different normalized bets is a conflict', async () => {
    await withUser(20, async (user) => {
      const service = createBaccaratService(client, () => playerWin);
      const requestId = randomUUID();
      await service.playBaccarat(user.id, { requestId, bets: { player: 1, banker: 0, tie: 0 } });
      await assert.rejects(
        service.playBaccarat(user.id, { requestId, bets: { player: 2, banker: 0, tie: 0 } }),
        (error: unknown) => {
          assert.ok(error instanceof BaccaratServiceError);
          assert.equal(error.code, 'REQUEST_CONFLICT');
          assert.equal(error.status, 409);
          return true;
        },
      );
      assert.equal(await client.bet.count({ where: { userId: user.id } }), 1);
    });
  });

  test('two distinct losing requests racing for one stake allow only one debit', async () => {
    await withUser(1, async (user) => {
      const service = createBaccaratService(client, () => bankerWin);
      const calls = [randomUUID(), randomUUID()].map((requestId) =>
        service.playBaccarat(user.id, { requestId, bets: { player: 1, banker: 0, tie: 0 } }),
      );
      const results = await Promise.allSettled(calls);

      assert.equal(results.filter(({ status }) => status === 'fulfilled').length, 1);
      const rejected = results.find(({ status }) => status === 'rejected');
      assert.equal(rejected?.status, 'rejected');
      if (rejected?.status === 'rejected') {
        assert.ok(rejected.reason instanceof BaccaratServiceError);
        assert.equal(rejected.reason.code, 'INSUFFICIENT_BALANCE');
      }
      assert.equal(await client.baccaratRound.count({ where: { userId: user.id } }), 1);
      assert.equal(await client.bet.count({ where: { userId: user.id } }), 1);
      const wallet = await client.user.findUniqueOrThrow({ where: { id: user.id } });
      assert.equal(wallet.balance, 0);
      assert.equal(wallet.totalWagered, 1);
      assert.equal(wallet.totalLost, 1);
    });
  });

  test('a failed bet write rolls back round, wallet, transaction, and progress changes', async () => {
    await withUser(10, async (user) => {
      const failingClient = {
        baccaratRound: client.baccaratRound,
        user: client.user,
        $transaction: (operation: (tx: unknown) => Promise<unknown>) =>
        client.$transaction((tx) => {
          const failingBet = new Proxy(tx.bet, {
            get(target, property, receiver) {
              if (property === 'create') {
                return async () => { throw new Error('TEST_BET_WRITE_FAILURE'); };
              }
              return Reflect.get(target, property, receiver);
            },
          });
          const failingTx = new Proxy(tx, {
            get(target, property, receiver) {
              if (property === 'bet') return failingBet;
              return Reflect.get(target, property, receiver);
            },
          });
          return operation(failingTx);
        }),
      } as unknown as PrismaClient;
      const service = createBaccaratService(failingClient, () => playerWin);

      await assert.rejects(
        service.playBaccarat(user.id, {
          requestId: randomUUID(),
          bets: { player: 1, banker: 0, tie: 0 },
        }),
        /TEST_BET_WRITE_FAILURE/,
      );

      const wallet = await client.user.findUniqueOrThrow({ where: { id: user.id } });
      assert.deepEqual(
        {
          balance: wallet.balance,
          xp: wallet.xp,
          totalWagered: wallet.totalWagered,
          totalWon: wallet.totalWon,
          totalLost: wallet.totalLost,
        },
        { balance: 10, xp: 0, totalWagered: 0, totalWon: 0, totalLost: 0 },
      );
      assert.equal(await client.baccaratRound.count({ where: { userId: user.id } }), 0);
      assert.equal(await client.bet.count({ where: { userId: user.id } }), 0);
      assert.equal(await client.transaction.count({ where: { userId: user.id } }), 0);
    });
  });

  test('records mixed area results and leaves win/loss totals unchanged for pushes', async () => {
    await withUser(20, async (user) => {
      const mixedService = createBaccaratService(client, () => playerWin);
      const mixed = await mixedService.playBaccarat(user.id, {
        requestId: randomUUID(),
        bets: { player: 1, banker: 0.5, tie: 0.5 },
      });
      assert.deepEqual(
        mixed.settlements.map(({ side, result, amount, payout }) => ({ side, result, amount, payout })),
        [
          { side: 'player', result: 'win', amount: 1, payout: 2 },
          { side: 'banker', result: 'loss', amount: 0.5, payout: 0 },
          { side: 'tie', result: 'loss', amount: 0.5, payout: 0 },
        ],
      );
      let wallet = await client.user.findUniqueOrThrow({ where: { id: user.id } });
      assert.equal(wallet.totalWagered, 2);
      assert.equal(wallet.totalWon, 1);
      assert.equal(wallet.totalLost, 1);

      const pushService = createBaccaratService(client, () => tie);
      await pushService.playBaccarat(user.id, {
        requestId: randomUUID(),
        bets: { player: 1, banker: 1, tie: 0 },
      });
      wallet = await client.user.findUniqueOrThrow({ where: { id: user.id } });
      assert.equal(wallet.totalWagered, 4);
      assert.equal(wallet.xp, 4);
      assert.equal(wallet.totalWon, 1);
      assert.equal(wallet.totalLost, 1);
      const pushes = await client.bet.count({ where: { userId: user.id, result: 'push' } });
      assert.equal(pushes, 2);
    });
  });

  test('history is user-scoped and replay responses use the current wallet balance', async () => {
    await withUser(20, async (first) => {
      await withUser(30, async (second) => {
        const service = createBaccaratService(client, () => playerWin);
        const firstRequest = randomUUID();
        await service.playBaccarat(first.id, {
          requestId: firstRequest,
          bets: { player: 1, banker: 0, tie: 0 },
        });
        await service.playBaccarat(second.id, {
          requestId: randomUUID(),
          bets: { player: 2, banker: 0, tie: 0 },
        });
        await client.user.update({ where: { id: first.id }, data: { balance: 77.77 } });

        const history = await service.baccaratHistory(first.id);
        assert.equal(history.length, 1);
        assert.equal(history[0].requestId, firstRequest);
        assert.equal(history[0].balance, 77.77);
        assert.equal((await service.baccaratRound(first.id, firstRequest))?.balance, 77.77);
        assert.equal(await service.baccaratRound(second.id, firstRequest), null);
      });
    });
  });

  test('mounted API enforces auth and serves exact deal/history/round envelopes', async () => {
    await withUser(20, async (user) => {
      process.env.JWT_SECRET = 'baccarat-test-secret';
      const { default: gameRoutes } = await import('../../routes/gameRoutes');
      const app = express();
      app.use(express.json());
      app.use('/api/games', gameRoutes);
      const server = app.listen(0, '127.0.0.1');
      await new Promise<void>((resolve) => server.once('listening', resolve));
      try {
        const address = server.address();
        assert.ok(address && typeof address !== 'string');
        const base = `http://127.0.0.1:${address.port}/api/games/baccarat`;
        const unauthorized = await fetch(`${base}/history`);
        assert.equal(unauthorized.status, 401);

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
        const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
        const requestId = randomUUID();
        const dealt = await fetch(`${base}/deal`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ requestId, bets: { player: 1, banker: 0, tie: 0 } }),
        });
        assert.equal(dealt.status, 200);
        const body = await dealt.json() as { requestId: string; roundId: string };
        assert.equal(body.requestId, requestId);
        assert.ok(body.roundId);

        const history = await fetch(`${base}/history`, { headers });
        assert.equal(history.status, 200);
        const historyBody = await history.json() as { rounds: Array<{ requestId: string }> };
        assert.equal(historyBody.rounds[0].requestId, requestId);

        const round = await fetch(`${base}/round/${requestId}`, { headers });
        assert.equal(round.status, 200);
        assert.equal(((await round.json()) as { requestId: string }).requestId, requestId);
      } finally {
        await new Promise<void>((resolve, reject) =>
          server.close((error) => error ? reject(error) : resolve()),
        );
      }
    });
  });
});

after(async () => {
  await db?.$disconnect();
});
