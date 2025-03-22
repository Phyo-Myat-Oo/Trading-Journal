import { Response, Request, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';

// HTTP Status codes
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  REQUEST_TIMEOUT = 408,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500
}

// Standard error response interface
export interface ErrorResponse {
  success: boolean;
  message: string;
  errors?: any[] | null;
  stack?: string;
}

/**
 * Send a success response
 */
export const sendSuccess = (
  res: Response,
  data: any = null,
  message = 'Success',
  statusCode = HttpStatus.OK
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Send an error response
 */
export const sendError = (
  res: Response,
  message = 'Error occurred',
  statusCode = HttpStatus.INTERNAL_SERVER_ERROR,
  errors: any[] | null = null
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
    stack: process.env.NODE_ENV === 'development' ? new Error().stack : undefined
  });
};

/**
 * Create an AppError instance
 */
export const createError = (
  message: string,
  statusCode = HttpStatus.INTERNAL_SERVER_ERROR,
  isOperational = true
): AppError => {
  return new AppError(message, statusCode, isOperational);
};

/**
 * Handle async errors in controllers
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}; 