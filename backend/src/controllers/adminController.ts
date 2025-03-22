import { Request, Response } from 'express';
import { User, IUser } from '../models/User';
import { AdminActivityLog, AdminActionType } from '../models/AdminActivityLog';
import mongoose from 'mongoose';
import { Types } from 'mongoose';
import os from 'os';

/**
 * Get system stats (admin only)
 * @route GET /api/admin/stats
 */
export const getSystemStats = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check if user has admin role
    const user = req.user as IUser;
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden - Admin access required' });
    }

    // Get all users count
    const totalUsers = await User.countDocuments();
    
    // Get active users count
    const activeUsers = await User.countDocuments({ isActive: true });
    
    // Get locked accounts count
    const lockedAccounts = await User.countDocuments({ accountLocked: true });
    
    // System uptime
    const uptimeInSeconds = os.uptime();
    const days = Math.floor(uptimeInSeconds / 86400);
    const hours = Math.floor((uptimeInSeconds % 86400) / 3600);
    const minutes = Math.floor(((uptimeInSeconds % 86400) % 3600) / 60);
    const systemUptime = `${days}d ${hours}h ${minutes}m`;

    // Get trades count (if Trade model exists)
    let totalTrades = 0;
    let tradesThisMonth = 0;
    
    try {
      // Assuming there's a Trade model - modify as needed
      if (mongoose.models.Trade) {
        const Trade = mongoose.model('Trade');
        totalTrades = await Trade.countDocuments();
        
        // Get trades for current month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        tradesThisMonth = await Trade.countDocuments({
          createdAt: { $gte: startOfMonth }
        });
      }
    } catch (err) {
      console.error('Error fetching trade statistics:', err);
      // Just continue if Trade model doesn't exist
    }

    res.json({
      totalUsers,
      activeUsers,
      lockedAccounts,
      totalTrades,
      tradesThisMonth,
      systemUptime
    });
  } catch (error) {
    console.error('Error getting system stats:', error);
    res.status(500).json({ message: 'Error fetching system statistics' });
  }
};

/**
 * Get locked user accounts (admin only)
 * @route GET /api/admin/locked-accounts
 */
export const getLockedAccounts = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check if user has admin role
    const user = req.user as IUser;
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden - Admin access required' });
    }

    // Find locked accounts
    const lockedUsers = await User.find({ 
      accountLocked: true 
    }).select('-password');

    res.json({
      success: true,
      users: lockedUsers
    });
  } catch (error) {
    console.error('Error getting locked accounts:', error);
    res.status(500).json({ message: 'Error fetching locked accounts' });
  }
};

/**
 * Log admin activity
 * @param userId - The admin's user ID
 * @param action - The action performed
 * @param details - Details about the action
 * @param ipAddress - The IP address from which the action was performed
 */
export const logAdminActivity = async (
  userId: Types.ObjectId,
  action: AdminActionType,
  details: string,
  ipAddress: string
) => {
  try {
    const log = new AdminActivityLog({
      userId,
      action,
      details,
      ipAddress
    });
    
    await log.save();
    console.log(`Admin activity logged: ${action} by ${userId}`);
    return true;
  } catch (error) {
    console.error('Error logging admin activity:', error);
    return false;
  }
};

/**
 * Get admin activity logs (admin only)
 * @route GET /api/admin/activity-logs
 */
export const getActivityLogs = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check if user has admin role
    const user = req.user as IUser;
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden - Admin access required' });
    }

    // Get pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Get admin activity logs with user details
    const logs = await AdminActivityLog.find()
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'firstName lastName email')
      .lean();

    // Get total count for pagination
    const total = await AdminActivityLog.countDocuments();

    // Format the logs for the response
    const formattedLogs = logs.map(log => {
      const userDoc = log.userId as any; // Cast to any since it's populated
      return {
        id: log._id,
        userId: userDoc._id,
        userName: `${userDoc.firstName} ${userDoc.lastName}`,
        userEmail: userDoc.email,
        action: log.action,
        details: log.details,
        timestamp: log.timestamp,
        ipAddress: log.ipAddress
      };
    });

    res.json({
      logs: formattedLogs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting admin activity logs:', error);
    res.status(500).json({ message: 'Error fetching admin activity logs' });
  }
}; 