import mongoose from 'mongoose';
import ScheduledJob, { IScheduledJob } from '../models/ScheduledJob';
import { AnalysisType } from '../models/Analysis';
import { JobInterval } from '../config/queue';
import { logger } from '../utils/logger';

export class ScheduledJobRepository {
  /**
   * Create a new scheduled job
   */
  static async create(jobData: {
    userId: string;
    jobId: string;
    jobKey: string;
    name: string;
    description?: string;
    analysisType: AnalysisType;
    interval: JobInterval;
    accountId?: string;
    nextRun?: Date;
  }): Promise<IScheduledJob> {
    try {
      const { userId, jobId, jobKey, name, description, analysisType, interval, accountId, nextRun } = jobData;
      
      const scheduledJob = new ScheduledJob({
        userId: new mongoose.Types.ObjectId(userId),
        jobId,
        jobKey,
        name,
        description,
        analysisType,
        interval,
        accountId,
        nextRun,
        isActive: true
      });

      return await scheduledJob.save();
    } catch (error) {
      logger.error(`Error creating scheduled job: ${error}`);
      throw error;
    }
  }

  /**
   * Find a scheduled job by ID
   */
  static async findById(id: string): Promise<IScheduledJob | null> {
    try {
      return await ScheduledJob.findById(id);
    } catch (error) {
      logger.error(`Error finding scheduled job by ID: ${error}`);
      throw error;
    }
  }

  /**
   * Find a scheduled job by Bull job ID
   */
  static async findByJobId(jobId: string): Promise<IScheduledJob | null> {
    try {
      return await ScheduledJob.findOne({ jobId });
    } catch (error) {
      logger.error(`Error finding scheduled job by jobId: ${error}`);
      throw error;
    }
  }

  /**
   * Find all jobs for a user
   */
  static async findByUser(userId: string, filter?: {
    isActive?: boolean;
    analysisType?: AnalysisType;
    interval?: JobInterval;
  }): Promise<IScheduledJob[]> {
    try {
      const query: any = { userId: new mongoose.Types.ObjectId(userId) };

      if (filter?.isActive !== undefined) {
        query.isActive = filter.isActive;
      }

      if (filter?.analysisType) {
        query.analysisType = filter.analysisType;
      }

      if (filter?.interval) {
        query.interval = filter.interval;
      }

      return await ScheduledJob.find(query).sort({ createdAt: -1 });
    } catch (error) {
      logger.error(`Error finding scheduled jobs for user: ${error}`);
      throw error;
    }
  }

  /**
   * Update scheduled job
   */
  static async update(id: string, updateData: Partial<IScheduledJob>): Promise<IScheduledJob | null> {
    try {
      // Don't allow updating userId or jobId
      const { userId, jobId, ...allowedUpdates } = updateData;
      
      return await ScheduledJob.findByIdAndUpdate(
        id,
        { $set: allowedUpdates },
        { new: true }
      );
    } catch (error) {
      logger.error(`Error updating scheduled job: ${error}`);
      throw error;
    }
  }

  /**
   * Mark job as inactive
   */
  static async deactivate(id: string): Promise<IScheduledJob | null> {
    try {
      return await ScheduledJob.findByIdAndUpdate(
        id,
        { $set: { isActive: false } },
        { new: true }
      );
    } catch (error) {
      logger.error(`Error deactivating scheduled job: ${error}`);
      throw error;
    }
  }

  /**
   * Mark job as active
   */
  static async activate(id: string): Promise<IScheduledJob | null> {
    try {
      return await ScheduledJob.findByIdAndUpdate(
        id,
        { $set: { isActive: true } },
        { new: true }
      );
    } catch (error) {
      logger.error(`Error activating scheduled job: ${error}`);
      throw error;
    }
  }

  /**
   * Delete a scheduled job
   */
  static async delete(id: string): Promise<boolean> {
    try {
      const result = await ScheduledJob.deleteOne({ _id: id });
      return result.deletedCount > 0;
    } catch (error) {
      logger.error(`Error deleting scheduled job: ${error}`);
      throw error;
    }
  }

  /**
   * Update job run information
   */
  static async updateJobRun(id: string, runData: {
    lastRun: Date;
    nextRun?: Date;
  }): Promise<IScheduledJob | null> {
    try {
      return await ScheduledJob.findByIdAndUpdate(
        id,
        { $set: runData },
        { new: true }
      );
    } catch (error) {
      logger.error(`Error updating job run information: ${error}`);
      throw error;
    }
  }

  /**
   * Find active jobs that are due to run
   */
  static async findDueJobs(): Promise<IScheduledJob[]> {
    try {
      const now = new Date();
      return await ScheduledJob.find({
        isActive: true,
        nextRun: { $lte: now }
      });
    } catch (error) {
      logger.error(`Error finding due jobs: ${error}`);
      throw error;
    }
  }
} 