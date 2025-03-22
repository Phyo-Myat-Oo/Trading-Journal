import { Request, Response, NextFunction } from 'express';

type ExpressHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

/**
 * Async handler to wrap async route handlers and handle errors
 * This eliminates the need for try/catch blocks in each controller
 * @param fn Async function to handle the route
 * @returns Express middleware function
 */
export const asyncHandler = (fn: ExpressHandler) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
}; 