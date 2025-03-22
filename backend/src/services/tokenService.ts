import jwt, { SignOptions } from 'jsonwebtoken';
import { Types } from 'mongoose';
import { IUser } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';
import { config } from '../config';
import { Request } from 'express';

// Utility to parse duration strings to milliseconds
const parseDuration = (duration: string): number => {
  const unit = duration.charAt(duration.length - 1);
  const value = parseInt(duration.slice(0, -1));
  
  switch(unit) {
    case 's': return value * 1000; // seconds
    case 'm': return value * 60 * 1000; // minutes
    case 'h': return value * 60 * 60 * 1000; // hours
    case 'd': return value * 24 * 60 * 60 * 1000; // days
    default: return value; // Default as milliseconds
  }
};

// Generate access token
export const generateAccessToken = (user: IUser): string => {
  return jwt.sign(
    { 
      id: user._id,
      email: user.email,
      role: user.role,
      type: 'access',
      iat: Math.floor(Date.now() / 1000),
      iss: 'trading-journal-api'
    }, 
    config.jwt.secret as jwt.Secret, 
    { expiresIn: config.jwt.accessExpiresIn } as SignOptions
  );
};

// Generate and store refresh token
export const generateRefreshToken = async (
  user: IUser,
  req?: Request
): Promise<{ token: string; expiresAt: Date }> => {
  // Generate a unique token ID
  const jti = new Types.ObjectId().toString();
  
  // Calculate expiration time
  const expirationMs = parseDuration(config.jwt.refreshExpiresIn as string);
  const expiresAt = new Date(Date.now() + expirationMs);
  
  // Create the token
  const token = jwt.sign(
    { 
      id: user._id,
      jti, // JWT ID for revocation
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      iss: 'trading-journal-api'
    }, 
    config.jwt.refreshSecret as jwt.Secret,
    { expiresIn: config.jwt.refreshExpiresIn } as SignOptions
  );
  
  // Store token in database
  await RefreshToken.create({
    token,
    userId: user._id,
    jti,
    expiresAt,
    userAgent: req?.headers['user-agent'],
    ipAddress: req?.ip || req?.connection.remoteAddress
  });
  
  return { token, expiresAt };
};

// Verify refresh token and return user ID if valid
export const verifyRefreshToken = async (token: string): Promise<{ 
  userId: Types.ObjectId;
  jti: string;
  isValid: boolean;
}> => {
  try {
    // Verify the token signature and expiration
    const decoded = jwt.verify(
      token,
      config.jwt.refreshSecret as jwt.Secret
    ) as { id: string; jti: string };
    
    // Check if token exists in database and is not revoked
    const tokenDoc = await RefreshToken.findOne({ 
      jti: decoded.jti,
      isRevoked: false
    });
    
    if (!tokenDoc) {
      return { 
        userId: new Types.ObjectId(decoded.id),
        jti: decoded.jti,
        isValid: false
      };
    }
    
    return { 
      userId: new Types.ObjectId(decoded.id),
      jti: decoded.jti,
      isValid: true
    };
  } catch (error) {
    // If token verification fails, return invalid result
    return { 
      userId: new Types.ObjectId(),
      jti: '',
      isValid: false
    };
  }
};

// Revoke a refresh token by its JTI
export const revokeRefreshToken = async (jti: string): Promise<boolean> => {
  return RefreshToken.revokeToken(jti);
};

// Revoke all refresh tokens for a user
export const revokeAllUserTokens = async (userId: Types.ObjectId): Promise<number> => {
  return RefreshToken.revokeAllUserTokens(userId);
};

// Get all active sessions for a user
export const getUserActiveSessions = async (userId: Types.ObjectId): Promise<any[]> => {
  try {
    const sessions = await RefreshToken.find({
      userId,
      isRevoked: false,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    return sessions.map(session => ({
      id: session._id,
      jti: session.jti,
      userAgent: session.userAgent || 'Unknown device',
      ipAddress: session.ipAddress || 'Unknown location',
      createdAt: session.createdAt,
      expiresAt: session.expiresAt
    }));
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    return [];
  }
};

// Revoke a specific session by its JTI
export const revokeSession = async (jti: string, userId: Types.ObjectId): Promise<boolean> => {
  try {
    // Verify the token belongs to the user before revoking it (security check)
    const session = await RefreshToken.findOne({ jti, userId });
    if (!session) {
      return false;
    }
    
    return RefreshToken.revokeToken(jti);
  } catch (error) {
    console.error('Error revoking session:', error);
    return false;
  }
};

// Schedule a job to remove expired tokens (should be called during app initialization)
export const scheduleTokenCleanup = (): NodeJS.Timeout => {
  console.log('Scheduling token cleanup job');
  // Run cleanup job every day
  return setInterval(async () => {
    try {
      const removedCount = await RefreshToken.removeExpiredTokens();
      console.log(`Removed ${removedCount} expired refresh tokens`);
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
    }
  }, 24 * 60 * 60 * 1000);
}; 