import { Request, Response } from 'express';
import { AnnouncementDisplayMode, Prisma, UserRole, UserStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { hashPassword } from '../utils/hashPassword';
import { adminAdjustBalance } from '../services/ledger';
import { emitUserNotify, pushWalletBalance } from '../socket/pushWalletBalance';
import { emitGlobalAnnouncement } from '../socket/siteBroadcast';
import type { AuthRequest } from '../middlewares/authMiddleware';
import { logAdminAction } from '../services/adminAudit';

const userPublicSelect = {
  id: true,
  email: true,
  username: true,
  balance: true,
  xp: true,
  totalWagered: true,
  totalWon: true,
  totalLost: true,
  role: true,
  status: true,
  createdAt: true,
} as const;

const SORT_FIELDS = ['createdAt', 'balance', 'xp', 'email', 'username', 'status'] as const;
type SortField = (typeof SORT_FIELDS)[number];

function parseSort(req: Request): { field: SortField; order: 'asc' | 'desc' } {
  const raw = typeof req.query.sort === 'string' ? req.query.sort : '';
  const field = SORT_FIELDS.includes(raw as SortField) ? (raw as SortField) : 'createdAt';
  const order = req.query.order === 'asc' ? 'asc' : 'desc';
  return { field, order };
}

function adminIdFrom(req: Request): string | undefined {
  return (req as AuthRequest).userId;
}

function parseAnnouncementDisplayMode(raw: unknown): AnnouncementDisplayMode {
  if (raw === 'MODAL' || raw === 'TOAST' || raw === 'BAR') return raw;
  return AnnouncementDisplayMode.BAR;
}

function optionalTrimmed(s: unknown): string | null {
  if (typeof s !== 'string' || !s.trim()) return null;
  return s.trim();
}

export const getDashboard = async (_req: Request, res: Response) => {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [
    usersTotal,
    byStatus,
    newUsersLast24h,
    betsTotal,
    betsLast24h,
    betAgg,
    txLast24h,
    balanceAgg,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.user.count({ where: { createdAt: { gte: dayAgo } } }),
    prisma.bet.count(),
    prisma.bet.count({ where: { createdAt: { gte: dayAgo } } }),
    prisma.bet.aggregate({
      where: { createdAt: { gte: dayAgo } },
      _sum: { amount: true },
    }),
    prisma.transaction.count({ where: { createdAt: { gte: dayAgo } } }),
    prisma.user.aggregate({ _sum: { balance: true } }),
  ]);
  const statusCounts: Record<string, number> = {};
  for (const row of byStatus) {
    statusCounts[row.status] = row._count._all;
  }
  return res.json({
    usersTotal,
    usersActive: statusCounts[UserStatus.ACTIVE] ?? 0,
    usersSuspended: statusCounts[UserStatus.SUSPENDED] ?? 0,
    usersBanned: statusCounts[UserStatus.BANNED] ?? 0,
    newUsersLast24h,
    betsTotal,
    betsLast24h,
    betVolumeLast24h: betAgg._sum.amount ?? 0,
    transactionsLast24h: txLast24h,
    totalBalanceInSystem: balanceAgg._sum.balance ?? 0,
  });
};

export const listUsers = async (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const take = Math.min(Number(req.query.limit) || 50, 100);
  const skip = Number(req.query.offset) || 0;
  const { field, order } = parseSort(req);
  const rawStatus = typeof req.query.status === 'string' ? req.query.status.trim() : '';
  const statusFilter =
    rawStatus === 'ACTIVE' || rawStatus === 'SUSPENDED' || rawStatus === 'BANNED'
      ? (rawStatus as UserStatus)
      : null;

  const where: Prisma.UserWhereInput = {};
  if (q) {
    where.OR = [
      { email: { contains: q, mode: 'insensitive' } },
      { username: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (statusFilter) {
    where.status = statusFilter;
  }
  const orderBy = { [field]: order } as Prisma.UserOrderByWithRelationInput;
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: userPublicSelect,
      orderBy,
      take,
      skip,
    }),
    prisma.user.count({ where }),
  ]);
  return res.json({ users, total });
};

export const getUserById = async (req: Request, res: Response) => {
  const u = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: userPublicSelect,
  });
  if (!u) return res.status(404).json({ message: 'Usuário não encontrado' });
  return res.json(u);
};

export const listUserTransactions = async (req: Request, res: Response) => {
  const userId = req.params.id;
  const exists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!exists) return res.status(404).json({ message: 'Usuário não encontrado' });
  const take = Math.min(Number(req.query.limit) || 30, 100);
  const skip = Number(req.query.offset) || 0;
  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
    prisma.transaction.count({ where: { userId } }),
  ]);
  return res.json({ transactions, total });
};

export const listUserBets = async (req: Request, res: Response) => {
  const userId = req.params.id;
  const exists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!exists) return res.status(404).json({ message: 'Usuário não encontrado' });
  const take = Math.min(Number(req.query.limit) || 30, 100);
  const skip = Number(req.query.offset) || 0;
  const [bets, total] = await Promise.all([
    prisma.bet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: {
        sportFixture: {
          select: {
            homeTeamName: true,
            awayTeamName: true,
            competitionName: true,
            utcDate: true,
            status: true,
          },
        },
      },
    }),
    prisma.bet.count({ where: { userId } }),
  ]);
  return res.json({ bets, total });
};

export const listAllBets = async (req: Request, res: Response) => {
  const take = Math.min(Number(req.query.limit) || 50, 200);
  const skip = Number(req.query.offset) || 0;
  const game = typeof req.query.game === 'string' ? req.query.game.trim() : '';
  const result = typeof req.query.result === 'string' ? req.query.result.trim() : '';
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

  const where: Prisma.BetWhereInput = {};
  if (game) where.game = game;
  if (result === 'pending' || result === 'win' || result === 'loss') where.result = result;
  if (q) {
    where.OR = [
      { user: { username: { contains: q, mode: 'insensitive' } } },
      { user: { email: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [bets, total] = await Promise.all([
    prisma.bet.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: {
        user: { select: { id: true, username: true, email: true } },
        sportFixture: {
          select: {
            homeTeamName: true,
            awayTeamName: true,
            competitionName: true,
            utcDate: true,
            status: true,
          },
        },
      },
    }),
    prisma.bet.count({ where }),
  ]);
  return res.json({ bets, total });
};

export const listAuditLogs = async (_req: Request, res: Response) => {
  const take = Math.min(Number(_req.query.limit) || 50, 200);
  const skip = Number(_req.query.offset) || 0;
  const [logs, total] = await Promise.all([
    prisma.adminAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: {
        admin: { select: { email: true, username: true } },
      },
    }),
    prisma.adminAuditLog.count(),
  ]);
  return res.json({ logs, total });
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  const { email, username, role, xp, status } = req.body as {
    email?: string;
    username?: string;
    role?: string;
    xp?: number;
    status?: string;
  };
  const id = req.params.id;
  const data: {
    email?: string;
    username?: string;
    role?: UserRole;
    xp?: number;
    status?: UserStatus;
  } = {};
  if (typeof email === 'string' && email.trim()) data.email = email.trim().toLowerCase();
  if (typeof username === 'string' && username.trim()) data.username = username.trim();
  if (role === 'USER' || role === 'ADMIN') data.role = role as UserRole;
  if (typeof xp === 'number' && Number.isFinite(xp) && xp >= 0) data.xp = Math.floor(xp);
  if (status === 'ACTIVE' || status === 'SUSPENDED' || status === 'BANNED') {
    data.status = status as UserStatus;
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ message: 'Nada para atualizar' });
  }

  try {
    const u = await prisma.user.update({
      where: { id },
      data,
      select: userPublicSelect,
    });
    const aid = adminIdFrom(req);
    if (aid) {
      await logAdminAction(aid, 'user.update', {
        targetUserId: id,
        metadata: { fields: Object.keys(data) },
      });
    }
    return res.json(u);
  } catch {
    return res.status(400).json({ message: 'Email ou username já em uso' });
  }
};

export const setUserPassword = async (req: AuthRequest, res: Response) => {
  const { password } = req.body as { password?: string };
  if (!password || password.length < 6) {
    return res.status(400).json({ message: 'Senha deve ter pelo menos 6 caracteres' });
  }
  const hashed = await hashPassword(password);
  await prisma.user.update({
    where: { id: req.params.id },
    data: { password: hashed },
  });
  const aid = adminIdFrom(req);
  if (aid) {
    await logAdminAction(aid, 'user.password_set', { targetUserId: req.params.id });
  }
  return res.json({ ok: true });
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  const id = req.params.id;
  if (id === req.userId) {
    return res.status(400).json({ message: 'Não é possível excluir a sua própria conta' });
  }
  const exists = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return res.status(404).json({ message: 'Usuário não encontrado' });
  const aid = adminIdFrom(req);
  if (aid) {
    await logAdminAction(aid, 'user.delete', { targetUserId: id });
  }
  await prisma.user.delete({ where: { id } });
  return res.json({ ok: true });
};

export const adjustBalance = async (req: AuthRequest, res: Response) => {
  const { delta, reason } = req.body as { delta?: number; reason?: string };
  if (typeof delta !== 'number' || !Number.isFinite(delta) || delta === 0) {
    return res.status(400).json({ message: 'delta inválido' });
  }
  const userId = req.params.id;
  const desc =
    typeof reason === 'string' && reason.trim()
      ? `Admin: ${reason.trim()}`
      : 'Ajuste manual (admin)';
  try {
    const balance = await adminAdjustBalance(userId, delta, desc);
    pushWalletBalance(userId);
    emitUserNotify(userId, {
      type: 'balance',
      title: 'Saldo atualizado',
      message:
        delta > 0
          ? `Foi creditado ${delta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} na sua conta.`
          : `Foi debitado ${Math.abs(delta).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} da sua conta.`,
    });
    const aid = adminIdFrom(req);
    if (aid) {
      await logAdminAction(aid, 'user.balance_adjust', {
        targetUserId: userId,
        metadata: { delta, reason: typeof reason === 'string' && reason.trim() ? reason.trim() : null },
      });
    }
    return res.json({ balance });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'NEGATIVE_BALANCE') {
      return res.status(400).json({ message: 'Saldo não pode ficar negativo' });
    }
    if (msg === 'INVALID_DELTA') {
      return res.status(400).json({ message: 'delta inválido' });
    }
    return res.status(500).json({ message: 'Erro ao ajustar saldo' });
  }
};

export const listBanners = async (_req: Request, res: Response) => {
  const rows = await prisma.siteBanner.findMany({
    orderBy: { key: 'asc' },
  });
  return res.json({ banners: rows });
};

export const upsertBanner = async (req: AuthRequest, res: Response) => {
  const key = req.params.key;
  const { imageUrl, active } = req.body as { imageUrl?: string; active?: boolean };
  if (!key || typeof imageUrl !== 'string' || !imageUrl.trim()) {
    return res.status(400).json({ message: 'imageUrl obrigatório' });
  }
  const row = await prisma.siteBanner.upsert({
    where: { key },
    create: {
      key,
      imageUrl: imageUrl.trim(),
      active: active !== false,
    },
    update: {
      imageUrl: imageUrl.trim(),
      ...(typeof active === 'boolean' ? { active } : {}),
    },
  });
  const aid = adminIdFrom(req);
  if (aid) {
    await logAdminAction(aid, 'banner.upsert', {
      metadata: { key, imageUrl: row.imageUrl, active: row.active },
    });
  }
  return res.json(row);
};

export const patchBanner = async (req: AuthRequest, res: Response) => {
  const key = req.params.key;
  const { active } = req.body as { active?: boolean };
  if (typeof active !== 'boolean') {
    return res.status(400).json({ message: 'active deve ser boolean' });
  }
  try {
    const row = await prisma.siteBanner.update({
      where: { key },
      data: { active },
    });
    const aid = adminIdFrom(req);
    if (aid) {
      await logAdminAction(aid, 'banner.active', { metadata: { key, active } });
    }
    return res.json(row);
  } catch {
    return res.status(404).json({ message: 'Banner não encontrado' });
  }
};

export const deleteBanner = async (req: AuthRequest, res: Response) => {
  const key = req.params.key;
  try {
    await prisma.siteBanner.delete({ where: { key } });
  } catch {
    return res.status(404).json({ message: 'Banner não encontrado' });
  }
  const aid = adminIdFrom(req);
  if (aid) {
    await logAdminAction(aid, 'banner.delete', { metadata: { key } });
  }
  return res.json({ ok: true });
};

export const listAnnouncements = async (_req: Request, res: Response) => {
  const rows = await prisma.globalAnnouncement.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });
  return res.json({ announcements: rows });
};

export const createAnnouncement = async (req: AuthRequest, res: Response) => {
  const {
    title,
    message,
    active,
    deactivateOthers,
    displayMode,
    imageUrl,
    bgColor,
    titleColor,
    messageColor,
    accentColor,
  } = req.body as {
    title?: string;
    message?: string;
    active?: boolean;
    deactivateOthers?: boolean;
    displayMode?: unknown;
    imageUrl?: unknown;
    bgColor?: unknown;
    titleColor?: unknown;
    messageColor?: unknown;
    accentColor?: unknown;
  };
  if (!title?.trim() || !message?.trim()) {
    return res.status(400).json({ message: 'Título e mensagem obrigatórios' });
  }
  if (active !== false && deactivateOthers !== false) {
    await prisma.globalAnnouncement.updateMany({
      where: { active: true },
      data: { active: false },
    });
  }
  const row = await prisma.globalAnnouncement.create({
    data: {
      title: title.trim(),
      message: message.trim(),
      active: active !== false,
      displayMode: parseAnnouncementDisplayMode(displayMode),
      imageUrl: optionalTrimmed(imageUrl),
      bgColor: optionalTrimmed(bgColor),
      titleColor: optionalTrimmed(titleColor),
      messageColor: optionalTrimmed(messageColor),
      accentColor: optionalTrimmed(accentColor),
    },
  });
  if (row.active) {
    emitGlobalAnnouncement(row);
  }
  const aid = adminIdFrom(req);
  if (aid) {
    await logAdminAction(aid, 'announcement.create', {
      metadata: { id: row.id, title: row.title },
    });
  }
  return res.json(row);
};

export const patchAnnouncement = async (req: AuthRequest, res: Response) => {
  const {
    title,
    message,
    active,
    displayMode,
    imageUrl,
    bgColor,
    titleColor,
    messageColor,
    accentColor,
  } = req.body as {
    title?: string;
    message?: string;
    active?: boolean;
    displayMode?: unknown;
    imageUrl?: unknown;
    bgColor?: unknown;
    titleColor?: unknown;
    messageColor?: unknown;
    accentColor?: unknown;
  };
  const data: {
    title?: string;
    message?: string;
    active?: boolean;
    displayMode?: AnnouncementDisplayMode;
    imageUrl?: string | null;
    bgColor?: string | null;
    titleColor?: string | null;
    messageColor?: string | null;
    accentColor?: string | null;
  } = {};
  if (typeof title === 'string') data.title = title.trim();
  if (typeof message === 'string') data.message = message.trim();
  if (typeof active === 'boolean') data.active = active;
  if (displayMode !== undefined) data.displayMode = parseAnnouncementDisplayMode(displayMode);
  if (imageUrl !== undefined) data.imageUrl = optionalTrimmed(imageUrl);
  if (bgColor !== undefined) data.bgColor = optionalTrimmed(bgColor);
  if (titleColor !== undefined) data.titleColor = optionalTrimmed(titleColor);
  if (messageColor !== undefined) data.messageColor = optionalTrimmed(messageColor);
  if (accentColor !== undefined) data.accentColor = optionalTrimmed(accentColor);

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ message: 'Nada para atualizar' });
  }

  if (data.active === true) {
    await prisma.globalAnnouncement.updateMany({
      where: { active: true, id: { not: req.params.id } },
      data: { active: false },
    });
  }

  try {
    const row = await prisma.globalAnnouncement.update({
      where: { id: req.params.id },
      data,
    });
    if (row.active) {
      emitGlobalAnnouncement(row);
    }
    const aid = adminIdFrom(req);
    if (aid) {
      await logAdminAction(aid, 'announcement.patch', {
        metadata: { id: req.params.id, patch: data },
      });
    }
    return res.json(row);
  } catch {
    return res.status(404).json({ message: 'Aviso não encontrado' });
  }
};

export const broadcastAnnouncement = async (req: AuthRequest, res: Response) => {
  const row = await prisma.globalAnnouncement.findUnique({ where: { id: req.params.id } });
  if (!row) return res.status(404).json({ message: 'Aviso não encontrado' });
  emitGlobalAnnouncement(row);
  const aid = adminIdFrom(req);
  if (aid) {
    await logAdminAction(aid, 'announcement.broadcast', { metadata: { id: row.id } });
  }
  return res.json({ ok: true });
};

export const deleteAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.globalAnnouncement.delete({ where: { id: req.params.id } });
  } catch {
    return res.status(404).json({ message: 'Aviso não encontrado' });
  }
  const aid = adminIdFrom(req);
  if (aid) {
    await logAdminAction(aid, 'announcement.delete', { metadata: { id: req.params.id } });
  }
  return res.json({ ok: true });
};
