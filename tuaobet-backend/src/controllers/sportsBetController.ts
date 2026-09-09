import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';
import { debitStake, validateStake } from '../services/ledger';
import { getConfigured1x2Odds, oddsForSelection } from '../services/sportOdds';
import { pushWalletBalance } from '../socket/pushWalletBalance';

const PREMATCH_STATUSES = new Set(['SCHEDULED', 'TIMED']);

const placeBetBodySchema = z.object({
  sportFixtureId: z.string().uuid(),
  selection: z.enum(['HOME', 'DRAW', 'AWAY']),
  amount: z.number().positive(),
});

export function getOdds1x2(_req: Request, res: Response) {
  return res.json(getConfigured1x2Odds());
}

export async function placeSportBet1x2(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const parsed = placeBetBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Payload inválido',
      issues: parsed.error.flatten(),
    });
  }

  const { sportFixtureId, selection, amount } = parsed.data;
  const stake = validateStake(amount);
  if (!stake.ok) {
    return res.status(400).json({ code: stake.code });
  }

  const fixture = await prisma.sportFixture.findUnique({
    where: { id: sportFixtureId },
  });

  if (!fixture) {
    return res.status(404).json({ message: 'Jogo não encontrado' });
  }

  if (!PREMATCH_STATUSES.has(fixture.status)) {
    return res.status(409).json({
      message: 'Apostas 1X2 só estão abertas antes do apito (SCHEDULED/TIMED).',
      status: fixture.status,
    });
  }

  const existing = await prisma.bet.findFirst({
    where: {
      userId,
      sportFixtureId,
      game: 'sport',
      sportMarket: '1X2',
      result: 'pending',
    },
  });
  if (existing) {
    return res.status(409).json({
      message: 'Você já tem uma aposta 1X2 pendente neste jogo.',
      betId: existing.id,
    });
  }

  const odds = oddsForSelection(selection);

  try {
    const bet = await prisma.$transaction(async (tx) => {
      await debitStake(
        userId,
        amount,
        `Futebol 1X2 — ${selection} (${fixture.homeTeamName} vs ${fixture.awayTeamName})`,
        tx
      );
      return tx.bet.create({
        data: {
          userId,
          game: 'sport',
          amount,
          result: 'pending',
          multiplier: odds,
          payout: null,
          sportFixtureId,
          sportMarket: '1X2',
          sportSelection: selection,
        },
      });
    });

    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });
    const balance = u?.balance ?? 0;
    pushWalletBalance(userId);

    return res.status(201).json({
      betId: bet.id,
      selection,
      odds,
      potentialPayout: Math.round(amount * odds * 100) / 100,
      balance,
    });
  } catch {
    return res.status(400).json({ code: 'INSUFFICIENT_BALANCE' });
  }
}
