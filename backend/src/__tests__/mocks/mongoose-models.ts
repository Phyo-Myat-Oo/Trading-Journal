import mongoose, { Document, Model, Query } from 'mongoose';
// These imports are required for type definitions even though they may appear unused
// mongoose is used for Types.ObjectId in the implementations
// Model and Query are used as type parameters and in generic constraints
import { IAnalysis } from '../../models/Analysis';
import { ITrade } from '../../models/Trade';
import { IJournalEntry } from '../../models/JournalEntry';

/**
 * Type definitions for Mongoose query chains
 * This helps us properly mock the chainable methods like find().sort().limit()
 */
export type MockQuery<T> = {
  sort: jest.Mock<MockQuery<T>, any>;
  limit: jest.Mock<MockQuery<T>, any>;
  skip: jest.Mock<MockQuery<T>, any>;
  populate: jest.Mock<MockQuery<T>, any>;
  lean: jest.Mock<Promise<T>, any>;
  exec: jest.Mock<Promise<T>, any>;
  select: jest.Mock<MockQuery<T>, any>;
} & Promise<T>;

/**
 * Type for mocked Mongoose model static methods
 */
export type MockModel<T extends Document> = {
  find: jest.Mock<MockQuery<T[]>, any>;
  findById: jest.Mock<MockQuery<T | null>, any>;
  findOne: jest.Mock<MockQuery<T | null>, any>;
  findOneAndUpdate: jest.Mock<Promise<T | null>, any>;
  updateOne: jest.Mock<Promise<{ modifiedCount: number }>, any>;
  updateMany: jest.Mock<Promise<{ modifiedCount: number }>, any>;
  deleteOne: jest.Mock<Promise<{ deletedCount: number }>, any>;
  deleteMany: jest.Mock<Promise<{ deletedCount: number }>, any>;
  create: jest.Mock<Promise<T>, any>;
  aggregate: jest.Mock<Promise<any[]>, any>;
  countDocuments: jest.Mock<Promise<number>, any>;
  [key: string]: any;
};

/**
 * Create a properly typed chainable query mock
 * This ensures methods like find().sort().limit() work correctly
 */
export function createMockQuery<T>(resolvedValue: T): MockQuery<T> {
  const mockQuery = {
    sort: jest.fn(),
    limit: jest.fn(),
    skip: jest.fn(),
    populate: jest.fn(),
    lean: jest.fn().mockResolvedValue(resolvedValue),
    exec: jest.fn().mockResolvedValue(resolvedValue),
    select: jest.fn(),
    then: jest.fn().mockImplementation((callback) => Promise.resolve(resolvedValue).then(callback)),
    catch: jest.fn().mockImplementation((callback) => Promise.resolve(resolvedValue).catch(callback)),
  } as any;

  // Make all chainable methods return the query itself
  mockQuery.sort.mockReturnValue(mockQuery);
  mockQuery.limit.mockReturnValue(mockQuery);
  mockQuery.skip.mockReturnValue(mockQuery);
  mockQuery.populate.mockReturnValue(mockQuery);
  mockQuery.select.mockReturnValue(mockQuery);

  return mockQuery;
}

/**
 * Create a fully typed mock for a Mongoose model
 */
export function createTypedModelMock<T extends Document>(): MockModel<T> {
  const model = {
    find: jest.fn().mockImplementation(() => createMockQuery<T[]>([])),
    findById: jest.fn().mockImplementation(() => createMockQuery<T | null>(null)),
    findOne: jest.fn().mockImplementation(() => createMockQuery<T | null>(null)),
    findOneAndUpdate: jest.fn().mockResolvedValue(null),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 5 }),
    deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 5 }),
    create: jest.fn().mockImplementation((data) => Promise.resolve(data)),
    aggregate: jest.fn().mockResolvedValue([]),
    countDocuments: jest.fn().mockResolvedValue(0),
  } as MockModel<T>;

  return model;
}

// Create specific mocks for our models with their proper types
export const mockTradeModel = createTypedModelMock<ITrade>();
export const mockAnalysisModel = createTypedModelMock<IAnalysis>();
export const mockJournalEntryModel = createTypedModelMock<IJournalEntry>();

/**
 * Set up all Mongoose model mocks
 * Call this in your beforeEach to reset all mocks with proper types
 */
export function setupMongooseModelMocks() {
  // Reset the mocks
  jest.resetAllMocks();
  
  // Set up Trade model mocks
  jest.mock('../../models/Trade', () => ({
    Trade: mockTradeModel
  }));

  // Set up Analysis model mocks
  jest.mock('../../models/Analysis', () => ({
    Analysis: mockAnalysisModel
  }));

  // Set up JournalEntry model mocks
  jest.mock('../../models/JournalEntry', () => ({
    JournalEntry: mockJournalEntryModel
  }));
  
  return {
    Trade: mockTradeModel,
    Analysis: mockAnalysisModel,
    JournalEntry: mockJournalEntryModel
  };
} 