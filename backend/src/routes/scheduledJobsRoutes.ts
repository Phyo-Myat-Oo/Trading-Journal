import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
    getScheduledJobs,
    getScheduledJobById,
    createScheduledJob,
    updateScheduledJob,
    deleteScheduledJob,
    runScheduledJobNow
} from '../controllers/scheduledJobsController';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all scheduled jobs for the user
router.get('/', getScheduledJobs);

// Get a specific scheduled job
router.get('/:id', getScheduledJobById);

// Create a new scheduled job
router.post('/', createScheduledJob);

// Update a scheduled job (pause/resume)
router.patch('/:id', updateScheduledJob);

// Delete a scheduled job
router.delete('/:id', deleteScheduledJob);

// Run a scheduled job immediately
router.post('/:id/run', runScheduledJobNow);

export default router; 