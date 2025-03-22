import express from 'express';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { 
  getSystemStats, 
  getLockedAccounts, 
  getActivityLogs 
} from '../controllers/adminController';
import { asyncHandler } from '../middleware/asyncHandler';

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get system statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/stats', asyncHandler(getSystemStats));

/**
 * @swagger
 * /api/admin/locked-accounts:
 *   get:
 *     summary: Get all locked user accounts
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Locked accounts retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/locked-accounts', asyncHandler(getLockedAccounts));

/**
 * @swagger
 * /api/admin/activity-logs:
 *   get:
 *     summary: Get admin activity logs
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Activity logs retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/activity-logs', asyncHandler(getActivityLogs));

export default router; 