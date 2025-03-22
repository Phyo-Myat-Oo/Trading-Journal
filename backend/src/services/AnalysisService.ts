/**
 * Analysis Service Module
 * 
 * Provides complex data analysis for trading performance and patterns.
 */
import { Types } from 'mongoose';
import { Analysis, IAnalysis, AnalysisType, AnalysisPeriod } from '../models/Analysis';
import { Trade, ITrade } from '../models/Trade';
import { JournalEntry, IJournalEntry } from '../models/JournalEntry';
import { Account } from '../models/Account';
import { logger } from '../utils/logger';
import { AnalysisRepository } from '../repositories/AnalysisRepository';

// Define types for analysis data structures
interface TradeStatsSummary {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  totalProfitLoss: number;
  avgProfitLoss: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  winRate: number;
  profitFactor: number;
}

interface TradeBySymbol {
  symbol: string;
  count: number;
  profitLoss: number;
  winCount: number;
  lossCount: number;
  winRate: number;
}

interface TradeByPeriod {
  period: number; // dayOfWeek or hour
  count: number;
  profitLoss: number;
}

interface HoldingTimeStats {
  avgHoldingTimeMinutes: number;
  winningTradesAvgTimeMinutes: number;
  losingTradesAvgTimeMinutes: number;
}

interface PerformanceAnalysisData {
  performance: TradeStatsSummary;
  tradesBySymbol: TradeBySymbol[];
  tradesByDayOfWeek: TradeByPeriod[];
  tradesByHourOfDay: TradeByPeriod[];
  holdingTime: HoldingTimeStats;
}

interface TradeSizeRange {
  sizeRange: string | number;
  count: number;
  wins: number;
  losses: number;
  winRate: number;
}

interface MistakeOrLesson {
  item: string;
  count: number;
}

interface TradeStreak {
  type: string;
  count: number;
  totalProfitLoss: number;
  trades: Array<{
    id: Types.ObjectId;
    symbol: string;
    profitLoss: number;
    entryDate: Date;
    exitDate: Date;
  }>;
}

interface PatternAnalysisData {
  streaks: TradeStreak[];
  tradeSizeAnalysis: TradeSizeRange[];
  topMistakes: MistakeOrLesson[];
  topLessons: MistakeOrLesson[];
  totalTrades: number;
  totalJournalEntries: number;
}

interface TradeAnalysis {
  userId: string;
  trades: any[];
  tradeCount: number;
  profitLoss: number;
  winRate: number;
  averageWin?: number;
  averageLoss?: number;
  profitFactor?: number;
  riskRewardRatio?: number;
}

/**
 * Analysis Cache Implementation
 * 
 * This caching system improves performance by storing analysis results in memory
 * to avoid expensive recalculations when the same analysis is requested multiple times.
 * Features:
 * - Time-based cache expiration (TTL)
 * - Targeted cache invalidation
 * - Cache key generation for different analysis types and periods
 */
class AnalysisCache {
  /**
   * In-memory cache storage
   * Map structure with cache keys mapping to analysis objects and timestamps
   */
  private static cache: Map<string, { analysis: IAnalysis; timestamp: number }> = new Map();
  
  /**
   * Time-to-live for cache entries (15 minutes)
   * After this period, cached analyses will be considered stale
   */
  private static readonly TTL = 1000 * 60 * 15; // 15 minutes

  /**
   * Store an analysis result in the cache
   * 
   * @param key - Unique identifier for the analysis
   * @param analysis - The analysis result to cache
   */
  public static set(key: string, analysis: IAnalysis): void {
    this.cache.set(key, { analysis, timestamp: Date.now() });
  }

  /**
   * Retrieve an analysis from the cache if available and not expired
   * 
   * @param key - Unique identifier for the analysis
   * @returns The cached analysis or null if not found or expired
   */
  public static get(key: string): IAnalysis | null {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    // Check if cache is expired using TTL
    if (Date.now() - cached.timestamp > this.TTL) {
      // Remove expired entries to free up memory
      this.cache.delete(key);
      return null;
    }

    return cached.analysis;
  }

  /**
   * Invalidate cache entries for a specific user and optional criteria
   * 
   * This is used when trades or data are updated, making existing analyses outdated.
   * The invalidation can target:
   * - All analyses for a user
   * - Analyses of a specific type (e.g., PERFORMANCE)
   * - Analyses for a specific period (e.g., MONTHLY)
   * 
   * @param userId - The user whose analyses should be invalidated
   * @param type - Optional analysis type to target specific analyses
   * @param period - Optional time period to target specific analyses
   */
  public static invalidate(userId: string, type?: AnalysisType, period?: IAnalysis['period']): void {
    // Collect keys to delete to avoid modifying the map during iteration
    const keysToDelete: string[] = [];
    
    this.cache.forEach((_, key) => {
      if (key.startsWith(`${userId}:`)) {
        if (!type || key.includes(`:${type}:`)) {
          if (!period || key.includes(`:${period}:`)) {
            keysToDelete.push(key);
          }
        }
      }
    });
    
    // Delete all matching cache entries
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Generate a unique cache key for an analysis
   * 
   * The key format is: userId:analysisType:period[:startDate:endDate]
   * For custom periods, the start and end dates are included in the key.
   * 
   * @param userId - User ID
   * @param type - Analysis type (PERFORMANCE, PATTERN, etc.)
   * @param period - Analysis period (DAILY, WEEKLY, etc. or custom dates)
   * @param startDate - Optional start date for custom periods
   * @param endDate - Optional end date for custom periods
   * @returns A unique string key for the cache
   */
  public static getCacheKey(
    userId: string, 
    type: AnalysisType, 
    period: IAnalysis['period'],
    startDate?: Date,
    endDate?: Date
  ): string {
    if (period && typeof period === 'object' && period.start && period.end && startDate && endDate) {
      return `${userId}:${type}:CUSTOM:${startDate.toISOString()}:${endDate.toISOString()}`;
    }
    
    // For standard periods (not custom date ranges)
    return `${userId}:${type}:${period}`;
  }
}

/**
 * Service for generating and managing trading analyses
 */
export class AnalysisService {
  /**
   * Generate trading performance analysis
   */
  public static async generatePerformanceAnalysis(
    userId: string,
    period: IAnalysis['period'],
    startDate: Date,
    endDate: Date,
    queryOptions: Record<string, any> = {}
  ): Promise<IAnalysis> {
    try {
      const startTime = Date.now();
      
      // Convert userId to ObjectId
      const userObjectId = new Types.ObjectId(userId);
      
      // Prepare the match query
      const matchQuery: any = {
        userId: userObjectId,
        entryDate: { $gte: startDate, $lte: endDate },
        exitDate: { $ne: null } // Only completed trades
      };
      
      // Add any additional query parameters
      Object.entries(queryOptions).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === 'accountId' && value) {
            matchQuery.accountId = new Types.ObjectId(value);
          } else {
            matchQuery[key] = value;
          }
        }
      });
      
      // Get trade statistics
      const tradeStats = await Trade.aggregate([
        {
          $match: matchQuery
        },
        {
          $group: {
            _id: null,
            totalTrades: { $sum: 1 },
            winningTrades: {
              $sum: {
                $cond: [{ $gt: ['$profitLoss', 0] }, 1, 0]
              }
            },
            losingTrades: {
              $sum: {
                $cond: [{ $lt: ['$profitLoss', 0] }, 1, 0]
              }
            },
            breakEvenTrades: {
              $sum: {
                $cond: [{ $eq: ['$profitLoss', 0] }, 1, 0]
              }
            },
            totalProfitLoss: { $sum: '$profitLoss' },
            avgProfitLoss: { $avg: '$profitLoss' },
            avgWin: {
              $avg: {
                $cond: [{ $gt: ['$profitLoss', 0] }, '$profitLoss', null]
              }
            },
            avgLoss: {
              $avg: {
                $cond: [{ $lt: ['$profitLoss', 0] }, '$profitLoss', null]
              }
            },
            largestWin: { $max: '$profitLoss' },
            largestLoss: { $min: '$profitLoss' }
          }
        },
        {
          $project: {
            _id: 0,
            totalTrades: 1,
            winningTrades: 1,
            losingTrades: 1,
            breakEvenTrades: 1,
            totalProfitLoss: 1,
            avgProfitLoss: 1,
            avgWin: 1,
            avgLoss: 1,
            largestWin: 1,
            largestLoss: 1,
            winRate: {
              $cond: [
                { $eq: ['$totalTrades', 0] },
                0,
                { $multiply: [{ $divide: ['$winningTrades', '$totalTrades'] }, 100] }
              ]
            },
            profitFactor: {
              $cond: [
                { $eq: [{ $abs: '$avgLoss' }, 0] },
                0,
                { $abs: { $divide: ['$avgWin', '$avgLoss'] } }
              ]
            }
          }
        }
      ]);

      // Calculate trades by symbol
      const tradesBySymbol = await Trade.aggregate([
        {
          $match: {
            userId: userObjectId,
            entryDate: { $gte: startDate, $lte: endDate },
            exitDate: { $ne: null } // Only completed trades
          }
        },
        {
          $group: {
            _id: '$symbol',
            count: { $sum: 1 },
            profitLoss: { $sum: '$profitLoss' },
            winCount: {
              $sum: {
                $cond: [{ $gt: ['$profitLoss', 0] }, 1, 0]
              }
            },
            lossCount: {
              $sum: {
                $cond: [{ $lt: ['$profitLoss', 0] }, 1, 0]
              }
            }
          }
        },
        {
          $project: {
            symbol: '$_id',
            count: 1,
            profitLoss: 1,
            winCount: 1,
            lossCount: 1,
            winRate: {
              $cond: [
                { $eq: ['$count', 0] },
                0,
                { $multiply: [{ $divide: ['$winCount', '$count'] }, 100] }
              ]
            },
            _id: 0
          }
        },
        { $sort: { profitLoss: -1 } }
      ]);

      // Get trade count by day of week
      const tradesByDayOfWeek = await Trade.aggregate([
        {
          $match: {
            userId: userObjectId,
            entryDate: { $gte: startDate, $lte: endDate },
            exitDate: { $ne: null }
          }
        },
        {
          $group: {
            _id: { $dayOfWeek: '$entryDate' },
            count: { $sum: 1 },
            profitLoss: { $sum: '$profitLoss' }
          }
        },
        {
          $project: {
            period: '$_id',
            count: 1,
            profitLoss: 1,
            _id: 0
          }
        },
        { $sort: { period: 1 } }
      ]);

      // Get trade count by hour of day
      const tradesByHourOfDay = await Trade.aggregate([
        {
          $match: {
            userId: userObjectId,
            entryDate: { $gte: startDate, $lte: endDate },
            exitDate: { $ne: null }
          }
        },
        {
          $group: {
            _id: { $hour: '$entryDate' },
            count: { $sum: 1 },
            profitLoss: { $sum: '$profitLoss' }
          }
        },
        {
          $project: {
            period: '$_id',
            count: 1,
            profitLoss: 1,
            _id: 0
          }
        },
        { $sort: { period: 1 } }
      ]);

      // Calculate the average holding time
      const holdingTimeStats = await Trade.aggregate([
        {
          $match: {
            userId: userObjectId,
            entryDate: { $gte: startDate, $lte: endDate },
            exitDate: { $ne: null }
          }
        },
        {
          $project: {
            holdingTimeMs: { $subtract: ['$exitDate', '$entryDate'] },
            profitLoss: 1
          }
        },
        {
          $group: {
            _id: null,
            avgHoldingTimeMs: { $avg: '$holdingTimeMs' },
            winningTradesAvgTimeMs: {
              $avg: {
                $cond: [{ $gt: ['$profitLoss', 0] }, '$holdingTimeMs', null]
              }
            },
            losingTradesAvgTimeMs: {
              $avg: {
                $cond: [{ $lt: ['$profitLoss', 0] }, '$holdingTimeMs', null]
              }
            }
          }
        },
        {
          $project: {
            _id: 0,
            avgHoldingTimeMinutes: { $divide: ['$avgHoldingTimeMs', 60000] },
            winningTradesAvgTimeMinutes: { $divide: ['$winningTradesAvgTimeMs', 60000] },
            losingTradesAvgTimeMinutes: { $divide: ['$losingTradesAvgTimeMs', 60000] }
          }
        }
      ]);

      // Prepare statistics response
      const tradeStatsSummary: TradeStatsSummary = tradeStats.length > 0 ? tradeStats[0] : {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        breakEvenTrades: 0,
        totalProfitLoss: 0,
        avgProfitLoss: 0,
        avgWin: 0,
        avgLoss: 0,
        largestWin: 0,
        largestLoss: 0,
        winRate: 0,
        profitFactor: 0
      };

      const holdingTime: HoldingTimeStats = holdingTimeStats.length > 0 ? holdingTimeStats[0] : {
        avgHoldingTimeMinutes: 0,
        winningTradesAvgTimeMinutes: 0,
        losingTradesAvgTimeMinutes: 0
      };

      // Count total trades
      const totalTrades = tradeStatsSummary.totalTrades;

      // Calculate calculation time
      const calculationTime = Date.now() - startTime;

      // Create analysis object for storage
      const analysisData: PerformanceAnalysisData = {
        performance: tradeStatsSummary,
        tradesBySymbol,
        tradesByDayOfWeek,
        tradesByHourOfDay,
        holdingTime
      };

      // Save analysis to database
      const analysis = await Analysis.findOneAndUpdate(
        {
          userId: userObjectId,
          type: 'PERFORMANCE',
          period,
          startDate,
          endDate
        },
        {
          userId: userObjectId,
          type: 'PERFORMANCE',
          period,
          startDate,
          endDate,
          data: analysisData,
          isActive: true,
          metadata: {
            dataPoints: totalTrades,
            calculationTime,
            version: '1.0'
          }
        },
        { new: true, upsert: true }
      );

      // Update cache
      const cacheKey = AnalysisCache.getCacheKey(userId, AnalysisType.PERFORMANCE, period, startDate, endDate);
      AnalysisCache.set(cacheKey, analysis);

      logger.info(`Generated performance analysis for user ${userId}, period: ${JSON.stringify(period)}, trades: ${totalTrades}`);

      return analysis;
    } catch (error) {
      logger.error(`Error generating performance analysis for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Generate pattern analysis to identify trading patterns
   */
  public static async generatePatternAnalysis(
    userId: string,
    period: IAnalysis['period'],
    startDate: Date,
    endDate: Date,
    queryOptions: Record<string, any> = {}
  ): Promise<IAnalysis> {
    try {
      const startTime = Date.now();
      
      // Convert userId to ObjectId
      const userObjectId = new Types.ObjectId(userId);
      
      // Prepare the query
      const matchQuery: any = {
        userId: userObjectId,
        entryDate: { $gte: startDate, $lte: endDate },
        exitDate: { $ne: null }
      };
      
      // Add any additional query parameters
      Object.entries(queryOptions).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === 'accountId' && value) {
            matchQuery.accountId = new Types.ObjectId(value);
          } else {
            matchQuery[key] = value;
          }
        }
      });
      
      // Get trades for pattern analysis
      const trades = await Trade.find(matchQuery).sort({ entryDate: 1 }).lean();
      
      // Get journal entries for the period
      const journalEntries = await JournalEntry.find({
        userId: userObjectId,
        date: { $gte: startDate, $lte: endDate }
      }).lean();

      // Identify consecutive win/loss streaks
      const streaks: TradeStreak[] = [];
      let currentStreak: TradeStreak = { type: '', count: 0, totalProfitLoss: 0, trades: [] };
      
      for (const trade of trades) {
        // Use type assertion to access properties from lean() documents
        const typedTrade = trade as any;
        const profitLoss = typedTrade.profitLoss || 0;
        const tradeType = profitLoss > 0 ? 'win' : profitLoss < 0 ? 'loss' : 'breakeven';
        
        if (currentStreak.type === '') {
          currentStreak.type = tradeType;
          currentStreak.count = 1;
          currentStreak.totalProfitLoss = profitLoss;
          currentStreak.trades = [{ 
            id: new Types.ObjectId(typedTrade._id),
            symbol: typedTrade.symbol,
            profitLoss: typedTrade.profitLoss,
            entryDate: typedTrade.entryDate,
            exitDate: typedTrade.exitDate
          }];
        } else if (currentStreak.type === tradeType) {
          currentStreak.count++;
          currentStreak.totalProfitLoss += profitLoss;
          currentStreak.trades.push({ 
            id: new Types.ObjectId(typedTrade._id),
            symbol: typedTrade.symbol,
            profitLoss: typedTrade.profitLoss,
            entryDate: typedTrade.entryDate,
            exitDate: typedTrade.exitDate
          });
        } else {
          if (currentStreak.count >= 3) { // Only record significant streaks
            streaks.push({ ...currentStreak });
          }
          currentStreak = { 
            type: tradeType,
            count: 1,
            totalProfitLoss: profitLoss,
            trades: [{ 
              id: new Types.ObjectId(typedTrade._id),
              symbol: typedTrade.symbol,
              profitLoss: typedTrade.profitLoss,
              entryDate: typedTrade.entryDate,
              exitDate: typedTrade.exitDate
            }]
          };
        }
      }
      
      // Add the last streak if significant
      if (currentStreak.count >= 3) {
        streaks.push({ ...currentStreak });
      }

      // Analyze trade size correlation with success
      const tradeSizeAnalysis = await Trade.aggregate([
        {
          $match: {
            userId: userObjectId,
            entryDate: { $gte: startDate, $lte: endDate },
            exitDate: { $ne: null }
          }
        },
        {
          $project: {
            size: { $abs: '$size' },
            isWin: { $cond: [{ $gt: ['$profitLoss', 0] }, true, false] }
          }
        },
        {
          $bucket: {
            groupBy: '$size',
            boundaries: [0, 100, 500, 1000, 5000, 10000, 50000, 100000],
            default: 'large',
            output: {
              count: { $sum: 1 },
              wins: { $sum: { $cond: ['$isWin', 1, 0] } },
              losses: { $sum: { $cond: ['$isWin', 0, 1] } }
            }
          }
        },
        {
          $project: {
            sizeRange: '$_id',
            count: 1,
            wins: 1,
            losses: 1,
            winRate: {
              $cond: [
                { $eq: ['$count', 0] },
                0,
                { $multiply: [{ $divide: ['$wins', '$count'] }, 100] }
              ]
            },
            _id: 0
          }
        }
      ]);

      // Find common mistakes from journal entries
      const commonMistakes: Record<string, number> = {};
      const commonLessons: Record<string, number> = {};
      
      journalEntries.forEach(entry => {
        // Use type assertion to access properties from lean() documents
        const typedEntry = entry as any;
        if (typedEntry.mistakes && Array.isArray(typedEntry.mistakes)) {
          typedEntry.mistakes.forEach((mistake: string) => {
            if (mistake) {
              commonMistakes[mistake] = (commonMistakes[mistake] || 0) + 1;
            }
          });
        }
        
        if (typedEntry.lessons && Array.isArray(typedEntry.lessons)) {
          typedEntry.lessons.forEach((lesson: string) => {
            if (lesson) {
              commonLessons[lesson] = (commonLessons[lesson] || 0) + 1;
            }
          });
        }
      });

      // Sort mistakes and lessons by frequency
      const topMistakes: MistakeOrLesson[] = Object.entries(commonMistakes)
        .map(([mistake, count]) => ({ item: mistake, count }))
        .sort((a, b) => (b.count as number) - (a.count as number))
        .slice(0, 10);
        
      const topLessons: MistakeOrLesson[] = Object.entries(commonLessons)
        .map(([lesson, count]) => ({ item: lesson, count }))
        .sort((a, b) => (b.count as number) - (a.count as number))
        .slice(0, 10);

      // Calculate calculation time
      const calculationTime = Date.now() - startTime;

      // Create analysis object
      const analysisData: PatternAnalysisData = {
        streaks,
        tradeSizeAnalysis,
        topMistakes,
        topLessons,
        totalTrades: trades.length,
        totalJournalEntries: journalEntries.length
      };

      // Save analysis to database
      const analysis = await Analysis.findOneAndUpdate(
        {
          userId: userObjectId,
          type: 'PATTERN',
          period,
          startDate,
          endDate
        },
        {
          userId: userObjectId,
          type: 'PATTERN',
          period,
          startDate,
          endDate,
          data: analysisData,
          isActive: true,
          metadata: {
            dataPoints: trades.length,
            calculationTime,
            version: '1.0'
          }
        },
        { new: true, upsert: true }
      );

      // Update cache
      const cacheKey = AnalysisCache.getCacheKey(userId, AnalysisType.PATTERN, period, startDate, endDate);
      AnalysisCache.set(cacheKey, analysis);

      logger.info(`Generated pattern analysis for user ${userId}, period: ${JSON.stringify(period)}, trades: ${trades.length}`);

      return analysis;
    } catch (error) {
      logger.error(`Error generating pattern analysis for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get analysis by type and period, with caching
   */
  public static async getAnalysis(
    userId: string,
    type: AnalysisType,
    period: IAnalysis['period'],
    startDate?: Date,
    endDate?: Date
  ): Promise<IAnalysis | null> {
    try {
      // Check cache first
      const cacheKey = AnalysisCache.getCacheKey(userId, type, period, startDate, endDate);
      const cachedAnalysis = AnalysisCache.get(cacheKey);
      
      if (cachedAnalysis) {
        logger.debug(`Retrieved cached analysis for user ${userId}, type: ${type}, period: ${JSON.stringify(period)}`);
        return cachedAnalysis;
      }
      
      // If not in cache, get from database
      const query: any = {
        userId: new Types.ObjectId(userId),
        type,
        isActive: true
      };

      // Handle period as an object, not string
      if (period && typeof period === 'object') {
        query.period = period;
        if (startDate && endDate) {
          query.startDate = startDate;
          query.endDate = endDate;
        }
      }

      const analysis = await Analysis.findOne(query).sort({ createdAt: -1 });
      
      // Store in cache if found
      if (analysis) {
        AnalysisCache.set(cacheKey, analysis);
      }
      
      return analysis;
    } catch (error) {
      logger.error(`Error retrieving analysis for user ${userId}, type: ${type}, period: ${JSON.stringify(period)}:`, error);
      return null;
    }
  }

  /**
   * Schedule and run analysis for a specific user
   */
  public static async scheduleAnalysis(
    userId: string,
    analysisTypes: AnalysisType[] = [AnalysisType.PERFORMANCE, AnalysisType.PATTERN],
    period: IAnalysis['period'] = { start: new Date(new Date().setMonth(new Date().getMonth() - 1)), end: new Date() }
  ): Promise<void> {
    try {
      // Determine date range based on period
      const endDate = period && typeof period === 'object' && period.end ? period.end : new Date();
      let startDate: Date = period && typeof period === 'object' && period.start ? period.start : new Date();
      
      if (!(period && typeof period === 'object')) {
        // This is for backward compatibility with older code that might pass string periods
        switch (period) {
          case 'DAILY':
            startDate = new Date(endDate);
            startDate.setDate(endDate.getDate() - 1);
            break;
          case 'WEEKLY':
            startDate = new Date(endDate);
            startDate.setDate(endDate.getDate() - 7);
            break;
          case 'MONTHLY':
            startDate = new Date(endDate);
            startDate.setMonth(endDate.getMonth() - 1);
            break;
          case 'QUARTERLY':
            startDate = new Date(endDate);
            startDate.setMonth(endDate.getMonth() - 3);
            break;
          case 'YEARLY':
            startDate = new Date(endDate);
            startDate.setFullYear(endDate.getFullYear() - 1);
            break;
          default:
            startDate = new Date(endDate);
            startDate.setMonth(endDate.getMonth() - 1);
        }
      }
      
      logger.info(`Scheduling analysis for user ${userId}, types: ${analysisTypes.join(', ')}, period: ${JSON.stringify(period)}`);
      
      // Run each type of analysis
      for (const type of analysisTypes) {
        try {
          if (type === AnalysisType.PERFORMANCE) {
            await this.generatePerformanceAnalysis(userId, period, startDate, endDate);
          } else if (type === AnalysisType.PATTERN) {
            await this.generatePatternAnalysis(userId, period, startDate, endDate);
          } else if (type === AnalysisType.FORECAST) {
            // Placeholder for future forecast implementation
            logger.info(`Forecast analysis not yet implemented for user ${userId}`);
          }
          
          // Invalidate cache for this type and period
          AnalysisCache.invalidate(userId, type, period);
          
        } catch (error) {
          logger.error(`Error running ${type} analysis for user ${userId}, period: ${JSON.stringify(period)}:`, error);
          // Continue with other analyses even if one fails
        }
      }
      
      logger.info(`Completed scheduled analysis for user ${userId}, types: ${analysisTypes.join(', ')}, period: ${JSON.stringify(period)}`);
    } catch (error) {
      logger.error(`Error scheduling analysis for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete old analyses to keep database size in check
   */
  public static async purgeOldAnalyses(maxAgeInDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxAgeInDays);
      
      // Find old analyses to mark as inactive
      const result = await Analysis.updateMany(
        { 
          createdAt: { $lt: cutoffDate },
          isActive: true
        },
        {
          $set: { isActive: false }
        }
      );
      
      logger.info(`Purged ${result.modifiedCount} old analyses older than ${maxAgeInDays} days`);
      return result.modifiedCount;
    } catch (error) {
      logger.error('Error purging old analyses:', error);
      throw error;
    }
  }

  /**
   * Store analysis results in the database
   */
  public static async storeAnalysisResults(
    userId: string,
    type: AnalysisType,
    period: IAnalysis['period'],
    startDate: Date,
    endDate: Date,
    data: any,
    metadata?: Record<string, any>,
    accountId?: string
  ): Promise<void> {
    try {
      logger.info(`Storing ${type} analysis for user ${userId} (period from ${startDate.toISOString()} to ${endDate.toISOString()})`);
      
      // Create analysis record
      const analysisData: any = {
        userId: new Types.ObjectId(userId),
        type,
        period,
        data,
        status: 'COMPLETED' as const,
        metadata: {
          dataPoints: this.getDataPointCount(data),
          calculationTime: metadata?.calculationTime || 0,
          storedAt: new Date(),
          ...metadata
        }
      };
      
      if (accountId) {
        (analysisData as any).accountId = new Types.ObjectId(accountId);
      }
      
      await AnalysisRepository.create(analysisData);
      logger.info(`Successfully stored ${type} analysis for user ${userId}`);
    } catch (error) {
      logger.error(`Error storing analysis results for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve the latest analysis results from the database
   */
  public static async getLatestAnalysis(
    userId: string,
    type: AnalysisType,
    period: IAnalysis['period'] | AnalysisPeriod,
    maxAge: number = 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    accountId?: string
  ): Promise<any | null> {
    try {
      let periodObject: IAnalysis['period'];
      
      // Handle the case when period is a string (AnalysisPeriod)
      if (typeof period === 'string') {
        // Convert AnalysisPeriod to an object with start and end dates
        const now = new Date();
        const start = new Date();
        
        switch (period) {
          case AnalysisPeriod.DAILY:
            start.setDate(now.getDate() - 1);
            break;
          case AnalysisPeriod.WEEKLY:
            start.setDate(now.getDate() - 7);
            break;
          case AnalysisPeriod.MONTHLY:
            start.setMonth(now.getMonth() - 1);
            break;
          case AnalysisPeriod.QUARTERLY:
            start.setMonth(now.getMonth() - 3);
            break;
          case AnalysisPeriod.YEARLY:
            start.setFullYear(now.getFullYear() - 1);
            break;
          case AnalysisPeriod.CUSTOM:
          default:
            start.setMonth(now.getMonth() - 1); // Default to monthly if custom
            break;
        }
        
        periodObject = { start, end: now };
      } else {
        // If it's already an object with start and end, use it directly
        periodObject = period;
      }
      
      // Find the latest analysis of this type
      const latestAnalysis = await AnalysisRepository.findLatest(
        userId,
        type,
        periodObject,
        accountId
      );
      
      // If no analysis exists or it's expired, return null
      if (!latestAnalysis) {
        return null;
      }
      
      // Check if the analysis is too old
      const analysisAge = Date.now() - latestAnalysis.updatedAt.getTime();
      if (analysisAge > maxAge) {
        logger.info(`Found analysis for user ${userId} but it's too old (${analysisAge}ms > ${maxAge}ms)`);
        return null;
      }
      
      logger.info(`Retrieved cached ${type} analysis for user ${userId} (${period})`);
      return latestAnalysis.data;
    } catch (error) {
      logger.error(`Error retrieving latest analysis for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Get data point count from analysis data for metadata
   */
  private static getDataPointCount(data: any): number {
    if (!data) return 0;
    
    try {
      if (Array.isArray(data)) {
        return data.length;
      }
      
      if (data.trades) {
        return data.trades.length;
      }
      
      if (data.dataPoints) {
        return data.dataPoints;
      }
      
      // Handle dashboard data which has multiple sections
      if (data.basicStats || data.symbolStats) {
        let count = 0;
        
        if (data.basicStats) count += 1;
        if (data.symbolStats) count += Array.isArray(data.symbolStats) ? data.symbolStats.length : 1;
        if (data.timeOfDayStats) count += Array.isArray(data.timeOfDayStats) ? data.timeOfDayStats.length : 1;
        if (data.dayOfWeekStats) count += Array.isArray(data.dayOfWeekStats) ? data.dayOfWeekStats.length : 1;
        
        return count;
      }
      
      // Default to number of keys
      return Object.keys(data).length;
    } catch (error) {
      logger.warn('Error calculating data point count:', error);
      return 0;
    }
  }

  /**
   * Analyze trades for a user and create/update analysis record
   */
  public async analyzeTrades(userId: string): Promise<TradeAnalysis> {
    // Get user trades
    const trades = await Trade.find({ userId });
    
    // Calculate metrics
    const tradeCount = trades.length;
    let profitLoss = 0;
    let winCount = 0;
    let totalWins = 0;
    let totalLosses = 0;
    
    for (const trade of trades) {
      // Use proper type handling for Mongoose documents
      const typedTrade = trade as any;
      if (typedTrade.profitLoss) {
        profitLoss += typedTrade.profitLoss;
        
        if (typedTrade.profitLoss > 0) {
          winCount++;
          totalWins += typedTrade.profitLoss;
        } else if (typedTrade.profitLoss < 0) {
          totalLosses -= typedTrade.profitLoss;
        }
      }
    }
    
    // Calculate win rate and other metrics
    const winRate = tradeCount > 0 ? (winCount / tradeCount) * 100 : 0;
    const averageWin = winCount > 0 ? totalWins / winCount : 0;
    const lossCount = tradeCount - winCount;
    const averageLoss = lossCount > 0 ? totalLosses / lossCount : 0;
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;
    const riskRewardRatio = averageLoss > 0 ? averageWin / averageLoss : 0;
    
    // Create or update analysis record
    const existingAnalysis = await Analysis.findOne({ userId });
    
    if (existingAnalysis) {
      existingAnalysis.metrics = {
        riskRewardRatio,
        winRate,
        profitFactor,
        averageWin,
        averageLoss
      };
      await existingAnalysis.save();
    } else if (tradeCount > 0) {
      await Analysis.create({
        userId,
        tradeId: trades[0]._id,
        metrics: {
          riskRewardRatio,
          winRate,
          profitFactor,
          averageWin,
          averageLoss
        },
        period: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          end: new Date()
        }
      });
    }
    
    // Return analysis data
    return {
      userId,
      trades,
      tradeCount,
      profitLoss,
      winRate,
      averageWin,
      averageLoss,
      profitFactor,
      riskRewardRatio
    };
  }
  
  /**
   * Get trade analysis for a specific date range
   */
  public async getAnalysisByDateRange(
    userId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<TradeAnalysis> {
    // Validate date range
    if (startDate > endDate) {
      throw new Error('Invalid date range');
    }
    
    // Get trades within date range
    const trades = await Trade.find({
      userId,
      date: { $gte: startDate, $lte: endDate }
    });
    
    // Calculate metrics
    const tradeCount = trades.length;
    let profitLoss = 0;
    let winCount = 0;
    
    for (const trade of trades) {
      if (trade.profit) {
        profitLoss += trade.profit;
        if (trade.profit > 0) {
          winCount++;
        }
      }
    }
    
    const winRate = tradeCount > 0 ? (winCount / tradeCount) * 100 : 0;
    
    // Return analysis
    return {
      userId,
      trades,
      tradeCount,
      profitLoss,
      winRate
    };
  }
} 