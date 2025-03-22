import rateLimit from 'express-rate-limit';
import { HttpStatus } from '../utils/errorResponse';

// Default rate limit settings
const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_MAX_REQUESTS = 100; // 100 requests per windowMs

// Auth rate limiter (more strict for auth endpoints)
export const authRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15, // Increased from 5 to 15 requests per hour for failed auth attempts
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed requests
  message: { 
    success: false, 
    message: 'Too many failed authentication attempts. Please try again later.' 
  },
  statusCode: HttpStatus.TOO_MANY_REQUESTS
});

// General API rate limiter
export const apiRateLimiter = rateLimit({
  windowMs: DEFAULT_WINDOW_MS,
  max: DEFAULT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: { 
    success: false, 
    message: 'Too many requests. Please try again later.' 
  },
  statusCode: HttpStatus.TOO_MANY_REQUESTS
});

// Export a combined rateLimiter for use in the app
export const rateLimiter = apiRateLimiter; 