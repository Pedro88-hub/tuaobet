import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { AuthRequest } from './authMiddleware';

/** Limite de pedidos ao painel /api/admin (por admin autenticado). */
export const adminRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.ADMIN_RATE_LIMIT_MAX ?? 180),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = (req as AuthRequest).userId;
    if (userId) return `admin:${userId}`;
    return ipKeyGenerator(req.ip ?? 'unknown');
  },
  message: { message: 'Muitas solicitações ao painel admin. Aguarde um momento.' },
});
