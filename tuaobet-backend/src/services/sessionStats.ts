import { prisma } from '../lib/prisma';
import { sumLostAmount, sumWonAmount } from './sessionStatsMath';

export type SessionStatsPayload = {
  previousLoginAt: string | null;
  wonAmount: number;
  lostAmount: number;
  balance: number;
  sessionStartedAt: string | null;
  updatedAt: string;
};

export async function recordLoginSession(userId: string): Promise<void> {
  const now = new Date();
  await prisma.$executeRaw`
    UPDATE "User"
    SET "previousLoginAt" = "lastLoginAt",
        "lastLoginAt" = ${now},
        "currentSessionStartedAt" = ${now}
    WHERE "id" = ${userId}
  `;
}

export async function getSessionStats(
  userId: string
): Promise<SessionStatsPayload | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      balance: true,
      previousLoginAt: true,
      currentSessionStartedAt: true,
      createdAt: true,
    },
  });
  if (!user) return null;

  const since = user.currentSessionStartedAt ?? user.createdAt;

  const [wins, losses] = await Promise.all([
    prisma.bet.findMany({
      where: {
        userId,
        result: 'win',
        createdAt: { gte: since },
      },
      select: { amount: true, payout: true },
    }),
    prisma.bet.findMany({
      where: {
        userId,
        result: 'loss',
        createdAt: { gte: since },
      },
      select: { amount: true },
    }),
  ]);

  return {
    previousLoginAt: user.previousLoginAt?.toISOString() ?? null,
    wonAmount: sumWonAmount(wins),
    lostAmount: sumLostAmount(losses),
    balance: user.balance,
    sessionStartedAt: since.toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
