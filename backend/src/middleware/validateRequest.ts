import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { logger } from '../utils/logger';

/**
 * Middleware to validate request data using Zod schemas
 * @param schema Zod schema to validate against
 * @param source Which part of the request to validate (body, query, params)
 */
export const validateRequest = (
  schema: AnyZodObject,
  source: 'body' | 'query' | 'params' = 'body'
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await schema.parseAsync(req[source]);
      // Replace the request data with the validated and transformed data
      req[source] = data;
      next();
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        logger.warn(`Validation error in ${req.method} ${req.path}:`, {
          errors: error.errors,
          data: req[source]
        });
        
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(error);
    }
  };
};

/**
 * Validate multiple parts of a request at once
 */
export const validateRequestMultiple = (schemas: {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const results = await Promise.all(
        Object.entries(schemas).map(async ([key, schema]) => {
          const source = key as 'body' | 'query' | 'params';
          const data = await schema.parseAsync(req[source]);
          return { source, data };
        })
      );
      
      // Update the request with validated data
      results.forEach(({ source, data }) => {
        req[source] = data;
      });
      
      next();
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(error);
    }
  };
}; 