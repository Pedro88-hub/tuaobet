import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { activeAccountMiddleware } from '../middlewares/activeAccountMiddleware';
import { gamesRateLimiter } from '../middlewares/gameRateLimit';
import {
  baccaratPlay,
  diceRoll,
  minesCashout,
  minesReveal,
  minesStart,
  plinkoDrop,
} from '../controllers/gamesController';

const router = Router();

const play = [authMiddleware, activeAccountMiddleware, gamesRateLimiter];

router.post('/mines/start', ...play, minesStart);
router.post('/mines/reveal', ...play, minesReveal);
router.post('/mines/cashout', ...play, minesCashout);
router.post('/dice/roll', ...play, diceRoll);
router.post('/plinko/drop', ...play, plinkoDrop);
router.post('/baccarat/play', ...play, baccaratPlay);

export default router;
