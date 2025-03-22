import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import {
  createTrade,
  getTrades,
  getTrade,
  updateTrade,
  deleteTrade,
  uploadScreenshot,
  deleteScreenshot
} from '../controllers/tradeController';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * tags:
 *   name: Trades
 *   description: Trade management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Trade:
 *       type: object
 *       required:
 *         - symbol
 *         - type
 *         - entry
 *         - quantity
 *         - date
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the trade
 *         userId:
 *           type: string
 *           description: The user who made the trade
 *         symbol:
 *           type: string
 *           description: The trading symbol
 *         type:
 *           type: string
 *           enum: [buy, sell]
 *           description: Type of trade
 *         entry:
 *           type: number
 *           description: Entry price
 *         exit:
 *           type: number
 *           description: Exit price
 *         quantity:
 *           type: number
 *           description: Number of units traded
 *         date:
 *           type: string
 *           format: date-time
 *           description: Date of the trade
 *         profit:
 *           type: number
 *           description: Profit/loss from the trade
 *         notes:
 *           type: string
 *           description: Additional notes about the trade
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: Tags associated with the trade
 */

/**
 * @swagger
 * /api/trades:
 *   post:
 *     summary: Create a new trade
 *     tags: [Trades]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Trade'
 *     responses:
 *       201:
 *         description: Trade created successfully
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
 *                   example: Trade created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Trade'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', authenticate, createTrade);

/**
 * @swagger
 * /api/trades:
 *   get:
 *     summary: Get all trades for the authenticated user
 *     tags: [Trades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: symbol
 *         schema:
 *           type: string
 *         description: Filter by symbol
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [buy, sell]
 *         description: Filter by trade type
 *     responses:
 *       200:
 *         description: List of trades
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
 *                     $ref: '#/components/schemas/Trade'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 */
router.get('/', authenticate, getTrades);

/**
 * @swagger
 * /api/trades/{id}:
 *   get:
 *     summary: Get a trade by ID
 *     tags: [Trades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Trade ID
 *     responses:
 *       200:
 *         description: Trade details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Trade'
 *       404:
 *         description: Trade not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', authenticate, getTrade);

/**
 * @swagger
 * /api/trades/{id}:
 *   put:
 *     summary: Update a trade
 *     tags: [Trades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Trade ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Trade'
 *     responses:
 *       200:
 *         description: Trade updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Trade'
 */
router.put('/:id', authenticate, updateTrade);

/**
 * @swagger
 * /api/trades/{id}:
 *   delete:
 *     summary: Delete a trade
 *     tags: [Trades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Trade ID
 *     responses:
 *       200:
 *         description: Trade deleted successfully
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
 *                   example: Trade deleted successfully
 */
router.delete('/:id', authenticate, deleteTrade);

/**
 * @swagger
 * /api/trades/{id}/screenshot:
 *   post:
 *     summary: Upload a screenshot for a trade
 *     tags: [Trades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Trade ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               screenshot:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Screenshot uploaded successfully
 */
router.post('/:id/screenshot', authenticate, upload.single('screenshot'), uploadScreenshot);

/**
 * @swagger
 * /api/trades/{id}/screenshot:
 *   delete:
 *     summary: Delete a trade's screenshot
 *     tags: [Trades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Trade ID
 *     responses:
 *       200:
 *         description: Screenshot deleted successfully
 */
router.delete('/:id/screenshot', authenticate, deleteScreenshot);

export default router; 