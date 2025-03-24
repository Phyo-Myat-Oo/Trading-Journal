import { Request, Response } from 'express';
import { User } from '../models/User';
import * as twoFactorService from '../services/twoFactorService';
import * as tokenService from '../services/tokenService';
import { CookieOptions } from 'express';

/**
 * Verify 2FA token during login
 * @route POST /api/auth/2fa/verify
 */
export const verifyTwoFactorLogin = async (req: Request, res: Response) => {
  try {
    // Get token and userId from request body
    const { token, userId } = req.body;

    if (!token || !userId) {
      return res.status(400).json({ message: 'Token and user ID are required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if 2FA is enabled
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({ message: 'Two-factor authentication not enabled for this user' });
    }

    // Verify the token
    const isValid = twoFactorService.verifyToken(token, user.twoFactorSecret);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }
    
    // Generate access token
    const accessToken = tokenService.generateAccessToken(user);
    
    // Generate refresh token with context information
    const { token: refreshToken, expiresAt } = await tokenService.generateRefreshToken(user, req);
    
    // Set refresh token in HTTP-only cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: expiresAt.getTime() - Date.now() // Use actual expiration time from token
    };
    
    res.cookie('refreshToken', refreshToken, cookieOptions as CookieOptions);
    
    // Update last login time if not already updated
    user.lastLogin = new Date();
    await user.save();

    res.json({
      message: 'Two-factor authentication successful',
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isVerified: user.isVerified,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });
  } catch (error) {
    console.error('2FA login verification error:', error);
    res.status(500).json({ message: 'Error verifying two-factor authentication' });
  }
};

/**
 * Verify backup code during login
 * @route POST /api/auth/2fa/backup
 */
export const verifyBackupCode = async (req: Request, res: Response) => {
  try {
    // Get backup code and userId from request body
    const { backupCode, userId } = req.body;

    if (!backupCode || !userId) {
      return res.status(400).json({ message: 'Backup code and user ID are required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if 2FA is enabled
    if (!user.twoFactorEnabled || !user.twoFactorBackupCodes || user.twoFactorBackupCodes.length === 0) {
      return res.status(400).json({ message: 'Two-factor authentication not enabled or no backup codes available' });
    }

    // Verify the backup code
    if (!user.twoFactorBackupCodes.includes(backupCode)) {
      return res.status(400).json({ message: 'Invalid backup code' });
    }

    // Remove the used backup code
    user.twoFactorBackupCodes = user.twoFactorBackupCodes.filter((code: string) => code !== backupCode);
    await user.save();
    
    // Generate access token
    const accessToken = tokenService.generateAccessToken(user);
    
    // Generate refresh token with context information
    const { token: refreshToken, expiresAt } = await tokenService.generateRefreshToken(user, req);
    
    // Set refresh token in HTTP-only cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: expiresAt.getTime() - Date.now() // Use actual expiration time from token
    };
    
    res.cookie('refreshToken', refreshToken, cookieOptions as CookieOptions);
    
    // Update last login time
    user.lastLogin = new Date();
    await user.save();

    res.json({
      message: 'Backup code verification successful',
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isVerified: user.isVerified,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });
  } catch (error) {
    console.error('Backup code verification error:', error);
    res.status(500).json({ message: 'Error verifying backup code' });
  }
};

/**
 * Setup two-factor authentication
 * @route GET /api/users/2fa/setup
 */
export const setupTwoFactor = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate a new TOTP secret
    try {
      const { secret, otpAuthUrl } = twoFactorService.generateSecret(user.email);
      
      if (!secret || !otpAuthUrl) {
        console.error('Failed to generate 2FA secret or OTP auth URL');
        return res.status(500).json({ message: 'Error generating two-factor authentication secret' });
      }
      
      // Store the temporary secret
      user.twoFactorTempSecret = secret;
      await user.save();
      
      // Generate backup codes
      const backupCodes = twoFactorService.generateBackupCodes();
      
      // Generate QR code
      try {
        const qrCodeUrl = await twoFactorService.generateQRCode(otpAuthUrl);
        
        res.json({
          message: 'Two-factor authentication setup initiated',
          secret,
          otpAuthUrl,
          qrCodeUrl,
          backupCodes
        });
      } catch (qrError) {
        console.error('QR code generation error:', qrError);
        res.status(500).json({ message: 'Error generating QR code' });
      }
    } catch (secretError) {
      console.error('Secret generation error:', secretError);
      res.status(500).json({ message: 'Error generating two-factor authentication secret' });
    }
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ message: 'Error setting up two-factor authentication' });
  }
};

/**
 * Verify and enable two-factor authentication
 * @route POST /api/users/2fa/verify
 */
export const verifyAndEnableTwoFactor = async (req: Request, res: Response) => {
  try {
    // Log request details for debugging
    console.log('2FA Verify Request:', { 
      body: req.body,
      headers: {
        'content-type': req.headers['content-type'],
        'x-requested-with': req.headers['x-requested-with'],
        'origin': req.headers['origin'],
        // Exclude auth tokens and csrf tokens from logs
        ...Object.fromEntries(
          Object.entries(req.headers)
            .filter(([key]) => !key.includes('auth') && !key.includes('csrf'))
        )
      }
    });
    
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { token, backupCodes, bypassCsrf } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Verification token is required' });
    }
    
    // Log if this is a special bypass request
    if (bypassCsrf) {
      console.log('Processing 2FA verification with CSRF bypass');
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if temporary secret exists
    if (!user.twoFactorTempSecret) {
      return res.status(400).json({ message: 'Two-factor authentication setup not initiated' });
    }

    // Verify the token
    const isValid = twoFactorService.verifyToken(token, user.twoFactorTempSecret);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    // Enable 2FA
    user.twoFactorEnabled = true;
    user.twoFactorSecret = user.twoFactorTempSecret;
    user.twoFactorTempSecret = undefined;
    
    // Save backup codes if provided, otherwise generate new ones
    user.twoFactorBackupCodes = backupCodes || twoFactorService.generateBackupCodes();
    
    await user.save();

    res.json({
      message: 'Two-factor authentication enabled successfully',
      backupCodes: user.twoFactorBackupCodes
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({ message: 'Error verifying two-factor authentication' });
  }
};

/**
 * Disable two-factor authentication
 * @route POST /api/users/2fa/disable
 */
export const disableTwoFactor = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // For added security, require password verification
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: 'Password is required to disable 2FA' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Check if 2FA is enabled
    if (!user.twoFactorEnabled) {
      return res.status(400).json({ message: 'Two-factor authentication is not enabled' });
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorBackupCodes = [];
    user.twoFactorTempSecret = undefined;
    
    await user.save();

    res.json({ message: 'Two-factor authentication disabled successfully' });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({ message: 'Error disabling two-factor authentication' });
  }
}; 