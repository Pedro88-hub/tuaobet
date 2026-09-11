import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { round2 } from './sessionStatsMath';

export type ProgressClient = Prisma.TransactionClient | typeof prisma;

export function xpFromStake(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.floor(amount);
}

export function profitFromWin(stake: number, payout: number): number {
  if (!Number.isFinite(stake) || !Number.isFinite(payout)) return 0;
  return round2(Math.max(0, payout - stake));
}

export async function applyWager(
  client: ProgressClient,
  userId: string,
  stake: number
): Promise<void> {
  const xp = xpFromStake(stake);
  await client.user.update({
    where: { id: userId },
    data: {
      totalWagered: { increment: stake },
      ...(xp > 0 ? { xp: { increment: xp } } : {}),
    },
  });
}

export async function reverseWager(
  client: ProgressClient,
  userId: string,
  stake: number
): Promise<void> {
  const xp = xpFromStake(stake);
  const user = await client.user.findUnique({
    where: { id: userId },
    select: { totalWagered: true, xp: true },
  });
  if (!user) return;

  const nextWagered = Math.max(0, round2(user.totalWagered - stake));
  const nextXp = Math.max(0, user.xp - xp);

  await client.user.update({
    where: { id: userId },
    data: {
      totalWagered: nextWagered,
      xp: nextXp,
    },
  });
}

export async function applyWin(
  client: ProgressClient,
  userId: string,
  stake: number,
  payout: number
): Promise<void> {
  const profit = profitFromWin(stake, payout);
  if (profit <= 0) return;
  await client.user.update({
    where: { id: userId },
    data: { totalWon: { increment: profit } },
  });
}

export async function applyLoss(
  client: ProgressClient,
  userId: string,
  stake: number
): Promise<void> {
  if (!Number.isFinite(stake) || stake <= 0) return;
  await client.user.update({
    where: { id: userId },
    data: { totalLost: { increment: stake } },
  });
}
