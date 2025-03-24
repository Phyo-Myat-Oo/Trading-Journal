import express from 'express';
import { authenticate } from '../middleware/authMiddleware';
import {
  getTradeStats,
  getSymbolPerformance,
  getTimeOfDayAnalysis,
  getDayOfWeekAnalysis,
  getRiskMetrics,
  getJournalCorrelation,
  getDashboardStats
} from '../controllers/statisticsController';

const router = express.Router();

// Apply authentication middleware to all statistics routes
router.use(authenticate);

// Basic trade statistics
router.get('/trade-stats', getTradeStats);

// Symbol performance analysis
router.get('/symbol-performance', getSymbolPerformance);

// Time-based analysis
router.get('/time-of-day', getTimeOfDayAnalysis);
router.get('/day-of-week', getDayOfWeekAnalysis);

// Risk metrics
router.get('/risk-metrics', getRiskMetrics);

// Journal correlation
router.get('/journal-correlation', getJournalCorrelation);

// Dashboard - all stats in one call
router.get('/dashboard', getDashboardStats);

export default router; 