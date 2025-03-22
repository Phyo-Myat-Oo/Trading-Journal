import { Types } from 'mongoose';

/**
 * Factory function to create a properly typed mock analysis repository
 */
export function createMockAnalysisRepository() {
  return {
    findByUser: jest.fn(),
    findById: jest.fn(),
    initializePending: jest.fn(),
    markCompleted: jest.fn(),
    markFailed: jest.fn(),
    delete: jest.fn(),
    findByPeriod: jest.fn(),
    findPendingAnalyses: jest.fn(),
    findLatestByType: jest.fn(),
    deleteOlderThan: jest.fn(),
    countByUser: jest.fn(),
    create: jest.fn()
  };
}

/**
 * Factory function to create a properly typed base repository
 */
export function createMockBaseRepository() {
  return {
    findById: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    count: jest.fn()
  };
}

/**
 * Factory function to create a properly typed scheduled job repository
 */
export function createMockScheduledJobRepository() {
  return {
    findByUser: jest.fn(),
    findById: jest.fn(),
    findByType: jest.fn(),
    addJob: jest.fn(),
    updateJob: jest.fn(),
    deleteJob: jest.fn(),
    findPendingJobs: jest.fn(),
    markJobAsRunning: jest.fn(),
    markJobAsCompleted: jest.fn(),
    markJobAsFailed: jest.fn()
  };
}

/**
 * Factory function to create common request and response mocks
 */
export function createMockRequestResponse() {
  const userId = new Types.ObjectId();
  
  const mockRequest = {
    user: { id: userId.toString() },
    params: {},
    query: {},
    body: {}
  };

  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    send: jest.fn()
  };

  return { mockRequest, mockResponse, userId };
}

/**
 * Type-safe utility for creating chainable Mongoose query mocks
 * This helps with mocking methods like find().sort().limit().lean()
 */
export function createChainableQueryMock(resolvedValue: unknown = []) {
  const chainableMock = {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(resolvedValue),
    exec: jest.fn().mockResolvedValue(resolvedValue),
    // Add more chainable methods as needed
  };
  return chainableMock;
}

/**
 * Factory function to create models with mock methods
 * Improved to be more type-safe and represent Mongoose static methods better
 */
export function createMockModel(modelName: string) {
  return {
    find: jest.fn().mockImplementation(() => createChainableQueryMock([])),
    findById: jest.fn().mockImplementation(() => createChainableQueryMock(null)),
    findOne: jest.fn().mockImplementation(() => createChainableQueryMock(null)),
    deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 5 }),
    create: jest.fn(),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    findOneAndUpdate: jest.fn().mockResolvedValue({}),
    aggregate: jest.fn().mockResolvedValue([]),
    countDocuments: jest.fn().mockResolvedValue(10),
    // Add model-specific methods as needed
    [modelName]: {
      modelName,
      collection: {
        name: modelName.toLowerCase() + 's',
      },
    }
  };
}

/**
 * Create a typed mock service for AnalysisService
 */
export function createMockAnalysisService() {
  return {
    generatePerformanceAnalysis: jest.fn(),
    generatePatternAnalysis: jest.fn(),
    getAnalysis: jest.fn(),
    scheduleAnalysis: jest.fn(), 
    purgeOldAnalyses: jest.fn().mockResolvedValue(5),
    storeAnalysisResults: jest.fn(),
    getLatestAnalysis: jest.fn(),
    invalidateCache: jest.fn()
  };
}

/**
 * Create a typed mock service for StatisticsService
 */
export function createMockStatisticsService() {
  return {
    calculateTradeStats: jest.fn(),
    analyzeSymbolPerformance: jest.fn(),
    analyzeTimeOfDay: jest.fn(),
    analyzeDayOfWeek: jest.fn(),
    calculateRiskMetrics: jest.fn(),
    analyzeJournalCorrelation: jest.fn(),
    calculateStandardDeviation: jest.fn()
  };
}

/**
 * Utility to properly mock Mongoose models for testing
 * This approach avoids the need for @ts-nocheck by properly setting up the mocks
 */
export function setupMongooseModelMocks() {
  // Create mock implementations for common Mongoose static methods
  const mockTradeModel = createMockModel('Trade');
  const mockAnalysisModel = createMockModel('Analysis');
  const mockJournalEntryModel = createMockModel('JournalEntry');
  
  // Return an object with all mocked models
  return {
    Trade: mockTradeModel,
    Analysis: mockAnalysisModel,
    JournalEntry: mockJournalEntryModel
  };
} 