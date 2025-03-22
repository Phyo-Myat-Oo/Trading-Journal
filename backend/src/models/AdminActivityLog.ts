import mongoose, { Schema, Document } from 'mongoose';
import { Types } from 'mongoose';

export enum AdminActionType {
  USER_UNLOCK = 'USER_UNLOCK',
  USER_LOCK_RESET = 'USER_LOCK_RESET',
  ROLE_UPDATE = 'ROLE_UPDATE',
  USER_DELETE = 'USER_DELETE',
  USER_CREATE = 'USER_CREATE',
  USER_UPDATE = 'USER_UPDATE',
  SYSTEM_SETTING_UPDATE = 'SYSTEM_SETTING_UPDATE'
}

export interface IAdminActivityLog extends Document {
  userId: Types.ObjectId;
  action: AdminActionType;
  details: string;
  ipAddress: string;
  timestamp: Date;
}

const adminActivityLogSchema = new Schema<IAdminActivityLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    action: {
      type: String,
      enum: Object.values(AdminActionType),
      required: true
    },
    details: {
      type: String,
      required: true
    },
    ipAddress: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
  }
);

// Create indexes for faster queries
adminActivityLogSchema.index({ userId: 1 });
adminActivityLogSchema.index({ action: 1 });
adminActivityLogSchema.index({ timestamp: -1 });

export const AdminActivityLog = mongoose.model<IAdminActivityLog>('AdminActivityLog', adminActivityLogSchema); 