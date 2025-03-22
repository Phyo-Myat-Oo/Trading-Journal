import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { HttpStatus } from '../utils/HttpStatus';
import { IUser } from '../types/models';

export const authorize = (roles: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized - No user found', HttpStatus.UNAUTHORIZED);
      }

      const user = req.user as IUser;
      if (roles.length && !roles.includes(user.role)) {
        throw new AppError(
          'Forbidden - Insufficient permissions',
          HttpStatus.FORBIDDEN
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}; 