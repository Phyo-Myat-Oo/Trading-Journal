import axios from 'axios';
import { jwtDecode, JwtPayload as JwtPayloadType } from 'jwt-decode';
import api from '../utils/api';
import {
  createTokenFingerprint,
  encryptData,
  decryptData,
  getTokenRemainingTime,
  isTokenFingerprintValid,
  checkOnlineStatus,
  User
} from '../utils/auth';
import { TokenManager } from './TokenManager';
import { TokenError, TokenErrorCode } from '../types/token';

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken?: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'user' | 'admin';
  };
  message: string;
  success?: boolean;
  requireTwoFactor?: boolean;
  userId?: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  message: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
}

export interface MessageResponse {
  message: string;
  success?: boolean;
}

export type { User };

export interface SessionData {
  id: string;
  jti: string;
  userAgent: string;
  ipAddress: string;
  createdAt: string;
  expiresAt: string;
}

interface JwtPayload extends JwtPayloadType {
  id: string;
  exp: number;
  iat: number;
  email?: string;
  role?: string;
}

// Token fingerprint storage key
const TOKEN_FINGERPRINT_KEY = 'authTokenFingerprint';

// Debug logging function that only logs in development
const debugLog = (message: string, data?: unknown) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Auth] ${message}`, data || '');
  }
};

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// In-memory token storage (more secure than localStorage)
let accessToken: string | null = null;

// For refreshing token semaphore - prevents multiple refresh requests
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

// Initialization status
let isInitializing = false;
let isInitialized = false;

// Debounce API calls - commented out as it's handled by TokenManager now
/*
const apiCallDebounce = {
  refreshToken: {
    lastCall: 0,
    cooldown: 5000, // 5 seconds cooldown
    consecutiveFailures: 0, 
    maxConsecutiveFailures: 5, // Circuit breaker threshold
    backoffFactor: 1.5, // Exponential backoff factor
    inCooldown: false, // Circuit breaker status
    circuitBreakerResetTime: 60000, // 1 minute circuit breaker cooldown
    circuitBreakerTimeout: null as number | null,
  },
  checkSession: {
    lastCall: 0,
    cooldown: 1000, // 1 second cooldown
  }
};
*/

// Function to calculate dynamic cooldown based on consecutive failures
// NOTE: Currently saved for future use
/*
const calculateDynamicCooldown = (baseDelay: number, failures: number, factor: number): number => {
  if (failures <= 0) return baseDelay;
  // Apply exponential backoff with maximum cap
  return Math.min(baseDelay * Math.pow(factor, failures), 300000); // Max 5 minutes
};
*/

// Reset circuit breaker after cooldown period
// NOTE: Currently saved for future use
/*
const resetCircuitBreaker = () => {
  if (apiCallDebounce.refreshToken.circuitBreakerTimeout) {
    clearTimeout(apiCallDebounce.refreshToken.circuitBreakerTimeout);
  }
  
  apiCallDebounce.refreshToken.circuitBreakerTimeout = window.setTimeout(() => {
    debugLog('Circuit breaker reset after cooldown period');
    apiCallDebounce.refreshToken.inCooldown = false;
    apiCallDebounce.refreshToken.consecutiveFailures = 0;
    apiCallDebounce.refreshToken.circuitBreakerTimeout = null;
  }, apiCallDebounce.refreshToken.circuitBreakerResetTime);
};
*/

// Subscribe to token refresh
const subscribeTokenRefresh = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

// On token refreshed, notify subscribers
const onTokenRefreshed = (newToken: string) => {
  refreshSubscribers.forEach(callback => callback(newToken));
  refreshSubscribers = [];
};

// Store token fingerprint in localStorage (not the actual token)
const storeTokenFingerprint = (token: string) => {
  try {
    const fingerprint = createTokenFingerprint(token);
    localStorage.setItem(TOKEN_FINGERPRINT_KEY, encryptData(JSON.stringify(fingerprint)));
    debugLog('Token fingerprint stored in localStorage');
  } catch (e) {
    console.warn('Failed to store token fingerprint:', e);
  }
};

// Get stored token fingerprint from localStorage
const getStoredFingerprint = () => {
  try {
    const encryptedData = localStorage.getItem(TOKEN_FINGERPRINT_KEY);
    if (!encryptedData) return null;
    
    const decrypted = decryptData(encryptedData);
    return JSON.parse(decrypted);
  } catch (e) {
    console.warn('Failed to retrieve token fingerprint:', e);
    localStorage.removeItem(TOKEN_FINGERPRINT_KEY);
    return null;
  }
};

// Track if a logout is in progress
let isLoggingOut = false;
// Timeout to reset the logout state
let logoutResetTimeout: ReturnType<typeof setTimeout> | null = null;

const register = async (userData: RegisterData): Promise<AuthResponse> => {
  console.log('Attempting registration with:', userData.email);
  try {
    // During registration, don't try to refresh token
    const response = await api.post('/api/auth/register', userData, { 
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('Registration response:', response);
    console.log('Registration cookies:', document.cookie);
    
    if (response.data.accessToken) {
      accessToken = response.data.accessToken;
      localStorage.setItem('user', JSON.stringify(response.data.user));
      console.log('Access token saved:', accessToken);
      
      // Store token fingerprint
      storeTokenFingerprint(response.data.accessToken);
    }
    return response.data;
  } catch (error) {
    console.error('Registration error details:', error);
    throw error;
  }
};

const login = async (userData: LoginData): Promise<AuthResponse> => {
  console.log('Attempting login with:', userData.email);
  try {
    console.log('Making POST request to /api/auth/login');
    const response = await api.post('/api/auth/login', userData, { 
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    });
    
    console.log('Login response received:', response.status);
    console.log('Response data structure:', Object.keys(response.data));
    console.log('Full response data:', JSON.stringify(response.data, null, 2));
    
    // Check if 2FA is required
    if (response.data.requireTwoFactor) {
      console.log('Two-factor authentication required');
      return {
        message: 'Two-factor authentication required',
        requireTwoFactor: true,
        userId: response.data.userId,
        success: false
      };
    }
    
    if (response.data && response.data.accessToken) {
      accessToken = response.data.accessToken;
      
      // Make sure the user object is complete
      if (response.data.user && 
          response.data.user.id && 
          response.data.user.email && 
          response.data.user.firstName) {
        
        localStorage.setItem('user', JSON.stringify(response.data.user));
        console.log('User info stored in localStorage', response.data.user);
        
        // Store token fingerprint for persistence
        storeTokenFingerprint(response.data.accessToken);
      } else {
        console.error('Invalid user object in response:', response.data.user);
        throw new Error('Invalid user data received from server');
      }
      
      console.log('Access token saved, length:', response.data.accessToken.length);
    } else {
      console.warn('No accessToken received from login response. Response:', JSON.stringify(response.data));
      throw new Error('No authentication token received');
    }
    
    return { ...response.data, success: true };
  } catch (error) {
    console.error('Login error details:', error);
    
    // Add specific handling for different error types
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        console.error('Request timeout');
        throw new Error('Login request timed out. Please try again.');
      }
      
      if (!error.response) {
        console.error('Network error');
        throw new Error('Network error. Please check your connection and try again.');
      }
      
      // Log the server error response
      if (error.response) {
        console.error('Server response error:', {
          status: error.response.status,
          data: error.response.data
        });
      }
    }
    
    throw error;
  }
};

const logout = async (): Promise<void> => {
  // If already logging out, don't start another logout request
  if (isLoggingOut) {
    debugLog('Logout already in progress, ignoring duplicate request');
    return;
  }
  
  try {
    // Set logging out flag
    isLoggingOut = true;
    debugLog('Starting logout process');
    
    // Call logout endpoint to clear the HTTP-only cookie
    await api.post('/api/auth/logout', {}, { withCredentials: true });
    
    debugLog('Logout API call completed successfully');
  } catch (error) {
    console.error('Error during logout:', error);
  } finally {
    // Clear local state regardless of server response
    accessToken = null;
    localStorage.removeItem('user');
    localStorage.removeItem(TOKEN_FINGERPRINT_KEY);
    
    // Set a timeout to reset the logging out flag
    // This prevents multiple logout calls in quick succession
    if (logoutResetTimeout) {
      clearTimeout(logoutResetTimeout);
    }
    
    logoutResetTimeout = setTimeout(() => {
      isLoggingOut = false;
    }, 2000);
  }
};

/**
 * Refresh the access token using the refresh token stored in HTTP-only cookie
 * This implementation now delegates to TokenManager for the actual refresh
 */
const refreshToken = async (): Promise<boolean> => {
  // Check if already refreshing
  if (isRefreshing) {
    debugLog('Another refresh already in progress, waiting for it to complete');
    return new Promise<boolean>((resolve) => {
      // Add timeout to prevent hanging subscribers
      const timeoutId = setTimeout(() => {
        debugLog('Refresh subscriber timed out after 5 seconds');
        // Remove from subscribers list to prevent memory leaks
        refreshSubscribers = refreshSubscribers.filter(cb => cb !== resolveCallback);
        resolve(false);
      }, 5000);
      
      // Create a function we can reference for cleanup
      const resolveCallback = (token: string) => {
        clearTimeout(timeoutId);
        resolve(!!token);
      };
      
      subscribeTokenRefresh(resolveCallback);
    });
  }
  
  isRefreshing = true;
  
  try {
    debugLog('Delegating token refresh to TokenManager');
    
    // Get TokenManager instance
    const tokenManager = TokenManager.getInstance();
    
    // Request token refresh from TokenManager
    const token = await tokenManager.refreshToken('high');
    
    if (token) {
      debugLog('Token refreshed successfully via TokenManager');
      accessToken = token;
      onTokenRefreshed(token);
      
      // Store token fingerprint for persistence
      storeTokenFingerprint(token);
      
      // Make sure we still have the user data in localStorage
      const user = getCurrentUser();
      if (!user && accessToken) {
        try {
          // Try to get user data from the token
          const decoded = jwtDecode<JwtPayload>(accessToken);
          if (decoded && decoded.id) {
            // Create minimal user object from token data
            const minimalUser = {
              id: decoded.id,
              email: decoded.email || 'unknown@example.com',
              firstName: 'Unknown', // Can be updated later
              lastName: 'User',     // Can be updated later
              role: decoded.role || 'user'
            };
            
            // Save minimal user info to localStorage
            localStorage.setItem('user', JSON.stringify(minimalUser));
          }
        } catch (error) {
          console.error('Failed to extract user data from token:', error);
        }
      }
      
      return true;
    } else {
      debugLog('TokenManager refresh did not return a token');
      accessToken = null;
      return false;
    }
  } catch (error) {
    // Handle TokenManager errors
    if (error instanceof TokenError) {
      console.error(`Token refresh failed: ${error.message} (${error.code})`, error.context);
      
      // Handle specific error codes
      if (error.code === TokenErrorCode.CIRCUIT_BREAKER_TRIPPED) {
        debugLog('Circuit breaker tripped, refresh not attempted');
      } else if (error.code === TokenErrorCode.NETWORK_ERROR) {
        debugLog('Network error during refresh, will retry on network recovery');
      }
    } else {
      console.error('Error refreshing token:', error);
    }
    
    // Clear token if refresh failed but don't clear user yet
    // We'll let the auth context decide whether to log out
    accessToken = null;
    
    return false;
  } finally {
    isRefreshing = false;
  }
};

/**
 * Initialize auth state on application start
 * This now properly initializes TokenManager
 */
const initializeAuth = async (): Promise<boolean> => {
  if (isInitializing || isInitialized) {
    debugLog(`Auth initialization already ${isInitializing ? 'in progress' : 'completed'}`);
    return isAuthenticated();
  }
  
  isInitializing = true;
  debugLog('Starting auth initialization');
  
  try {
    // Get TokenManager instance
    const tokenManager = TokenManager.getInstance();
    
    // Check for existing token
    const existingToken = getToken();
    
    // If we have a token, validate it with TokenManager
    if (existingToken) {
      tokenManager.initializeToken(existingToken);
      
      // Check if token is valid according to TokenManager
      if (tokenManager.isTokenValid()) {
        debugLog('Found valid token, authentication successful');
        isInitialized = true;
        return true;
      } else {
        debugLog('Found expired token, attempting refresh');
        const refreshSuccessful = await refreshToken();
        isInitialized = true;
        return refreshSuccessful;
      }
    }
    
    // No token in memory, check for token fingerprint
    const fingerprint = getStoredFingerprint();
    if (fingerprint && isTokenFingerprintValid(fingerprint)) {
      debugLog('Found valid token fingerprint, attempting refresh');
      const refreshSuccessful = await refreshToken();
      isInitialized = true;
      return refreshSuccessful;
    }
    
    // No valid token or fingerprint
    debugLog('No valid authentication found');
    isInitialized = true;
    return false;
  } catch (error) {
    console.error('Error during auth initialization:', error);
    isInitialized = true;
    return false;
  } finally {
    isInitializing = false;
  }
};

const forgotPassword = async (data: ForgotPasswordData): Promise<MessageResponse> => {
  const response = await api.post('/api/auth/forgot-password', data);
  return response.data;
};

const requestPasswordReset = forgotPassword;

const resetPassword = async (data: ResetPasswordData): Promise<MessageResponse> => {
  const response = await api.post('/api/auth/reset-password', data);
  return response.data;
};

const verifyEmail = async (token: string): Promise<MessageResponse> => {
  const response = await api.post('/api/auth/verify-email', { token });
  return response.data;
};

// Set the token (used for testing and token refresh)
const setToken = (token: string | null) => {
  accessToken = token;
  if (token) {
    storeTokenFingerprint(token);
  } else {
    localStorage.removeItem(TOKEN_FINGERPRINT_KEY);
  }
};

// Get the current token
const getToken = (): string | null => {
  return accessToken;
};

const getCurrentUser = (): User | null => {
  try {
  const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// Check if token is expired
const isTokenExpired = () => {
  const token = getToken();
  if (!token) {
    debugLog('No access token found, considering token expired');
    return true;
  }

  try {
    const decoded = jwtDecode<JwtPayload>(token);
    const currentTime = Date.now() / 1000;

    // Get token expiry time from decoded JWT
    const expTime = decoded.exp;

    // Standard strategy: consider token expired if it's within 2 minutes of expiry
    // or if it has less than 1/3 of its lifetime remaining
    const tokenLifetime = decoded.exp - (decoded.iat || 0);
    const timeElapsed = currentTime - (decoded.iat || 0);
    const lifetimePercentUsed = timeElapsed / tokenLifetime;
    
    // Expire if less than 2 minutes remain OR we've used more than 2/3 of the lifetime
    // Add a grace period for offline scenarios
    const isOffline = !checkOnlineStatus();
    const gracePeriod = isOffline ? 3600 : 120; // 1 hour grace when offline, 2 minutes normally
    
    const isExpired = (expTime - currentTime < gracePeriod) || (!isOffline && lifetimePercentUsed > 0.67);
    
    // Store token expiry info in localStorage for persistence across page reloads
    try {
      localStorage.setItem('tokenExpiry', JSON.stringify({
        exp: expTime,
        lastChecked: currentTime,
        isOffline
      }));
    } catch (e) {
      console.warn('Failed to store token expiry info:', e);
    }
    
    // Only log detailed info in development
    if (isDevelopment && isExpired) {
      console.debug('Token expiry check:', {
        tokenExp: new Date(expTime * 1000).toISOString(),
        currentTime: new Date(currentTime * 1000).toISOString(),
        timeRemaining: Math.floor(expTime - currentTime),
        isOffline,
        gracePeriod,
        isExpired
      });
    }
    
    return isExpired;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    
    // If we can't decode the token, check localStorage as fallback
    try {
      const storedExpiry = localStorage.getItem('tokenExpiry');
      if (storedExpiry) {
        const { exp, lastChecked, isOffline } = JSON.parse(storedExpiry);
        const currentTime = Date.now() / 1000;
        const gracePeriod = isOffline ? 3600 : 120;
        
        // If we're offline, give an extended grace period
        if (!checkOnlineStatus() && (exp - currentTime > -3600)) {
          console.log('Offline mode: using extended token grace period');
          return false;
        }
        
        // If checked recently and token was valid, trust that
        if (currentTime - lastChecked < 300 && exp - lastChecked > gracePeriod) {
          return false;
        }
      }
    } catch (e) {
      console.warn('Failed to read token expiry info from localStorage:', e);
    }
    
    return true;
  }
};

const isTokenValid = (): boolean => {
  if (!accessToken) {
    console.log('No access token found, token is invalid');
    return false;
  }
  
  try {
    const decoded = jwtDecode<JwtPayload>(accessToken);
    const currentTime = Date.now() / 1000;
    
    const isValid = decoded.exp > currentTime;
    console.log('Token validity check:', { 
      tokenExp: new Date(decoded.exp * 1000).toISOString(),
      currentTime: new Date(currentTime * 1000).toISOString(),
      isValid
    });
    
    return isValid;
  } catch (error) {
    console.error('Error checking token validity:', error);
    return false;
  }
};

const isAuthenticated = (): boolean => {
  return !!getToken() && isTokenValid();
};

const getTokenRemainingTimeMs = (): number => {
  const token = getToken();
  if (!token) return 0;
  
  try {
    return getTokenRemainingTime(token);
  } catch (error) {
    console.error('Error getting token remaining time:', error);
    return 0;
  }
};

/**
 * Verify a TOTP code during 2FA login
 */
const verifyTwoFactorLogin = async (userId: string, code: string): Promise<AuthResponse> => {
  // Input validation
  if (!userId || !code) {
    console.error('Missing required parameters for 2FA verification');
    const error = new Error('Token and user ID are required');
    // @ts-expect-error Adding custom property to Error
    error.isValidationError = true;
    throw error;
  }
  
  // Format validation
  if (!/^\d{6}$/.test(code)) {
    console.error('Invalid 2FA code format');
    const error = new Error('Verification code must be 6 digits');
    // @ts-expect-error Adding custom property to Error
    error.isValidationError = true;
    throw error;
  }
  
  try {
    // Add retry logic for network issues
    const maxRetries = 2;
    let currentTry = 0;
    let lastError = null;
    
    while (currentTry <= maxRetries) {
      try {
        const response = await api.post(
          '/api/auth/2fa/verify', 
          { 
            userId, 
            token: code // Changed from 'code' to 'token' to match backend expectation
          },
          { 
            withCredentials: true,
            timeout: 10000 // 10 second timeout
          }
        );
        
        // If successful, handle the token and user info
        if (response.data && response.data.accessToken) {
          accessToken = response.data.accessToken;
          
          if (response.data.user) {
            localStorage.setItem('user', JSON.stringify(response.data.user));
          }
          
          // Store token fingerprint for persistence
          storeTokenFingerprint(response.data.accessToken);
        }
        
        return { ...response.data, success: true };
      } catch (error) {
        lastError = error;
        // Only retry on network errors, not validation errors
        if (
          error instanceof Error && 
          error.message.includes('Network Error') && 
          checkOnlineStatus() && 
          currentTry < maxRetries
        ) {
          currentTry++;
          // Wait with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, currentTry)));
          continue;
        }
        // For other errors or if we've exhausted retries, break out and throw
        break;
      }
    }
    
    // If we've exhausted retries or hit a non-retryable error, throw the last error
    if (lastError) {
      throw lastError;
    }
    
    throw new Error('Failed to verify 2FA code after retries');
  } catch (error) {
    console.error('Error verifying 2FA code:', error);
    throw error;
  }
};

/**
 * Verify a backup code during 2FA login
 */
const verifyBackupCode = async (userId: string, backupCode: string): Promise<AuthResponse> => {
  // Input validation
  if (!userId || !backupCode) {
    console.error('Missing required parameters for backup code verification');
    const error = new Error('User ID and backup code are required');
    // @ts-expect-error Adding custom property to Error
    error.isValidationError = true;
    throw error;
  }
  
  // Format validation for backup code (alphanumeric, no special chars)
  if (!/^[a-zA-Z0-9]+$/.test(backupCode)) {
    console.error('Invalid backup code format');
    const error = new Error('Backup code format is invalid');
    // @ts-expect-error Adding custom property to Error
    error.isValidationError = true;
    throw error;
  }
  
  try {
    // Include timestamp to prevent replay attacks
    const verificationTime = Date.now();
    
    const response = await api.post(
      '/api/auth/2fa/backup', 
      { 
        userId, 
        backupCode,
        verificationTime,
        // Include a client session ID for tracing
        sessionId: localStorage.getItem('sessionId') || `session-${Date.now()}`
      },
      { 
        withCredentials: true,
        timeout: 10000 // 10 second timeout
      }
    );
    
    // If successful, handle the token and user info
    if (response.data && response.data.accessToken) {
      accessToken = response.data.accessToken;
      
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      // Store token fingerprint for persistence
      storeTokenFingerprint(response.data.accessToken);
    }
    
    return { ...response.data, success: true };
  } catch (error) {
    console.error('Error verifying backup code:', error);
    
    // Convert error to a more user-friendly format when possible
    if (error instanceof Error) {
      // @ts-expect-error Checking custom property on Error
      if (error.isValidationError) {
        return {
          success: false,
          message: error.message
        };
      }
      
      // Axios error handling
      // @ts-expect-error Checking for Axios error response
      if (error.response) {
        // @ts-expect-error Accessing Axios error status
        const status = error.response.status;
        // @ts-expect-error Accessing Axios error data
        const message = error.response.data?.message || 'Failed to verify backup code';
        
        if (status === 400) {
          return {
            success: false,
            message: message || 'Invalid backup code'
          };
        } else if (status === 404) {
          return {
            success: false,
            message: 'User not found or session expired'
          };
        } else if (status === 401) {
          return {
            success: false,
            message: 'Backup code is invalid or has already been used'
          };
        }
      }
    }
    
    throw error;
  }
};

/**
 * Check if user has permission to access a resource or perform an action
 * @param resource The resource or action to check
 * @returns Promise that resolves to an object with allowed flag and message
 */
const checkPermission = async (resource: string): Promise<{ allowed: boolean; message?: string }> => {
  try {
    // Only make the API call if the user is logged in
    if (!getCurrentUser()) {
      return { allowed: false, message: 'User not authenticated' };
    }
    
    const response = await api.post('/api/auth/check-permission', { resource }, {
      withCredentials: true
    });
    
    return { 
      allowed: response.data.allowed, 
      message: response.data.message 
    };
  } catch (error) {
    console.error('Error checking permission:', error);
    // Default to denying access on error
    return { 
      allowed: false, 
      message: 'Error checking permissions' 
    };
  }
};

/**
 * Get user's active sessions
 */
const getUserSessions = async (): Promise<SessionData[]> => {
  try {
    const response = await api.get('/api/auth/sessions', {
      withCredentials: true
    });
    return response.data.sessions || [];
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    throw error;
  }
};

/**
 * Terminate a specific session by its JTI
 */
const terminateSession = async (sessionJti: string): Promise<boolean> => {
  try {
    const response = await api.post('/api/auth/sessions/revoke', {
      jti: sessionJti
    }, {
      withCredentials: true
    });
    return response.status === 200;
  } catch (error) {
    console.error('Error terminating session:', error);
    throw error;
  }
};

/**
 * Response type for cookie check
 */
export interface CookieCheckResponse {
  hasRefreshToken: boolean;
  environment: string;
  serverTime: string;
  status: 'success' | 'error';
  message?: string;
}

/**
 * Check cookie status (for debugging)
 */
const checkCookies = async (): Promise<CookieCheckResponse> => {
  try {
    // Set a test cookie first
    document.cookie = "cookieTest=1; path=/;";
    
    // Make a request to check cookies
    const response = await api.get<CookieCheckResponse>('/api/auth/check-cookies', {
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    console.error('Error checking cookies:', error);
    throw error;
  }
};

const resendVerificationEmail = async (email: string): Promise<MessageResponse> => {
  const response = await api.post('/api/auth/resend-verification', { email });
  return response.data;
};

export default {
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
  getToken,
  setToken,
  getCurrentUser,
  isTokenExpired,
  isTokenValid,
  isAuthenticated,
  verifyTwoFactorLogin,
  verifyBackupCode,
  checkPermission,
  getTokenRemainingTimeMs,
  initializeAuth,
  getUserSessions,
  terminateSession,
  checkCookies,
  resendVerificationEmail
}; 