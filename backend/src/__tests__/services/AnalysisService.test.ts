import mongoose from 'mongoose';
import { AnalysisService } from '../../services/AnalysisService';
import { AnalysisRepository } from '../../repositories/AnalysisRepository';
import { AnalysisType, AnalysisPeriod } from '../../models/Analysis';
import { Trade } from '../../models/Trade';
import { JournalEntry } from '../../models/JournalEntry';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { 
  createMockAnalysisRepository, 
  createChainableQueryMock 
} from '../mocks/repositoryMocks';

// Mock the models and repositories
jest.mock('../../models/Trade');
jest.mock('../../models/JournalEntry');
jest.mock('../../models/Analysis');
jest.mock('../../repositories/AnalysisRepository');

describe('AnalysisService', () => {
  const mockUserId = new mongoose.Types.ObjectId().toString();
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const endDate = new Date();
  // Create a standard period object to use in tests
  const periodObj = { start: startDate, end: endDate };
  
  // Sample trade data for testing
  const mockTrades = [
    {
      _id: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(mockUserId),
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
      _id: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(mockUserId),
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
  
  // Sample analysis data for mocking
  const mockAnalysis = {
    _id: new mongoose.Types.ObjectId(),
    userId: new mongoose.Types.ObjectId(mockUserId),
    type: AnalysisType.PERFORMANCE,
    period: periodObj,
    status: 'COMPLETED',
    data: {
      performance: {
        totalTrades: 10,
        winningTrades: 6,
        losingTrades: 4,
        winRate: 60
      }
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: { calculationTime: 150 }
  };
  
  // Use our mock factory to create a typed repository mock
  let mockAnalysisRepo: ReturnType<typeof createMockAnalysisRepository>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create fresh repository mock using our factory
    mockAnalysisRepo = createMockAnalysisRepository();
    
    // Set up repository method mocks with type assertions to avoid errors
    mockAnalysisRepo.findByUser.mockResolvedValue([mockAnalysis] as any);
    mockAnalysisRepo.findById.mockResolvedValue(mockAnalysis as any);
    mockAnalysisRepo.findByPeriod.mockResolvedValue(mockAnalysis as any);
    mockAnalysisRepo.findLatestByType.mockResolvedValue(mockAnalysis as any);
    mockAnalysisRepo.create.mockResolvedValue({
      _id: new mongoose.Types.ObjectId()
    } as any);
    mockAnalysisRepo.deleteOlderThan.mockResolvedValue(5);
    
    // Assign our mock to the actual repository
    Object.assign(AnalysisRepository, mockAnalysisRepo);
    
    // Set up Trade.aggregate with type assertion
    (Trade.aggregate as jest.Mock).mockResolvedValue([
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
    ] as any);
    
    // Set up proper chainable mock for Trade.find
    (Trade.find as jest.Mock).mockImplementation(() => 
      createChainableQueryMock(mockTrades)
    );
    
    // Set up chainable mock for JournalEntry.find
    (JournalEntry.find as jest.Mock).mockImplementation(() => 
      createChainableQueryMock([])
    );
  });
  
  afterEach(() => {
    jest.resetAllMocks();
  });
  
  describe('getAnalysis', () => {
    it('should retrieve analysis from the database', async () => {
      // Call getAnalysis with period object
      const result = await AnalysisService.getAnalysis(
        mockUserId,
        AnalysisType.PERFORMANCE,
        periodObj
      );
      
      // Assert repository method was called with correct params
      expect(AnalysisRepository.findByUser).toHaveBeenCalledWith(
        expect.any(mongoose.Types.ObjectId),
        expect.objectContaining({
          type: AnalysisType.PERFORMANCE
        })
      );
      
      // Assert result is not null
      expect(result).not.toBeNull();
      expect(result).toEqual(mockAnalysis);
    });
    
    it('should handle custom date ranges', async () => {
      // Call with custom dates
      await AnalysisService.getAnalysis(
        mockUserId,
        AnalysisType.PERFORMANCE,
        periodObj,
        startDate,
        endDate
      );
      
      // Check that the correct method was called with custom date params
      expect(AnalysisRepository.findByPeriod).toHaveBeenCalledWith(
        expect.any(mongoose.Types.ObjectId),
        AnalysisType.PERFORMANCE,
        startDate,
        endDate
      );
    });
    
    it('should return null when no analysis is found', async () => {
      // Mock to return null
      mockAnalysisRepo.findByUser.mockResolvedValue(null as any);
      mockAnalysisRepo.findByPeriod.mockResolvedValue(null as any);
      
      const result = await AnalysisService.getAnalysis(
        mockUserId,
        AnalysisType.PERFORMANCE,
        periodObj
      );
      
      expect(result).toBeNull();
    });
  });
  
  describe('getLatestAnalysis', () => {
    it('should retrieve the latest analysis for a user with period object', async () => {
      // Call getLatestAnalysis with period object
      const result = await AnalysisService.getLatestAnalysis(
        mockUserId,
        AnalysisType.PERFORMANCE,
        periodObj
      );
      
      // Assert repository method was called
      expect(AnalysisRepository.findLatestByType).toHaveBeenCalled();
      
      // Assert result contains expected properties
      expect(result).toHaveProperty('performance');
      expect(result.performance).toHaveProperty('totalTrades', 10);
      expect(result.performance).toHaveProperty('winRate', 60);
    });
    
    it('should retrieve the latest analysis with enum period', async () => {
      // Call with enum period
      const result = await AnalysisService.getLatestAnalysis(
        mockUserId,
        AnalysisType.PERFORMANCE,
        AnalysisPeriod.MONTHLY
      );
      
      // Assert repository method was called
      expect(AnalysisRepository.findLatestByType).toHaveBeenCalled();
      
      // Assert result contains expected properties
      expect(result).toHaveProperty('performance');
    });
    
    it('should generate new analysis when no recent one exists', async () => {
      // Mock repository to return null (no recent analysis)
      mockAnalysisRepo.findLatestByType.mockResolvedValue(null as any);
      
      // Mock the generate method
      jest.spyOn(AnalysisService, 'generatePerformanceAnalysis').mockResolvedValue(mockAnalysis as any);
      
      await AnalysisService.getLatestAnalysis(
        mockUserId,
        AnalysisType.PERFORMANCE,
        AnalysisPeriod.MONTHLY
      );
      
      // Verify generation was attempted
      expect(AnalysisService.generatePerformanceAnalysis).toHaveBeenCalled();
    });
  });
  
  describe('generatePerformanceAnalysis', () => {
    it('should generate performance analysis', async () => {
      // Mock the initializePending method
      mockAnalysisRepo.initializePending.mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        status: 'PENDING'
      } as any);
      
      // Call generatePerformanceAnalysis
      const result = await AnalysisService.generatePerformanceAnalysis(
        mockUserId,
        periodObj,
        startDate,
        endDate
      );
      
      // Assert aggregate was called
      expect(Trade.aggregate).toHaveBeenCalled();
      
      // Assert markCompleted was called
      expect(mockAnalysisRepo.markCompleted).toHaveBeenCalled();
      
      // Assert result has correct properties
      expect(result).toHaveProperty('type', AnalysisType.PERFORMANCE);
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('status', 'COMPLETED');
    });
    
    it('should handle errors during generation', async () => {
      // Mock to throw an error
      (Trade.aggregate as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      // Mock the initializePending method
      mockAnalysisRepo.initializePending.mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        status: 'PENDING'
      } as any);
      
      // Call method
      await expect(AnalysisService.generatePerformanceAnalysis(
        mockUserId,
        periodObj,
        startDate,
        endDate
      )).rejects.toThrow();
      
      // Verify markFailed was called
      expect(mockAnalysisRepo.markFailed).toHaveBeenCalled();
    });
  });
  
  describe('generatePatternAnalysis', () => {
    it('should generate pattern analysis', async () => {
      // Mock the initializePending method
      mockAnalysisRepo.initializePending.mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        status: 'PENDING'
      } as any);
      
      // Mock the find methods
      (Trade.find as jest.Mock).mockImplementation(() => 
        createChainableQueryMock(mockTrades)
      );
      
      (JournalEntry.find as jest.Mock).mockImplementation(() => 
        createChainableQueryMock([])
      );
      
      // Call method
      const result = await AnalysisService.generatePatternAnalysis(
        mockUserId,
        periodObj,
        startDate,
        endDate
      );
      
      // Assert the trades were fetched
      expect(Trade.find).toHaveBeenCalled();
      
      // Assert markCompleted was called
      expect(mockAnalysisRepo.markCompleted).toHaveBeenCalled();
      
      // Assert result
      expect(result).toHaveProperty('type', AnalysisType.PATTERN);
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('status', 'COMPLETED');
    });
  });
  
  describe('scheduleAnalysis', () => {
    it('should schedule analysis tasks with period object', async () => {
      // Spy on the generate methods
      jest.spyOn(AnalysisService, 'generatePerformanceAnalysis').mockResolvedValue(mockAnalysis as any);
      jest.spyOn(AnalysisService, 'generatePatternAnalysis').mockResolvedValue(mockAnalysis as any);
      
      // Call scheduleAnalysis
      await AnalysisService.scheduleAnalysis(
        mockUserId,
        [AnalysisType.PERFORMANCE, AnalysisType.PATTERN],
        periodObj
      );
      
      // Verify methods were called
      expect(AnalysisService.generatePerformanceAnalysis).toHaveBeenCalledWith(
        mockUserId,
        periodObj,
        periodObj.start,
        periodObj.end,
        {}
      );
      expect(AnalysisService.generatePatternAnalysis).toHaveBeenCalledWith(
        mockUserId,
        periodObj,
        periodObj.start,
        periodObj.end,
        {}
      );
    });
    
    it('should schedule analysis with default period if not provided', async () => {
      // Spy on the generate methods
      jest.spyOn(AnalysisService, 'generatePerformanceAnalysis').mockResolvedValue(mockAnalysis as any);
      
      // Call with just the required parameters
      await AnalysisService.scheduleAnalysis(
        mockUserId,
        [AnalysisType.PERFORMANCE]
      );
      
      // Verify method was called with default period
      expect(AnalysisService.generatePerformanceAnalysis).toHaveBeenCalled();
    });
  });
  
  describe('purgeOldAnalyses', () => {
    it('should purge old analyses', async () => {
      // Mock the repository method
      mockAnalysisRepo.deleteOlderThan.mockResolvedValue(5);
      
      const result = await AnalysisService.purgeOldAnalyses(90);
      
      // Verify method was called with correct params
      expect(mockAnalysisRepo.deleteOlderThan).toHaveBeenCalledWith(
        expect.any(Date),
        undefined
      );
      
      expect(result).toBe(5);
    });
  });
  
  describe('storeAnalysisResults', () => {
    it('should store analysis results in the database', async () => {
      // Sample analysis data
      const data = {
        performance: {
          totalTrades: 15,
          winningTrades: 9,
          losingTrades: 6,
          winRate: 60
        }
      };
      
      // Call storeAnalysisResults
      await AnalysisService.storeAnalysisResults(
        mockUserId,
        AnalysisType.PERFORMANCE,
        periodObj,
        startDate,
        endDate,
        data,
        { calculationTime: 150 }
      );
      
      // Verify create was called with correct params
      expect(mockAnalysisRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: expect.any(mongoose.Types.ObjectId),
          type: AnalysisType.PERFORMANCE,
          period: periodObj,
          data,
          metadata: { calculationTime: 150 }
        })
      );
    });
  });
}); 