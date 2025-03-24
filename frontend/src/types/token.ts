import { JwtPayload } from 'jwt-decode';

export interface RefreshLock {
  isLocked: boolean;
  lockTime: number;
  lockTimeout: number;
  lockId: string;
}

export interface QueueItem extends RefreshRequest {
  lockId?: string;
}

export interface TokenStateInfo {
  token: string | null;
  state: TokenState;
  lastRefresh: number;
  nextRefresh: number;
  error: Error | null;
  isLocked: boolean;
  expiresAt?: number;
  timeToExpiration?: number;
}

export enum TokenState {
  VALID = 'VALID',
  REFRESHING = 'REFRESHING',
  EXPIRING_SOON = 'EXPIRING_SOON',
  EXPIRED = 'EXPIRED',
  ERROR = 'ERROR',
  INITIALIZING = 'INITIALIZING',
  REVOKED = 'REVOKED'
}

export enum TokenEventType {
  TOKEN_INITIALIZED = 'tokenInitialized',
  TOKEN_REFRESH = 'tokenRefresh',
  TOKEN_EXPIRING = 'tokenExpiring',
  TOKEN_EXPIRED = 'tokenExpired',
  TOKEN_ERROR = 'tokenError',
  TOKEN_REVOKED = 'tokenRevoked',
  TOKEN_STATE_CHANGE = 'tokenStateChange',
  REFRESH_STARTED = 'refreshStarted',
  REFRESH_SUCCEEDED = 'refreshSucceeded',
  REFRESH_FAILED = 'refreshFailed',
  QUEUE_UPDATE = 'queueUpdate'
}

export interface RefreshRequest {
  timestamp: number;
  priority: 'high' | 'normal' | 'low';
  retryCount?: number;
}

export interface TokenManagerConfig {
  refreshThreshold: number; // Percentage of token lifetime before refresh (0-1)
  minRefreshInterval: number; // Minimum time between refresh attempts in ms
  maxRetries: number; // Maximum number of retry attempts
  backoffFactor: number; // Exponential backoff factor
  maxBackoffTime: number; // Maximum backoff time in ms
  queueMaxSize: number; // Maximum number of queued refresh requests
  expiringThreshold?: number; // Seconds before expiration to consider token as expiring soon
  circuitBreakerTimeout?: number; // Time in ms to wait before resetting circuit breaker
  circuitBreakerFailureThreshold?: number; // Number of consecutive failures before tripping circuit breaker
}

export interface TokenManagerEvents {
  onStateChange?: (state: TokenState) => void;
  onTokenRefresh?: (token: string) => void;
  onTokenExpiring?: (timeToExpiration: number) => void;
  onTokenExpired?: () => void;
  onTokenRevoked?: () => void;
  onRefreshStarted?: () => void;
  onRefreshFailed?: (error: Error) => void;
  onError?: (error: Error) => void;
  onQueueUpdate?: (queueSize: number) => void;
}

export interface TokenInfo extends JwtPayload {
  id: string;
  exp: number;
  iat: number;
  email?: string;
  role?: string;
}

export interface TokenManagerStats {
  refreshCount: number;
  errorCount: number;
  averageRefreshTime: number;
  lastRefreshTime: number;
  queueSize: number;
  consecutiveFailures: number;
  lastErrorTime?: number;
  circuitBreakerTripped?: boolean;
  circuitBreakerResetTime?: number;
}

export class TokenError extends Error {
  public code: TokenErrorCode;
  public details?: Record<string, unknown>;
  public context?: Record<string, unknown>;
  
  constructor(message: string, code: TokenErrorCode, details?: Record<string, unknown>, context?: Record<string, unknown>) {
    super(message);
    this.name = 'TokenError';
    this.code = code;
    this.details = details;
    this.context = context;
  }
}

export enum TokenErrorCode {
  REFRESH_FAILED = 'REFRESH_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_TOKEN = 'INVALID_TOKEN',
  EXPIRED_TOKEN = 'EXPIRED_TOKEN',
  SERVER_ERROR = 'SERVER_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  CIRCUIT_BREAKER_TRIPPED = 'CIRCUIT_BREAKER_TRIPPED',
  MAX_RETRIES_EXCEEDED = 'MAX_RETRIES_EXCEEDED',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// Device types for dynamic token expiration
export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown';

// Token expiration configuration for different device types and scenarios
export interface TokenExpirationConfig {
  desktop: {
    standard: string; // Standard token expiration (e.g., '15m')
    rememberMe: string; // Expiration with "Remember Me" enabled (e.g., '7d')
  };
  mobile: {
    standard: string;
    rememberMe: string;
  };
  tablet: {
    standard: string;
    rememberMe: string;
  };
  unknown: {
    standard: string;
    rememberMe: string;
  };
} 