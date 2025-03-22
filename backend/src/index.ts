import dotenv from 'dotenv';
import { connectDB } from './config/database';
import { ensureUploadDir } from './utils/ensureUploadDir';
import app from './app';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB()
  .then(() => {
    // Ensure upload directory exists
    ensureUploadDir();
    
    // Start server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    logger.error('Failed to start the application:', err);
    process.exit(1);
  }); 