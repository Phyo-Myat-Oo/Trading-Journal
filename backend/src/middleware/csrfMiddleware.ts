import csrf from 'csurf';
import { Request, Response, NextFunction } from 'express';

// Initialize CSRF protection
export const csrfProtection = csrf({
  cookie: {
    key: '_csrf',
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 3600 // 1 hour
  }
});

/**
 * Middleware to provide CSRF token to client
 */
export const setCsrfToken = (req: Request, res: Response, next: NextFunction) => {
  // Set CSRF token on response object
  res.locals.csrfToken = req.csrfToken();
  
  // Attach CSRF token to response header for easy access by frontends
  res.setHeader('X-CSRF-Token', req.csrfToken());
  
  next();
};

/**
 * Error handler for CSRF token validation errors
 */
export const handleCsrfError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.code === 'EBADCSRFTOKEN') {
    // Send forbidden response if CSRF validation fails
    return res.status(403).json({
      status: 'error',
      message: 'Invalid or expired CSRF token. Please refresh the page and try again.',
      code: 'INVALID_CSRF_TOKEN'
    });
  }
  
  // Pass other errors to next error handler
  next(err);
};

/**
 * Route to get a new CSRF token
 */
export const getCsrfToken = (req: Request, res: Response) => {
  return res.json({
    csrfToken: req.csrfToken()
  });
};

// Add CSRF token method to Express Request interface
export {};

declare global {
  namespace Express {
    interface Request {
      csrfToken(): string;
    }
  }
} 