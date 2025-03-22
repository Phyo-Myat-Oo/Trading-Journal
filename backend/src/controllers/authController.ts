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
import { RefreshToken } from '../models/RefreshToken';

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

    // Check if account is locked
    if (user.accountLocked && user.accountLockedUntil) {
      const now = new Date();
      if (now < user.accountLockedUntil) {
        const remainingTimeMinutes = Math.ceil((user.accountLockedUntil.getTime() - now.getTime()) / (60 * 1000));
        return res.status(401).json({ 
          message: `Account is locked. Please try again in ${remainingTimeMinutes} minute${remainingTimeMinutes > 1 ? 's' : ''}.`,
          isLocked: true
        });
      } else {
        // Lock period expired, reset the lock
        user.accountLocked = false;
        user.accountLockedUntil = undefined;
        // Keep failed attempts counter as is - don't reset it yet
      }
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
      // Increment failed login attempts
      user.failedLoginAttempts += 1;
      
      // Check if account should be locked
      if (user.failedLoginAttempts >= config.accountLockout.maxLoginAttempts) {
        // Calculate lockout duration based on the number of previous lockouts
        let lockoutDuration = 15 * 60 * 1000; // 15 minutes for first lockout
        let requiresAdminUnlock = false;
        
        // Use the previousLockouts field to determine lockout duration
        const lockoutCount = user.previousLockouts;
        
        if (lockoutCount === 0) {
          // First lockout: 15 minutes (default)
          lockoutDuration = 15 * 60 * 1000;
        } else if (lockoutCount === 1) {
          // Second lockout: 30 minutes
          lockoutDuration = 30 * 60 * 1000;
        } else {
          // Third+ lockout: 60 minutes
          lockoutDuration = 60 * 60 * 1000;
          
          // If it's more than 3 lockouts, flag for admin attention
          if (lockoutCount >= 3) {
            requiresAdminUnlock = true;
          }
        }
        
        user.accountLocked = true;
        user.accountLockedUntil = new Date(Date.now() + lockoutDuration);
        user.previousLockouts += 1; // Increment the previous lockouts counter
        
        await user.save();
        
        // Send account lockout notification email
        try {
          const lockoutMinutes = Math.ceil(lockoutDuration / (60 * 1000));
          await emailService.sendAccountLockoutEmail({
            email: user.email,
            firstName: user.firstName,
            lockoutDuration: lockoutMinutes,
            lockedUntil: user.accountLockedUntil,
            frontendUrl: config.frontendUrl,
            requiresAdminUnlock: requiresAdminUnlock
          });
        } catch (emailError) {
          console.error('Failed to send account lockout email:', emailError);
          // Continue even if email fails - don't expose this error to client
        }
        
        const lockoutMinutes = Math.ceil(lockoutDuration / (60 * 1000));
        let message = `Account locked due to too many failed login attempts. Please try again in ${lockoutMinutes} minute${lockoutMinutes > 1 ? 's' : ''}.`;
        
        if (requiresAdminUnlock) {
          message = `Account locked due to excessive failed login attempts. Please contact an administrator.`;
        }
        
        return res.status(401).json({ 
          message: message,
          isLocked: true,
          requiresAdminUnlock: requiresAdminUnlock
        });
      }
      
      await user.save();
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // If login successful, reset failed login attempts
    user.failedLoginAttempts = 0;
    user.accountLocked = false;
    user.accountLockedUntil = undefined;
    // Note: Don't reset previousLockouts - that's a permanent record

    // Generate access token
    const accessToken = tokenService.generateAccessToken(user);
    
    // Generate refresh token with context information
    const { token: refreshToken, expiresAt } = await tokenService.generateRefreshToken(user, req);

    // Set refresh token in HTTP-only cookie
    const cookieOptions = {
      httpOnly: true,
      secure: false, // Set to false in development for http://localhost
      sameSite: 'lax', // Use 'lax' for all environments for better compatibility
      path: '/',
      maxAge: expiresAt.getTime() - Date.now() // Use actual expiration time from token
    };
    
    console.log(`Setting refreshToken cookie with options:`, JSON.stringify(cookieOptions, null, 2));
    res.cookie('refreshToken', refreshToken, cookieOptions as CookieOptions);
    console.log(`Cookie set, refreshToken length: ${refreshToken.length}`);

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
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Cookies received:', JSON.stringify(req.cookies, null, 2));
    
    if (!refreshToken) {
      console.log('No refresh token found in cookies');
      return res.status(401).json({ 
        message: 'Refresh token not found'
      });
    }

    // Log token information (without revealing full token for security)
    console.log(`Refresh token found, length: ${refreshToken.length}, first 10 chars: ${refreshToken.substring(0, 10)}...`);

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
      secure: false, // Set to false in development for http://localhost
      sameSite: 'lax', // Use 'lax' for all environments for better compatibility
      path: '/',
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
    const userId = req.user?.id;
    
    // Log the logout attempt for debugging purposes
    console.log(`[${new Date().toISOString()}] Logout attempt from user ID: ${userId || 'unknown'}`);
    
    // Only try to revoke tokens if we have a user ID
    if (userId) {
      console.log(`Revoking tokens for user: ${userId}`);
      
      try {
        // Fetch user to check if they have refresh tokens
        const user = await User.findById(userId);
        
        // Check if user exists and has refresh tokens
        if (user && user.refreshTokens && user.refreshTokens.length > 0) {
          // Revoke all refresh tokens for the user to ensure complete logout
          console.log(`User has ${user.refreshTokens.length} tokens to revoke`);
          const result = await RefreshToken.deleteMany({ user: userId });
          console.log(`Revoked all ${result.deletedCount} tokens for user ${userId}`);
          
          // Update the user document to clear the refreshTokens array
          await User.findByIdAndUpdate(userId, { $set: { refreshTokens: [] } });
        } else {
          console.log(`User ${userId} has no tokens to revoke or user not found`);
        }
      } catch (dbError) {
        console.error('Database error during logout:', dbError);
        // Continue with cookie clearing even if token revocation fails
      }
    } else {
      console.log('No user ID in request, unable to revoke refresh tokens');
    }
    
    // Clear the refresh token cookie regardless of token revocation
    console.log('Clearing refresh token cookie');
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/'
    });
    
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error during logout:', error);
    return res.status(500).json({ message: 'Error during logout' });
  }
};

// Debug endpoint to check cookie settings
export const checkCookies = async (req: Request, res: Response) => {
  try {
    // Get all cookies
    const cookies = req.cookies;
    
    // Test setting a new cookie
    const testCookieOptions = {
      httpOnly: false, // Make visible to JavaScript
      secure: false, // Match other cookie settings
      sameSite: 'lax',
      path: '/',
      maxAge: 60000 // 1 minute
    };
    
    res.cookie('cookieTest', 'test-value', testCookieOptions as CookieOptions);
    
    // Check for the refresh token cookie specifically
    const hasRefreshToken = !!cookies.refreshToken;
    
    // Return diagnostic information
    return res.status(200).json({
      cookiesReceived: cookies,
      hasRefreshToken,
      serverTime: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      cookieSettings: {
        secure: false, // Actual setting used
        sameSite: 'lax', // Actual setting used
        httpOnly: true,
        path: '/'
      }
    });
  } catch (error) {
    console.error('Error checking cookies:', error);
    return res.status(500).json({ message: 'Server error checking cookies' });
  }
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

export const getUserSessions = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const userId = new Types.ObjectId(req.user.id);
    const sessions = await tokenService.getUserActiveSessions(userId);

    res.json({
      success: true,
      sessions
    });
  } catch (error) {
    console.error('Error getting user sessions:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching active sessions' 
    });
  }
};

export const revokeSession = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Session ID is required' 
      });
    }

    const userId = new Types.ObjectId(req.user.id);
    const success = await tokenService.revokeSession(sessionId, userId);

    if (success) {
      res.json({
        success: true,
        message: 'Session terminated successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Session not found or already terminated'
      });
    }
  } catch (error) {
    console.error('Error revoking session:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error terminating session' 
    });
  }
};

(async () => {
  // Only run in browser environment
  if (typeof window === 'undefined') return;
  
  try {
    // Wait for DOM to be fully loaded
    if (document.readyState === 'loading') {
      await new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', resolve);
      });
    }
    
    // Only check session if there's a user in localStorage
    if (localStorage.getItem('user')) {
      console.log('User found in storage, checking session status on page load...');
      await checkSessionStatus();
    } else {
      console.log('No user in storage, skipping session check');
    }
  } catch (error) {
    console.error('Error during automatic session recovery:', error);
  }
})(); 