import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

/**
 * Protege o teu servidor e reduz risco de esgotar o limite do plano grátis (10 req/min na API).
 */
export const sportsRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.SPORTS_RATE_LIMIT_MAX ?? 20),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? 'unknown'),
  message: {
    message: 'Muitas solicitações de dados esportivos. Aguarde um momento.',
  },
});
