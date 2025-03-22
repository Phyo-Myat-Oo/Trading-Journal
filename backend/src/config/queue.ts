import { QueueOptions } from 'bull';

// Bull queue configuration
export const queueConfig: QueueOptions = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
  defaultJobOptions: {
    attempts: 3,
    removeOnComplete: true,
    removeOnFail: false,
  },
};

// Analysis job types
export enum AnalysisJobType {
  PERFORMANCE = 'performance',
  PATTERN = 'pattern',
  SYMBOL = 'symbol',
  TIME_OF_DAY = 'time_of_day',
  DAY_OF_WEEK = 'day_of_week',
  RISK = 'risk',
  DASHBOARD = 'dashboard',
  JOURNAL_CORRELATION = 'journal_correlation',
}

// Job interval types
export enum JobInterval {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

// Cron expressions for different intervals
export const intervalCronExpressions = {
  [JobInterval.DAILY]: '0 0 * * *',         // Every day at midnight
  [JobInterval.WEEKLY]: '0 0 * * 1',        // Every Monday at midnight
  [JobInterval.MONTHLY]: '0 0 1 * *',       // 1st day of the month at midnight
  [JobInterval.QUARTERLY]: '0 0 1 1,4,7,10 *', // 1st day of Jan, Apr, Jul, Oct
  [JobInterval.YEARLY]: '0 0 1 1 *',        // January 1st at midnight
}; 