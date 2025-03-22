import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Trade } from '../models/Trade';
import { JournalEntry } from '../models/JournalEntry';
import { Account } from '../models/Account';
import { z } from 'zod';
import { StatisticsService } from '../services/StatisticsService';
import { validateCustomDate } from '../validators/dateValidator';
import { logger } from '../utils/logger';

// Validation schema for date range
const dateRangeSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// Define mood type for type safety
type Mood = 'GREAT' | 'GOOD' | 'NEUTRAL' | 'BAD' | 'TERRIBLE';

// Interface for mood correlation data
interface MoodCorrelationData {
  date: string;
  mood: Mood;
  profitLoss: number;
  trades: number;
  winRate: number;
}

// Interface for mood correlation stats
interface MoodStats {
  totalDays: number;
  totalTrades: number;
  totalProfitLoss: number;
  avgWinRate: number;
  avgProfitLoss: number;
  winRates?: number[];  // Make winRates optional so it can be deleted
  examples: Array<{
    date: string;
    trades: number;
    profitLoss: number;
    winRate: number;
  }>;
}

// Type for mood correlation map
type MoodCorrelationMap = {
  [key in Mood]?: MoodStats;
};

/**
 * Get overall trading performance statistics
 */
export const getTradingPerformance = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Parse date range
    const { startDate, endDate } = dateRangeSchema.parse(req.query);
    
    const start = startDate 
      ? new Date(startDate) 
      : new Date(new Date().setFullYear(new Date().getFullYear() - 1)); // Default to 1 year ago
    
    const end = endDate 
      ? new Date(endDate) 
      : new Date(); // Default to today

    // Get trade statistics
    const tradeStats = await Trade.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          entryDate: { $gte: start, $lte: end },
          exitDate: { $ne: null } // Only completed trades
        }
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
          userId: new Types.ObjectId(userId),
          entryDate: { $gte: start, $lte: end },
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

    // Get trading journal mood statistics
    const journalMoodStats = await JournalEntry.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$mood',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          mood: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    // Calculate account balance changes
    const accountBalanceChanges = await Account.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          createdAt: { $lte: end }
        }
      },
      {
        $lookup: {
          from: 'transactions',
          let: { accountId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$accountId', '$$accountId'] },
                    { $gte: ['$date', start] },
                    { $lte: ['$date', end] }
                  ]
                }
              }
            }
          ],
          as: 'transactions'
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          initialBalance: 1,
          currentBalance: {
            $sum: [
              '$initialBalance',
              { $sum: '$transactions.amount' }
            ]
          },
          netChange: { $sum: '$transactions.amount' },
          transactions: { $size: '$transactions' }
        }
      }
    ]);

    // Prepare statistics response
    const tradeStatsSummary = tradeStats.length > 0 ? tradeStats[0] : {
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

    // Prepare mood distribution
    const moodDistribution = {
      GREAT: 0,
      GOOD: 0,
      NEUTRAL: 0,
      BAD: 0,
      TERRIBLE: 0,
      ...Object.fromEntries(journalMoodStats.map(stat => [stat.mood, stat.count]))
    };

    // Calculate account stats
    const accountStats = {
      totalAccounts: accountBalanceChanges.length,
      totalStartingBalance: accountBalanceChanges.reduce((sum, acc) => sum + acc.initialBalance, 0),
      totalCurrentBalance: accountBalanceChanges.reduce((sum, acc) => sum + acc.currentBalance, 0),
      totalNetChange: accountBalanceChanges.reduce((sum, acc) => sum + acc.netChange, 0),
      totalTransactions: accountBalanceChanges.reduce((sum, acc) => sum + acc.transactions, 0),
      accounts: accountBalanceChanges
    };

    res.json({
      dateRange: {
        startDate: start,
        endDate: end
      },
      tradePerformance: tradeStatsSummary,
      tradesBySymbol,
      journalMoodDistribution: moodDistribution,
      accountPerformance: accountStats
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    
    console.error('Error fetching trading performance:', error);
    res.status(500).json({ message: 'Error fetching trading performance' });
  }
};

/**
 * Get daily performance statistics
 */
export const getDailyPerformance = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Parse date range
    const { startDate, endDate } = dateRangeSchema.parse(req.query);
    
    const start = startDate 
      ? new Date(startDate) 
      : new Date(new Date().setMonth(new Date().getMonth() - 1)); // Default to 1 month ago
    
    const end = endDate 
      ? new Date(endDate) 
      : new Date(); // Default to today

    // Get daily trade performance
    const dailyTradeStats = await Trade.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          exitDate: {
            $gte: start,
            $lte: end,
            $ne: null // Only completed trades
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$exitDate' },
            month: { $month: '$exitDate' },
            day: { $dayOfMonth: '$exitDate' }
          },
          date: { $first: '$exitDate' },
          trades: { $sum: 1 },
          profitLoss: { $sum: '$profitLoss' },
          wins: {
            $sum: {
              $cond: [{ $gt: ['$profitLoss', 0] }, 1, 0]
            }
          },
          losses: {
            $sum: {
              $cond: [{ $lt: ['$profitLoss', 0] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$date'
            }
          },
          trades: 1,
          profitLoss: 1,
          wins: 1,
          losses: 1,
          winRate: {
            $cond: [
              { $eq: ['$trades', 0] },
              0,
              { $multiply: [{ $divide: ['$wins', '$trades'] }, 100] }
            ]
          }
        }
      },
      { $sort: { date: 1 } }
    ]);

    // Get journal entries by day
    const dailyJournalEntries = await JournalEntry.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          date: {
            $gte: start,
            $lte: end
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            day: { $dayOfMonth: '$date' }
          },
          date: { $first: '$date' },
          entries: { $sum: 1 },
          mood: { $first: '$mood' }
        }
      },
      {
        $project: {
          _id: 0,
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$date'
            }
          },
          entries: 1,
          mood: 1
        }
      },
      { $sort: { date: 1 } }
    ]);

    // Merge daily trade stats and journal entries
    const allDates = new Set([
      ...dailyTradeStats.map(stat => stat.date),
      ...dailyJournalEntries.map(entry => entry.date)
    ]);

    const dailyPerformance = Array.from(allDates).map(date => {
      const tradeStats = dailyTradeStats.find(stat => stat.date === date) || {
        trades: 0,
        profitLoss: 0,
        wins: 0,
        losses: 0,
        winRate: 0
      };
      
      const journalEntry = dailyJournalEntries.find(entry => entry.date === date) || {
        entries: 0,
        mood: null
      };

      return {
        date,
        trades: tradeStats.trades,
        profitLoss: tradeStats.profitLoss,
        wins: tradeStats.wins,
        losses: tradeStats.losses,
        winRate: tradeStats.winRate,
        journalEntries: journalEntry.entries,
        mood: journalEntry.mood
      };
    }).sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      dateRange: {
        startDate: start,
        endDate: end
      },
      dailyPerformance
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    
    console.error('Error fetching daily performance:', error);
    res.status(500).json({ message: 'Error fetching daily performance' });
  }
};

/**
 * Get correlation between journal mood and trading performance
 */
export const getMoodTradeCorrelation = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Parse date range
    const { startDate, endDate } = dateRangeSchema.parse(req.query);
    
    const start = startDate 
      ? new Date(startDate) 
      : new Date(new Date().setFullYear(new Date().getFullYear() - 1)); // Default to 1 year ago
    
    const end = endDate 
      ? new Date(endDate) 
      : new Date(); // Default to today

    // Get journal entries with dates
    const journalEntries = await JournalEntry.find({
      userId: new Types.ObjectId(userId),
      date: { $gte: start, $lte: end }
    }).select('date mood').lean();

    // Get trades from dates with journal entries
    const journalDates = journalEntries.map(entry => {
      const date = new Date(entry.date);
      return {
        year: date.getFullYear(),
        month: date.getMonth(),
        day: date.getDate(),
        mood: entry.mood as Mood
      };
    });

    // Group trades by day and calculate performance
    const tradePerformanceByDay = await Trade.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          exitDate: { $gte: start, $lte: end, $ne: null }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$exitDate' },
            month: { $month: '$exitDate' },
            day: { $dayOfMonth: '$exitDate' }
          },
          profitLoss: { $sum: '$profitLoss' },
          trades: { $sum: 1 },
          wins: {
            $sum: {
              $cond: [{ $gt: ['$profitLoss', 0] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          profitLoss: 1,
          trades: 1,
          wins: 1,
          winRate: {
            $cond: [
              { $eq: ['$trades', 0] },
              0,
              { $multiply: [{ $divide: ['$wins', '$trades'] }, 100] }
            ]
          }
        }
      }
    ]);

    // Merge journal mood with trade performance
    const correlationData: MoodCorrelationData[] = journalDates.map(journalDate => {
      const matchingTrade = tradePerformanceByDay.find(trade => 
        trade.date.year === journalDate.year &&
        trade.date.month === journalDate.month &&
        trade.date.day === journalDate.day
      );

      if (!matchingTrade) return null;

      return {
        date: `${journalDate.year}-${journalDate.month + 1}-${journalDate.day}`,
        mood: journalDate.mood,
        profitLoss: matchingTrade.profitLoss,
        trades: matchingTrade.trades,
        winRate: matchingTrade.winRate
      };
    }).filter(Boolean) as MoodCorrelationData[];

    // Group by mood and calculate average performance
    const moodCorrelation: MoodCorrelationMap = {};
    
    correlationData.forEach(data => {
      if (!moodCorrelation[data.mood]) {
        moodCorrelation[data.mood] = {
          totalDays: 0,
          totalTrades: 0,
          totalProfitLoss: 0,
          avgWinRate: 0,
          avgProfitLoss: 0,
          winRates: [],
          examples: []
        };
      }
      
      moodCorrelation[data.mood]!.totalDays++;
      moodCorrelation[data.mood]!.totalTrades += data.trades;
      moodCorrelation[data.mood]!.totalProfitLoss += data.profitLoss;
      
      // Keep track of all win rates to calculate average later
      moodCorrelation[data.mood]!.winRates?.push(data.winRate);
      
      // Add to examples (limited to 5)
      if (moodCorrelation[data.mood]!.examples.length < 5) {
        moodCorrelation[data.mood]!.examples.push({
          date: data.date,
          trades: data.trades,
          profitLoss: data.profitLoss,
          winRate: data.winRate
        });
      }
    });
    
    // Calculate averages for each mood
    Object.keys(moodCorrelation).forEach(mood => {
      const moodData = moodCorrelation[mood as Mood]!;
      const winRates = moodData.winRates || [];
      moodData.avgWinRate = winRates.reduce((sum: number, rate: number) => sum + rate, 0) / winRates.length || 0;
      moodData.avgProfitLoss = moodData.totalProfitLoss / moodData.totalDays;
      delete moodData.winRates; // Remove the working array
    });

    res.json({
      dateRange: {
        startDate: start,
        endDate: end
      },
      totalCorrelationPoints: correlationData.length,
      correlationByMood: moodCorrelation,
      detailedData: correlationData
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    
    console.error('Error analyzing mood-trade correlation:', error);
    res.status(500).json({ message: 'Error analyzing mood-trade correlation' });
  }
};

/**
 * Get basic trade statistics
 */
export async function getTradeStats(req: Request, res: Response): Promise<Response> {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Parse date parameters
    const { startDate, endDate, accountId } = req.query;
    
    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start and end dates are required' });
    }
    
    const dateValidation = validateCustomDate(startDate.toString(), endDate.toString());
    if (!dateValidation.success) {
      return res.status(400).json({ message: dateValidation.error });
    }

    // Calculate statistics
    const stats = await StatisticsService.calculateTradeStats(
      userId,
      new Date(startDate.toString()),
      new Date(endDate.toString()),
      accountId?.toString()
    );

    return res.json(stats);
  } catch (error) {
    logger.error('Error in getTradeStats:', error);
    return res.status(500).json({ message: 'Error retrieving trade statistics' });
  }
}

/**
 * Get symbol performance analysis
 */
export async function getSymbolPerformance(req: Request, res: Response): Promise<Response> {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Parse date parameters
    const { startDate, endDate, accountId } = req.query;
    
    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start and end dates are required' });
    }
    
    const dateValidation = validateCustomDate(startDate.toString(), endDate.toString());
    if (!dateValidation.success) {
      return res.status(400).json({ message: dateValidation.error });
    }

    // Calculate symbol performance
    const symbolStats = await StatisticsService.analyzeSymbolPerformance(
      userId,
      new Date(startDate.toString()),
      new Date(endDate.toString()),
      accountId?.toString()
    );

    return res.json(symbolStats);
  } catch (error) {
    logger.error('Error in getSymbolPerformance:', error);
    return res.status(500).json({ message: 'Error retrieving symbol performance' });
  }
}

/**
 * Get time-based analysis (time of day)
 */
export async function getTimeOfDayAnalysis(req: Request, res: Response): Promise<Response> {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Parse date parameters
    const { startDate, endDate, accountId } = req.query;
    
    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start and end dates are required' });
    }
    
    const dateValidation = validateCustomDate(startDate.toString(), endDate.toString());
    if (!dateValidation.success) {
      return res.status(400).json({ message: dateValidation.error });
    }

    // Calculate time of day performance
    const timeStats = await StatisticsService.analyzeTimeOfDay(
      userId,
      new Date(startDate.toString()),
      new Date(endDate.toString()),
      accountId?.toString()
    );

    return res.json(timeStats);
  } catch (error) {
    logger.error('Error in getTimeOfDayAnalysis:', error);
    return res.status(500).json({ message: 'Error retrieving time analysis' });
  }
}

/**
 * Get day of week analysis
 */
export async function getDayOfWeekAnalysis(req: Request, res: Response): Promise<Response> {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Parse date parameters
    const { startDate, endDate, accountId } = req.query;
    
    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start and end dates are required' });
    }
    
    const dateValidation = validateCustomDate(startDate.toString(), endDate.toString());
    if (!dateValidation.success) {
      return res.status(400).json({ message: dateValidation.error });
    }

    // Calculate day of week performance
    const dowStats = await StatisticsService.analyzeDayOfWeek(
      userId,
      new Date(startDate.toString()),
      new Date(endDate.toString()),
      accountId?.toString()
    );

    return res.json(dowStats);
  } catch (error) {
    logger.error('Error in getDayOfWeekAnalysis:', error);
    return res.status(500).json({ message: 'Error retrieving day of week analysis' });
  }
}

/**
 * Get risk metrics analysis
 */
export async function getRiskMetrics(req: Request, res: Response): Promise<Response> {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Parse date parameters
    const { startDate, endDate, accountId } = req.query;
    
    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start and end dates are required' });
    }
    
    const dateValidation = validateCustomDate(startDate.toString(), endDate.toString());
    if (!dateValidation.success) {
      return res.status(400).json({ message: dateValidation.error });
    }

    // Calculate risk metrics
    const riskStats = await StatisticsService.calculateRiskMetrics(
      userId,
      new Date(startDate.toString()),
      new Date(endDate.toString()),
      accountId?.toString()
    );

    return res.json(riskStats);
  } catch (error) {
    logger.error('Error in getRiskMetrics:', error);
    return res.status(500).json({ message: 'Error retrieving risk metrics' });
  }
}

/**
 * Get journal correlation analysis
 */
export async function getJournalCorrelation(req: Request, res: Response): Promise<Response> {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Parse date parameters
    const { startDate, endDate } = req.query;
    
    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start and end dates are required' });
    }
    
    const dateValidation = validateCustomDate(startDate.toString(), endDate.toString());
    if (!dateValidation.success) {
      return res.status(400).json({ message: dateValidation.error });
    }

    // Calculate journal correlation
    const correlationStats = await StatisticsService.analyzeJournalCorrelation(
      userId,
      new Date(startDate.toString()),
      new Date(endDate.toString())
    );

    return res.json(correlationStats);
  } catch (error) {
    logger.error('Error in getJournalCorrelation:', error);
    return res.status(500).json({ message: 'Error retrieving journal correlation analysis' });
  }
}

/**
 * Get all statistics in a single call (dashboard data)
 */
export async function getDashboardStats(req: Request, res: Response): Promise<Response> {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Parse date parameters
    const { startDate, endDate, accountId } = req.query;
    
    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start and end dates are required' });
    }
    
    const dateValidation = validateCustomDate(startDate.toString(), endDate.toString());
    if (!dateValidation.success) {
      return res.status(400).json({ message: dateValidation.error });
    }

    const start = new Date(startDate.toString());
    const end = new Date(endDate.toString());
    const account = accountId?.toString();

    // Run all statistics in parallel
    const [
      basicStats,
      symbolStats,
      timeOfDayStats,
      dayOfWeekStats,
      riskStats,
      journalStats
    ] = await Promise.all([
      StatisticsService.calculateTradeStats(userId, start, end, account),
      StatisticsService.analyzeSymbolPerformance(userId, start, end, account),
      StatisticsService.analyzeTimeOfDay(userId, start, end, account),
      StatisticsService.analyzeDayOfWeek(userId, start, end, account),
      StatisticsService.calculateRiskMetrics(userId, start, end, account),
      StatisticsService.analyzeJournalCorrelation(userId, start, end)
    ]);

    return res.json({
      basicStats,
      symbolStats,
      timeOfDayStats,
      dayOfWeekStats,
      riskStats,
      journalStats
    });
  } catch (error) {
    logger.error('Error in getDashboardStats:', error);
    return res.status(500).json({ message: 'Error retrieving dashboard statistics' });
  }
} 