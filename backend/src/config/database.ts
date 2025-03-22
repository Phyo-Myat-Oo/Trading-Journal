import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import { config } from './index';

export const connectDB = async (): Promise<void> => {
  try {
    const connection = await mongoose.connect(config.db.uri);
    
    // Log successful connection
    logger.info(`MongoDB connected: ${connection.connection.host}`);
    
    // Add connection event handlers
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });
    
  } catch (error) {
    logger.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

export const closeDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection:', error);
    throw error;
  }
};

// Configure mongoose
mongoose.set('strictQuery', true);
mongoose.set('debug', config.isDevelopment);

// Add custom query methods
declare module 'mongoose' {
  interface Query<ResultType, DocType, THelpers = Record<string, never>, RawDocType = DocType> {
    cache(ttl?: number): this;
    clearCache(): this;
  }
}

// Export mongoose instance for use in other parts of the application
export { mongoose }; 