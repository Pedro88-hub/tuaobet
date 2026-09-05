import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { AuthRequest } from './authMiddleware';

/** Limite por utilizador autenticado (fallback: IP com helper IPv6-safe). */
export const gamesRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.GAMES_RATE_LIMIT_MAX ?? 60),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = (req as AuthRequest).userId;
    if (userId) return `uid:${userId}`;
    return ipKeyGenerator(req.ip ?? 'unknown');
  },
  message: { message: 'Muitas jogadas. Aguarde um momento e tente de novo.' },
});
