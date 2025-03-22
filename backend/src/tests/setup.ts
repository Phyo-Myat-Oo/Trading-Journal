import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.test') });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.TEST_MONGODB_URI = 'mongodb://localhost:27017/trading-journal-test';

// Mock email service
jest.mock('../utils/emailService', () => ({
  sendResetEmail: jest.fn().mockResolvedValue(undefined),
}));

// Increase timeout for all tests
jest.setTimeout(10000); 