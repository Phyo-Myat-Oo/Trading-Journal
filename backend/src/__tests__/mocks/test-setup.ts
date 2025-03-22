import mongoose, { Types } from 'mongoose';
import { mockTradeModel, mockAnalysisModel, mockJournalEntryModel, createMockQuery } from './mongoose-models';
import { mockAnalysisRepositoryImplementation } from './repository-mocks';
import { AnalysisRepository } from '../../repositories/AnalysisRepository';
import { AnalysisType, IAnalysis } from '../../models/Analysis';
import { ITrade } from '../../models/Trade';
import { IJournalEntry } from '../../models/JournalEntry';

/**
 * Setup function for initializing all mocks with sample data
 * This provides a one-line way to set up all the necessary mocks for tests
 */
export function setupTestMocks(options: {
  mockTrades?: any[],
  mockAnalysis?: any,
  mockJournalEntries?: any[]
} = {}) {
  // Reset all mocks
  jest.resetAllMocks();
  
  // Setup default mock data
  const userId = new Types.ObjectId();
  const mockTrades = options.mockTrades || [
    {
      _id: new Types.ObjectId(),
      userId,
      symbol: 'AAPL',
      entryDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      exitDate: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000),
      profitLoss: 100,
      entryPrice: 150,
      exitPrice: 160,
      size: 10,
      fees: 5
    },
    {
      _id: new Types.ObjectId(),
      userId,
      symbol: 'MSFT',
      entryDate: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
      exitDate: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000),
      profitLoss: -50,
      entryPrice: 300,
      exitPrice: 295,
      size: 10,
      fees: 5
    }
  ];
  
  const mockJournalEntries = options.mockJournalEntries || [
    {
      _id: new Types.ObjectId(),
      userId,
      date: new Date(),
      mood: 'Positive',
      content: 'Great trading day',
      tags: ['discipline', 'patience']
    }
  ];
  
  const mockAnalysis = options.mockAnalysis || {
    _id: new Types.ObjectId(),
    userId,
    type: AnalysisType.PERFORMANCE,
    status: 'COMPLETED',
    data: {
      performance: {
        totalTrades: 10,
        winningTrades: 6,
        losingTrades: 4,
        winRate: 0.6
      }
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  // Configure Trade model mocks
  mockTradeModel.find.mockImplementation((_query) => 
    createMockQuery<ITrade[]>(mockTrades)
  );
  
  mockTradeModel.aggregate.mockResolvedValue([
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
  ]);
  
  // Configure JournalEntry model mocks
  mockJournalEntryModel.find.mockImplementation((_query) => 
    createMockQuery<IJournalEntry[]>(mockJournalEntries)
  );
  
  // Configure Analysis model mocks
  mockAnalysisModel.findOneAndUpdate.mockResolvedValue(mockAnalysis);
  mockAnalysisModel.find.mockImplementation((_query) => 
    createMockQuery<IAnalysis[]>([mockAnalysis])
  );
  
  // Setup Analysis Repository mock implementation
  Object.keys(mockAnalysisRepositoryImplementation).forEach(key => {
    // @ts-expect-error - We know these properties exist
    AnalysisRepository[key] = mockAnalysisRepositoryImplementation[key];
  });
  
  return {
    mockTrades,
    mockJournalEntries,
    mockAnalysis,
    userId,
    models: {
      Trade: mockTradeModel,
      JournalEntry: mockJournalEntryModel,
      Analysis: mockAnalysisModel
    },
    repositories: {
      analysisRepo: mockAnalysisRepositoryImplementation
    }
  };
}

/**
 * Helper to create mock ObjectIds for testing
 */
export function createObjectId() {
  return new mongoose.Types.ObjectId();
}

/**
 * Helper to create a date in the past
 */
export function createPastDate(daysAgo: number) {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
} 