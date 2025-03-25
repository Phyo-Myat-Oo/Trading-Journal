import { Router } from 'express';
import authRoutes from './authRoutes';
import tradeRoutes from './tradeRoutes';
import analysisRoutes from './analysisRoutes';
import accountRoutes from './accountRoutes';
import journalRoutes from './journalRoutes';
import adminRoutes from './adminRoutes';
import statisticsRoutes from './statisticsRoutes';
import scheduledJobsRoutes from './scheduledJobsRoutes';
import { asyncHandler } from '../middleware/asyncHandler';
import { logger } from '../utils/logger';

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

/**
 * CSP violation reporting endpoint
 * Used to collect Content Security Policy violation reports
 */
router.post('/csp-report', asyncHandler(async (req, res) => {
  // Log CSP violation for monitoring
  logger.warn('CSP Violation Report:', {
    cspReport: req.body['csp-report'] || req.body,
    userAgent: req.headers['user-agent'],
    ip: req.ip
  });
  
  // Acknowledge receipt
  res.status(204).end();
}));

export default router; 