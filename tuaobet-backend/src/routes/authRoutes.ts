import { Router } from 'express';
import { login, register, getMe, getSessionStats } from '../controllers/authController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { sessionStatsRateLimiter } from '../middlewares/sessionStatsRateLimit';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, getMe);
router.get('/session-stats', authMiddleware, sessionStatsRateLimiter, getSessionStats);

export default router;