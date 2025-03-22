import { Types } from 'mongoose';
import { AnalysisType, IAnalysis } from '../../models/Analysis';

/**
 * Interface for mock Analysis Repository
 * Matches the same methods and signatures from the actual repository
 */
export interface MockAnalysisRepository {
  findByUser: jest.Mock<Promise<IAnalysis[] | null>>;
  findById: jest.Mock<Promise<IAnalysis | null>>;
  findByPeriod: jest.Mock<Promise<IAnalysis | null>>;
  findLatestByType: jest.Mock<Promise<IAnalysis | null>>;
  initializePending: jest.Mock<Promise<Partial<IAnalysis>>>;
  markCompleted: jest.Mock<Promise<IAnalysis | null>>;
  markFailed: jest.Mock<Promise<IAnalysis | null>>;
  delete: jest.Mock<Promise<boolean>>;
  findPendingAnalyses: jest.Mock<Promise<IAnalysis[]>>;
  deleteOlderThan: jest.Mock<Promise<number>>;
  countByUser: jest.Mock<Promise<number>>;
  create: jest.Mock<Promise<IAnalysis>>;
}

/**
 * Factory function to create a typed mock analysis repository
 * All methods are mocked with jest.fn() and properly typed
 */
export function createMockAnalysisRepository(): MockAnalysisRepository {
  return {
    findByUser: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
    findByPeriod: jest.fn().mockResolvedValue(null),
    findLatestByType: jest.fn().mockResolvedValue(null),
    initializePending: jest.fn().mockResolvedValue({ status: 'PENDING' }),
    markCompleted: jest.fn().mockResolvedValue(null),
    markFailed: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue(true),
    findPendingAnalyses: jest.fn().mockResolvedValue([]),
    deleteOlderThan: jest.fn().mockResolvedValue(0),
    countByUser: jest.fn().mockResolvedValue(0),
    create: jest.fn().mockImplementation((data) => Promise.resolve({ 
      _id: new Types.ObjectId(),
      ...data 
    } as IAnalysis))
  };
}

/**
 * Interface for a generic base repository
 */
export interface MockBaseRepository<T> {
  findById: jest.Mock<Promise<T | null>>;
  findOne: jest.Mock<Promise<T | null>>;
  findAll: jest.Mock<Promise<T[]>>;
  create: jest.Mock<Promise<T>>;
  update: jest.Mock<Promise<T | null>>;
  delete: jest.Mock<Promise<boolean>>;
  findByIdAndUpdate: jest.Mock<Promise<T | null>>;
  count: jest.Mock<Promise<number>>;
}

/**
 * Factory function to create a typed base repository mock
 */
export function createMockBaseRepository<T>(): MockBaseRepository<T> {
  return {
    findById: jest.fn().mockResolvedValue(null),
    findOne: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((data) => Promise.resolve(data as T)),
    update: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue(true),
    findByIdAndUpdate: jest.fn().mockResolvedValue(null),
    count: jest.fn().mockResolvedValue(0)
  };
}

/**
 * Mock implementation for the Analysis Repository
 * This can be used to add to the global AnalysisRepository object in tests
 */
export const mockAnalysisRepositoryImplementation = {
  findByUser: jest.fn().mockImplementation(
    (userId: Types.ObjectId, filters?: { type?: AnalysisType }) => {
      return Promise.resolve([{
        _id: new Types.ObjectId(),
        userId,
        type: filters?.type || AnalysisType.PERFORMANCE,
        status: 'COMPLETED',
        data: { performance: { totalTrades: 10, winRate: 0.6 } }
      }] as IAnalysis[]);
    }
  ),
  
  findById: jest.fn().mockImplementation((id: string) => {
    return Promise.resolve({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(),
      type: AnalysisType.PERFORMANCE,
      status: 'COMPLETED',
      data: { performance: { totalTrades: 10, winRate: 0.6 } }
    } as IAnalysis);
  }),
  
  findByPeriod: jest.fn().mockImplementation(
    (userId: Types.ObjectId, type: AnalysisType, startDate: Date, endDate: Date) => {
      return Promise.resolve({
        _id: new Types.ObjectId(),
        userId,
        type,
        period: { start: startDate, end: endDate },
        status: 'COMPLETED',
        data: { performance: { totalTrades: 10, winRate: 0.6 } }
      } as IAnalysis);
    }
  ),
  
  findLatestByType: jest.fn().mockImplementation(
    (userId: Types.ObjectId, type: AnalysisType) => {
      return Promise.resolve({
        _id: new Types.ObjectId(),
        userId,
        type,
        status: 'COMPLETED',
        data: { performance: { totalTrades: 10, winRate: 0.6 } }
      } as IAnalysis);
    }
  ),
  
  create: jest.fn().mockImplementation((analysisData: Partial<IAnalysis>) => {
    return Promise.resolve({
      _id: new Types.ObjectId(),
      ...analysisData,
      createdAt: new Date(),
      updatedAt: new Date()
    } as IAnalysis);
  }),
  
  deleteOlderThan: jest.fn().mockResolvedValue(5),
  
  initializePending: jest.fn().mockImplementation((data: Partial<IAnalysis>) => {
    return Promise.resolve({
      _id: new Types.ObjectId(),
      ...data,
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }),
  
  markCompleted: jest.fn().mockImplementation((id: string, data: any) => {
    return Promise.resolve({
      _id: new Types.ObjectId(id),
      ...data,
      status: 'COMPLETED',
      updatedAt: new Date()
    } as IAnalysis);
  }),
  
  markFailed: jest.fn().mockImplementation((id: string, error: string) => {
    const now = new Date();
    return Promise.resolve({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(),
      tradeId: new Types.ObjectId(),
      type: AnalysisType.PERFORMANCE,
      period: {
        start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        end: now
      },
      metrics: {
        riskRewardRatio: 0,
        winRate: 0,
        profitFactor: 0,
        averageWin: 0,
        averageLoss: 0
      },
      status: 'FAILED',
      error,
      isActive: false,
      createdAt: now,
      updatedAt: now,
      data: {}
    } as unknown as IAnalysis);
  })
}; 