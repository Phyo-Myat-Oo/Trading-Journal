import mongoose, { Schema, Document, Model } from 'mongoose';
import { Types } from 'mongoose';

export interface IRefreshToken extends Document {
  token: string;
  userId: Types.ObjectId;
  jti: string;       // JWT ID - unique identifier for the token
  isRevoked: boolean; // Whether the token has been explicitly revoked
  expiresAt: Date;   // When the token expires
  createdAt: Date;   // When the token was created
  updatedAt: Date;   // When the token was last updated
  userAgent?: string; // The user agent that created the token
  ipAddress?: string; // The IP address that created the token
  familyId: string;   // ID to track tokens in the same family/chain
  parentJti: string | null; // Links to the previous token in the chain
  familyCreatedAt: Date; // When this token family was first created
  rotationCounter: number; // Number of times tokens in this family have been rotated
}

// Define static methods interface
interface RefreshTokenModel extends Model<IRefreshToken> {
  revokeToken(jti: string): Promise<boolean>;
  revokeAllUserTokens(userId: Types.ObjectId): Promise<number>;
  removeExpiredTokens(): Promise<number>;
  revokeTokenFamily(familyId: string): Promise<number>;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    token: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    jti: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    userAgent: {
      type: String,
    },
    ipAddress: {
      type: String,
    },
    familyId: {
      type: String,
      required: true,
      index: true,
      default: () => new Types.ObjectId().toString(), // Default to a new ObjectId
    },
    parentJti: {
      type: String,
      default: null,
      index: true,
    },
    familyCreatedAt: {
      type: Date,
      required: true,
      index: true,
      default: Date.now,
    },
    rotationCounter: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index combination for quick lookups by userId and token status
refreshTokenSchema.index({ userId: 1, isRevoked: 1, expiresAt: 1 });
// Add new index for token family
refreshTokenSchema.index({ userId: 1, familyId: 1 });

// Add a method to revoke a token
refreshTokenSchema.statics.revokeToken = async function(jti: string): Promise<boolean> {
  const result = await this.updateOne(
    { jti },
    { isRevoked: true }
  );
  return result.modifiedCount > 0;
};

// Add a method to revoke all tokens for a user
refreshTokenSchema.statics.revokeAllUserTokens = async function(userId: Types.ObjectId): Promise<number> {
  const result = await this.updateMany(
    { userId, isRevoked: false },
    { isRevoked: true }
  );
  return result.modifiedCount;
};

// Add a method to revoke all tokens in a family
refreshTokenSchema.statics.revokeTokenFamily = async function(familyId: string): Promise<number> {
  const result = await this.updateMany(
    { familyId, isRevoked: false },
    { isRevoked: true }
  );
  return result.modifiedCount;
};

// Add a method to clean up expired tokens
refreshTokenSchema.statics.removeExpiredTokens = async function(): Promise<number> {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
  return result.deletedCount;
};

// Create and export the model
export const RefreshToken = mongoose.model<IRefreshToken, RefreshTokenModel>('RefreshToken', refreshTokenSchema); 