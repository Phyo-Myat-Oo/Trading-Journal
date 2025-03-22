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
 */
export const setCSP = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: https:; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self'"
  );
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
}; 