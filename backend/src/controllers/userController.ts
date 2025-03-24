import { Request, Response, NextFunction } from 'express';
import { BaseController } from './BaseController';
import { UserService } from '../services/UserService';
import { IUser } from '../models/User';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import { HttpStatus } from '../utils/errorResponse';
import { logAdminActivity } from '../utils/adminLogger';
import { AdminActionType } from '../models/AdminActivityLog';
import { TokenEvent } from '../models/TokenEvent';
import { User } from '../models/User';
import { AdminActivityLog } from '../models/AdminActivityLog';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';

// Validation schemas
const updateUserSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').optional(),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])[A-Za-z\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]{8,}$/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    )
    .optional(),
});

export class UserController extends BaseController<IUser> {
  constructor(protected userService: UserService) {
    super(userService);
  }

  // Core user operations
  getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.id) {
        throw new AppError('User not authenticated', HttpStatus.UNAUTHORIZED);
      }

      const user = await this.userService.findById(req.user.id);
      if (!user) {
        throw new AppError('User not found', HttpStatus.NOT_FOUND);
      }

      res.status(HttpStatus.OK).json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.id) {
        throw new AppError('User not authenticated', HttpStatus.UNAUTHORIZED);
      }

      const validatedData = updateUserSchema.parse(req.body);
      const user = await this.userService.findById(req.user.id);

      if (!user) {
        throw new AppError('User not found', HttpStatus.NOT_FOUND);
      }

      // Verify current password if trying to update password
      if (validatedData.newPassword) {
        const isPasswordValid = await this.userService.validatePassword(user, validatedData.currentPassword);
        if (!isPasswordValid) {
          throw new AppError('Current password is incorrect', HttpStatus.UNAUTHORIZED);
        }
        
        // Check if the new password is in the password history
        const isPasswordInHistory = await user.isPasswordInHistory(validatedData.newPassword);
        if (isPasswordInHistory) {
          throw new AppError(
            'New password cannot be the same as any of your recent passwords. Please choose a different password.',
            HttpStatus.BAD_REQUEST
          );
        }
      }

      // Update fields if provided
      if (validatedData.firstName) user.firstName = validatedData.firstName;
      if (validatedData.lastName) user.lastName = validatedData.lastName;
      if (validatedData.email) user.email = validatedData.email;
      if (validatedData.newPassword) await this.userService.updatePassword(user, validatedData.newPassword);

      await user.save();

      res.status(HttpStatus.OK).json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.id) {
        throw new AppError('User not authenticated', HttpStatus.UNAUTHORIZED);
      }

      const { currentPassword, newPassword } = req.body;
      const user = await this.userService.findById(req.user.id);

      if (!user) {
        throw new AppError('User not found', HttpStatus.NOT_FOUND);
      }

      const isPasswordValid = await this.userService.validatePassword(user, currentPassword);
      if (!isPasswordValid) {
        throw new AppError('Current password is incorrect', HttpStatus.UNAUTHORIZED);
      }

      await this.userService.updatePassword(user, newPassword);

      res.status(HttpStatus.OK).json({
        success: true,
        message: 'Password updated successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  deleteAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.id) {
        throw new AppError('User not authenticated', HttpStatus.UNAUTHORIZED);
      }

      const user = await this.userService.findById(req.user.id);
      if (!user) {
        throw new AppError('User not found', HttpStatus.NOT_FOUND);
      }

      await this.userService.delete(req.user.id);

      res.status(HttpStatus.OK).json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Security operations
  getSecurityStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.id) {
        throw new AppError('User not authenticated', HttpStatus.UNAUTHORIZED);
      }

      const user = await this.userService.findById(req.user.id);
      if (!user) {
        throw new AppError('User not found', HttpStatus.NOT_FOUND);
      }

      res.status(HttpStatus.OK).json({
        success: true,
        data: {
          twoFactorEnabled: user.twoFactorEnabled,
          lastPasswordChange: user.passwordChangedAt,
          failedLoginAttempts: user.failedLoginAttempts,
          accountLocked: user.accountLocked,
          accountLockedUntil: user.accountLockedUntil
        }
      });
    } catch (error) {
      next(error);
    }
  };

  getUserActivityLog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.id) {
        throw new AppError('User not authenticated', HttpStatus.UNAUTHORIZED);
      }

      const logs = await AdminActivityLog.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .limit(50);

      res.status(HttpStatus.OK).json({
        success: true,
        data: logs
      });
    } catch (error) {
      next(error);
    }
  };

  setupTwoFactor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.id) {
        throw new AppError('User not authenticated', HttpStatus.UNAUTHORIZED);
      }

      const user = await this.userService.findById(req.user.id);
      if (!user) {
        throw new AppError('User not found', HttpStatus.NOT_FOUND);
      }

      const secret = speakeasy.generateSecret({
        name: `TradingJournal:${user.email}`
      });

      // Store the temporary secret
      user.twoFactorTempSecret = secret.base32;
      await user.save();

      const qrCode = await QRCode.toDataURL(secret.otpauth_url || '');

      res.status(HttpStatus.OK).json({
        success: true,
        data: {
          secret: secret.base32,
          qrCode
        }
      });
    } catch (error) {
      next(error);
    }
  };

  verifyAndEnableTwoFactor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.id) {
        throw new AppError('User not authenticated', HttpStatus.UNAUTHORIZED);
      }

      const { token } = req.body;
      const user = await this.userService.findById(req.user.id);

      if (!user) {
        throw new AppError('User not found', HttpStatus.NOT_FOUND);
      }

      // Check if temporary secret exists
      if (!user.twoFactorTempSecret) {
        throw new AppError('Two-factor authentication setup not initiated', HttpStatus.BAD_REQUEST);
      }

      // Verify the token with a window of 1 step (30 seconds) before and after
      const isValid = speakeasy.totp.verify({
        secret: user.twoFactorTempSecret,
        encoding: 'base32',
        token,
        window: 1 // Allow tokens from 30 seconds before and after the current time
      });

      if (!isValid) {
        throw new AppError('Invalid 2FA token. Please make sure to enter the code quickly after it appears.', HttpStatus.BAD_REQUEST);
      }

      // Enable 2FA and move temporary secret to permanent secret
      user.twoFactorEnabled = true;
      user.twoFactorSecret = user.twoFactorTempSecret;
      user.twoFactorTempSecret = undefined;
      await user.save();

      res.status(HttpStatus.OK).json({
        success: true,
        message: 'Two-factor authentication enabled successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  disableTwoFactor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.id) {
        throw new AppError('User not authenticated', HttpStatus.UNAUTHORIZED);
      }

      const user = await this.userService.findById(req.user.id);
      if (!user) {
        throw new AppError('User not found', HttpStatus.NOT_FOUND);
      }

      await this.userService.updateTwoFactor(user, false);

      res.status(HttpStatus.OK).json({
        success: true,
        message: 'Two-factor authentication disabled successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Admin operations
  searchUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { query, page, limit } = req.query;
      const result = await this.userService.searchUsers(
        query as string,
        Number(page) || 1,
        Number(limit) || 10
      );

      res.status(HttpStatus.OK).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  updateUserRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      const updatedUser = await this.userService.updateUserRole(userId, role);

      await logAdminActivity(
        req.user?.id || '',
        AdminActionType.ROLE_UPDATE,
        userId,
        `Updated role for user ${updatedUser.email} to ${role}`
      );

      res.status(HttpStatus.OK).json({
        success: true,
        data: updatedUser
      });
    } catch (error) {
      next(error);
    }
  };

  // Authentication methods
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Check if user already exists
      const existingUser = await this.userService.findByEmail(email);
      if (existingUser) {
        throw new AppError('User already exists', HttpStatus.BAD_REQUEST);
      }

      // Create new user
      const user = await this.userService.create({
        email,
        password,
        firstName,
        lastName
      });

      // Log the registration event
      await TokenEvent.create({
        userId: user._id,
        eventType: 'REGISTRATION',
        details: 'User registered successfully',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      res.status(HttpStatus.CREATED).json({
        success: true,
        message: 'User registered successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await this.userService.findByEmail(email);
      if (!user) {
        throw new AppError('Invalid credentials', HttpStatus.UNAUTHORIZED);
      }

      // Check if account is locked
      if (user.accountLocked && user.accountLockedUntil && user.accountLockedUntil > new Date()) {
        throw new AppError('Account is locked. Please try again later.', HttpStatus.UNAUTHORIZED);
      }

      // Verify password
      const isMatch = await this.userService.validatePassword(user, password);
      if (!isMatch) {
        // Increment login attempts
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
        
        // Lock account if too many attempts
        if (user.failedLoginAttempts >= 5) {
          user.accountLocked = true;
          user.accountLockedUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
          user.previousLockouts = (user.previousLockouts || 0) + 1;
        }
        
        await user.save();
        throw new AppError('Invalid credentials', HttpStatus.UNAUTHORIZED);
      }

      // Reset login attempts on successful login
      user.failedLoginAttempts = 0;
      user.accountLocked = false;
      user.accountLockedUntil = undefined;
      user.lastLogin = new Date();
      await user.save();

      // Log the login event
      await TokenEvent.create({
        userId: user._id,
        eventType: 'LOGIN',
        details: 'User logged in successfully',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      // Generate tokens
      const accessToken = await this.userService.generateAuthToken(user);

      res.status(HttpStatus.OK).json({
        success: true,
        data: {
          accessToken,
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
          }
        }
      });
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body;

      // Find user
      const user = await this.userService.findByEmail(email);
      if (!user) {
        // Don't reveal if email exists
        res.status(HttpStatus.OK).json({
          success: true,
          message: 'If an account exists with this email, a password reset link will be sent.'
        });
        return;
      }

      // Generate reset token
      const resetToken = await this.userService.generatePasswordResetToken(user);

      // TODO: Send reset email
      // For now, just return the token in development
      if (process.env.NODE_ENV === 'development') {
        res.status(HttpStatus.OK).json({
          success: true,
          data: { resetToken }
        });
        return;
      }

      res.status(HttpStatus.OK).json({
        success: true,
        message: 'If an account exists with this email, a password reset link will be sent.'
      });
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token, newPassword } = req.body;

      // Find user by reset token
      const user = await User.findOne({
        resetPasswordToken: crypto
          .createHash('sha256')
          .update(token)
          .digest('hex'),
        resetPasswordExpires: { $gt: Date.now() }
      });

      if (!user) {
        throw new AppError('Password reset token is invalid or has expired', HttpStatus.BAD_REQUEST);
      }

      // Set new password
      await this.userService.updatePassword(user, newPassword);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      // Log the password reset event
      await TokenEvent.create({
        userId: user._id,
        eventType: 'PASSWORD_RESET',
        details: 'Password reset successful',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      res.status(HttpStatus.OK).json({
        success: true,
        message: 'Password has been reset successfully'
      });
    } catch (error) {
      next(error);
    }
  };
}

// Export a singleton instance
export const userController = new UserController(new UserService()); 