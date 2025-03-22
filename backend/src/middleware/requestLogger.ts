import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Sanitizes request body to mask sensitive fields before logging
 */
const sanitizeRequestBody = (body: any) => {
  if (!body) return undefined;
  
  // Create a deep clone of the body
  const sanitized = JSON.parse(JSON.stringify(body));
  
  // List of sensitive fields to mask
  const sensitiveFields = ['password', 'newPassword', 'confirmPassword', 'currentPassword', 'token', 'accessToken', 'refreshToken'];
  
  // Recursively mask sensitive fields
  const maskSensitiveData = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    
    Object.keys(obj).forEach(key => {
      if (sensitiveFields.includes(key.toLowerCase())) {
        obj[key] = '******'; // Replace value with asterisks
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        maskSensitiveData(obj[key]); // Recursively check nested objects
      }
    });
  };
  
  maskSensitiveData(sanitized);
  return sanitized;
};

/**
 * Middleware to log all incoming requests and assign a request ID
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  // Create a unique request ID
  const requestId = logger.requestId.create();
  
  // Store in request object for later use
  (req as any).requestId = requestId;
  
  // Sanitize the request body for logging
  const sanitizedBody = req.method !== 'GET' ? sanitizeRequestBody(req.body) : undefined;
  
  // Log the incoming request
  logger.info(
    `Request received: ${req.method} ${req.originalUrl}`,
    {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      params: req.params,
      query: req.query,
      body: sanitizedBody
    },
    requestId
  );
  
  // Capture response time
  const startTime = Date.now();
  
  // Log response when sent
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    const logMethod = statusCode >= 400 ? 'warn' : 'info';
    
    logger[logMethod](
      `Response sent: ${statusCode} ${res.statusMessage} - ${duration}ms`,
      {
        method: req.method,
        url: req.originalUrl,
        statusCode,
        duration
      },
      requestId
    );
  });
  
  next();
}; 