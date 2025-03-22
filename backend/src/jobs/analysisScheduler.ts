import cron from 'node-cron';
import { User } from '../models/User';
import { AnalysisService } from '../services/AnalysisService';
import { logger } from '../utils/logger';

/**
 * Scheduler for running periodic analysis jobs
 */
export class AnalysisScheduler {
  private static dailySchedule = '0 0 * * *';       // Run at midnight every day
  private static weeklySchedule = '0 0 * * 0';      // Run at midnight on Sunday
  private static monthlySchedule = '0 0 1 * *';     // Run at midnight on the first day of the month
  private static quarterlySchedule = '0 0 1 1,4,7,10 *'; // Run on the first day of each quarter

  /**
   * Initialize all scheduled analysis jobs
   */
  public static initialize(): void {
    this.scheduleDailyAnalysis();
    this.scheduleWeeklyAnalysis();
    this.scheduleMonthlyAnalysis();
    this.scheduleQuarterlyAnalysis();
    logger.info('Analysis scheduler initialized');
  }

  /**
   * Schedule daily analysis jobs
   */
  private static scheduleDailyAnalysis(): void {
    cron.schedule(this.dailySchedule, async () => {
      logger.info('Running daily analysis job');
      
      try {
        // Get all active users
        const users = await User.find({ isActive: true }).select('_id').lean();
        
        // Log the number of users to process
        logger.info(`Processing daily analysis for ${users.length} users`);
        
        // Run daily analysis for each user
        for (const user of users) {
          try {
            await AnalysisService.scheduleAnalysis(
              user._id.toString(),
              ['PERFORMANCE'],
              'DAILY'
            );
          } catch (error) {
            logger.error(`Error running daily analysis for user ${user._id}:`, error);
          }
        }
        
        logger.info('Completed daily analysis job');
      } catch (error) {
        logger.error('Error in daily analysis job:', error);
      }
    });
    
    logger.info('Daily analysis job scheduled');
  }

  /**
   * Schedule weekly analysis jobs
   */
  private static scheduleWeeklyAnalysis(): void {
    cron.schedule(this.weeklySchedule, async () => {
      logger.info('Running weekly analysis job');
      
      try {
        // Get all active users
        const users = await User.find({ isActive: true }).select('_id').lean();
        
        // Log the number of users to process
        logger.info(`Processing weekly analysis for ${users.length} users`);
        
        // Run weekly analysis for each user
        for (const user of users) {
          try {
            await AnalysisService.scheduleAnalysis(
              user._id.toString(),
              ['PERFORMANCE', 'PATTERN'],
              'WEEKLY'
            );
          } catch (error) {
            logger.error(`Error running weekly analysis for user ${user._id}:`, error);
          }
        }
        
        logger.info('Completed weekly analysis job');
      } catch (error) {
        logger.error('Error in weekly analysis job:', error);
      }
    });
    
    logger.info('Weekly analysis job scheduled');
  }

  /**
   * Schedule monthly analysis jobs
   */
  private static scheduleMonthlyAnalysis(): void {
    cron.schedule(this.monthlySchedule, async () => {
      logger.info('Running monthly analysis job');
      
      try {
        // Get all active users
        const users = await User.find({ isActive: true }).select('_id').lean();
        
        // Log the number of users to process
        logger.info(`Processing monthly analysis for ${users.length} users`);
        
        // Run monthly analysis for each user
        for (const user of users) {
          try {
            await AnalysisService.scheduleAnalysis(
              user._id.toString(),
              ['PERFORMANCE', 'PATTERN'],
              'MONTHLY'
            );
          } catch (error) {
            logger.error(`Error running monthly analysis for user ${user._id}:`, error);
          }
        }
        
        logger.info('Completed monthly analysis job');
      } catch (error) {
        logger.error('Error in monthly analysis job:', error);
      }
    });
    
    logger.info('Monthly analysis job scheduled');
  }

  /**
   * Schedule quarterly analysis jobs
   */
  private static scheduleQuarterlyAnalysis(): void {
    cron.schedule(this.quarterlySchedule, async () => {
      logger.info('Running quarterly analysis job');
      
      try {
        // Get all active users
        const users = await User.find({ isActive: true }).select('_id').lean();
        
        // Log the number of users to process
        logger.info(`Processing quarterly analysis for ${users.length} users`);
        
        // Run quarterly analysis for each user
        for (const user of users) {
          try {
            await AnalysisService.scheduleAnalysis(
              user._id.toString(),
              ['PERFORMANCE', 'PATTERN', 'FORECAST'],
              'QUARTERLY'
            );
          } catch (error) {
            logger.error(`Error running quarterly analysis for user ${user._id}:`, error);
          }
        }
        
        logger.info('Completed quarterly analysis job');
      } catch (error) {
        logger.error('Error in quarterly analysis job:', error);
      }
    });
    
    logger.info('Quarterly analysis job scheduled');
  }
} 