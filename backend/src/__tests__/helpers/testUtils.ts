import { Types } from 'mongoose';
import { ITrade } from '../../models/Trade';
import { Trade } from '../../models/Trade';
import { Express } from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { User } from '../../models/User';
import { config } from '../../config';

export const createMockTrade = async (userId?: string): Promise<ITrade & { _id: Types.ObjectId }> => {
  return await Trade.create({
    userId: new Types.ObjectId(userId),
    accountId: new Types.ObjectId(),
    symbol: 'TEST',
    type: 'LONG',
    entryPrice: 100,
    quantity: 1,
    entryDate: new Date(),
  }) as ITrade & { _id: Types.ObjectId };
};

export const createMockFile = (mimetype: string = 'image/jpeg'): Express.Multer.File => ({
  fieldname: 'screenshot',
  originalname: 'test-image.jpg',
  encoding: '7bit',
  mimetype,
  buffer: Buffer.from('test-image'),
  size: 1024,
  stream: null as any,
  destination: '',
  filename: 'test-image.jpg',
  path: '',
});

export const getTestAuthToken = (): string => {
  // This should be replaced with actual token generation based on your auth system
  return 'test-auth-token';
};

export interface TestUser {
  _id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  token: string;
}

/**
 * Create a test user and return with auth token
 */
export const createTestUser = async (): Promise<TestUser> => {
  const user = await User.create({
    email: 'test@example.com',
    password: 'Test123!@#',
    firstName: 'Test',
    lastName: 'User'
  });

  const token = jwt.sign({ id: user._id }, config.jwt.secret, {
    expiresIn: '1h'
  });

  return {
    _id: user._id.toString(),
    email: user.email,
    password: 'Test123!@#',
    firstName: user.firstName,
    lastName: user.lastName,
    token
  };
};

/**
 * Create an authenticated supertest request
 */
export const authenticatedRequest = (app: Express, token: string) => {
  return request(app).set('Authorization', `Bearer ${token}`);
};

/**
 * Generate test data for trades
 */
export const generateTestTrade = (userId: string) => ({
  userId,
  symbol: 'AAPL',
  type: 'STOCK',
  direction: 'LONG',
  entryPrice: 150.00,
  exitPrice: 155.00,
  quantity: 100,
  entryDate: new Date(),
  exitDate: new Date(),
  profitLoss: 500.00,
  notes: 'Test trade'
});

/**
 * Clean up test data
 */
export const cleanupTestData = async () => {
  await User.deleteMany({});
  // Add other model cleanups as needed
};

/**
 * Wait for a specified time
 */
export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mock date for consistent testing
 */
export const mockDate = (isoDate: string) => {
  const realDate = Date;
  global.Date = class extends realDate {
    constructor() {
      super();
      return new realDate(isoDate);
    }
  } as DateConstructor;
  return () => {
    global.Date = realDate;
  };
}; 