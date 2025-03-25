import { Request, Response, NextFunction } from 'express';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss';
import hpp from 'hpp';
import { AppError } from './errorHandler';
import { HttpStatus } from '../utils/errorResponse';
import helmet from 'helmet';
import cors from 'cors';
import { Express } from 'express';

/**
 * Middleware to sanitize data and prevent NoSQL injection attacks
 */
export const sanitizeData = mongoSanitize();

/**
 * Recursively sanitize object values against XSS
 */
const sanitizeObject = (obj: any): any => {
  if (typeof obj !== 'object' || obj === null) {
    return typeof obj === 'string' ? xss(obj) : obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  return Object.keys(obj).reduce((acc, key) => {
    acc[key] = sanitizeObject(obj[key]);
    return acc;
  }, {} as any);
};

/**
 * Middleware to prevent XSS attacks
 */
export const preventXss = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  next();
};

/**
 * Middleware to prevent HTTP Parameter Pollution
 */
export const preventHpp = hpp({
  whitelist: [
    // Add parameters that are allowed to be duplicated in query strings
    'date', 'tags', 'symbols', 'ids'
  ]
});

/**
 * Middleware to set request timeout
 * @param timeout Timeout in milliseconds
 */
export const requestTimeout = (timeout = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Set a timeout for the request
    const timeoutId = setTimeout(() => {
      // Clean up event listeners to prevent memory leaks
      req.removeAllListeners();
      res.removeAllListeners();
      
      // Send timeout response if headers not sent yet
      if (!res.headersSent) {
        next(new AppError('Request timeout - operation took too long to complete', HttpStatus.REQUEST_TIMEOUT));
      }
    }, timeout);
    
    // Clear the timeout when the response is sent
    res.on('finish', () => {
      clearTimeout(timeoutId);
    });
    
    // Clear the timeout if the client disconnects
    req.on('close', () => {
      clearTimeout(timeoutId);
    });
    
    next();
  };
};

/**
 * Content Security Policy middleware
 * Provides a comprehensive and configurable CSP
 */
export const setCSP = (req: Request, res: Response, next: NextFunction) => {
  // Determine environment
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Default CSP directives - more restrictive in production
  const directives = {
    'default-src': ["'self'"],
    'img-src': ["'self'", 'data:', 'https:'],
    'script-src': ["'self'", ...(isProduction ? [] : ["'unsafe-eval'"])], // Allow unsafe-eval in development for tools like React DevTools
    'style-src': ["'self'", 'https://fonts.googleapis.com', ...(isProduction ? [] : ["'unsafe-inline'"])],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'connect-src': ["'self'", ...(isProduction ? [] : ['ws:'])], // Allow WebSockets in development
    'frame-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'none'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': isProduction ? [] : null, // Force HTTPS in production
    'block-all-mixed-content': isProduction ? [] : null, // Block mixed content in production
    'report-uri': [process.env.CSP_REPORT_URI || '/api/csp-report'], // Optional reporting endpoint
  };

  // Build CSP string from directives
  const cspString = Object.entries(directives)
    .filter(([key, value]) => value !== null) // Remove null directives
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        // If value is empty array, it means directive has no value (e.g., 'upgrade-insecure-requests')
        return value.length ? `${key} ${value.join(' ')}` : key;
      }
      return `${key} ${value}`;
    })
    .join('; ');

  // Set the CSP header
  res.setHeader('Content-Security-Policy', cspString);
  
  next();
};

/**
 * Advanced Security Headers middleware
 * Sets additional security headers beyond what Helmet provides
 */
export const setAdvancedSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Permissions Policy (formerly Feature Policy)
  // Controls which browser features can be used
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  // Cross-Origin Resource Policy
  // Prevents other sites from loading resources from your site
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  // Cross-Origin Opener Policy
  // Controls how windows/tabs interact with each other
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

  // Cross-Origin Embedder Policy
  // Ensures all resources loaded are either same-origin or have allowed CORS headers
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  }

  next();
};

// XSS Filter for request body, params, and query
const xssFilter = (obj: any): any => {
  if (!obj) return obj;
  
  if (typeof obj === 'string') {
    return xss(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => xssFilter(item));
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      result[key] = xssFilter(obj[key]);
    }
    return result;
  }
  
  return obj;
};

/**
 * Apply all security middleware to Express app
 */
export const configureSecurityMiddleware = (app: Express): void => {
  // Set security HTTP headers
  app.use(helmet());
  
  // Enable CORS
  app.use(cors({
    origin: process.env.NODE_ENV === 'production'
      ? process.env.CORS_ORIGIN || '*'
      : ['http://localhost:5173', 'http://127.0.0.1:5173'], // Vite default dev server
    credentials: true, // Allow cookies to be sent
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'X-Silent-Request'],
    exposedHeaders: ['Content-Range', 'X-Total-Count', 'Set-Cookie']
  }));
  
  // Sanitize data against NoSQL query injection
  app.use(mongoSanitize());
  
  // Prevent HTTP Parameter Pollution
  app.use(hpp());
  
  // Middleware to protect against XSS
  app.use((req, res, next) => {
    if (req.body) req.body = xssFilter(req.body);
    if (req.params) req.params = xssFilter(req.params);
    if (req.query) req.query = xssFilter(req.query);
    next();
  });
  
  // Apply advanced security headers
  app.use(setAdvancedSecurityHeaders);
}; 