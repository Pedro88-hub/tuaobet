import { Prisma, PrismaClient } from '@prisma/client';

import { prisma } from '../../lib/prisma';
import { creditPayout, debitStake, MAX_BET, MIN_BET } from '../../services/ledger';
import { applyLoss, applyWin } from '../../services/userProgress';
import {
  createShoe,
  dealRound,
  settleBets,
  shuffleShoe,
  type BaccaratOutcome,
  type Bets,
  type Settlement,
} from './baccaratMath';

type MoneyLimits = { minBet: number; maxBet: number };
type ParsedInput = { requestId: string; bets: Bets };
type StoredOutcome = BaccaratOutcome & {
  settlements: Settlement[];
  totalStake: number;
  totalPayout: number;
};

export type RoundResponse = BaccaratOutcome & {
  roundId: string;
  requestId: string;
  settlements: Settlement[];
  totalStake: number;
  totalPayout: number;
  balance: number;
  createdAt: string;
};

export class BaccaratServiceError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: 400 | 409,
    message: string,
  ) {
    super(message);
    this.name = 'BaccaratServiceError';
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MONEY_TOLERANCE = 1e-7;
const BET_KEYS = ['player', 'banker', 'tie'] as const;

function invalid(code: string, message: string): never {
  throw new BaccaratServiceError(code, 400, message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function moneyToCents(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    invalid('INVALID_BET_AMOUNT', 'Valor de aposta inválido');
  }
  const scaled = value * 100;
  const rounded = Math.round(scaled);
  if (
    !Number.isSafeInteger(rounded)
    || (value !== 0 && rounded === 0)
    || Math.abs(scaled - rounded) > MONEY_TOLERANCE
  ) {
    invalid('INVALID_BET_AMOUNT', 'Valor de aposta deve ter no máximo duas casas decimais');
  }
  return rounded;
}

export function parseBaccaratInput(
  input: unknown,
  limits: MoneyLimits = { minBet: MIN_BET, maxBet: MAX_BET },
): ParsedInput {
  if (!isRecord(input) || !hasExactKeys(input, ['requestId', 'bets'])) {
    invalid('INVALID_BETS', 'Payload de aposta inválido');
  }
  if (typeof input.requestId !== 'string' || !UUID_PATTERN.test(input.requestId)) {
    invalid('INVALID_REQUEST_ID', 'requestId inválido');
  }
  if (!isRecord(input.bets) || !hasExactKeys(input.bets, BET_KEYS)) {
    invalid('INVALID_BETS', 'Apostas inválidas');
  }

  const bets = {
    player: moneyToCents(input.bets.player),
    banker: moneyToCents(input.bets.banker),
    tie: moneyToCents(input.bets.tie),
  };
  const minCents = Math.round(limits.minBet * 100);
  const maxCents = Number.isFinite(limits.maxBet)
    ? Math.round(limits.maxBet * 100)
    : Number.POSITIVE_INFINITY;

  let total = 0;
  for (const side of BET_KEYS) {
    const amount = bets[side];
    if (amount > 0 && amount < minCents) invalid('MIN_BET', 'Aposta abaixo do mínimo');
    if (amount > maxCents) invalid('MAX_BET', 'Aposta acima do máximo');
    if (!Number.isSafeInteger(total + amount)) {
      invalid('INVALID_BET_AMOUNT', 'Total de aposta fora do intervalo seguro');
    }
    total += amount;
  }
  if (total === 0) invalid('BET_REQUIRED', 'Informe ao menos uma aposta');
  if (total > maxCents) invalid('MAX_BET', 'Total de aposta acima do máximo');

  return { requestId: input.requestId, bets };
}

function centsToBrl(cents: number): number {
  return cents / 100;
}

function sameBets(stored: Prisma.JsonValue, expected: Bets): boolean {
  if (!isRecord(stored)) return false;
  return BET_KEYS.every((side) => stored[side] === expected[side]);
}

function storedOutcome(value: Prisma.JsonValue): StoredOutcome {
  return value as unknown as StoredOutcome;
}

function responseFrom(
  round: { id: string; requestId: string; outcome: Prisma.JsonValue; createdAt: Date },
  balance: number,
): RoundResponse {
  const outcome = storedOutcome(round.outcome);
  return {
    playerCards: outcome.playerCards,
    bankerCards: outcome.bankerCards,
    playerTotal: outcome.playerTotal,
    bankerTotal: outcome.bankerTotal,
    winner: outcome.winner,
    roundId: round.id,
    requestId: round.requestId,
    settlements: outcome.settlements.map((settlement) => ({
      ...settlement,
      amount: centsToBrl(settlement.amount),
      payout: centsToBrl(settlement.payout),
    })),
    totalStake: centsToBrl(outcome.totalStake),
    totalPayout: centsToBrl(outcome.totalPayout),
    balance,
    createdAt: round.createdAt.toISOString(),
  };
}

export function createBaccaratService(
  client: PrismaClient,
  draw: () => BaccaratOutcome,
) {
  async function currentBalance(userId: string): Promise<number> {
    const user = await client.user.findUniqueOrThrow({
      where: { id: userId },
      select: { balance: true },
    });
    return user.balance;
  }

  async function replayOrConflict(userId: string, input: ParsedInput) {
    const round = await client.baccaratRound.findUnique({
      where: { userId_requestId: { userId, requestId: input.requestId } },
    });
    if (!round) return null;
    if (!sameBets(round.bets, input.bets)) {
      throw new BaccaratServiceError('REQUEST_CONFLICT', 409, 'requestId já usado com apostas diferentes');
    }
    return responseFrom(round, await currentBalance(userId));
  }

  async function playBaccarat(userId: string, rawInput: unknown): Promise<RoundResponse> {
    const input = parseBaccaratInput(rawInput);
    const replay = await replayOrConflict(userId, input);
    if (replay) return replay;

    try {
      const committed = await client.$transaction(async (tx) => {
        const reserved = await tx.baccaratRound.create({
          data: {
            userId,
            requestId: input.requestId,
            bets: input.bets,
            outcome: {},
          },
        });
        const outcome = draw();
        const settlements = settleBets(input.bets, outcome.winner);
        const totalStake = settlements.reduce((sum, settlement) => sum + settlement.amount, 0);
        const totalPayout = settlements.reduce((sum, settlement) => sum + settlement.payout, 0);

        await debitStake(userId, centsToBrl(totalStake), 'Baccarat — aposta', tx);
        await creditPayout(userId, centsToBrl(totalPayout), 'Baccarat — pagamento', tx);

        for (const settlement of settlements) {
          const amount = centsToBrl(settlement.amount);
          const payout = centsToBrl(settlement.payout);
          await tx.bet.create({
            data: {
              userId,
              game: 'baccarat',
              amount,
              multiplier: settlement.multiplier,
              payout,
              result: settlement.result,
            },
          });
          if (settlement.result === 'win') await applyWin(tx, userId, amount, payout);
          if (settlement.result === 'loss') await applyLoss(tx, userId, amount);
        }

        const savedOutcome: StoredOutcome = { ...outcome, settlements, totalStake, totalPayout };
        const round = await tx.baccaratRound.update({
          where: { id: reserved.id },
          data: { outcome: savedOutcome as unknown as Prisma.InputJsonValue },
        });
        const user = await tx.user.findUniqueOrThrow({
          where: { id: userId },
          select: { balance: true },
        });
        return { round, balance: user.balance };
      }, { maxWait: 10_000, timeout: 10_000 });
      return responseFrom(committed.round, committed.balance);
    } catch (error) {
      if (error instanceof Error && error.message === 'INSUFFICIENT_BALANCE') {
        throw new BaccaratServiceError('INSUFFICIENT_BALANCE', 400, 'Saldo insuficiente');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const recovered = await replayOrConflict(userId, input);
        if (recovered) return recovered;
      }
      throw error;
    }
  }

  async function baccaratHistory(userId: string): Promise<RoundResponse[]> {
    const [rounds, balance] = await Promise.all([
      client.baccaratRound.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      currentBalance(userId),
    ]);
    return rounds.map((round) => responseFrom(round, balance));
  }

  async function baccaratRound(userId: string, requestId: string): Promise<RoundResponse | null> {
    if (!UUID_PATTERN.test(requestId)) return null;
    const round = await client.baccaratRound.findUnique({
      where: { userId_requestId: { userId, requestId } },
    });
    return round ? responseFrom(round, await currentBalance(userId)) : null;
  }

  return { playBaccarat, baccaratHistory, baccaratRound };
}

const productionService = createBaccaratService(
  prisma,
  () => dealRound(shuffleShoe(createShoe())),
);

export const playBaccarat = productionService.playBaccarat;
export const baccaratHistory = productionService.baccaratHistory;
export const baccaratRound = productionService.baccaratRound;
