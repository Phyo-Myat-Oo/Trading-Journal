import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

// Custom error class for application errors
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  
  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Type for error response
interface ErrorResponse {
  success: boolean;
  message: string;
  errors: { field: string; message: string }[] | null;
  stack?: string;
}

export const errorHandler = (
  err: Error | AppError | ZodError | any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Log the error
  logger.error(`${req.method} ${req.path} - Error:`, err);
  
  // Default error response
  const errorResponse: ErrorResponse = {
    success: false,
    message: 'Internal server error',
    errors: null,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  };
  
  // Custom AppError instance
  if (err instanceof AppError) {
    errorResponse.message = err.message;
    return res.status(err.statusCode).json(errorResponse);
  }
  
  // Zod validation errors
  if (err instanceof ZodError) {
    errorResponse.message = 'Validation error';
    errorResponse.errors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));
    return res.status(400).json(errorResponse);
  }

  // Handle validation errors (Mongoose)
  if (err.name === 'ValidationError') {
    errorResponse.message = 'Validation Error';
    errorResponse.errors = Object.values(err).map((error: any) => ({
      field: error.path,
      message: error.message
    }));
    return res.status(400).json(errorResponse);
  }

  // Handle MongoDB duplicate key errors
  if (err.name === 'MongoError' && (err as any).code === 11000) {
    errorResponse.message = 'Duplicate key error';
    errorResponse.errors = [{
      field: Object.keys((err as any).keyPattern)[0],
      message: 'Value already exists'
    }];
    return res.status(400).json(errorResponse);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    errorResponse.message = 'Invalid token';
    return res.status(401).json(errorResponse);
  }

  if (err.name === 'TokenExpiredError') {
    errorResponse.message = 'Token expired';
    return res.status(401).json(errorResponse);
  }

  // Handle other custom error types as needed
  
  // Default error (uncaught exceptions)
  res.status(500).json(errorResponse);
}; 