import api from '../utils/api';
import axios from 'axios';

export interface SecurityStatus {
  success: boolean;
  data: {
    twoFactorEnabled: boolean;
    lastPasswordChange: string;
    failedLoginAttempts: number;
    accountLocked: boolean;
    accountLockedUntil: string | null;
  }
}

export interface SetupTwoFactorResponse {
  success: boolean;
  data: {
    secret: string;
    qrCode: string;
  };
}

export interface VerifyTwoFactorResponse {
  success: boolean;
  message: string;
  backupCodes?: string[];
}

export interface ProfileData {
  firstName?: string;
  lastName?: string;
  email?: string;
  [key: string]: string | number | boolean | undefined; // More specific type for additional properties
}

export interface ActivityLogEntry {
  type: string;
  date: Date;
  details: string;
  ip?: string;
  userAgent?: string;
  [key: string]: string | Date | number | boolean | undefined; // More specific type for additional metadata
}

/**
 * Get the current user's security status
 */
const getSecurityStatus = async (): Promise<SecurityStatus['data']> => {
  const response = await api.get<SecurityStatus>('/api/users/security-status');
  return response.data.data;
};

/**
 * Setup two-factor authentication
 */
const setupTwoFactor = async (): Promise<SetupTwoFactorResponse> => {
  const response = await api.get('/api/users/2fa/setup');
  return response.data;
};

/**
 * Verify and enable two-factor authentication
 */
const verifyTwoFactorSetup = async (token: string): Promise<VerifyTwoFactorResponse> => {
  try {
    const response = await api.post('/api/users/2fa/verify', 
      { token, bypassCsrf: true }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new Error('2FA verification endpoint not found. Please contact support.');
      }
      if (error.response?.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      }
      if (error.response?.status === 400) {
        throw new Error(error.response.data.message || 'Invalid verification code');
      }
    }
    throw error;
  }
};

/**
 * Disable two-factor authentication
 */
const disableTwoFactor = async (password: string): Promise<void> => {
  await api.post('/api/users/2fa/disable', { password });
};

/**
 * Change user password
 */
const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  await api.post('/api/users/password', {
    currentPassword,
    newPassword
  });
};

/**
 * Update user profile
 */
const updateProfile = async (data: {
  name?: string;
  email?: string;
  phone?: string;
}): Promise<void> => {
  await api.put('/api/users/profile', data);
};

/**
 * Get user activity log
 */
const getActivityLog = async (): Promise<ActivityLogEntry[]> => {
  const response = await api.get('/api/users/activity-log');
  return response.data;
};

/**
 * Delete user account
 */
const deleteAccount = async (password: string): Promise<void> => {
  await api.post('/api/users/delete-account', { password });
};

// Export all service methods
const userService = {
  getSecurityStatus,
  setupTwoFactor,
  verifyTwoFactorSetup,
  disableTwoFactor,
  changePassword,
  updateProfile,
  getActivityLog,
  deleteAccount
};

export default userService; 