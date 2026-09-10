import { Router } from 'express';
import * as pub from '../controllers/publicSiteController';

const router = Router();

router.get('/banners', pub.getPublicBanners);
router.get('/announcement', pub.getPublicAnnouncement);
router.get('/recent-wins', pub.getPublicRecentWins);

export default router;
