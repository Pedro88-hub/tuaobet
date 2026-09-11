import { Request, Response } from 'express';
import { UserStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { hashPassword, comparePassword } from '../utils/hashPassword';
import { generateToken } from '../utils/generateToken';
import { recordLoginSession } from '../services/sessionStats';

export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    const userExists = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] }
    });

    if (userExists) {
      return res.status(400).json({ message: 'Usuário ou Email já cadastrado' });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        balance: 50.00, // Bônus de cadastro
        lastLoginAt: new Date(),
        currentSessionStartedAt: new Date(),
      }
    });

    const token = generateToken(user.id);

    return res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        balance: user.balance,
        xp: user.xp,
        role: user.role,
        status: user.status,
      },
      token,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erro no servidor', error });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await comparePassword(password, user.password))) {
      return res.status(400).json({ message: 'Credenciais inválidas' });
    }

    if (user.status !== UserStatus.ACTIVE) {
      return res.status(403).json({
        message:
          user.status === UserStatus.BANNED
            ? 'Conta banida.'
            : 'Conta suspensa. Contate o suporte.',
        code: user.status === UserStatus.BANNED ? 'ACCOUNT_BANNED' : 'ACCOUNT_SUSPENDED',
      });
    }

    await recordLoginSession(user.id);

    const token = generateToken(user.id);

    return res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        balance: user.balance,
        xp: user.xp,
        role: user.role,
        status: user.status,
      },
      token,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erro no servidor' });
  }
};

export const getMe = async (req: any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        username: true,
        email: true,
        balance: true,
        xp: true,
        role: true,
        status: true,
      },
    });
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    if (user.status !== UserStatus.ACTIVE) {
      return res.status(403).json({
        message: user.status === UserStatus.BANNED ? 'Conta banida.' : 'Conta suspensa.',
        code: user.status === UserStatus.BANNED ? 'ACCOUNT_BANNED' : 'ACCOUNT_SUSPENDED',
      });
    }
    return res.json(user);
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao buscar usuário' });
  }
};