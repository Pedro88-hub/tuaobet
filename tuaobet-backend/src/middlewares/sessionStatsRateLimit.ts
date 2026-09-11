import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { AuthRequest } from './authMiddleware';

/** Poll ~2 min no frontend; limite leve por user/IP. */
export const sessionStatsRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.SESSION_STATS_RATE_LIMIT_MAX ?? 30),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = (req as AuthRequest).userId;
    if (userId) return `uid:${userId}`;
    return ipKeyGenerator(req.ip ?? 'unknown');
  },
  message: { message: 'Demasiados pedidos de estatísticas de sessão.' },
});
