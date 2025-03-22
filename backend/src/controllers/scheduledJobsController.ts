import { Request, Response } from 'express';
import { z } from 'zod';
import { AnalysisType } from '../models/Analysis';
import { JobInterval } from '../config/queue';
import { queueService } from '../services/QueueService';
import { ScheduledJobRepository } from '../repositories/ScheduledJobRepository';
import { logger } from '../utils/logger';

// Validation schema for creating a scheduled job
export const createScheduledJobSchema = z.object({
  analysisType: z.enum([
    AnalysisType.PERFORMANCE, 
    AnalysisType.SYMBOL, 
    AnalysisType.TIME_OF_DAY, 
    AnalysisType.DAY_OF_WEEK, 
    AnalysisType.RISK, 
    AnalysisType.JOURNAL_CORRELATION, 
    AnalysisType.DASHBOARD
  ]),
  interval: z.enum([
    JobInterval.DAILY,
    JobInterval.WEEKLY,
    JobInterval.MONTHLY,
    JobInterval.QUARTERLY,
    JobInterval.YEARLY
  ]),
  name: z.string().optional(),
  description: z.string().optional(),
  accountId: z.string().optional()
});

// Type for validated job data
type CreateScheduledJobData = z.infer<typeof createScheduledJobSchema>;

/**
 * Get all scheduled jobs for the current user
 */
export async function getScheduledJobs(req: Request, res: Response): Promise<Response> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Extract query parameters
    const { isActive, analysisType, interval } = req.query;
    
    // Build filter
    const filter: any = {};
    
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    
    if (analysisType && Object.values(AnalysisType).includes(analysisType as AnalysisType)) {
      filter.analysisType = analysisType as AnalysisType;
    }
    
    if (interval && Object.values(JobInterval).includes(interval as JobInterval)) {
      filter.interval = interval as JobInterval;
    }

    // Get scheduled jobs for the user
    const jobs = await queueService.getScheduledJobsForUser(userId, filter);

    return res.status(200).json({ jobs });
  } catch (error) {
    logger.error(`Error getting scheduled jobs: ${error}`);
    return res.status(500).json({ message: 'Error retrieving scheduled jobs' });
  }
}

/**
 * Get a specific scheduled job by ID
 */
export async function getScheduledJobById(req: Request, res: Response): Promise<Response> {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Get the scheduled job
    const job = await ScheduledJobRepository.findById(id);

    if (!job) {
      return res.status(404).json({ message: 'Scheduled job not found' });
    }

    // Check if job belongs to the user
    if (job.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized to access this scheduled job' });
    }

    return res.status(200).json({ job });
  } catch (error) {
    logger.error(`Error getting scheduled job by ID: ${error}`);
    return res.status(500).json({ message: 'Error retrieving scheduled job' });
  }
}

/**
 * Create a new scheduled job
 */
export const createScheduledJob = async (req: Request, res: Response): Promise<void> => {
  try {
    // @ts-ignore TS doesn't recognize the user property
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    // Validate request body
    const validationResult = createScheduledJobSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      res.status(400).json({ 
        message: 'Invalid request body',
        errors: validationResult.error.errors 
      });
      return;
    }

    const jobData: CreateScheduledJobData = validationResult.data;

    // Create scheduled job
    try {
      const scheduledJob = await queueService.scheduleRecurringJob(
        userId,
        jobData.analysisType,
        jobData.interval,
        {
          name: jobData.name,
          description: jobData.description,
          accountId: jobData.accountId
        }
      );

      res.status(201).json(scheduledJob);
    } catch (error) {
      logger.error(`Error creating scheduled job: ${error}`);
      res.status(500).json({ message: 'Failed to create scheduled job' });
    }
  } catch (error) {
    logger.error(`Error in createScheduledJob: ${error}`);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Update a scheduled job (pause/resume)
 */
export async function updateScheduledJob(req: Request, res: Response): Promise<Response> {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { isActive, name, description } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Get the scheduled job
    const job = await ScheduledJobRepository.findById(id);

    if (!job) {
      return res.status(404).json({ message: 'Scheduled job not found' });
    }

    // Check if job belongs to the user
    if (job.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized to access this scheduled job' });
    }

    // Update basic properties
    let updatedJob = job;
    
    if (name !== undefined || description !== undefined) {
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      
      updatedJob = await ScheduledJobRepository.update(id, updates) || job;
    }

    // Handle active status change
    if (isActive !== undefined) {
      if (isActive && !job.isActive) {
        updatedJob = await queueService.resumeScheduledJob(id) || job;
      } else if (!isActive && job.isActive) {
        updatedJob = await queueService.pauseScheduledJob(id) || job;
      }
    }

    return res.status(200).json({
      message: 'Scheduled job updated successfully',
      job: updatedJob
    });
  } catch (error) {
    logger.error(`Error updating scheduled job: ${error}`);
    return res.status(500).json({ message: 'Error updating scheduled job' });
  }
}

/**
 * Delete a scheduled job
 */
export async function deleteScheduledJob(req: Request, res: Response): Promise<Response> {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Get the scheduled job
    const job = await ScheduledJobRepository.findById(id);

    if (!job) {
      return res.status(404).json({ message: 'Scheduled job not found' });
    }

    // Check if job belongs to the user
    if (job.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized to access this scheduled job' });
    }

    // Delete the job
    await queueService.removeScheduledJob(id);

    return res.status(200).json({
      message: 'Scheduled job deleted successfully',
      id
    });
  } catch (error) {
    logger.error(`Error deleting scheduled job: ${error}`);
    return res.status(500).json({ message: 'Error deleting scheduled job' });
  }
}

/**
 * Run a scheduled job immediately
 */
export async function runScheduledJobNow(req: Request, res: Response): Promise<Response> {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Get the scheduled job
    const job = await ScheduledJobRepository.findById(id);

    if (!job) {
      return res.status(404).json({ message: 'Scheduled job not found' });
    }

    // Check if job belongs to the user
    if (job.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized to access this scheduled job' });
    }

    // Use conversion between interval and period
    const period = queueService.mapIntervalToPeriod(job.interval);

    // Queue the job to run immediately with the scheduled job ID
    const queuedJob = await queueService.queueAnalysisJob(
      userId,
      job.analysisType,
      period,
      {
        accountId: job.accountId,
        priority: 10, // Higher priority for manual runs
        startDate: job.lastRun // Start from last run date
      }
    );

    // Update last run time
    await ScheduledJobRepository.updateJobRun(id, { lastRun: new Date() });

    return res.status(202).json({
      message: 'Scheduled job queued for immediate execution',
      jobId: queuedJob.id
    });
  } catch (error) {
    logger.error(`Error running scheduled job now: ${error}`);
    return res.status(500).json({ message: 'Error running scheduled job' });
  }
} 