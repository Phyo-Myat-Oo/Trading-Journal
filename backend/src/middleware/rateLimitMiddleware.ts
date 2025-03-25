import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Rate limiter for login attempts by IP
 * Prevents brute force attacks by limiting the number of login attempts from a single IP
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    status: 'error',
    message: 'Too many login attempts from this IP, please try again after 15 minutes',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Store info about the client's IP address for rate limiting purposes
  keyGenerator: (req: Request): string => {
    return req.ip || 'unknown';
  },
});

/**
 * Rate limiter for password reset requests by IP
 * Prevents abuse of the password reset functionality
 */
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: {
    status: 'error',
    message: 'Too many password reset requests from this IP, please try again after 1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    return req.ip || 'unknown';
  },
});

/**
 * Rate limiter for user registration by IP
 * Prevents mass account creation
 */
export const registrationRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3, // 3 new accounts per day from same IP
  message: {
    status: 'error',
    message: 'Too many accounts created from this IP, please try again after 24 hours',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    return req.ip || 'unknown';
  },
});

/**
 * Rate limiter specifically for token refresh operations
 * More strict than general API limits but less strict than login attempts
 */
export const tokenRefreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 refreshes per 15 minutes
  message: 'Too many token refresh attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use both IP and user ID if available
    const ip = req.ip || req.socket.remoteAddress;
    const userId = req.user?._id;
    return `${ip}:${userId || 'anonymous'}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many token refresh attempts',
      message: 'Please wait before trying to refresh your token again.'
    });
  }
});

/**
 * Global rate limiter based solely on IP address
 * Acts as a first line of defense against distributed attacks
 * Has higher limits than endpoint-specific rate limiters
 */
export const ipRateLimiter = rateLimit({
  windowMs: config.rateLimit.ip.windowMs,
  max: config.rateLimit.ip.maxRequests, 
  message: {
    status: 'error',
    message: 'Too many requests from this IP address. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
  handler: (req: Request, res: Response) => {
    // Log the rate limit violation for monitoring
    logger.warn(`IP Rate limit exceeded for IP: ${req.ip}`, { 
      ip: req.ip, 
      path: req.path,
      method: req.method,
      userAgent: req.headers['user-agent']
    });
    
    // Calculate retry-after time
    const retryAfterSeconds = Math.ceil(config.rateLimit.ip.windowMs / 1000);
    
    // Set Retry-After header (in seconds)
    res.setHeader('Retry-After', String(retryAfterSeconds));
    
    // Send standardized response
    res.status(429).json({
      status: 'error',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: retryAfterSeconds
    });
  },
  skip: (req: Request) => {
    // Skip rate limiting for health check endpoint
    return req.path === '/health';
  }
});

/**
 * General API rate limiter
 * Protects all API endpoints from excessive requests
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per IP per 15 minutes
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    return req.ip || 'unknown';
  },
  handler: (req: Request, res: Response) => {
    // Calculate retry-after time
    const retryAfterSeconds = Math.ceil(15 * 60);
    
    // Set Retry-After header (in seconds)
    res.setHeader('Retry-After', String(retryAfterSeconds));
    
    // Send standardized response
    res.status(429).json({
      status: 'error',
      message: 'Too many requests from this IP, please try again after 15 minutes',
      retryAfter: retryAfterSeconds
    });
  }
}); 