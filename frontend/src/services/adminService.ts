import api from '../utils/api';
import { AxiosError } from 'axios';

// Interface for error responses
interface ErrorResponse {
  message: string;
  success?: boolean;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
  isActive?: boolean;
  failedLoginAttempts?: number;
  accountLocked?: boolean;
  accountLockedUntil?: string;
  previousLockouts?: number;
  lastLogin?: string;
}

export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalTrades: number;
  tradesThisMonth: number;
  systemUptime: string;
  lockedAccounts?: number;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
  ipAddress: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Get all users (admin only)
const getUsers = async (): Promise<User[]> => {
  try {
    const response = await api.get('/api/users/search', { withCredentials: true });
    return response.data.users || [];
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
};

// Get system statistics (admin only)
const getSystemStats = async (): Promise<SystemStats> => {
  try {
    const response = await api.get('/api/admin/stats', { withCredentials: true });
    return response.data;
  } catch (error) {
    console.error('Error fetching system stats:', error);
    return {
      totalUsers: 0,
      activeUsers: 0,
      totalTrades: 0,
      tradesThisMonth: 0,
      systemUptime: '0h 0m',
      lockedAccounts: 0
    };
  }
};

// Get locked user accounts
const getLockedUsers = async (): Promise<User[]> => {
  try {
    const response = await api.get('/api/admin/locked-accounts', { withCredentials: true });
    return response.data.users || [];
  } catch (error) {
    console.error('Error fetching locked users:', error);
    return [];
  }
};

// Unlock user account
const unlockUserAccount = async (userId: string, resetLockoutHistory: boolean = false): Promise<{ success: boolean, message: string }> => {
  try {
    const response = await api.post('/api/auth/unlock-account', 
      { userId, resetLockoutHistory }, 
      { withCredentials: true }
    );
    return { 
      success: true, 
      message: response.data.message || 'Account unlocked successfully' 
    };
  } catch (error) {
    console.error('Error unlocking user account:', error);
    const typedError = error as AxiosError<ErrorResponse>;
    const errorMessage = typedError.response?.data?.message || 'Failed to unlock account';
    return { success: false, message: errorMessage };
  }
};

// Get admin activity logs
const getActivityLogs = async (page: number = 1, limit: number = 20): Promise<{logs: ActivityLog[], pagination: Pagination}> => {
  try {
    const response = await api.get(`/api/admin/activity-logs?page=${page}&limit=${limit}`, 
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return { logs: [], pagination: { total: 0, page, limit, totalPages: 0 } };
  }
};

// Update user role (admin only)
const updateUserRole = async (userId: string, role: 'user' | 'admin'): Promise<User> => {
  try {
    const response = await api.put(`/api/users/${userId}/role`, { role }, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data.user;
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
};

const adminService = {
  getUsers,
  getSystemStats,
  getLockedUsers,
  unlockUserAccount,
  getActivityLogs,
  updateUserRole
};

export default adminService; 