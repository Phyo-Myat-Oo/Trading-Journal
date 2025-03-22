import mongoose from 'mongoose';
import { StatisticsService } from '../../services/StatisticsService';
import { Trade } from '../../models/Trade';
import { JournalEntry } from '../../models/JournalEntry';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { setupTestMocks, createPastDate } from '../mocks/test-setup';
import { ITrade } from '../../models/Trade';
import { createMockQuery } from '../mocks/mongoose-models';

// Mock the mongoose models
jest.mock('../../models/Trade');
jest.mock('../../models/JournalEntry');

describe('StatisticsService', () => {
  // Test data
  const mockUserId = new mongoose.Types.ObjectId().toString();
  const startDate = createPastDate(30); // 30 days ago
  const endDate = new Date();
  
  // Create test setup
  let testSetup: ReturnType<typeof setupTestMocks>;
  
  beforeEach(() => {
    // Initialize mocks with test data
    testSetup = setupTestMocks({
      mockTrades: [
        {
          _id: new mongoose.Types.ObjectId(),
          userId: new mongoose.Types.ObjectId(mockUserId),
          symbol: 'AAPL',
          entryDate: createPastDate(20),
          exitDate: createPastDate(19),
          profitLoss: 100,
          entryPrice: 150,
          exitPrice: 160,
          size: 10,
          fees: 5
        },
        {
          _id: new mongoose.Types.ObjectId(),
          userId: new mongoose.Types.ObjectId(mockUserId),
          symbol: 'MSFT',
          entryDate: createPastDate(18),
          exitDate: createPastDate(17),
          profitLoss: -50,
          entryPrice: 300,
          exitPrice: 295,
          size: 10,
          fees: 5
        },
        {
          _id: new mongoose.Types.ObjectId(),
          userId: new mongoose.Types.ObjectId(mockUserId),
          symbol: 'AAPL',
          entryDate: createPastDate(15),
          exitDate: createPastDate(14),
          profitLoss: 200,
          entryPrice: 155,
          exitPrice: 175,
          size: 10,
          fees: 5
        }
      ],
      mockJournalEntries: [
        {
          _id: new mongoose.Types.ObjectId(),
          userId: new mongoose.Types.ObjectId(mockUserId),
          tradeId: new mongoose.Types.ObjectId(),
          date: createPastDate(19),
          mood: 'Positive',
          content: 'Great trade execution',
          tags: ['discipline', 'patience']
        },
        {
          _id: new mongoose.Types.ObjectId(),
          userId: new mongoose.Types.ObjectId(mockUserId),
          tradeId: new mongoose.Types.ObjectId(),
          date: createPastDate(17),
          mood: 'Negative',
          content: 'Got impatient and entered too early',
          tags: ['impatience', 'fomo']
        }
      ]
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('calculateTradeStats', () => {
    it('should calculate trade statistics for a user', async () => {
      const stats = await StatisticsService.calculateTradeStats(
        mockUserId,
        startDate,
        endDate
      );

      // Check that find was called with correct parameters
      expect(Trade.find).toHaveBeenCalledWith(expect.objectContaining({
        userId: expect.any(mongoose.Types.ObjectId),
        exitDate: expect.objectContaining({
          $exists: true,
          $ne: null,
          $gte: startDate,
          $lte: endDate
        })
      }));

      // Verify the calculated statistics
      expect(stats).toEqual(expect.objectContaining({
        totalTrades: 3,
        winningTrades: 2,
        losingTrades: 1,
        breakEvenTrades: 0,
        winRate: 2/3,
        totalNetProfit: 250
      }));
    });

    it('should return default values when no trades are found', async () => {
      // Override the mock to return empty array with proper typing
      testSetup.models.Trade.find.mockImplementation(() => 
        createMockQuery<ITrade[]>([])
      );

      const stats = await StatisticsService.calculateTradeStats(
        mockUserId,
        startDate,
        endDate
      );

      expect(stats).toEqual({
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        breakEvenTrades: 0,
        winRate: 0,
        profitFactor: 0,
        averageReturn: 0,
        averageWin: 0,
        averageLoss: 0,
        largestWin: 0,
        largestLoss: 0,
        totalNetProfit: 0,
        totalGrossProfit: 0,
        totalGrossLoss: 0,
        expectancy: 0,
        standardDeviation: 0,
        consecutiveWins: 0,
        consecutiveLosses: 0,
        averageTradeDuration: 0
      });
    });

    it('should filter trades by account ID when provided', async () => {
      const accountId = new mongoose.Types.ObjectId().toString();
      
      await StatisticsService.calculateTradeStats(
        mockUserId,
        startDate,
        endDate,
        accountId
      );

      expect(Trade.find).toHaveBeenCalledWith(expect.objectContaining({
        userId: expect.any(mongoose.Types.ObjectId),
        accountId: expect.any(mongoose.Types.ObjectId)
      }));
    });
  });

  describe('analyzeSymbolPerformance', () => {
    it('should analyze performance by symbol', async () => {
      // Mock the aggregate function with specific result
      testSetup.models.Trade.aggregate.mockResolvedValue([
        {
          _id: 'AAPL',
          totalTrades: 2,
          winningTrades: 2,
          losingTrades: 0,
          netProfit: 300,
          avgReturn: 150
        },
        {
          _id: 'MSFT',
          totalTrades: 1,
          winningTrades: 0,
          losingTrades: 1,
          netProfit: -50,
          avgReturn: -50
        }
      ] as unknown[]);

      const symbolPerformance = await StatisticsService.analyzeSymbolPerformance(
        mockUserId,
        startDate,
        endDate
      );

      expect(Trade.aggregate).toHaveBeenCalled();
      expect(symbolPerformance).toHaveLength(2);
      expect(symbolPerformance[0]).toEqual(expect.objectContaining({
        symbol: 'AAPL',
        totalTrades: 2,
        winRate: 1,
        netProfit: 300,
        averageReturn: 150,
        profitFactor: expect.any(Number)
      }));
    });
  });

  describe('analyzeTimeOfDay', () => {
    it('should analyze performance by hour of day', async () => {
      // Mock the aggregate function with time analysis result
      testSetup.models.Trade.aggregate.mockResolvedValue([
        {
          _id: 9, // 9 AM
          totalTrades: 2,
          profitLoss: 200,
          avgReturn: 100
        },
        {
          _id: 14, // 2 PM
          totalTrades: 1,
          profitLoss: -50,
          avgReturn: -50
        }
      ] as unknown[]);

      const timeOfDayAnalysis = await StatisticsService.analyzeTimeOfDay(
        mockUserId,
        startDate,
        endDate
      );

      expect(Trade.aggregate).toHaveBeenCalled();
      expect(timeOfDayAnalysis).toHaveLength(2);
      expect(timeOfDayAnalysis[0]).toEqual(expect.objectContaining({
        period: '9 AM',
        totalTrades: 2,
        netProfit: 200,
        averageReturn: 100
      }));
    });
  });

  describe('analyzeDayOfWeek', () => {
    it('should analyze performance by day of week', async () => {
      // Mock the aggregate function with day of week result
      testSetup.models.Trade.aggregate.mockResolvedValue([
        {
          _id: 1, // Monday
          totalTrades: 3,
          profitLoss: 150,
          avgReturn: 50
        },
        {
          _id: 5, // Friday
          totalTrades: 2,
          profitLoss: -80,
          avgReturn: -40
        }
      ] as unknown[]);

      const dayOfWeekAnalysis = await StatisticsService.analyzeDayOfWeek(
        mockUserId,
        startDate,
        endDate
      );

      expect(Trade.aggregate).toHaveBeenCalled();
      expect(dayOfWeekAnalysis).toHaveLength(2);
      expect(dayOfWeekAnalysis[0]).toEqual(expect.objectContaining({
        period: 'Monday',
        totalTrades: 3,
        netProfit: 150,
        averageReturn: 50
      }));
    });
  });

  describe('calculateRiskMetrics', () => {
    it('should calculate risk metrics', async () => {
      // Set up proper chain for Trade.find
      testSetup.models.Trade.find.mockImplementation(() => 
        createMockQuery<ITrade[]>(testSetup.mockTrades)
      );
      
      // Mock the aggregate function for daily returns
      testSetup.models.Trade.aggregate.mockResolvedValue([
        {
          _id: {
            year: 2023,
            month: 4,
            day: 1
          },
          profitLoss: 100
        },
        {
          _id: {
            year: 2023,
            month: 4,
            day: 2
          },
          profitLoss: -50
        }
      ] as unknown[]);

      const riskMetrics = await StatisticsService.calculateRiskMetrics(
        mockUserId,
        startDate,
        endDate
      );

      expect(Trade.aggregate).toHaveBeenCalled();
      expect(riskMetrics).toEqual(expect.objectContaining({
        maxDrawdown: expect.any(Number),
        maxDrawdownPercentage: expect.any(Number),
        sharpeRatio: expect.any(Number),
        sortinoRatio: expect.any(Number),
        profitToMaxDrawdownRatio: expect.any(Number),
        dailyReturns: expect.any(Array)
      }));
    });
  });

  describe('analyzeJournalCorrelation', () => {
    it('should analyze correlation between journal entries and trade performance', async () => {
      const correlation = await StatisticsService.analyzeJournalCorrelation(
        mockUserId,
        startDate,
        endDate
      );

      expect(Trade.find).toHaveBeenCalled();
      expect(JournalEntry.find).toHaveBeenCalled();
      expect(correlation).toEqual(expect.objectContaining({
        moodCorrelation: expect.any(Array),
        tagCorrelation: expect.any(Array)
      }));
    });
  });

  describe('calculateStandardDeviation', () => {
    it('should calculate standard deviation correctly', () => {
      const values = [100, -50, 200];
      const stdDev = StatisticsService['calculateStandardDeviation'](values);
      
      // Expected calculation: sqrt(((100-83.33)² + (-50-83.33)² + (200-83.33)²) / 3)
      expect(stdDev).toBeCloseTo(104.08, 2);
    });

    it('should return 0 for empty array', () => {
      const stdDev = StatisticsService['calculateStandardDeviation']([]);
      expect(stdDev).toBe(0);
    });

    it('should return 0 for single value array', () => {
      const stdDev = StatisticsService['calculateStandardDeviation']([100]);
      expect(stdDev).toBe(0);
    });
  });
}); 