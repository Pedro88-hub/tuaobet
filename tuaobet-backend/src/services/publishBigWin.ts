import { prisma } from '../lib/prisma';
import { emitSiteBigWin, type SiteBigWinPayload } from '../socket/siteBroadcast';
import { maskUsername } from '../utils/maskUsername';

const MIN_PAYOUT = 1;

export type BigWinInput = {
  id: string;
  game: string;
  amount: number;
  multiplier: number | null;
  payout: number;
  createdAt?: Date;
  username: string;
};

export function publishBigWinFromBet(input: BigWinInput): void {
  if (!Number.isFinite(input.payout) || input.payout < MIN_PAYOUT) return;
  const payload: SiteBigWinPayload = {
    id: input.id,
    game: input.game,
    amount: input.amount,
    multiplier: input.multiplier,
    payout: input.payout,
    createdAt: (input.createdAt ?? new Date()).toISOString(),
    username: maskUsername(input.username),
  };
  emitSiteBigWin(payload);
}

/** Resolve username e emite (para settles que só têm userId). */
export async function publishBigWinForUser(opts: {
  betId: string;
  userId: string;
  game: string;
  amount: number;
  multiplier: number | null;
  payout: number;
}): Promise<void> {
  if (!Number.isFinite(opts.payout) || opts.payout < MIN_PAYOUT) return;
  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { username: true },
  });
  if (!user?.username) return;
  publishBigWinFromBet({
    id: opts.betId,
    game: opts.game,
    amount: opts.amount,
    multiplier: opts.multiplier,
    payout: opts.payout,
    username: user.username,
  });
}
