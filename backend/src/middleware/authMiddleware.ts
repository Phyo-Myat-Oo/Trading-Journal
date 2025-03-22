import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { createError, HttpStatus } from '../utils/errorResponse';
import { config } from '../config';

/**
 * Authenticate middleware - verifies JWT token and attaches user to request
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(createError('Authentication required', HttpStatus.UNAUTHORIZED));
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next(createError('Authentication token missing', HttpStatus.UNAUTHORIZED));
    }

    // Verify token
    try {
      const decoded = jwt.verify(
        token,
        config.jwt.secret as jwt.Secret
      ) as { 
        id: string; 
        email?: string;
        role?: string;
        type?: string;
        iat?: number;
        exp?: number;
      };
      
      // Additional validation
      if (decoded.type !== 'access') {
        return next(createError('Invalid token type', HttpStatus.UNAUTHORIZED));
      }
      
      // Find user by id from token
      const user = await User.findById(decoded.id);
      if (!user) {
        return next(createError('User not found', HttpStatus.UNAUTHORIZED));
      }
      
      // Check if the token was issued before the user's password was changed
      // This is an extra security measure to invalidate tokens when password changes
      if (user.passwordChangedAt) {
        const passwordChangedTimestamp = Math.floor(user.passwordChangedAt.getTime() / 1000);
        if (decoded.iat && decoded.iat < passwordChangedTimestamp) {
          return next(createError('Password recently changed, please login again', HttpStatus.UNAUTHORIZED));
        }
      }

      // Attach user to request object
      req.user = user;
      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return next(createError('Invalid token', HttpStatus.UNAUTHORIZED));
      }
      if (error instanceof jwt.TokenExpiredError) {
        return next(createError('Token expired', HttpStatus.UNAUTHORIZED));
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Authorize middleware - restricts access based on user role
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createError('Authentication required', HttpStatus.UNAUTHORIZED));
    }

    const userRole = 'role' in req.user ? req.user.role : 'user';
    
    if (!roles.includes(userRole)) {
      return next(
        createError(
          'You do not have permission to perform this action',
          HttpStatus.FORBIDDEN
        )
      );
    }
    next();
  };
}; 