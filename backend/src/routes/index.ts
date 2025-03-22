import { Router } from 'express';
import authRoutes from './authRoutes';
import tradeRoutes from './tradeRoutes';
import analysisRoutes from './analysisRoutes';
import accountRoutes from './accountRoutes';
import journalRoutes from './journalRoutes';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

// Public routes
router.use('/api/auth', authRoutes);

// Protected routes
router.use('/api/trades', authenticate, tradeRoutes);
router.use('/api/analysis', authenticate, analysisRoutes);
router.use('/api/accounts', authenticate, accountRoutes);
router.use('/api/journal', authenticate, journalRoutes);

export default router; 