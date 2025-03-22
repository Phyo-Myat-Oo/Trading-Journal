import express from 'express';
import {
  createJournalEntry,
  getJournalEntries,
  getJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  getJournalStatistics,
  getJournalPatterns
} from '../controllers/journalController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Journal entry CRUD routes
router.post('/', createJournalEntry);
router.get('/', getJournalEntries);
router.get('/:id', getJournalEntry);
router.put('/:id', updateJournalEntry);
router.delete('/:id', deleteJournalEntry);

// Statistics and analysis routes
router.get('/statistics', getJournalStatistics);
router.get('/patterns', getJournalPatterns);

export default router; 