import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dotenv from 'dotenv';
import { User } from '../models/User';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

// Extend the NodeJS global type definition
declare global {
  function createTestUser(): Promise<any>;
  function generateAuthToken(userId: string): Promise<string>;
}

dotenv.config({ path: '.env.test' });

let mongoServer: MongoMemoryServer;

// Mock cloudinary
jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload: jest.fn().mockImplementation((file, options) => {
        if (file === 'error') {
          return Promise.reject(new Error('Upload failed'));
        }
        return Promise.resolve({
          public_id: 'test_public_id',
          secure_url: 'https://test.cloudinary.com/image.jpg'
        });
      }),
      destroy: jest.fn().mockImplementation((publicId) => {
        if (publicId === 'error') {
          return Promise.reject(new Error('Delete failed'));
        }
        return Promise.resolve({ result: 'ok' });
      })
    }
  }
}));

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({
      messageId: 'test-message-id'
    })
  })
}));

// Mock the Trade model
jest.mock('../models/Trade', () => ({
  Trade: {
    find: jest.fn().mockImplementation(() => {
      return {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          {
            _id: new mongoose.Types.ObjectId(),
            userId: new mongoose.Types.ObjectId(),
            symbol: 'AAPL',
            entryPrice: 150,
            exitPrice: 160,
            quantity: 10,
            entryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            exitDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            profitLoss: 100,
            tradeType: 'LONG',
            status: 'CLOSED'
          }
        ])
      };
    }),
    findOne: jest.fn().mockImplementation(() => {
      return {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          _id: new mongoose.Types.ObjectId(),
          userId: new mongoose.Types.ObjectId(),
          symbol: 'AAPL',
          entryPrice: 150,
          exitPrice: 160,
          quantity: 10,
          entryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          exitDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          profitLoss: 100,
          tradeType: 'LONG',
          status: 'CLOSED'
        })
      };
    }),
    create: jest.fn().mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      symbol: 'AAPL',
      entryPrice: 150,
      exitPrice: 160,
      quantity: 10,
      entryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      exitDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      profitLoss: 100,
      tradeType: 'LONG',
      status: 'CLOSED'
    }),
    aggregate: jest.fn().mockResolvedValue([{
      totalTrades: 10,
      winningTrades: 6,
      losingTrades: 4,
      breakEvenTrades: 0,
      totalProfitLoss: 1000,
      avgProfitLoss: 100,
      avgWin: 200,
      avgLoss: -50,
      largestWin: 500,
      largestLoss: -200,
      winRate: 60,
      profitFactor: 3
    }])
  }
}));

// Mock the JournalEntry model
jest.mock('../models/JournalEntry', () => ({
  JournalEntry: {
    find: jest.fn().mockImplementation(() => {
      return {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          {
            _id: new mongoose.Types.ObjectId(),
            userId: new mongoose.Types.ObjectId(),
            title: 'Test Entry',
            content: 'Test content with #lesson and #mistake tags',
            mood: 'NEUTRAL',
            date: new Date(),
            tags: ['lesson', 'mistake']
          }
        ])
      };
    }),
    findOne: jest.fn().mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      title: 'Test Entry',
      content: 'Test content with #lesson and #mistake tags',
      mood: 'NEUTRAL',
      date: new Date(),
      tags: ['lesson', 'mistake']
    }),
    create: jest.fn().mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      title: 'Test Entry',
      content: 'Test content with #lesson and #mistake tags',
      mood: 'NEUTRAL',
      date: new Date(),
      tags: ['lesson', 'mistake']
    }),
    aggregate: jest.fn().mockResolvedValue([
      {
        _id: 'lesson',
        count: 5
      },
      {
        _id: 'mistake',
        count: 3
      }
    ])
  }
}));

// Mock the Analysis model
jest.mock('../models/Analysis', () => ({
  Analysis: {
    findOne: jest.fn().mockImplementation(() => {
      return {
        lean: jest.fn().mockResolvedValue({
          _id: new mongoose.Types.ObjectId(),
          userId: new mongoose.Types.ObjectId(),
          type: 'PERFORMANCE',
          data: {
            performance: {
              totalTrades: 10,
              winningTrades: 6,
              losingTrades: 4,
              winRate: 60
            }
          },
          period: {
            start: new Date(),
            end: new Date()
          },
          status: 'COMPLETED',
          createdAt: new Date(),
          updatedAt: new Date()
        })
      };
    }),
    find: jest.fn().mockImplementation(() => {
      return {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          {
            _id: new mongoose.Types.ObjectId(),
            userId: new mongoose.Types.ObjectId(),
            type: 'PERFORMANCE',
            period: {
              start: new Date(),
              end: new Date()
            },
            data: {
              performance: {
                totalTrades: 10,
                winningTrades: 6,
                losingTrades: 4,
                winRate: 60
              }
            },
            status: 'COMPLETED'
          }
        ])
      };
    }),
    create: jest.fn().mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      type: 'PERFORMANCE',
      status: 'COMPLETED',
      data: { 
        performance: { 
          totalTrades: 10,
          winningTrades: 6, 
          losingTrades: 4, 
          winRate: 60 
        } 
      }
    }),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 5 }),
    aggregate: jest.fn().mockResolvedValue([{
      totalTrades: 10,
      winningTrades: 6,
      losingTrades: 4,
      breakEvenTrades: 0,
      totalProfitLoss: 1000,
      avgProfitLoss: 100,
      avgWin: 200,
      avgLoss: -50,
      largestWin: 500,
      largestLoss: -200,
      winRate: 60,
      profitFactor: 3
    }])
  },
  AnalysisType: {
    PERFORMANCE: 'PERFORMANCE',
    PATTERN: 'PATTERN',
    FORECAST: 'FORECAST',
    SYMBOL: 'SYMBOL',
    TIME_OF_DAY: 'TIME_OF_DAY',
    DAY_OF_WEEK: 'DAY_OF_WEEK',
    RISK: 'RISK',
    JOURNAL_CORRELATION: 'JOURNAL_CORRELATION',
    DASHBOARD: 'DASHBOARD'
  },
  AnalysisPeriod: {
    DAILY: 'DAILY',
    WEEKLY: 'WEEKLY',
    MONTHLY: 'MONTHLY',
    QUARTERLY: 'QUARTERLY',
    YEARLY: 'YEARLY',
    CUSTOM: 'CUSTOM'
  }
}));

jest.mock('../repositories/AnalysisRepository', () => ({
  AnalysisRepository: {
    create: jest.fn().mockImplementation(async (data) => {
      return {
        _id: new mongoose.Types.ObjectId(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        toString: () => 'mock-analysis-id'
      };
    }),
    initializePending: jest.fn().mockImplementation(async (userId, type, period, startDate, endDate) => {
      return {
        _id: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(userId),
        type,
        period: typeof period === 'string' 
          ? { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() } 
          : period,
        startDate,
        endDate,
        status: 'PENDING',
        data: {},
        metadata: { queuedAt: new Date() },
        createdAt: new Date(),
        updatedAt: new Date(),
        toString: () => 'mock-analysis-id'
      };
    }),
    findLatest: jest.fn().mockImplementation(async (userId, type, period) => {
      return {
        _id: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(userId),
        type,
        period: typeof period === 'string' 
          ? { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() } 
          : period,
        data: {
          performance: {
            totalTrades: 10,
            winningTrades: 6,
            losingTrades: 4,
            winRate: 60
          }
        },
        status: 'COMPLETED',
        createdAt: new Date(),
        updatedAt: new Date(),
        toString: () => 'mock-analysis-id'
      };
    }),
    markCompleted: jest.fn().mockImplementation(async (id, data, metadata) => {
      return {
        _id: new mongoose.Types.ObjectId(id),
        status: 'COMPLETED',
        data,
        metadata,
        updatedAt: new Date(),
        toString: () => id
      };
    }),
    markFailed: jest.fn().mockImplementation(async (id, error) => {
      return {
        _id: new mongoose.Types.ObjectId(id),
        status: 'FAILED',
        error,
        updatedAt: new Date(),
        toString: () => id
      };
    })
  }
}));

// Disable logging during tests
// logger.level = 'silent';  // This doesn't work with our custom logger
// Instead, we'll mock our logger's methods
jest.spyOn(logger, 'info').mockImplementation(() => {});
jest.spyOn(logger, 'error').mockImplementation(() => {});
jest.spyOn(logger, 'warn').mockImplementation(() => {});
jest.spyOn(logger, 'debug').mockImplementation(() => {});

// Global test setup
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

// Clean up database between tests
beforeEach(async () => {
  if (mongoose.connection.db) {
    const collections = await mongoose.connection.db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }
});

// Global test teardown
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Global test timeout
jest.setTimeout(30000);

// Mock implementations
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Global test utilities
global.createTestUser = async () => {
  const user = await User.create({
    email: 'test@example.com',
    password: 'Test123!@#',
    firstName: 'Test',
    lastName: 'User'
  });

  return user;
};

global.generateAuthToken = async (userId: string) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

// Add custom matchers if needed
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Reset mocks between tests
afterEach(() => {
  jest.clearAllMocks();
}); 