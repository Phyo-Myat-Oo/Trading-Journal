import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type TokenEventType = 
  | 'SUSPICIOUS_ROTATION'
  | 'FAMILY_REVOKED'
  | 'MULTIPLE_IPS'
  | 'PASSWORD_RESET'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'TOKEN_REFRESH'
  | 'TOKEN_REVOKED';

export interface ITokenEvent extends Document {
  userId: Types.ObjectId;
  familyId?: string;
  eventType: TokenEventType;
  details: string | Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

interface TokenEventModel extends Model<ITokenEvent> {
  // Add static methods if needed in the future
}

const tokenEventSchema = new Schema<ITokenEvent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    familyId: {
      type: String,
      required: false,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      index: true,
      enum: [
        'SUSPICIOUS_ROTATION',
        'FAMILY_REVOKED',
        'MULTIPLE_IPS',
        'PASSWORD_RESET',
        'LOGIN_SUCCESS',
        'LOGIN_FAILED',
        'LOGOUT',
        'TOKEN_REFRESH',
        'TOKEN_REVOKED'
      ]
    },
    details: {
      type: Schema.Types.Mixed,
      required: true,
    },
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: true,
  }
);

// Create indexes
tokenEventSchema.index({ userId: 1, eventType: 1 });
tokenEventSchema.index({ createdAt: 1 });

export const TokenEvent = mongoose.model<ITokenEvent, TokenEventModel>('TokenEvent', tokenEventSchema); 