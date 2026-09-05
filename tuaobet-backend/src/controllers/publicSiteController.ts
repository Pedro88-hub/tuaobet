import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

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
