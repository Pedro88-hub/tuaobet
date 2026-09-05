import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { activeAccountMiddleware } from '../middlewares/activeAccountMiddleware';
import { gamesRateLimiter } from '../middlewares/gameRateLimit';
import { sportsRateLimiter } from '../middlewares/sportsRateLimit';
import {
  getMatch,
  listCachedFixtures,
  listCompetitions,
  listMatches,
  syncFixtures,
} from '../controllers/sportsController';
import { getOdds1x2, placeSportBet1x2 } from '../controllers/sportsBetController';

const router = Router();

router.get('/competitions', sportsRateLimiter, listCompetitions);
router.post('/sync', sportsRateLimiter, syncFixtures);
router.get('/fixtures', sportsRateLimiter, listCachedFixtures);
router.get('/matches', sportsRateLimiter, listMatches);
router.get('/matches/:matchId', sportsRateLimiter, getMatch);

router.get('/odds/1x2', sportsRateLimiter, getOdds1x2);
router.post(
  '/bet/1x2',
  authMiddleware,
  activeAccountMiddleware,
  gamesRateLimiter,
  placeSportBet1x2
);

export default router;
