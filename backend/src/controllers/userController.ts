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
import jwt from 'jsonwebtoken';
import cloudinary from '../config/cloudinary';
import { emailService } from '../utils/emailService';

// Validation schemas
const updateUserSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').optional(),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  currentPassword: z.string().min(1, 'Current password is required').optional(),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])[A-Za-z\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]{8,}$/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    )
    .optional(),
  phone: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  language: z.string().optional(),
  notifications: z.object({
    email: z.boolean(),
    push: z.boolean(),
    sms: z.boolean()
  }).optional(),
  profilePicture: z.string().optional()
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

      // Prevent email changes for Google OAuth users
      if (validatedData.email && user.provider === 'google') {
        throw new AppError('Google OAuth users cannot change their email address', HttpStatus.BAD_REQUEST);
      }

      // Check if email is being updated and if it's already in use
      if (validatedData.email && validatedData.email !== user.email) {
        const existingUser = await this.userService.findByEmail(validatedData.email);
        if (existingUser) {
          throw new AppError('Email is already in use', HttpStatus.BAD_REQUEST);
        }

        // Generate verification token
        const verificationToken = jwt.sign(
          { id: user._id, newEmail: validatedData.email },
          process.env.JWT_SECRET || 'default_secret',
          { expiresIn: '24h' }
        );

        // Store pending email and verification token
        user.pendingEmail = validatedData.email;
        user.verificationToken = verificationToken;

        // Send verification email
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        await emailService.sendVerificationEmail({
          email: validatedData.email, // Send to new email
          firstName: user.firstName,
          token: verificationToken,
          frontendUrl,
          isEmailChange: true
        });

        // Remove email from validatedData so it's not updated until verified
        delete validatedData.email;

        // Clear user's session since they need to verify email
        if (req.session) {
          req.session.destroy(() => {
            console.log('Session destroyed after initiating email change');
          });
        }

        // Set headers to clear client-side tokens
        res.setHeader('Clear-Site-Data', '"cookies", "storage"');
      }

      // Update other fields if provided
      if (validatedData.firstName) user.firstName = validatedData.firstName;
      if (validatedData.lastName) user.lastName = validatedData.lastName;
      if (validatedData.phone) user.phone = validatedData.phone;
      if (validatedData.timezone) user.timezone = validatedData.timezone;
      if (validatedData.currency) user.currency = validatedData.currency;
      if (validatedData.language) user.language = validatedData.language;
      if (validatedData.notifications) user.notifications = validatedData.notifications;
      if (validatedData.profilePicture) user.profilePicture = validatedData.profilePicture;

      // Handle password update
      if (validatedData.newPassword) {
        if (!validatedData.currentPassword) {
          throw new AppError('Current password is required to update password', HttpStatus.BAD_REQUEST);
        }

        const isPasswordValid = await this.userService.validatePassword(user, validatedData.currentPassword);
        if (!isPasswordValid) {
          throw new AppError('Current password is incorrect', HttpStatus.UNAUTHORIZED);
        }
        
        const isPasswordInHistory = await user.isPasswordInHistory(validatedData.newPassword);
        if (isPasswordInHistory) {
          throw new AppError(
            'New password cannot be the same as any of your recent passwords. Please choose a different password.',
            HttpStatus.BAD_REQUEST
          );
        }

        await this.userService.updatePassword(user, validatedData.newPassword);
      }

      await user.save();

      res.status(HttpStatus.OK).json({
        success: true,
        data: user,
        message: validatedData.email ? 'A verification email has been sent to your new email address. Please verify to complete the email change. You will be logged out.' : undefined,
        requiresLogout: !!validatedData.email
      });
    } catch (error) {
      next(error);
    }
  };

  verifyEmailChange = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('Starting email verification process');
      const { token } = req.body;

      if (!token) {
        throw new AppError('Verification token is required', HttpStatus.BAD_REQUEST);
      }

      // Verify and decode the token
      let decoded;
      try {
        console.log('Verifying JWT token');
        decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret') as { id: string; newEmail: string };
        console.log('Decoded token:', { userId: decoded.id, newEmail: decoded.newEmail });
      } catch (error) {
        console.error('Token verification failed:', error);
        throw new AppError('Invalid or expired verification token', HttpStatus.BAD_REQUEST);
      }

      // Find user by ID from token
      console.log('Finding user with ID:', decoded.id);
      const user = await User.findById(decoded.id);
      if (!user) {
        throw new AppError('User not found', HttpStatus.NOT_FOUND);
      }

      console.log('Current user state:', {
        currentEmail: user.email,
        pendingEmail: user.pendingEmail,
        hasVerificationToken: !!user.verificationToken
      });

      // Verify pending email matches the email in token
      if (!user.pendingEmail || user.pendingEmail !== decoded.newEmail) {
        console.error('Email mismatch:', {
          pendingEmail: user.pendingEmail,
          tokenEmail: decoded.newEmail
        });
        throw new AppError('Invalid email verification request', HttpStatus.BAD_REQUEST);
      }

      console.log('Updating email from', user.email, 'to', user.pendingEmail);

      // Update email and clear verification fields
      const oldEmail = user.email;
      user.email = user.pendingEmail;
      user.pendingEmail = undefined;
      user.verificationToken = undefined;

      // Save user document
      try {
        await user.save();
        console.log('User document after save:', user.toObject());
      } catch (saveError) {
        console.error('Error saving user:', saveError);
        throw saveError;
      }

      // Log the email change event
      await TokenEvent.create({
        userId: user._id,
        eventType: 'EMAIL_CHANGE',
        details: `Email changed from ${oldEmail} to ${user.email}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      // Clear user's session and client-side data
      if (req.session) {
        req.session.destroy(() => {
          console.log('User session destroyed');
        });
      }

      // Set headers to clear client-side tokens
      res.setHeader('Clear-Site-Data', '"cookies", "storage"');

      res.status(HttpStatus.OK).json({
        success: true,
        message: 'Email changed successfully. Please log in with your new email address.',
        requiresLogin: true
      });
    } catch (error) {
      console.error('Email verification failed:', error);
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
            role: user.role,
            profilePicture: user.profilePicture || null
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

  updateProfilePicture = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.id) {
        throw new AppError('User not authenticated', HttpStatus.UNAUTHORIZED);
      }

      if (!req.file) {
        throw new AppError('No file uploaded', HttpStatus.BAD_REQUEST);
      }

      const user = await this.userService.findById(req.user.id);
      if (!user) {
        throw new AppError('User not found', HttpStatus.NOT_FOUND);
      }

      // Delete old profile picture from Cloudinary if exists
      if (user.profilePicture) {
        const publicId = user.profilePicture.split('/').pop()?.split('.')[0];
        if (publicId) {
          try {
            await cloudinary.uploader.destroy(`trading-journal/avatars/${publicId}`);
          } catch (error) {
            console.error('Error deleting old profile picture:', error);
          }
        }
      }

      // Upload new profile picture to Cloudinary
      const result = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
        {
          folder: 'trading-journal/avatars',
          resource_type: 'auto',
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto' }
          ]
        }
      );

      // Update user profile picture URL
      user.profilePicture = result.secure_url;
      await user.save();

      res.status(HttpStatus.OK).json({
        success: true,
        data: {
          profilePicture: user.profilePicture
        }
      });
    } catch (error) {
      next(error);
    }
  };
}

// Export a singleton instance
export const userController = new UserController(new UserService()); 