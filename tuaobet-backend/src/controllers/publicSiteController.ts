import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { maskUsername } from '../utils/maskUsername';

export const getPublicBanners = async (_req: Request, res: Response) => {
  const rows = await prisma.siteBanner.findMany({
    where: { active: true },
    select: { key: true, imageUrl: true },
  });
  const banners: Record<string, string> = {};
  for (const r of rows) {
    banners[r.key] = r.imageUrl;
  }
  return res.json({ banners });
};

export const getPublicAnnouncement = async (_req: Request, res: Response) => {
  const ann = await prisma.globalAnnouncement.findFirst({
    where: { active: true },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      message: true,
      updatedAt: true,
      displayMode: true,
      imageUrl: true,
      bgColor: true,
      titleColor: true,
      messageColor: true,
      accentColor: true,
    },
  });
  return res.json({ announcement: ann });
};

export const getPublicRecentWins = async (req: Request, res: Response) => {
  const limitRaw = Number(req.query.limit);
  const minPayoutRaw = Number(req.query.minPayout);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.floor(limitRaw), 1), 50)
    : 20;
  const minPayout = Number.isFinite(minPayoutRaw) && minPayoutRaw >= 0 ? minPayoutRaw : 1;

  const rows = await prisma.bet.findMany({
    where: {
      result: 'win',
      payout: { gte: minPayout },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      game: true,
      amount: true,
      multiplier: true,
      payout: true,
      createdAt: true,
      user: { select: { username: true } },
    },
  });

  const wins = rows.map((r) => ({
    id: r.id,
    game: r.game,
    amount: r.amount,
    multiplier: r.multiplier,
    payout: r.payout ?? 0,
    createdAt: r.createdAt.toISOString(),
    username: maskUsername(r.user.username),
  }));

  return res.json({ wins });
};
