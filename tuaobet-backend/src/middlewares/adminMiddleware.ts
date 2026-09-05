import { Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import type { AuthRequest } from './authMiddleware';

export const adminMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const id = req.userId;
  if (!id) {
    return res.status(401).json({ message: 'Não autenticado' });
  }
  const user = await prisma.user.findUnique({
    where: { id },
    select: { role: true },
  });
  if (user?.role !== UserRole.ADMIN) {
    return res.status(403).json({ message: 'Acesso reservado a administradores' });
  }
  next();
};
