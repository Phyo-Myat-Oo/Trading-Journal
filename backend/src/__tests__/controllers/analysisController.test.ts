// @ts-nocheck
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { 
  getAnalysis, 
  generateAnalysis, 
  triggerAnalysis,
  getAnalysisSummary,
  getUserAnalyses,
  getAnalysisById,
  scheduleAnalysis
} from '../../controllers/analysisController';
import { AnalysisService } from '../../services/AnalysisService';
import { AnalysisType, AnalysisPeriod, IAnalysis } from '../../models/Analysis';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AnalysisRepository } from '../../repositories/AnalysisRepository';
import { StatisticsService } from '../../services/StatisticsService';

// Create interface for request with user
interface RequestWithUser extends Request {
  user?: { id: string };
}

// Partial type for creating mocks without needing all document methods
type AnalysisMock = Partial<IAnalysis> & {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  tradeId: mongoose.Types.ObjectId;
  type: AnalysisType;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    riskRewardRatio: number;
    winRate: number;
    profitFactor: number;
    averageWin: number;
    averageLoss: number;
  };
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

// Mock factory function to create properly typed analysis objects
const createMockAnalysis = (overrides: Partial<AnalysisMock> = {}): IAnalysis => {
  const defaultMock: AnalysisMock = {
    _id: new mongoose.Types.ObjectId(),
    userId: new mongoose.Types.ObjectId(),
    tradeId: new mongoose.Types.ObjectId(),
    type: AnalysisType.PERFORMANCE,
    period: {
      start: new Date(),
      end: new Date()
    },
    metrics: {
      riskRewardRatio: 1,
      winRate: 50,
      profitFactor: 1.5,
      averageWin: 100,
      averageLoss: -50
    },
    data: {},
    status: 'COMPLETED',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: { calculationTime: 150 },
    ...overrides
  };
  
  return defaultMock as unknown as IAnalysis;
};

// Mock the repositories and services
jest.mock('../../services/AnalysisService');
jest.mock('../../repositories/AnalysisRepository', () => ({
  AnalysisRepository: {
    findByUser: jest.fn(),
    findById: jest.fn(),
    initializePending: jest.fn(),
    markCompleted: jest.fn(),
    markFailed: jest.fn(),
    delete: jest.fn()
  }
}));

describe('Analysis Controller', () => {
  let mockRequest: Partial<RequestWithUser>;
  let mockResponse: Partial<Response>;
  let mockUser: { id: string };
  let mockAnalysis: IAnalysis;

  beforeEach(() => {
    mockUser = { id: new mongoose.Types.ObjectId().toString() };
    mockAnalysis = createMockAnalysis();

    mockRequest = {
      user: mockUser,
      params: {},
      query: {},
      body: {}
    } as Partial<RequestWithUser>;

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as Partial<Response>;

    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock implementations with proper type casts
    (AnalysisRepository.findByUser as jest.Mock).mockResolvedValue([mockAnalysis]);
    (AnalysisRepository.findById as jest.Mock).mockResolvedValue(mockAnalysis);
    (AnalysisRepository.initializePending as jest.Mock).mockImplementation(
      (analysis) => Promise.resolve(createMockAnalysis({ ...analysis }))
    );
    (AnalysisRepository.markCompleted as jest.Mock).mockImplementation(
      (id, data) => Promise.resolve(createMockAnalysis({ _id: id, ...data }))
    );
    (AnalysisRepository.markFailed as jest.Mock).mockImplementation(
      (id, error) => Promise.resolve(createMockAnalysis({ _id: id, status: 'FAILED', error }))
    );
    (AnalysisRepository.delete as jest.Mock).mockResolvedValue(true);
  });

  describe('getAnalysis', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;
      await getAnalysis(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'User not authenticated' });
    });

    it('should return 400 if type is invalid', async () => {
      mockRequest.params = { type: 'INVALID', period: 'DAILY' };
      await getAnalysis(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Invalid analysis type' });
    });

    it('should return 400 if period is invalid', async () => {
      mockRequest.params = { type: 'PERFORMANCE', period: 'INVALID' };
      await getAnalysis(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Invalid period' });
    });

    it('should return analysis when found', async () => {
      mockRequest.params = { type: 'PERFORMANCE', period: 'DAILY' };
      const testAnalysis = createMockAnalysis();
      jest.spyOn(AnalysisService, 'getAnalysis').mockResolvedValue(testAnalysis);

      await getAnalysis(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.json).toHaveBeenCalledWith(testAnalysis);
    });
  });

  describe('generateAnalysis', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;
      await generateAnalysis(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'User not authenticated' });
    });

    it('should return 400 if type is invalid', async () => {
      mockRequest.body = { type: 'INVALID', period: 'DAILY' };
      await generateAnalysis(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Invalid analysis type' });
    });

    it('should generate analysis successfully', async () => {
      mockRequest.body = { 
        type: 'PERFORMANCE', 
        period: 'DAILY',
        start: new Date().toISOString(),
        end: new Date().toISOString()
      };
      const testAnalysis = createMockAnalysis();
      jest.spyOn(AnalysisService, 'generatePerformanceAnalysis').mockResolvedValue(testAnalysis);

      await generateAnalysis(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(testAnalysis);
    });
  });

  describe('triggerAnalysis', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;
      await triggerAnalysis(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'User not authenticated' });
    });

    it('should schedule analysis successfully', async () => {
      mockRequest.body = {
        types: [AnalysisType.PERFORMANCE],
        period: AnalysisPeriod.DAILY
      };
      jest.spyOn(AnalysisService, 'scheduleAnalysis').mockResolvedValue(undefined);

      await triggerAnalysis(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Analysis generation scheduled successfully'
      });
    });

    it('should handle validation errors', async () => {
      mockRequest.body = {
        types: ['INVALID'],
        period: 'INVALID'
      };

      await triggerAnalysis(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getAnalysisSummary', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;
      await getAnalysisSummary(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'User not authenticated' });
    });

    it('should return analysis summary', async () => {
      const mockAnalyses = [createMockAnalysis()];
      jest.spyOn(AnalysisRepository, 'findByUser').mockResolvedValue(mockAnalyses);

      await getAnalysisSummary(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe('getUserAnalyses', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;
      await getUserAnalyses(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'User not authenticated' });
    });

    it('should return user analyses with filters', async () => {
      mockRequest.query = {
        type: AnalysisType.PERFORMANCE,
        period: AnalysisPeriod.DAILY,
        limit: '10',
        offset: '0'
      };
      const mockAnalyses = [createMockAnalysis()];
      jest.spyOn(AnalysisRepository, 'findByUser').mockResolvedValue(mockAnalyses);

      await getUserAnalyses(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.json).toHaveBeenCalledWith({
        total: 1,
        analyses: expect.any(Array)
      });
    });
  });

  describe('getAnalysisById', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;
      await getAnalysisById(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'User not authenticated' });
    });

    it('should return 404 if analysis not found', async () => {
      mockRequest.params = { id: new mongoose.Types.ObjectId().toString() };
      jest.spyOn(AnalysisRepository, 'findById').mockResolvedValue(null);

      await getAnalysisById(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Analysis not found' });
    });

    it('should return 403 if user does not own analysis', async () => {
      const analysisId = new mongoose.Types.ObjectId().toString();
      mockRequest.params = { id: analysisId };
      jest.spyOn(AnalysisRepository, 'findById').mockResolvedValue(
        createMockAnalysis({ 
          userId: new mongoose.Types.ObjectId() // Different user ID
        })
      );

      await getAnalysisById(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Unauthorized access to this analysis' });
    });

    it('should return analysis if found and owned by user', async () => {
      const analysisId = new mongoose.Types.ObjectId().toString();
      mockRequest.params = { id: analysisId };
      const testAnalysis = createMockAnalysis({
        userId: new mongoose.Types.ObjectId(mockUser.id)
      });
      jest.spyOn(AnalysisRepository, 'findById').mockResolvedValue(testAnalysis);

      await getAnalysisById(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.json).toHaveBeenCalledWith(testAnalysis);
    });
  });

  describe('scheduleAnalysis', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;
      await scheduleAnalysis(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'User not authenticated' });
    });

    it('should return 400 if required fields are missing', async () => {
      mockRequest.body = {};
      await scheduleAnalysis(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ 
        message: 'Missing required fields: type, period, startDate, and endDate are required' 
      });
    });

    it('should schedule analysis successfully', async () => {
      const now = new Date();
      mockRequest.body = {
        type: AnalysisType.PERFORMANCE,
        period: AnalysisPeriod.DAILY,
        startDate: now.toISOString(),
        endDate: new Date(now.getTime() + 86400000).toISOString()
      };

      const mockPendingAnalysis = createMockAnalysis({
        status: 'PENDING'
      });
      
      // Mock the repository and service methods
      jest.spyOn(AnalysisRepository, 'initializePending').mockResolvedValue(mockPendingAnalysis);
      jest.spyOn(AnalysisService, 'generatePerformanceAnalysis').mockResolvedValue(
        createMockAnalysis({
          _id: mockPendingAnalysis._id,
          status: 'COMPLETED',
          data: { performance: {} }
        })
      );
      jest.spyOn(AnalysisRepository, 'markCompleted').mockResolvedValue(
        createMockAnalysis({
          _id: mockPendingAnalysis._id,
          status: 'COMPLETED',
          data: { performance: {} }
        })
      );
      
      // Mock the StatisticsService calculateTradeStats function
      const mockTradeStats = {
        totalTrades: 10,
        winningTrades: 6,
        losingTrades: 4,
        winRate: 60,
        profitFactor: 1.5
      };
      jest.spyOn(StatisticsService, 'calculateTradeStats').mockResolvedValue(mockTradeStats);

      await scheduleAnalysis(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Analysis completed successfully'
      }));
    });
  });
}); 