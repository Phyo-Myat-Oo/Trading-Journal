import * as cron from 'node-cron';
import { AnalysisService } from './AnalysisService';
import { User } from '../models/User';
import { logger } from '../utils/logger';
import { AnalysisPeriod, AnalysisType } from '../models/Analysis';
import mongoose from 'mongoose';
import { getDateRangeForPeriod } from '../utils/dateUtils';

class AnalysisScheduler {
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private isRunning: boolean = false;

  /**
   * Initialize the analysis scheduler
   */
  public async initialize(): Promise<void> {
    try {
      // Check if scheduler is already running
      if (this.isRunning) {
        logger.warn('Analysis scheduler is already running');
        return;
      }

      logger.info('Initializing analysis scheduler');

      // Schedule daily analysis (runs at 1:00 AM)
      this.jobs.set('daily', cron.schedule('0 1 * * *', async () => {
        logger.info('Running daily analysis job');
        await this.runAnalysisForAllUsers(AnalysisPeriod.DAILY);
      }));

      // Schedule weekly analysis (runs on Sunday at 2:00 AM)
      this.jobs.set('weekly', cron.schedule('0 2 * * 0', async () => {
        logger.info('Running weekly analysis job');
        await this.runAnalysisForAllUsers(AnalysisPeriod.WEEKLY);
      }));

      // Schedule monthly analysis (runs on the 1st of each month at 3:00 AM)
      this.jobs.set('monthly', cron.schedule('0 3 1 * *', async () => {
        logger.info('Running monthly analysis job');
        await this.runAnalysisForAllUsers(AnalysisPeriod.MONTHLY);
      }));

      // Schedule quarterly cleanup (runs on the 1st of Jan, Apr, Jul, Oct at 4:00 AM)
      this.jobs.set('quarterly', cron.schedule('0 4 1 1,4,7,10 *', async () => {
        logger.info('Running quarterly analysis job');
        await this.runAnalysisForAllUsers(AnalysisPeriod.QUARTERLY);
      }));

      // Schedule yearly analysis (runs on January 1st at 5:00 AM)
      this.jobs.set('yearly', cron.schedule('0 5 1 1 *', async () => {
        logger.info('Running yearly analysis job');
        await this.runAnalysisForAllUsers(AnalysisPeriod.YEARLY);
      }));

      // Schedule purge of old analyses (runs on the 15th of each month at 4:30 AM)
      this.jobs.set('purge', cron.schedule('30 4 15 * *', async () => {
        logger.info('Running purge job for old analyses');
        try {
          const purgedCount = await AnalysisService.purgeOldAnalyses(90); // 90 days retention
          logger.info(`Purged ${purgedCount} old analyses`);
        } catch (error) {
          logger.error('Error purging old analyses:', error);
        }
      }));

      logger.info('Analysis scheduler initialized successfully');
      this.isRunning = true;
    } catch (error) {
      logger.error('Error initializing analysis scheduler:', error);
      throw error;
    }
  }

  /**
   * Stop all scheduled jobs
   */
  public stop(): void {
    try {
      logger.info('Stopping analysis scheduler');
      this.jobs.forEach((job, name) => {
        job.stop();
        logger.info(`Stopped ${name} job`);
      });
      this.jobs.clear();
      this.isRunning = false;
      logger.info('Analysis scheduler stopped');
    } catch (error) {
      logger.error('Error stopping analysis scheduler:', error);
    }
  }

  /**
   * Run analysis for all active users
   */
  private async runAnalysisForAllUsers(period: AnalysisPeriod): Promise<void> {
    try {
      logger.info(`Starting ${period} analysis for all users`);
      
      // Find active users with active trades
      const users = await User.find({ isActive: true }).select('_id').lean();
      logger.info(`Found ${users.length} active users`);
      
      let successCount = 0;
      let errorCount = 0;
      
      // Generate analysis for each user
      for (const user of users) {
        try {
          // Schedule both performance and pattern analysis
          await this.queueAnalysisJob(user._id.toString(), [AnalysisType.PERFORMANCE, AnalysisType.PATTERN], period);
          successCount++;
        } catch (error) {
          logger.error(`Error generating ${period} analysis for user ${user._id}:`, error);
          errorCount++;
        }
        
        // Brief delay to prevent server overload
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      logger.info(`Completed ${period} analysis job. Success: ${successCount}, Errors: ${errorCount}`);
    } catch (error) {
      logger.error(`Error running ${period} analysis job:`, error);
    }
  }

  /**
   * Queue an analysis job for a specific user
   */
  public async queueAnalysisJob(
    userId: string,
    types: AnalysisType[] = [AnalysisType.PERFORMANCE, AnalysisType.PATTERN],
    period: AnalysisPeriod = AnalysisPeriod.MONTHLY
  ): Promise<void> {
    try {
      logger.info(`Queueing analysis job for user ${userId} with period ${period}`);
      
      // Convert period enum to date range
      const { startDate, endDate } = getDateRangeForPeriod(period);
      
      // Create a period object for the AnalysisService
      const periodObject = { start: startDate, end: endDate };
      
      // Validate user exists
      const userExists = await User.exists({ _id: new mongoose.Types.ObjectId(userId) });
      if (!userExists) {
        throw new Error(`User ${userId} not found`);
      }
      
      // Schedule the analysis
      await AnalysisService.scheduleAnalysis(userId, types, periodObject);
      
      logger.info(`Successfully queued analysis job for user ${userId}`);
    } catch (error) {
      logger.error(`Error queueing analysis job for user ${userId}:`, error);
      throw error;
    }
  }
}

// Create singleton instance
const analysisScheduler = new AnalysisScheduler();

export { analysisScheduler }; 