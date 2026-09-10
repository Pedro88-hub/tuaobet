import { prisma } from '../lib/prisma';
import { creditPayout } from './ledger';
import { pushWalletBalance } from '../socket/pushWalletBalance';
import { publishBigWinForUser } from './publishBigWin';

export type Outcome1x2 = 'HOME' | 'DRAW' | 'AWAY';

export function outcome1x2FromFixture(f: {
  status: string;
  homeScore: number | null;
  awayScore: number | null;
}): Outcome1x2 | null {
  if (f.status !== 'FINISHED') return null;
  if (f.homeScore == null || f.awayScore == null) return null;
  if (f.homeScore > f.awayScore) return 'HOME';
  if (f.homeScore < f.awayScore) return 'AWAY';
  return 'DRAW';
}

/** Liquida apostas `pending` em 1X2 para um jogo já terminado com resultado. */
export async function settlePendingSportBetsForFixture(
  fixtureId: string
): Promise<number> {
  const f = await prisma.sportFixture.findUnique({ where: { id: fixtureId } });
  if (!f) return 0;
  const outcome = outcome1x2FromFixture(f);
  if (!outcome) return 0;

  const pending = await prisma.bet.findMany({
    where: {
      sportFixtureId: fixtureId,
      game: 'sport',
      result: 'pending',
      sportMarket: '1X2',
    },
  });

  let settled = 0;
  for (const bet of pending) {
    const odds = bet.multiplier ?? 1;
    const won = bet.sportSelection === outcome;

    await prisma.$transaction(async (tx) => {
      if (won) {
        const payout = Math.round(bet.amount * odds * 100) / 100;
        await creditPayout(
          bet.userId,
          payout,
          `Futebol 1X2 — vitória`,
          tx
        );
        await tx.bet.update({
          where: { id: bet.id },
          data: { result: 'win', payout, multiplier: odds },
        });
      } else {
        await tx.bet.update({
          where: { id: bet.id },
          data: { result: 'loss', payout: 0, multiplier: odds },
        });
      }
    });
    pushWalletBalance(bet.userId);
    if (won) {
      const payout = Math.round(bet.amount * odds * 100) / 100;
      void publishBigWinForUser({
        betId: bet.id,
        userId: bet.userId,
        game: 'sport',
        amount: bet.amount,
        multiplier: odds,
        payout,
      });
    }
    settled += 1;
  }

  return settled;
}

export async function settleFinishedSportBetsForQueryDate(
  queryDate: string
): Promise<number> {
  const fixtures = await prisma.sportFixture.findMany({
    where: { queryDate, status: 'FINISHED' },
    select: { id: true },
  });
  let total = 0;
  for (const { id } of fixtures) {
    total += await settlePendingSportBetsForFixture(id);
  }
  return total;
}
