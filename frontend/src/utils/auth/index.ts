export * from './TokenUtils';
export * from './NetworkUtils';

// User type for storage
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin';
  profilePicture: string | null;
}

// Common types
export interface TokenInfo {
  token: string;
  expiresAt: number;
  fingerprint: string;
}

export interface AuthStorage {
  user: User;
  tokenInfo?: TokenInfo;
  twoFactorState?: {
    required: boolean;
    userId: string;
    timestamp: number;
  }
} 