import { Response, NextFunction } from 'express';
import { UserStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import type { AuthRequest } from './authMiddleware';

/** Bloqueia apostas/jogos se a conta não estiver ACTIVE. */
export const activeAccountMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const id = req.userId;
  if (!id) {
    return res.status(401).json({ message: 'Não autenticado' });
  }
  const user = await prisma.user.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!user) {
    return res.status(401).json({ message: 'Utilizador não encontrado' });
  }
  if (user.status === UserStatus.SUSPENDED) {
    return res.status(403).json({ message: 'Conta suspensa.', code: 'ACCOUNT_SUSPENDED' });
  }
  if (user.status === UserStatus.BANNED) {
    return res.status(403).json({ message: 'Conta banida.', code: 'ACCOUNT_BANNED' });
  }
  next();
};
