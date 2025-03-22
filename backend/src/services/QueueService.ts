/**
 * Queue Service for Background Job Processing
 * 
 * This service manages background job processing for analysis tasks using Bull queue.
 * It provides functionality for:
 * - Scheduling one-time and recurring analysis jobs
 * - Processing analysis jobs in the background
 * - Managing scheduled job lifecycle (create, pause, resume, delete)
 */
import Queue, { Job } from 'bull';
import { queueConfig, JobInterval, intervalCronExpressions } from '../config/queue';
import { AnalysisType, AnalysisPeriod } from '../models/Analysis';
import { logger } from '../utils/logger';
import { StatisticsService } from './StatisticsService';
import { AnalysisRepository } from '../repositories/AnalysisRepository';
import { ScheduledJobRepository } from '../repositories/ScheduledJobRepository';
import ScheduledJob, { IScheduledJob } from '../models/ScheduledJob';

// Queue name
const ANALYSIS_QUEUE = 'analysis';

/**
 * Analysis Job Data Interface
 * Defines the structure of data needed to process an analysis job
 */
interface AnalysisJobData {
  userId: string;
  analysisType: AnalysisType;
  period: AnalysisPeriod;
  accountId?: string;
  startDate?: Date;
  endDate?: Date;
  scheduledJobId?: string;
}

/**
 * Scheduled Job Interface
 * Represents a recurring analysis job configuration
 */
export interface ScheduledJob {
  _id?: string;
  userId: string;
  jobId: string;
  analysisType: AnalysisType;
  interval: JobInterval;
  accountId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * QueueService class
 * Handles background processing of analysis tasks
 */
class QueueService {
  private analysisQueue: Queue.Queue;
  private initialized: boolean = false;

  constructor() {
    this.analysisQueue = new Queue(ANALYSIS_QUEUE, queueConfig);
    this.initialized = false;
  }

  /**
   * Initialize the queue and register processors
   * Sets up job handlers and event listeners
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    // Register job processors
    this.analysisQueue.process(async (job: Job<AnalysisJobData>) => {
      return this.processAnalysisJob(job);
    });

    // Register event listeners for job completion and failure
    this.analysisQueue.on('completed', async (job) => {
      logger.info(`Job ${job.id} completed successfully`);
      
      // If this was a scheduled job, update the lastRun time
      const { scheduledJobId } = job.data;
      if (scheduledJobId) {
        try {
          const scheduledJob = await ScheduledJobRepository.findById(scheduledJobId);
          if (scheduledJob) {
            await ScheduledJobRepository.updateJobRun(scheduledJobId, { 
              lastRun: new Date() 
            });
          }
        } catch (error) {
          logger.error(`Error updating scheduled job last run time: ${error}`);
        }
      }
    });

    this.analysisQueue.on('failed', (job, error) => {
      logger.error(`Job ${job?.id} failed with error: ${error.message}`);
    });

    this.initialized = true;
    logger.info('Queue service initialized successfully');
  }

  /**
   * Process an analysis job
   * 
   * This is the main worker function that:
   * 1. Calculates the appropriate date range for analysis
   * 2. Creates a pending analysis record
   * 3. Calls the appropriate analysis method based on job type
   * 4. Stores the analysis results
   * 
   * @param job The Bull job containing analysis parameters
   * @returns Result of the analysis operation
   */
  private async processAnalysisJob(job: Job<AnalysisJobData>): Promise<any> {
    const { userId, analysisType, period, accountId, startDate, endDate, scheduledJobId } = job.data;
    logger.info(`Processing ${analysisType} analysis job for user ${userId}`);

    try {
      // Calculate date range if not provided
      const now = new Date();
      const jobStartDate = startDate ? new Date(startDate) : new Date();
      let jobEndDate = endDate ? new Date(endDate) : new Date();

      if (!startDate || !endDate) {
        // Calculate date range based on period - important for scheduled jobs
        // that need to analyze data for a specific time window
        jobEndDate = now;
        
        switch (period) {
          case AnalysisPeriod.DAILY:
            jobStartDate.setDate(jobEndDate.getDate() - 1);
            break;
          case AnalysisPeriod.WEEKLY:
            jobStartDate.setDate(jobEndDate.getDate() - 7);
            break;
          case AnalysisPeriod.MONTHLY:
            jobStartDate.setMonth(jobEndDate.getMonth() - 1);
            break;
          case AnalysisPeriod.QUARTERLY:
            jobStartDate.setMonth(jobEndDate.getMonth() - 3);
            break;
          case AnalysisPeriod.YEARLY:
            jobStartDate.setFullYear(jobEndDate.getFullYear() - 1);
            break;
          default:
            jobStartDate.setMonth(jobEndDate.getMonth() - 1);
        }
      }

      // Initialize a pending analysis record
      // This creates a placeholder in the database that will be updated when analysis completes
      const pendingAnalysis = await AnalysisRepository.initializePending(
        userId,
        analysisType,
        period,
        jobStartDate,
        jobEndDate,
        accountId
      );

      try {
        // Generate the analysis based on type
        // Each analysis type uses a different calculation method
        let data;
        const startTime = Date.now();

        switch (analysisType) {
          case AnalysisType.PERFORMANCE:
            data = await StatisticsService.calculateTradeStats(userId, jobStartDate, jobEndDate, accountId);
            break;
          case AnalysisType.SYMBOL:
            data = await StatisticsService.analyzeSymbolPerformance(userId, jobStartDate, jobEndDate, accountId);
            break;
          case AnalysisType.TIME_OF_DAY:
            data = await StatisticsService.analyzeTimeOfDay(userId, jobStartDate, jobEndDate, accountId);
            break;
          case AnalysisType.DAY_OF_WEEK:
            data = await StatisticsService.analyzeDayOfWeek(userId, jobStartDate, jobEndDate, accountId);
            break;
          case AnalysisType.RISK:
            data = await StatisticsService.calculateRiskMetrics(userId, jobStartDate, jobEndDate, accountId);
            break;
          case AnalysisType.JOURNAL_CORRELATION:
            data = await StatisticsService.analyzeJournalCorrelation(userId, jobStartDate, jobEndDate);
            break;
          case AnalysisType.DASHBOARD:
            // For dashboard, get all stats and combine them
            const [
              basicStats,
              symbolStats,
              timeOfDayStats,
              dayOfWeekStats,
              riskStats,
              journalStats
            ] = await Promise.all([
              StatisticsService.calculateTradeStats(userId, jobStartDate, jobEndDate, accountId),
              StatisticsService.analyzeSymbolPerformance(userId, jobStartDate, jobEndDate, accountId),
              StatisticsService.analyzeTimeOfDay(userId, jobStartDate, jobEndDate, accountId),
              StatisticsService.analyzeDayOfWeek(userId, jobStartDate, jobEndDate, accountId),
              StatisticsService.calculateRiskMetrics(userId, jobStartDate, jobEndDate, accountId),
              StatisticsService.analyzeJournalCorrelation(userId, jobStartDate, jobEndDate)
            ]);

            data = {
              basicStats,
              symbolStats,
              timeOfDayStats,
              dayOfWeekStats,
              riskStats,
              journalStats
            };
            break;
        }

        const calculationTime = Date.now() - startTime;
        const metadata: Record<string, any> = { 
          calculationTime,
          scheduledJob: scheduledJobId ? true : false
        };
        
        if (scheduledJobId) {
          metadata.scheduledJobId = scheduledJobId;
        }

        // Mark analysis as completed
        const completedAnalysis = await AnalysisRepository.markCompleted(
          pendingAnalysis._id as unknown as string,
          data,
          metadata
        );

        return { 
          success: true, 
          analysisId: pendingAnalysis._id as unknown as string,
          scheduledJobId: scheduledJobId 
        };
      } catch (error) {
        // Mark analysis as failed
        await AnalysisRepository.markFailed(
          pendingAnalysis._id as unknown as string,
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    } catch (error) {
      logger.error(`Error processing analysis job: ${error}`);
      throw error;
    }
  }

  /**
   * Add a one-time analysis job to the queue
   */
  async queueAnalysisJob(
    userId: string,
    analysisType: AnalysisType,
    period: AnalysisPeriod,
    options?: {
      accountId?: string;
      startDate?: Date;
      endDate?: Date;
      priority?: number;
      delay?: number;
    }
  ): Promise<Job<AnalysisJobData>> {
    if (!this.initialized) await this.init();

    const jobData: AnalysisJobData = {
      userId,
      analysisType,
      period,
      accountId: options?.accountId,
      startDate: options?.startDate,
      endDate: options?.endDate
    };

    const jobOptions = {
      priority: options?.priority || 0,
      delay: options?.delay || 0,
      attempts: 3,
      removeOnComplete: true
    };

    return this.analysisQueue.add(jobData, jobOptions);
  }

  /**
   * Schedule a recurring analysis job and store in database
   */
  async scheduleRecurringJob(
    userId: string,
    analysisType: AnalysisType,
    interval: JobInterval,
    options?: {
      name?: string;
      description?: string;
      accountId?: string;
    }
  ): Promise<ScheduledJob> {
    if (!this.initialized) await this.init();

    // Get the period for the interval
    const period = this.mapIntervalToPeriod(interval);

    // Create a job name if not provided
    const name = options?.name || `${analysisType} ${interval} Analysis`;

    // Add the repeatable job with Bull
    const cronExpression = intervalCronExpressions[interval];
    const repeatableJob = await this.analysisQueue.add(
      {
        userId,
        analysisType,
        period,
        accountId: options?.accountId
      },
      {
        repeat: { cron: cronExpression },
        removeOnComplete: true
      }
    );

    // Get the job key for future reference
    const repeatableJobs = await this.analysisQueue.getRepeatableJobs();
    const jobKey = repeatableJobs.find(job => job.id === repeatableJob.id)?.key;

    if (!jobKey) {
      throw new Error('Failed to retrieve job key for repeatable job');
    }

    // Calculate the next run time based on the cron expression
    const parser = require('cron-parser');
    const interval_obj = parser.parseExpression(cronExpression);
    const nextRun = interval_obj.next().toDate();

    // Store the scheduled job in the database
    const scheduledJob = await ScheduledJobRepository.create({
      userId,
      jobId: typeof repeatableJob.id === 'number' ? repeatableJob.id.toString() : repeatableJob.id,
      jobKey,
      name,
      description: options?.description,
      analysisType,
      interval,
      accountId: options?.accountId,
      nextRun
    });

    return scheduledJob;
  }

  /**
   * Remove a scheduled recurring job
   */
  async removeScheduledJob(id: string): Promise<boolean> {
    if (!this.initialized) await this.init();

    // Get the scheduled job
    const scheduledJob = await ScheduledJobRepository.findById(id);
    
    if (!scheduledJob) {
      throw new Error('Scheduled job not found');
    }

    // Remove the job from Bull queue
    await this.analysisQueue.removeRepeatableByKey(scheduledJob.jobKey);

    // Delete from database
    await ScheduledJobRepository.delete(id);

    return true;
  }

  /**
   * Pause a scheduled job
   */
  async pauseScheduledJob(id: string): Promise<IScheduledJob | null> {
    // Mark the job as inactive in the database
    return ScheduledJobRepository.deactivate(id);
  }

  /**
   * Resume a scheduled job
   */
  async resumeScheduledJob(id: string): Promise<IScheduledJob | null> {
    // Mark the job as active in the database
    return ScheduledJobRepository.activate(id);
  }

  /**
   * Get all scheduled jobs for a user
   */
  async getScheduledJobsForUser(userId: string, filter?: {
    isActive?: boolean;
    analysisType?: AnalysisType;
    interval?: JobInterval;
  }): Promise<ScheduledJob[]> {
    return ScheduledJobRepository.findByUser(userId, filter);
  }

  /**
   * Map interval to analysis period - Public method for use in controllers
   */
  mapIntervalToPeriod(interval: JobInterval): AnalysisPeriod {
    switch (interval) {
      case JobInterval.DAILY:
        return AnalysisPeriod.DAILY;
      case JobInterval.WEEKLY:
        return AnalysisPeriod.WEEKLY;
      case JobInterval.MONTHLY:
        return AnalysisPeriod.MONTHLY;
      case JobInterval.QUARTERLY:
        return AnalysisPeriod.QUARTERLY;
      case JobInterval.YEARLY:
        return AnalysisPeriod.YEARLY;
      default:
        return AnalysisPeriod.MONTHLY;
    }
  }

  /**
   * Clean up old jobs
   */
  async cleanUp(): Promise<void> {
    if (!this.initialized) await this.init();
    
    // Clean completed and failed jobs older than 7 days
    const olderThan = 7 * 24 * 60 * 60 * 1000; // 7 days
    await this.analysisQueue.clean(olderThan, 'completed');
    await this.analysisQueue.clean(olderThan, 'failed');
  }

  /**
   * Create a scheduled analysis job
   */
  async createScheduledJob(
    userId: string,
    analysisType: AnalysisType,
    interval: JobInterval,
    options?: {
      startDate?: Date;
      endDate?: Date;
      accountId?: string;
    }
  ): Promise<IScheduledJob> {
    if (!this.initialized) await this.init();

    // ... rest of the method ...
  }

  /**
   * Find a user's scheduled jobs
   */
  async getScheduledJobs(userId: string, filter?: {
    isActive?: boolean;
    analysisType?: AnalysisType;
    interval?: JobInterval;
  }): Promise<IScheduledJob[]> {
    return ScheduledJobRepository.findByUser(userId, filter);
  }
}

// Export singleton instance
export const queueService = new QueueService(); 