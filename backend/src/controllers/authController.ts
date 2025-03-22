import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { Types } from 'mongoose';
import { registerSchema, loginSchema, resetPasswordSchema, updatePasswordSchema } from '../schemas/authSchema';
import { emailService } from '../utils/emailService';
import { z } from 'zod';
import { config } from '../config';
import { CookieOptions } from 'express';
import * as tokenService from '../services/tokenService';

/**
 * Register a new user
 * @route POST /api/auth/register
 */
export const register = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    // Validate input using Zod schema
      const validatedData = registerSchema.parse(req.body);
      const { email, password, firstName, lastName } = validatedData;
      
    // Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

    // Create new user
    const user = new User({
        email,
      password,
        firstName,
      lastName
      });

      // Generate verification token
      const verificationToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'default_secret',
        { expiresIn: '24h' }
      );

    // Save token to user
    user.verificationToken = verificationToken;
    
    // Save user to database
    await user.save();

      // Send verification email
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    try {
      await emailService.sendVerificationEmail({
          email: user.email,
          firstName: user.firstName,
        token: verificationToken,
        frontendUrl
      });
      console.log(`Verification email sent to ${user.email}`);
    } catch (error) {
      console.error('Error sending verification email:', error);
      // Don't return error to client for security reasons
    }

    // Return success response (don't return the whole user object for security)
    res.status(201).json({
      message: 'User registered successfully. Please check your email to verify your account.',
      userId: user._id
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

/**
 * Login a user
 * @route POST /api/auth/login
 */
export const login = async (req: Request, res: Response) => {
  try {
    // Validate input using Zod schema
    const validatedData = loginSchema.parse(req.body);
    const { email, password } = validatedData;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(401).json({ 
        message: 'Email not verified. Please check your email for verification link.',
        requiresVerification: true 
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate access token
    const accessToken = tokenService.generateAccessToken(user);
    
    // Generate refresh token with context information
    const { token: refreshToken, expiresAt } = await tokenService.generateRefreshToken(user, req);

    // Set refresh token in HTTP-only cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: expiresAt.getTime() - Date.now() // Use actual expiration time from token
    };
    
    res.cookie('refreshToken', refreshToken, cookieOptions as CookieOptions);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Return success response
    res.status(200).json({
      message: 'Login successful',
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData = resetPasswordSchema.parse(req.body);
    const { email } = validatedData;
    
    console.log(`[requestPasswordReset] Processing reset request for email: ${email}`);

    const user = await User.findOne({ email }) as IUser & { _id: Types.ObjectId };
    
    // For security reasons, always return a successful response
    // even if the user doesn't exist - but DON'T actually send an email
    if (!user) {
      console.log(`[requestPasswordReset] User not found with email: ${email}, skipping email send`);
      // Still return success to prevent email enumeration
      return res.json({ message: 'Password reset email sent' });
    }

    // Generate reset token - IMPORTANT: Use the same secret as in resetPassword
    console.log(`[requestPasswordReset] User found, generating reset token for user ID: ${user._id.toString()}`);
    const secret = process.env.JWT_SECRET || 'default_secret';
    console.log(`[requestPasswordReset] Using JWT secret (length): ${secret.length}`);

    const resetToken = jwt.sign(
      { id: user._id.toString() },
      secret,
      { expiresIn: '1h' }
    );

    // Send reset email (using same pattern as verification email)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    console.log(`[requestPasswordReset] Using frontendUrl: ${frontendUrl}`);

    try {
      console.log(`[requestPasswordReset] Attempting to send reset email to: ${email}`);
        await emailService.sendResetPasswordEmail(email, resetToken);
      console.log(`[requestPasswordReset] Reset email sent successfully to: ${email}`);
    } catch (emailError) {
      console.error('[requestPasswordReset] Error sending reset email:', emailError);
      // Don't return error to client for security reasons
    }

    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('[requestPasswordReset] Password reset request error:', error);
    res.status(500).json({ message: 'Error requesting password reset' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    console.log('[resetPassword] Attempting to reset password with token');
    console.log('[resetPassword] Request body:', { token: token ? 'provided' : 'missing', passwordLength: password?.length });
    
    // Ensure we're using the correct validation schema
    try {
      updatePasswordSchema.parse(req.body);
    } catch (validationError) {
      console.error('[resetPassword] Validation error:', validationError);
      return res.status(400).json({ 
        message: 'Invalid input', 
        errors: validationError instanceof z.ZodError ? validationError.errors : [] 
      });
    }
    
    // Verify token using same secret as when creating the token
    let decoded;
    try {
      // IMPORTANT: Use the same secret that was used to generate the token
      // in the requestPasswordReset function
      const secret = process.env.JWT_SECRET || 'default_secret';
      console.log('[resetPassword] Verifying token with secret key (secret length):', secret.length);
      
      decoded = jwt.verify(token, secret) as { id: string };
      console.log('[resetPassword] Token verified successfully, decoded:', decoded);
    } catch (tokenError) {
      console.error('[resetPassword] Token verification failed:', tokenError);
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    if (!decoded || !decoded.id) {
      console.error('[resetPassword] Invalid token payload, missing id');
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Find user
    console.log('[resetPassword] Looking for user with ID:', decoded.id);
    const user = await User.findById(decoded.id) as IUser & { _id: Types.ObjectId };
    if (!user) {
      console.error('[resetPassword] User not found for ID:', decoded.id);
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('[resetPassword] User found:', user.email);

    // Hash new password
    try {
      // Updating the password on the model will trigger the pre-save hook
      // which will hash the password automatically
      user.password = password;
    await user.save();
      console.log('[resetPassword] Password updated and saved successfully');
    } catch (saveError) {
      console.error('[resetPassword] Error saving new password:', saveError);
      return res.status(500).json({ message: 'Error updating password' });
    }

    console.log('[resetPassword] Password reset successful for user:', user.email);

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('[resetPassword] Password reset error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    // Get refresh token from cookie instead of request body
    const refreshToken = req.cookies.refreshToken;
    
    console.log('Refresh token request received');
    
    if (!refreshToken) {
      console.log('No refresh token found in cookies');
      return res.status(401).json({ 
        message: 'Refresh token not found'
      });
    }

    // Verify and validate refresh token
    const { userId, jti, isValid } = await tokenService.verifyRefreshToken(refreshToken);
    
    if (!isValid) {
      console.log('Invalid or revoked refresh token');
      return res.status(401).json({ 
        message: 'Invalid refresh token',
        code: 'INVALID_TOKEN'
      });
    }

    // Find user
    const user = await User.findById(userId) as IUser;
    if (!user) {
      console.log('User not found for id:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    // Revoke the current refresh token (one-time use)
    await tokenService.revokeRefreshToken(jti);
    
    // Generate new access token
    const newAccessToken = tokenService.generateAccessToken(user);
    
    // Generate new refresh token
    const { token: newRefreshToken, expiresAt } = await tokenService.generateRefreshToken(user, req);
    
    // Set the new refresh token as a cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: expiresAt.getTime() - Date.now() // Use actual expiration time from token
    };
    
    res.cookie('refreshToken', newRefreshToken, cookieOptions as CookieOptions);

    // Return the new access token
    return res.status(200).json({
      message: 'Token refreshed successfully',
      accessToken: newAccessToken
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    return res.status(500).json({ message: 'Server error during token refresh' });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    // Get the refresh token from the cookie
    const refreshToken = req.cookies.refreshToken;
    
    if (refreshToken) {
      // Attempt to verify and revoke the token
      try {
        const { jti, isValid } = await tokenService.verifyRefreshToken(refreshToken);
        
        if (isValid && jti) {
          // Revoke the specific token
          await tokenService.revokeRefreshToken(jti);
          console.log(`Revoked refresh token with jti: ${jti}`);
        }
        
        // If user is authenticated, revoke all their tokens for complete logout
        if (req.user?.id) {
          const count = await tokenService.revokeAllUserTokens(new Types.ObjectId(req.user.id));
          console.log(`Revoked all ${count} tokens for user: ${req.user.id}`);
        }
      } catch (error) {
        console.error('Error revoking token during logout:', error);
        // Continue with logout even if token revocation fails
      }
    }
    
    // Clear the refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/'
    });
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error during logout' });
  }
};

// Debug endpoint to check cookie settings
export const checkCookies = async (req: Request, res: Response) => {
  // Check if this is a silent request from the frontend
  const isSilentRequest = req.headers['x-silent-request'] === 'true';
  
  // Only log if not a silent request
  if (!isSilentRequest) {
    console.log('Checking cookies...');
    console.log('All cookies:', req.cookies);
    console.log('Headers:', req.headers);
  }

  // Set a test cookie
  res.cookie('testCookie', 'test-value', {
    httpOnly: true,
    secure: false, // Disable secure for local development
    sameSite: 'lax',
    maxAge: 60 * 1000, // 1 minute
    path: '/'
  });

  return res.json({
    message: 'Cookie check completed',
    cookies: req.cookies,
    refreshTokenExists: !!req.cookies.refreshToken,
    environment: process.env.NODE_ENV || 'development'
  });
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'Verification token is required' });
    }
    
    console.log('Verifying email with token');
    
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret) as { id: string };
    } catch (tokenError) {
      console.error('Token verification failed:', tokenError);
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Find user
    const user = await User.findById(decoded.id) as IUser & { _id: Types.ObjectId };
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // If user is already verified, just return success
    if (user.isVerified) {
      return res.json({ message: 'Email already verified' });
    }

    // Update user verification status
    user.isVerified = true;
    await user.save();
    
    console.log('Email verified successfully for user:', user.email);
    
    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Error verifying email' });
  }
};

/**
 * Resend verification email to user
 * @route POST /api/auth/resend-verification
 */
export const resendVerification = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    
    // Don't reveal if user exists or not for security reasons
    if (!user || user.isVerified) {
      // Return success even if no email sent to prevent user enumeration
      return res.status(200).json({ 
        message: 'If an account exists with this email, a verification link has been sent.' 
      });
    }
    
    // Generate new verification token
    const verificationToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '24h' }
    );
    
    // Update user's verification token
    user.verificationToken = verificationToken;
    await user.save();
    
    // Send verification email
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    try {
      await emailService.sendVerificationEmail({
        email: user.email,
        firstName: user.firstName,
        token: verificationToken,
        frontendUrl
      });
      console.log(`Verification email resent to ${user.email}`);
    } catch (error) {
      console.error('Error sending verification email:', error);
      // Don't reveal error details for security
    }
    
    res.status(200).json({ message: 'Verification email sent successfully.' });
  } catch (error) {
    console.error('Error resending verification email:', error);
    res.status(500).json({ message: 'Server error during verification email resend' });
  }
}; 