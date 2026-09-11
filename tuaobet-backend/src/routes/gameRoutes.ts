import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { activeAccountMiddleware } from '../middlewares/activeAccountMiddleware';
import { gamesRateLimiter } from '../middlewares/gameRateLimit';
import {
  diceRoll,
  minesCashout,
  minesReveal,
  minesStart,
  plinkoDrop,
} from '../controllers/gamesController';
import {
  baccaratDeal,
  baccaratGetHistory,
  baccaratGetRound,
} from '../controllers/baccaratController';

const router = Router();

const play = [authMiddleware, activeAccountMiddleware, gamesRateLimiter];

router.post('/mines/start', ...play, minesStart);
router.post('/mines/reveal', ...play, minesReveal);
router.post('/mines/cashout', ...play, minesCashout);
router.post('/dice/roll', ...play, diceRoll);
router.post('/plinko/drop', ...play, plinkoDrop);
router.post('/baccarat/deal', ...play, baccaratDeal);
router.get('/baccarat/history', ...play, baccaratGetHistory);
router.get('/baccarat/round/:requestId', ...play, baccaratGetRound);

export default router;
