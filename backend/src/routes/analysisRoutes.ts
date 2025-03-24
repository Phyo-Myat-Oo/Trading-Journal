import express from 'express';
import { authenticate } from '../middleware/authMiddleware';
import {
  getAnalysis,
  generateAnalysis,
  getAnalysisSummary,
  queueAnalysisJob,
  runSpecificAnalysis,
  getUserAnalyses,
  getAnalysisById,
  triggerAnalysis,
  deleteAnalysis,
  getAnalyticsOverTime,
  compareAnalyses,
  getLatestAnalysisByType,
  getAnalysisHistoryByType,
  getAnalysisByDateRange,
  getDashboardAnalytics
} from '../controllers/analysisController';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Analysis
 *   description: Trade analysis and metrics endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Analysis:
 *       type: object
 *       required:
 *         - userId
 *         - tradeId
 *         - metrics
 *         - period
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the analysis
 *         userId:
 *           type: string
 *           description: The user who owns the analysis
 *         tradeId:
 *           type: string
 *           description: The trade being analyzed
 *         metrics:
 *           type: object
 *           properties:
 *             riskRewardRatio:
 *               type: number
 *               description: Risk to reward ratio
 *             winRate:
 *               type: number
 *               description: Percentage of winning trades
 *             profitFactor:
 *               type: number
 *               description: Ratio of gross profit to gross loss
 *             averageWin:
 *               type: number
 *               description: Average profit on winning trades
 *             averageLoss:
 *               type: number
 *               description: Average loss on losing trades
 *         period:
 *           type: object
 *           properties:
 *             start:
 *               type: string
 *               format: date-time
 *               description: Start date of analysis period
 *             end:
 *               type: string
 *               format: date-time
 *               description: End date of analysis period
 */

// Apply authentication middleware to all routes
router.use(authenticate);

// Basic analysis routes
router.get('/summary', getAnalysisSummary);
router.get('/:type/:period', getAnalysis);

// Stored analysis routes
router.get('/', getUserAnalyses);
router.get('/:id', getAnalysisById);
router.post('/trigger', triggerAnalysis);
router.delete('/:id', deleteAnalysis);

// Analysis generation routes
router.post('/generate', generateAnalysis);
router.post('/queue', queueAnalysisJob);
router.post('/specific', runSpecificAnalysis);

// Analytics and comparison routes
router.get('/metrics/time-series', getAnalyticsOverTime);
router.get('/compare/:baseAnalysisId/:comparisonAnalysisId', compareAnalyses);

// Additional analysis data routes
router.get('/latest/:type', getLatestAnalysisByType);
router.get('/history/:type', getAnalysisHistoryByType);
router.get('/date-range/:type', getAnalysisByDateRange);
router.get('/dashboard', getDashboardAnalytics);

/**
 * @swagger
 * /api/analysis:
 *   get:
 *     summary: Get analysis for the authenticated user
 *     tags: [Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tradeId
 *         schema:
 *           type: string
 *         description: Filter by trade ID
 *     responses:
 *       200:
 *         description: Analysis data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Analysis'
 */
router.get('/', getAnalysis);

/**
 * @swagger
 * /api/analysis/range:
 *   get:
 *     summary: Get analysis within a date range
 *     tags: [Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Analysis data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Analysis'
 */
router.get('/range', getAnalysisByDateRange);

/**
 * @swagger
 * /api/analysis:
 *   post:
 *     summary: Generate new analysis
 *     tags: [Analysis]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tradeId
 *             properties:
 *               tradeId:
 *                 type: string
 *                 description: ID of the trade to analyze
 *     responses:
 *       201:
 *         description: Analysis generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Analysis'
 */
router.post('/', generateAnalysis);

/**
 * @swagger
 * /api/analysis/{id}:
 *   delete:
 *     summary: Delete analysis
 *     tags: [Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Analysis ID
 *     responses:
 *       200:
 *         description: Analysis deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Analysis deleted successfully
 */
router.delete('/:id', deleteAnalysis);

export default router; 