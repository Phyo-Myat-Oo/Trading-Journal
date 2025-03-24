import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBlacklistedToken extends Document {
  token: string;
  jti: string;
  reason: string;
  createdAt: Date;
  expiresAt: Date;
}

// Add static methods to the interface
interface BlacklistedTokenModel extends Model<IBlacklistedToken> {
  isBlacklisted(jti: string): Promise<boolean>;
  blacklistToken(
    token: string,
    jti: string,
    expiresAt: Date,
    reason?: string
  ): Promise<boolean>;
  cleanupExpiredTokens(): Promise<number>;
}

/**
 * Blacklisted Token Schema
 * Used to invalidate tokens before their natural expiration
 */
const blacklistedTokenSchema = new Schema<IBlacklistedToken>(
  {
    token: {
      type: String,
      required: true,
      index: true
    },
    jti: {
      type: String,
      required: true
    },
    reason: {
      type: String,
      default: 'Manual invalidation'
    },
    expiresAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Create indexes
blacklistedTokenSchema.index({ jti: 1 }, { unique: true });
blacklistedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Check if a token is blacklisted
 */
blacklistedTokenSchema.statics.isBlacklisted = async function(jti: string): Promise<boolean> {
  const blacklistedToken = await this.findOne({ jti });
  return !!blacklistedToken;
};

/**
 * Add a token to the blacklist
 */
blacklistedTokenSchema.statics.blacklistToken = async function(
  token: string,
  jti: string,
  expiresAt: Date,
  reason: string = 'Manual invalidation'
): Promise<boolean> {
  try {
    await this.create({
      token,
      jti,
      reason,
      expiresAt
    });
    return true;
  } catch (error) {
    console.error('Error blacklisting token:', error);
    return false;
  }
};

/**
 * Clean up expired blacklisted tokens
 */
blacklistedTokenSchema.statics.cleanupExpiredTokens = async function(): Promise<number> {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
  return result.deletedCount || 0;
};

export const BlacklistedToken = mongoose.model<IBlacklistedToken, BlacklistedTokenModel>(
  'BlacklistedToken',
  blacklistedTokenSchema
); 