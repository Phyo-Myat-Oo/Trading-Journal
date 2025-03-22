import app from './app';
import { logger } from './utils/logger';
import { AnalysisScheduler } from './jobs/analysisScheduler';
import { config } from './config';
import { connectDB, closeDB } from './config/database';
import { scheduleTokenCleanup } from './services/tokenService';

// Start server
const startServer = async () => {
  await connectDB();
  
  // Store the token cleanup interval for later cleanup
  let tokenCleanupInterval: NodeJS.Timeout;
  
  const server = app.listen(config.server.port, () => {
    logger.info(`Server running in ${config.env} mode on port ${config.server.port}`);
    
    // Initialize token cleanup job
    tokenCleanupInterval = scheduleTokenCleanup();
    logger.info('Scheduled refresh token cleanup job');
    
    if (config.isProduction) {
      // Initialize background jobs in production
      AnalysisScheduler.initialize();
    }
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Received shutdown signal. Starting graceful shutdown...');

    // Clear token cleanup interval
    if (tokenCleanupInterval) {
      clearInterval(tokenCleanupInterval);
      logger.info('Token cleanup job stopped');
    }

    server.close(async () => {
      logger.info('HTTP server closed.');
      
      try {
        await closeDB();
        
        // Close any other resources (e.g., Redis, etc.)
        
        process.exit(0);
      } catch (err) {
        logger.error('Error during shutdown:', err);
        process.exit(1);
      }
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);
  };

  // Handle shutdown signals
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

startServer(); 