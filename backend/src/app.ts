import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { ensureUploadDir } from './utils/ensureUploadDir';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { requestLogger } from './middleware/requestLogger';
import { sanitizeData, preventXss, preventHpp, requestTimeout, setCSP, configureSecurityMiddleware, setAdvancedSecurityHeaders } from './middleware/security';
import { config } from './config';
import authRoutes from './routes/authRoutes';
import accountRoutes from './routes/accountRoutes';
import tradeRoutes from './routes/tradeRoutes';
import userRoutes from './routes/userRoutes';
import journalRoutes from './routes/journalRoutes';
import statisticsRoutes from './routes/statisticsRoutes';
import analysisRoutes from './routes/analysisRoutes';
import scheduledJobsRoutes from './routes/scheduledJobsRoutes';
import adminRoutes from './routes/adminRoutes';
import { analysisScheduler } from './services/analysisScheduler';
import { logger } from './utils/logger';
import { queueService } from './services/QueueService';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import routes from './routes';
import cookieParser from 'cookie-parser';
import * as tokenService from './services/tokenService';
import { apiRateLimiter, ipRateLimiter } from './middleware/rateLimitMiddleware';
import { csrfProtection, handleCsrfError } from './middleware/csrfMiddleware';
import session from 'express-session';
import { configurePassport } from './config/passport';

// Load environment variables
dotenv.config();

/**
 * Initialize Express Application
 * 
 * This is the main entry point for the Trading Journal API server.
 * It configures middleware, security, routes, and error handling.
 */
const app = express();

/**
 * Middleware Configuration
 * 
 * Sets up core middleware for security, logging, and request processing
 */

// CORS setup - Control which domains can access the API
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CORS_ORIGIN || true
    : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'], // Add localhost:3000
  credentials: true, // Allow cookies to be sent with requests
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Cache-Control', 
    'X-Silent-Request',
    'x-csrf-token'  // Add CSRF token header
  ],
  exposedHeaders: ['Content-Range', 'X-Total-Count']
}));

// Security headers with Helmet
app.use(helmet());

// Parse cookies
app.use(cookieParser());

// Express session middleware - required for Passport
app.use(session({
  secret: config.jwt.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.isProduction,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize and configure Passport
const passport = configurePassport();
app.use(passport.initialize());

// Parse JSON request bodies
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded request bodies (traditional form data)
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Security Middleware Configuration
 * 
 * In production/development, we apply a comprehensive set of security measures:
 * 1. Helmet - Sets various HTTP headers for security
 * 2. CORS - Controls which domains can access the API
 * 3. Custom Security Headers - CSP, Permissions-Policy, CORP, COOP, COEP
 * 4. Data sanitization - Prevents injection attacks
 * 5. Parameter pollution prevention
 * 6. Request timeout protection
 * 
 * In test environment, we use a simplified security setup
 */
if (process.env.NODE_ENV !== 'test') {
  // 1. Set security headers with Helmet
  app.use(helmet({
    contentSecurityPolicy: false, // We handle CSP with our custom middleware
    crossOriginEmbedderPolicy: false, // We handle COEP with our custom middleware
    dnsPrefetchControl: { allow: false }, // Disable DNS prefetching
    frameguard: { action: 'deny' }, // Prevent iframe embedding
    hidePoweredBy: true, // Hide X-Powered-By header
    hsts: {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true,
      preload: true
    },
    ieNoOpen: true, // Prevent IE from opening downloads
    noSniff: true, // Prevent MIME type sniffing
    referrerPolicy: { policy: 'same-origin' }, // Restrict referrer information
    xssFilter: true // Enable XSS filtering
  }));

  // 2. Apply advanced security headers
  app.use(setAdvancedSecurityHeaders);

  // 3. Custom CSP headers beyond what Helmet provides
  app.use(setCSP);

  // 4-5. Data sanitization middleware against various attack vectors
  app.use(sanitizeData); // Against NoSQL query injection
  app.use(preventXss); // Against XSS attacks
  app.use(preventHpp); // Prevent parameter pollution

  // 6. Global request timeout (30 seconds) to prevent hanging requests
  app.use(requestTimeout(30 * 1000));
} else {
  // For test environment, use simplified security setup
  configureSecurityMiddleware(app);
}

/**
 * Performance Middleware
 * Compresses responses to reduce bandwidth and improve loading times
 */
app.use(compression());

/**
 * Logging Middleware
 * In development, use concise logging with morgan
 * In all environments, use custom request logger
 */
if (config.isDevelopment) {
  app.use(morgan('dev'));
}
app.use(requestLogger);

/**
 * Rate Limiting Configuration
 * 
 * Implements multiple levels of rate limiting:
 * 1. Global IP-based rate limiting - Applies to all routes based solely on IP
 * 2. Global route-based rate limiting - Applies to all routes
 * 3. Authentication rate limiting - More strict, applies only to auth endpoints
 * 4. Cookie check endpoint - Higher limit to allow for debugging
 * 
 * This helps prevent brute force attacks and API abuse
 */
if (process.env.NODE_ENV !== 'test') {
  // 1. Apply IP-based rate limiter as first line of defense
  app.use(ipRateLimiter);

  // 2. Global rate limiter for all routes
  const globalLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs, // Time window in milliseconds
    max: config.rateLimit.maxRequests, // Max requests per window
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false, // Disable deprecated headers
    message: { 
      success: false, 
      message: 'Too many requests, please try again later.' 
    },
    // Use IP + user agent as key for better rate limiting accuracy
    keyGenerator: (req) => {
      return `${req.ip}-${req.headers['user-agent'] || 'unknown'}`;
    }
  });
  app.use(globalLimiter);

  // 3. Authentication/login rate limiter (more strict for security)
  const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 15, // Increased from 5 to 15 attempts per hour
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many login attempts, please try again later.'
    },
    skipSuccessfulRequests: true, // Only count failed attempts
  });
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/forgot-password', authLimiter);
  
  // 4. Cookie check endpoint - higher limit for debugging
  const cookieCheckLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 30, // Allow 30 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many cookie check requests, please try again later.'
    }
  });
  app.use('/api/auth/check-cookies', cookieCheckLimiter);
}

/**
 * File Upload Configuration
 * Set up upload directory and static file serving
 */
// Ensure upload directory exists
ensureUploadDir();

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

/**
 * API Documentation Configuration
 * Only available in development environment
 */
if (config.isDevelopment) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Trading Journal API Documentation',
  }));
}

/**
 * API Routes Configuration
 * All API endpoints are prefixed with /api
 */
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/scheduled-jobs', scheduledJobsRoutes);
app.use('/api/admin', adminRoutes);

/**
 * Error Handling Middleware
 * Must be registered after all routes
 */
app.use(notFoundHandler);
app.use(errorHandler);

/**
 * Health Check Endpoint
 * Used for monitoring and container orchestration
 */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

/**
 * Scheduler and Queue Initialization
 * Only initialized in production environment
 */
if (process.env.NODE_ENV === 'production') {
  // Initialize analysis scheduler for recurring tasks
  analysisScheduler.initialize()
    .then(() => logger.info('Analysis scheduler initialized'))
    .catch(err => logger.error('Failed to initialize analysis scheduler', err));
  
  // Initialize queue service for background processing
  queueService.init()
    .then(() => logger.info('Queue service initialized'))
    .catch(err => logger.error('Failed to initialize queue service', err));
}

// Setup scheduled tasks
const tokenCleanupJob = tokenService.scheduleTokenCleanup();
const blacklistCleanupJob = tokenService.scheduleBlacklistCleanup();

/**
 * Graceful Shutdown Handling
 * Properly handle termination signals
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  // Clear interval timers
  clearInterval(tokenCleanupJob);
  clearInterval(blacklistCleanupJob);
  
  // Close server and database connection
  logger.info('SIGTERM signal received. Closing HTTP server...');
  // Place any cleanup logic here (closing DB connections, etc.)
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received. Closing HTTP server...');
  // Place any cleanup logic here (closing DB connections, etc.)
  process.exit(0);
});

/**
 * Global Error Handling
 * Catch unhandled exceptions and rejections to prevent app crashes
 */
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection', reason);
  process.exit(1);
});

// Apply general API rate limiter to all routes
app.use('/api', apiRateLimiter);

// Mount routes
app.use('/api', routes);

// Apply CSRF protection to sensitive routes
app.use('/api/auth/reset-password', csrfProtection);
app.use('/api/users/profile', csrfProtection);
app.use('/api/users/password', csrfProtection);
app.use('/api/users/delete-account', csrfProtection);

// Add CSRF error handler
app.use(handleCsrfError);

export default app; 