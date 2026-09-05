import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { adminMiddleware } from '../middlewares/adminMiddleware';
import { adminRateLimiter } from '../middlewares/adminRateLimit';
import * as admin from '../controllers/adminController';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);
router.use(adminRateLimiter);

router.get('/dashboard', admin.getDashboard);

router.get('/audit-logs', admin.listAuditLogs);

router.get('/bets', admin.listAllBets);

router.get('/users', admin.listUsers);
router.get('/users/:id/transactions', admin.listUserTransactions);
router.get('/users/:id/bets', admin.listUserBets);
router.get('/users/:id', admin.getUserById);
router.patch('/users/:id', admin.updateUser);
router.post('/users/:id/password', admin.setUserPassword);
router.delete('/users/:id', admin.deleteUser);
router.post('/users/:id/balance', admin.adjustBalance);

router.get('/banners', admin.listBanners);
router.put('/banners/:key', admin.upsertBanner);
router.patch('/banners/:key', admin.patchBanner);
router.delete('/banners/:key', admin.deleteBanner);

router.get('/announcements', admin.listAnnouncements);
router.post('/announcements', admin.createAnnouncement);
router.patch('/announcements/:id', admin.patchAnnouncement);
router.delete('/announcements/:id', admin.deleteAnnouncement);
router.post('/announcements/:id/broadcast', admin.broadcastAnnouncement);

export default router;
