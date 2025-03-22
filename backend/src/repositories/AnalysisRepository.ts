import { Types } from 'mongoose';
import { Analysis, AnalysisType, AnalysisPeriod, IAnalysis } from '../models/Analysis';
import { logger } from '../utils/logger';

export class AnalysisRepository {
  /**
   * Create a new analysis record
   */
  static async create(analysisData: Partial<IAnalysis>): Promise<IAnalysis> {
    try {
      const analysis = new Analysis(analysisData);
      return await analysis.save();
    } catch (error) {
      logger.error('Error creating analysis record:', error);
      throw error;
    }
  }

  /**
   * Initialize a pending analysis record
   */
  static async initializePending(
    userId: string,
    type: AnalysisType,
    period: AnalysisPeriod,
    startDate: Date,
    endDate: Date,
    accountId?: string
  ): Promise<IAnalysis> {
    try {
      const analysisData: Partial<IAnalysis> = {
        userId: new Types.ObjectId(userId),
        type,
        period,
        startDate,
        endDate,
        status: 'PENDING',
        data: {},
        metadata: {
          queuedAt: new Date()
        }
      };

      if (accountId) {
        analysisData.accountId = new Types.ObjectId(accountId);
      }

      return await this.create(analysisData);
    } catch (error) {
      logger.error('Error initializing pending analysis:', error);
      throw error;
    }
  }

  /**
   * Update an existing analysis record
   */
  static async update(id: string, updateData: Partial<IAnalysis>): Promise<IAnalysis | null> {
    try {
      return await Analysis.findByIdAndUpdate(
        id,
        { ...updateData, updatedAt: new Date() },
        { new: true }
      );
    } catch (error) {
      logger.error(`Error updating analysis record ${id}:`, error);
      throw error;
    }
  }

  /**
   * Mark analysis as completed with data
   */
  static async markCompleted(id: string, data: any, metadata?: Record<string, any>): Promise<IAnalysis | null> {
    try {
      const updateData: Partial<IAnalysis> = {
        status: 'COMPLETED',
        data,
        updatedAt: new Date()
      };

      if (metadata) {
        updateData.metadata = metadata;
      }

      return await Analysis.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      );
    } catch (error) {
      logger.error(`Error marking analysis ${id} as completed:`, error);
      throw error;
    }
  }

  /**
   * Mark analysis as failed with error message
   */
  static async markFailed(id: string, error: string): Promise<IAnalysis | null> {
    try {
      return await Analysis.findByIdAndUpdate(
        id,
        {
          status: 'FAILED',
          error,
          updatedAt: new Date()
        },
        { new: true }
      );
    } catch (error) {
      logger.error(`Error marking analysis ${id} as failed:`, error);
      throw error;
    }
  }

  /**
   * Find analysis by ID
   */
  static async findById(id: string): Promise<IAnalysis | null> {
    try {
      return await Analysis.findById(id);
    } catch (error) {
      logger.error(`Error finding analysis by ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Find latest analysis by type and period for a user
   */
  static async findLatest(
    userId: string,
    type: AnalysisType,
    period: IAnalysis['period'] | AnalysisPeriod,
    accountId?: string
  ): Promise<IAnalysis | null> {
    try {
      const query: any = {
        userId: new Types.ObjectId(userId),
        type,
        status: 'COMPLETED'
      };

      if (accountId) {
        query.accountId = new Types.ObjectId(accountId);
      }

      if (typeof period === 'string') {
        query.period = period;
      } else if (typeof period === 'object' && period.start && period.end) {
        query['period.start'] = { $lte: period.end };
        query['period.end'] = { $gte: period.start };
      }

      return await Analysis.findOne(query)
        .sort({ createdAt: -1 })
        .lean();
    } catch (error) {
      logger.error(`Error finding latest analysis for user ${userId}, type ${type}:`, error);
      return null;
    }
  }

  /**
   * Find all analyses for a user with optional filters
   */
  static async findByUser(
    userId: string,
    options: {
      type?: AnalysisType;
      period?: AnalysisPeriod;
      startDate?: Date;
      endDate?: Date;
      status?: 'PENDING' | 'COMPLETED' | 'FAILED';
      accountId?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<IAnalysis[]> {
    try {
      const query: any = {
        userId: new Types.ObjectId(userId)
      };

      if (options.type) query.type = options.type;
      if (options.period) query.period = options.period;
      if (options.status) query.status = options.status;
      
      if (options.startDate || options.endDate) {
        query.startDate = {};
        if (options.startDate) query.startDate.$gte = options.startDate;
        if (options.endDate) query.endDate = { $lte: options.endDate };
      }

      if (options.accountId) {
        query.accountId = new Types.ObjectId(options.accountId);
      }

      const limit = options.limit || 20;
      const offset = options.offset || 0;

      return await Analysis.find(query)
        .sort({ updatedAt: -1 })
        .skip(offset)
        .limit(limit);
    } catch (error) {
      logger.error(`Error finding analyses for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get active analyses count by type
   */
  static async countActiveByType(type: AnalysisType): Promise<number> {
    try {
      return await Analysis.countDocuments({
        type,
        status: 'PENDING'
      });
    } catch (error) {
      logger.error(`Error counting active analyses of type ${type}:`, error);
      throw error;
    }
  }

  /**
   * Delete analysis by ID
   */
  static async delete(id: string): Promise<boolean> {
    try {
      const result = await Analysis.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      logger.error(`Error deleting analysis ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete expired analyses
   */
  static async deleteExpired(): Promise<number> {
    try {
      const result = await Analysis.deleteMany({
        expiresAt: { $lt: new Date() }
      });
      return result.deletedCount || 0;
    } catch (error) {
      logger.error('Error deleting expired analyses:', error);
      throw error;
    }
  }

  /**
   * Find analyses that need to be purged (older than retention period)
   */
  static async purgeOldAnalyses(retentionDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await Analysis.deleteMany({
        createdAt: { $lt: cutoffDate }
      });

      return result.deletedCount || 0;
    } catch (error) {
      logger.error(`Error purging old analyses:`, error);
      throw error;
    }
  }
} 