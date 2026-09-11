import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { applyWager, reverseWager } from './userProgress';

const MIN_BET = Number(process.env.MIN_BET ?? 0.5);
/** Sem teto por defeito; só aplica se `MAX_BET` estiver definido no env. */
const MAX_BET =
  process.env.MAX_BET != null && process.env.MAX_BET !== ''
    ? Number(process.env.MAX_BET)
    : Number.POSITIVE_INFINITY;

export function validateStake(amount: number): { ok: true } | { ok: false; code: string } {
  if (!Number.isFinite(amount) || amount < MIN_BET) {
    return { ok: false, code: 'MIN_BET' };
  }
  if (Number.isFinite(MAX_BET) && amount > MAX_BET) {
    return { ok: false, code: 'MAX_BET' };
  }
  return { ok: true };
}

export async function debitStake(
  userId: string,
  amount: number,
  description: string,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const client = tx ?? prisma;
  const updated = await client.user.updateMany({
    where: { id: userId, balance: { gte: amount } },
    data: { balance: { decrement: amount } },
  });
  if (updated.count !== 1) {
    throw new Error('INSUFFICIENT_BALANCE');
  }
  await client.transaction.create({
    data: {
      userId,
      type: 'bet',
      amount,
      description,
    },
  });
  await applyWager(client, userId, amount);
}

export async function creditPayout(
  userId: string,
  amount: number,
  description: string,
  tx?: Prisma.TransactionClient
): Promise<void> {
  if (amount <= 0) return;
  const client = tx ?? prisma;
  await client.user.update({
    where: { id: userId },
    data: { balance: { increment: amount } },
  });
  await client.transaction.create({
    data: {
      userId,
      type: 'win',
      amount,
      description,
    },
  });
}

/** Reembolso de stake (cancelamento / duplicata) — reverte wager/XP, não conta como vitória. */
export async function refundStake(
  userId: string,
  amount: number,
  description: string,
  tx?: Prisma.TransactionClient
): Promise<void> {
  if (amount <= 0) return;
  await refundStakes(userId, [amount], description, tx);
}

/**
 * Reembolso de várias stakes (ex.: cancel multi-cor no Double).
 * Credita o total no saldo e reverte XP/wagered por aposta (evita erro de floor no agregado).
 */
export async function refundStakes(
  userId: string,
  amounts: number[],
  description: string,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const parts = amounts.filter((a) => Number.isFinite(a) && a > 0);
  const total = Math.round(parts.reduce((s, a) => s + a, 0) * 100) / 100;
  if (total <= 0) return;
  const client = tx ?? prisma;
  await client.user.update({
    where: { id: userId },
    data: { balance: { increment: total } },
  });
  await client.transaction.create({
    data: {
      userId,
      type: 'win',
      amount: total,
      description,
    },
  });
  for (const amount of parts) {
    await reverseWager(client, userId, amount);
  }
}

export async function getBalance(userId: string): Promise<number> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { balance: true },
  });
  return u?.balance ?? 0;
}

export async function getWalletProgress(userId: string): Promise<{
  balance: number;
  xp: number;
}> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { balance: true, xp: true },
  });
  return { balance: u?.balance ?? 0, xp: u?.xp ?? 0 };
}

/** Ajuste manual pelo admin (delta positivo ou negativo). */
export async function adminAdjustBalance(
  userId: string,
  delta: number,
  description: string
): Promise<number> {
  if (!Number.isFinite(delta) || delta === 0) {
    throw new Error('INVALID_DELTA');
  }
  return prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: userId },
      data: { balance: { increment: delta } },
      select: { balance: true },
    });
    if (u.balance < 0) {
      throw new Error('NEGATIVE_BALANCE');
    }
    await tx.transaction.create({
      data: {
        userId,
        type: delta > 0 ? 'admin_credit' : 'admin_debit',
        amount: Math.abs(delta),
        description,
      },
    });
    return u.balance;
  });
}

export { MIN_BET, MAX_BET };
