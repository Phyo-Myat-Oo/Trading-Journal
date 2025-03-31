import { BaseService } from './BaseService';
import { User, IUser } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { HttpStatus } from '../utils/errorResponse';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import crypto from 'crypto';

export class UserService extends BaseService<IUser> {
  constructor() {
    super(User);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return await User.findOne({ email: email.toLowerCase() });
  }

  async validatePassword(user: IUser, password: string): Promise<boolean> {
    return await user.comparePassword(password);
  }

  async generateAuthToken(user: IUser): Promise<string> {
    return jwt.sign(
      { id: user._id, role: user.role },
      config.jwtSecret,
      { expiresIn: '1d' }
    );
  }

  async generatePasswordResetToken(user: IUser): Promise<string> {
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();
    return resetToken;
  }

  async updatePassword(user: IUser, newPassword: string): Promise<void> {
    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();
  }

  async updateTwoFactor(user: IUser, enabled: boolean, secret?: string): Promise<void> {
    user.twoFactorEnabled = enabled;
    if (secret) {
      user.twoFactorSecret = secret;
    }
    await user.save();
  }

  async searchUsers(query: string, page: number = 1, limit: number = 10) {
    const searchRegex = new RegExp(query, 'i');
    const users = await User.find({
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex }
      ]
    })
    .select('-password')
    .skip((page - 1) * limit)
    .limit(limit);

    const total = await User.countDocuments({
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex }
      ]
    });

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async updateUserRole(userId: string, newRole: 'user' | 'admin'): Promise<IUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', HttpStatus.NOT_FOUND);
    }
    user.role = newRole;
    await user.save();
    return user;
  }

  async sendEmailVerification(email: string, token: string): Promise<void> {
    // TODO: Implement email sending logic using your email service
    // For development, just log the verification link
    if (process.env.NODE_ENV === 'development') {
      console.log(`Email verification link: ${config.frontendUrl}/verify-email?token=${token}`);
      return;
    }

    // Example email sending logic (replace with your email service implementation)
    // await sendEmail({
    //   to: email,
    //   subject: 'Verify Your New Email Address',
    //   text: `Please click the following link to verify your new email address: ${config.frontendUrl}/verify-email?token=${token}`,
    //   html: `
    //     <p>Please click the following link to verify your new email address:</p>
    //     <a href="${config.frontendUrl}/verify-email?token=${token}">Verify Email</a>
    //     <p>This link will expire in 24 hours.</p>
    //   `
    // });
  }
} 