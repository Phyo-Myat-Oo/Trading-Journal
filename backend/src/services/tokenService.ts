import jwt, { SignOptions } from 'jsonwebtoken';
import { Types } from 'mongoose';
import { IUser } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';
import { BlacklistedToken } from '../models/BlacklistedToken';
import { TokenEvent } from '../models/TokenEvent';
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
  // Generate a unique token ID
  const jti = new Types.ObjectId().toString();
  
  return jwt.sign(
    { 
      id: user._id,
      email: user.email,
      role: user.role,
      type: 'access',
      jti, // Add JWT ID for blacklisting
      iat: Math.floor(Date.now() / 1000),
      iss: 'trading-journal-api',
      aud: 'trading-journal-app'
    }, 
    config.jwt.secret as jwt.Secret, 
    { expiresIn: config.jwt.accessExpiresIn } as SignOptions
  );
};

// Token family options for refresh token generation
interface TokenFamilyOptions {
  familyId?: string;
  parentJti?: string;
  familyCreatedAt?: Date;
  rotationCounter?: number;
  extendedExpiration?: boolean; // Flag for "Remember Me" extended expiration
}

// Generate and store refresh token
export const generateRefreshToken = async (
  user: IUser,
  req?: Request,
  familyOptions?: TokenFamilyOptions
): Promise<{ token: string; expiresAt: Date }> => {
  // Generate a unique token ID
  const jti = new Types.ObjectId().toString();
  
  // Handle token family tracking
  const familyId = familyOptions?.familyId || new Types.ObjectId().toString();
  const familyCreatedAt = familyOptions?.familyCreatedAt || new Date();
  const rotationCounter = (familyOptions?.rotationCounter || 0) + (familyOptions?.parentJti ? 1 : 0);
  
  // Calculate expiration time
  const refreshExpiresIn = familyOptions?.extendedExpiration ? 
    (config.jwt.extendedRefreshExpiresIn || '7d') : 
    (config.jwt.refreshExpiresIn as string);
  
  const expirationMs = parseDuration(refreshExpiresIn);
  const expiresAt = new Date(Date.now() + expirationMs);
  
  // Create the token
  const token = jwt.sign(
    { 
      id: user._id,
      jti, // JWT ID for revocation
      fid: familyId, // Add family ID to token payload
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      iss: 'trading-journal-api',
      aud: 'trading-journal-app'
    }, 
    config.jwt.refreshSecret as jwt.Secret,
    { expiresIn: refreshExpiresIn } as SignOptions
  );
  
  // Store token in database with family info
  await RefreshToken.create({
    token,
    userId: user._id,
    jti,
    expiresAt,
    familyId,
    parentJti: familyOptions?.parentJti || null,
    familyCreatedAt,
    rotationCounter,
    userAgent: req?.headers['user-agent'],
    ipAddress: req?.ip || req?.connection.remoteAddress,
    absoluteSessionStart: familyOptions?.parentJti ? 
      // If this is a refresh, get the original session start time from the parent token
      (await RefreshToken.findOne({ jti: familyOptions.parentJti }))?.absoluteSessionStart || new Date() :
      // If this is a new session, use current time
      new Date()
  });
  
  return { token, expiresAt };
};

// Verify refresh token and return user ID if valid
export const verifyRefreshToken = async (token: string): Promise<{ 
  userId: Types.ObjectId;
  jti: string;
  familyId: string;
  isValid: boolean;
  securityIssue?: boolean;
  requiresFullAuth?: boolean;
  rotationCounter?: number;
}> => {
  try {
    // Verify the token signature and expiration
    const decoded = jwt.verify(
      token,
      config.jwt.refreshSecret as jwt.Secret
    ) as { id: string; jti: string; fid?: string };
    
    // Check if token exists in database and is not revoked
    const tokenDoc = await RefreshToken.findOne({ 
      jti: decoded.jti,
      isRevoked: false
    });
    
    if (!tokenDoc) {
      return { 
        userId: new Types.ObjectId(decoded.id),
        jti: decoded.jti,
        familyId: decoded.fid || '',
        isValid: false
      };
    }

    // Check for absolute session timeout
    const absoluteTimeoutMs = parseDuration(config.jwt.absoluteSessionTimeout as string);
    const sessionAge = Date.now() - tokenDoc.absoluteSessionStart.getTime();
    
    if (sessionAge > absoluteTimeoutMs) {
      // Revoke token and require full authentication
      await RefreshToken.revokeToken(decoded.jti);
      await TokenEvent.create({
        userId: tokenDoc.userId,
        familyId: tokenDoc.familyId,
        eventType: 'ABSOLUTE_TIMEOUT',
        details: {
          reason: 'Absolute session timeout reached',
          sessionAge: sessionAge,
          absoluteTimeout: absoluteTimeoutMs,
          sessionStartTime: tokenDoc.absoluteSessionStart,
          tokenJti: decoded.jti
        }
      });
      
      return {
        userId: new Types.ObjectId(decoded.id),
        jti: decoded.jti,
        familyId: tokenDoc.familyId,
        isValid: false,
        requiresFullAuth: true,
        rotationCounter: tokenDoc.rotationCounter
      };
    }
    
    // Token family checks
    
    // 1. Check for absolute family age limit (7 days)
    const maxFamilyAgeMs = 7 * 24 * 60 * 60 * 1000; // 7 days
    const familyAge = Date.now() - tokenDoc.familyCreatedAt.getTime();
    
    if (familyAge > maxFamilyAgeMs) {
      // Mark as invalid but provide reason
      await RefreshToken.revokeToken(decoded.jti);
      return {
        userId: new Types.ObjectId(decoded.id),
        jti: decoded.jti,
        familyId: tokenDoc.familyId,
        isValid: false,
        requiresFullAuth: true,
        rotationCounter: tokenDoc.rotationCounter
      };
    }
    
    // 2. Check for suspicious parallel token usage (detect token theft)
    const suspiciousTokens = await RefreshToken.find({
      familyId: tokenDoc.familyId,
      isRevoked: false,
      _id: { $ne: tokenDoc._id },
      createdAt: { $lt: tokenDoc.createdAt }
    });

    if (suspiciousTokens.length > 0) {
      // Possible token theft! Revoke the entire family
      await RefreshToken.revokeTokenFamily(tokenDoc.familyId);
      
      // Log security event
      await TokenEvent.create({
        userId: tokenDoc.userId,
        familyId: tokenDoc.familyId,
        eventType: 'suspicious_parallel_usage',
        details: {
          tokenJti: decoded.jti,
          suspiciousTokens: suspiciousTokens.map(t => t.jti),
          rotationCounter: tokenDoc.rotationCounter
        },
        ipAddress: tokenDoc.ipAddress,
        userAgent: tokenDoc.userAgent
      });
      
      return { 
        userId: new Types.ObjectId(decoded.id),
        jti: decoded.jti,
        familyId: tokenDoc.familyId,
        isValid: false,
        securityIssue: true,
        rotationCounter: tokenDoc.rotationCounter
      };
    }
    
    // 3. Check for excessive rotations (potential abuse)
    const maxRotations = 100; // Arbitrary limit to prevent abuse
    if (tokenDoc.rotationCounter > maxRotations) {
      await RefreshToken.revokeTokenFamily(tokenDoc.familyId);
      
      return {
        userId: new Types.ObjectId(decoded.id),
        jti: decoded.jti,
        familyId: tokenDoc.familyId,
        isValid: false,
        requiresFullAuth: true,
        rotationCounter: tokenDoc.rotationCounter
      };
    }
    
    // All checks passed
    return { 
      userId: new Types.ObjectId(decoded.id),
      jti: decoded.jti,
      familyId: tokenDoc.familyId,
      isValid: true,
      rotationCounter: tokenDoc.rotationCounter
    };
  } catch (error) {
    // If token verification fails, return invalid result
    return { 
      userId: new Types.ObjectId(),
      jti: '',
      familyId: '',
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

// Revoke a token family by its ID
export const revokeTokenFamily = async (
  familyId: string, 
  reason: string = 'Manual revocation'
): Promise<number> => {
  try {
    const result = await RefreshToken.revokeTokenFamily(familyId);
    
    // Log the family revocation event if tokens were revoked
    if (result > 0) {
      // Find any token from this family to get the user ID
      const sampleToken = await RefreshToken.findOne({ familyId });
      if (sampleToken) {
        await TokenEvent.create({
          userId: sampleToken.userId,
          familyId,
          eventType: 'family_revoked',
          details: {
            reason,
            tokenCount: result
          },
          ipAddress: sampleToken.ipAddress,
          userAgent: sampleToken.userAgent
        });
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error revoking token family:', error);
    return 0;
  }
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
      familyId: session.familyId,
      userAgent: session.userAgent || 'Unknown device',
      ipAddress: session.ipAddress || 'Unknown location',
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      rotationCounter: session.rotationCounter
    }));
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    return [];
  }
};

// Function to detect suspicious patterns in token usage
export const detectSuspiciousPatterns = async (
  userId: Types.ObjectId, 
  ipAddress?: string,
  userAgent?: string
): Promise<boolean> => {
  try {
    // 1. Check for multiple IPs in short timeframe
    const recentTokens = await RefreshToken.find({
      userId,
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
    });
    
    const uniqueIPs = new Set(recentTokens
      .map(t => t.ipAddress)
      .filter(Boolean)
    );
    
    // If more than 3 different IPs used in last hour and current IP not among recent ones
    if (uniqueIPs.size > 3 && ipAddress && !uniqueIPs.has(ipAddress)) {
      await TokenEvent.create({
        userId,
        familyId: recentTokens[0]?.familyId || 'unknown',
        eventType: 'multiple_ips',
        details: {
          uniqueIPs: Array.from(uniqueIPs),
          currentIP: ipAddress,
          tokenCount: recentTokens.length
        },
        ipAddress,
        userAgent
      });
      return true;
    }
    
    // 2. Check for rapid refresh rate
    const refreshRateThreshold = 10; // More than 10 refreshes per hour is suspicious
    if (recentTokens.length > refreshRateThreshold) {
      await TokenEvent.create({
        userId,
        familyId: recentTokens[0]?.familyId || 'unknown',
        eventType: 'SUSPICIOUS_ROTATION',
        details: {
          refreshCount: recentTokens.length,
          timeframeMs: 60 * 60 * 1000,
          threshold: refreshRateThreshold
        },
        ipAddress,
        userAgent
      });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error detecting suspicious patterns:', error);
    return false;
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

// Blacklist a token (both access and refresh tokens)
export const blacklistToken = async (
  token: string,
  reason: string = 'Manual invalidation'
): Promise<boolean> => {
  try {
    // Verify the token to get its payload
    let decoded;
    let secret;
    
    try {
      // Try to verify as access token
      secret = config.jwt.secret as jwt.Secret;
      decoded = jwt.verify(token, secret) as { id: string; jti?: string; exp?: number; type?: string; fid?: string };
    } catch (error) {
      // If that fails, try as refresh token
      secret = config.jwt.refreshSecret as jwt.Secret;
      try {
        decoded = jwt.verify(token, secret) as { id: string; jti?: string; exp?: number; type?: string; fid?: string };
      } catch (innerError) {
        console.error('Invalid token for blacklisting:', innerError);
        return false;
      }
    }
    
    // Extract necessary data
    const jti = decoded.jti || new Types.ObjectId().toString(); // Use existing JTI or generate new one
    const expiresAt = decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 86400000); // 24h default
    
    // For refresh tokens, also revoke in RefreshToken collection
    if (decoded.type === 'refresh' && decoded.jti) {
      // If it's part of a family, revoke the entire family
      if (decoded.fid) {
        await revokeTokenFamily(decoded.fid, reason);
      } else {
        // Fallback to just this token
        await RefreshToken.revokeToken(decoded.jti);
      }
    }
    
    // Add to blacklist
    return BlacklistedToken.blacklistToken(token, jti, expiresAt, reason);
  } catch (error) {
    console.error('Error blacklisting token:', error);
    return false;
  }
};

// Check if a token is blacklisted
export const isTokenBlacklisted = async (jti: string): Promise<boolean> => {
  return BlacklistedToken.isBlacklisted(jti);
};

// Schedule token blacklist cleanup (call during app initialization along with token cleanup)
export const scheduleBlacklistCleanup = (): NodeJS.Timeout => {
  console.log('Scheduling token blacklist cleanup job');
  // Run cleanup job every day
  return setInterval(async () => {
    try {
      const removedCount = await BlacklistedToken.cleanupExpiredTokens();
      console.log(`Removed ${removedCount} expired blacklisted tokens`);
    } catch (error) {
      console.error('Error cleaning up blacklisted tokens:', error);
    }
  }, 24 * 60 * 60 * 1000);
}; 