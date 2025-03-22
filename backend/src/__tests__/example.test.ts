/**
 * Example test file showing how to use the type-safe mocking system
 * 
 * This is a template for creating new tests with proper type safety
 */

import mongoose from 'mongoose';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { setupTestMocks, createPastDate } from './mocks/test-setup';
import { StatisticsService } from '../services/StatisticsService';
import { createMockQuery } from './mocks/mongoose-models';
import { ITrade } from '../models/Trade';

// Mock the necessary models - make sure to do this OUTSIDE any describe blocks
jest.mock('../models/Trade');
jest.mock('../models/JournalEntry');

describe('Example Service Test', () => {
  // Create test IDs
  const mockUserId = new mongoose.Types.ObjectId().toString();
  const startDate = createPastDate(30); // 30 days ago
  const endDate = new Date();
  
  // Create test setup - this will be typed properly
  let testSetup: ReturnType<typeof setupTestMocks>;
  
  beforeEach(() => {
    // Initialize mocks with test data - you can pass custom data or use defaults
    testSetup = setupTestMocks({
      // Custom mock data for this test
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
        }
      ]
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Service Method Tests', () => {
    it('should calculate trade statistics for a user', async () => {
      // ARRANGE - override mock behavior for this specific test if needed
      testSetup.models.Trade.aggregate.mockResolvedValue([
        {
          _id: null,
          totalTrades: 10,
          winningTrades: 6,
          losingTrades: 4,
          totalProfitLoss: 500,
          avgProfitLoss: 50,
          avgWin: 100,
          avgLoss: -50,
          largestWin: 200,
          largestLoss: -100,
          winRate: 0.6,
          profitFactor: 2
        }
      ] as unknown[]);
      
      // ACT - call the service method
      const stats = await StatisticsService.calculateTradeStats(
        mockUserId,
        startDate,
        endDate
      );
      
      // ASSERT - verify the result and that the mocks were called correctly
      expect(testSetup.models.Trade.find).toHaveBeenCalledWith(expect.objectContaining({
        userId: expect.any(mongoose.Types.ObjectId)
      }));
      
      expect(stats).toEqual(expect.objectContaining({
        totalTrades: expect.any(Number),
        winningTrades: expect.any(Number),
        winRate: expect.any(Number)
      }));
    });
    
    it('should handle error cases properly', async () => {
      // ARRANGE - setup mocks to simulate an error
      testSetup.models.Trade.find.mockImplementation(() => {
        throw new Error('Database connection failed');
      });
      
      // ACT & ASSERT - verify that the error is handled
      await expect(async () => {
        await StatisticsService.calculateTradeStats(mockUserId, startDate, endDate);
      }).rejects.toThrow('Database connection failed');
    });
  });

  describe('Advanced Mocking Examples', () => {
    it('should mock chainable query methods', async () => {
      // For complex chainable queries, use the createMockQuery helper
      const mockTrades = [{ name: 'Test Object' }];
      const mockQuery = createMockQuery<ITrade[]>(mockTrades as unknown as ITrade[]);
      
      testSetup.models.Trade.find.mockReturnValue(mockQuery);
      
      // Now you can make assertions about how the chain was used
      await StatisticsService.calculateTradeStats(mockUserId, startDate, endDate);
      
      expect(mockQuery.sort).toHaveBeenCalled();
      expect(mockQuery.lean).toHaveBeenCalled();
    });

    it('should mock repository methods', async () => {
      // For repository methods, use the repository mocks
      testSetup.repositories.analysisRepo.findByUser.mockResolvedValue([
        {
          _id: new mongoose.Types.ObjectId(),
          userId: new mongoose.Types.ObjectId(mockUserId),
          type: 'PERFORMANCE',
          data: { metrics: { winRate: 0.65 } }
        }
      ]);
      
      // Now you can use the repository in your tests
      // const result = await AnalysisService.getAnalysis(...);
      // expect(result).toEqual(...);
    });
  });
}); 