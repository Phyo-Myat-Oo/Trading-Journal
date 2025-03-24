import { Router } from 'express';
import authRoutes from './authRoutes';
import tradeRoutes from './tradeRoutes';
import analysisRoutes from './analysisRoutes';
import accountRoutes from './accountRoutes';
import journalRoutes from './journalRoutes';
import adminRoutes from './adminRoutes';
import statisticsRoutes from './statisticsRoutes';
import scheduledJobsRoutes from './scheduledJobsRoutes';

const router = Router();

// Public routes
router.use('/api/auth', authRoutes);

// Protected routes - authentication is handled in each route file
router.use('/api/trades', tradeRoutes);
router.use('/api/analysis', analysisRoutes);
router.use('/api/accounts', accountRoutes);
router.use('/api/journal', journalRoutes);
router.use('/api/statistics', statisticsRoutes);
router.use('/api/scheduled-jobs', scheduledJobsRoutes);

// Admin routes - authentication is handled in adminRoutes
router.use('/api/admin', adminRoutes);

export default router; 