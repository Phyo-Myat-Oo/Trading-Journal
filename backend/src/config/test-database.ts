import mongoose from 'mongoose';

const options: mongoose.ConnectOptions = {
  maxPoolSize: 10,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 60000,
  socketTimeoutMS: 60000,
  connectTimeoutMS: 60000,
  family: 4,
};

export const connectTestDB = async (): Promise<void> => {
  try {
    const testMongoURI = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/trading-journal-test';
    
    await mongoose.connect(testMongoURI, options);
    
    console.log('Test MongoDB Connection Details:', {
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      database: mongoose.connection.name,
      readyState: mongoose.connection.readyState,
      maxPoolSize: options.maxPoolSize,
      minPoolSize: options.minPoolSize
    });

  } catch (error) {
    console.error('Test MongoDB Connection Error:', error);
    throw error;
  }
};

export const disconnectTestDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    console.log('Test MongoDB connection closed');
  } catch (error) {
    console.error('Error closing test MongoDB connection:', error);
    throw error;
  }
}; 