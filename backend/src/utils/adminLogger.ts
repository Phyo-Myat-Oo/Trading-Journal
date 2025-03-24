import { AdminActivityLog } from '../models/AdminActivityLog';
import { AdminActionType } from '../models/AdminActivityLog';
import { Types } from 'mongoose';

export async function logAdminActivity(
  adminId: string | Types.ObjectId,
  actionType: AdminActionType,
  targetUserId: string | Types.ObjectId,
  details: string
): Promise<void> {
  try {
    await AdminActivityLog.create({
      adminId: adminId.toString(),
      actionType,
      targetUserId: targetUserId.toString(),
      details,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error logging admin activity:', error);
    // We don't throw the error here as logging should not break the main flow
  }
} 