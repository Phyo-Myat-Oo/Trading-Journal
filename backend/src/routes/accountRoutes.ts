import express from 'express';
import {
  createAccount,
  getAccounts,
  getAccount,
  updateAccount,
  deleteAccount,
  getAccountTransactions,
  getAccountStats,
  transferBetweenAccounts,
  getBalanceHistory,
} from '../controllers/accountController';
import { authenticate } from '../middleware/authMiddleware';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Account CRUD routes
router.post('/', createAccount);
router.get('/', getAccounts);
router.get('/:id', getAccount);
router.put('/:id', updateAccount);
router.delete('/:id', deleteAccount);

// Account transactions and statistics
router.get('/:id/transactions', getAccountTransactions);
router.get('/:id/stats', getAccountStats);
router.get('/:id/balance-history', getBalanceHistory);

// Account transfers
router.post('/transfer', transferBetweenAccounts);

export default router; 