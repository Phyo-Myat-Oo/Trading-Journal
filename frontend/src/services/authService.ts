import axios from 'axios';
import { jwtDecode, JwtPayload as JwtPayloadType } from 'jwt-decode';
import api from '../utils/api';

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
  accessToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'user' | 'admin';
  };
  message: string;
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
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin';
}

export interface SessionData {
  id: string;
  jti: string;
  userAgent: string;
  ipAddress: string;
  createdAt: string;
  expiresAt: string;
}

interface JwtPayload {
  id: string;
  exp: number;
  iat: number;
}

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

// Debounce API calls
const apiCallDebounce = {
  refreshToken: {
    lastCall: 0,
    cooldown: 5000, // 5 seconds cooldown
  },
  checkSession: {
    lastCall: 0,
    cooldown: 1000, // 1 second cooldown
  }
};

// Subscribe to token refresh
const subscribeTokenRefresh = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

// On token refreshed, notify subscribers
const onTokenRefreshed = (newToken: string) => {
  refreshSubscribers.forEach(callback => callback(newToken));
  refreshSubscribers = [];
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
    
    if (response.data && response.data.accessToken) {
      accessToken = response.data.accessToken;
      
      // Make sure the user object is complete
      if (response.data.user && 
          response.data.user.id && 
          response.data.user.email && 
          response.data.user.firstName) {
        
        localStorage.setItem('user', JSON.stringify(response.data.user));
        console.log('User info stored in localStorage', response.data.user);
      } else {
        console.error('Invalid user object in response:', response.data.user);
        throw new Error('Invalid user data received from server');
      }
      
      console.log('Access token saved, length:', response.data.accessToken.length);
    } else {
      console.warn('No accessToken received from login response. Response:', JSON.stringify(response.data));
      throw new Error('No authentication token received');
    }
    return response.data as AuthResponse;
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
    
    // Set a timeout to reset the logging out flag
    // This prevents multiple logout calls in quick succession
    if (logoutResetTimeout) {
      clearTimeout(logoutResetTimeout);
    }
    
    logoutResetTimeout = setTimeout(() => {
      debugLog('Logout cooldown expired, can log out again');
      isLoggingOut = false;
      logoutResetTimeout = null;
    }, 2000); // 2 second cooldown
  }
};

const refreshToken = async (): Promise<boolean> => {
  // Apply debounce to prevent excessive calls
  const now = Date.now();
  if (now - apiCallDebounce.refreshToken.lastCall < apiCallDebounce.refreshToken.cooldown) {
    debugLog('Token refresh debounced, too soon since last call');
    return !!accessToken; // Return current token status
  }
  apiCallDebounce.refreshToken.lastCall = now;

  // If already refreshing, don't make another request
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
    debugLog('Attempting to refresh token');
    
    // Send request to refresh token endpoint
    const response = await api.post<RefreshTokenResponse>(
      '/api/auth/refresh-token', 
      {}, 
      { 
        withCredentials: true,
        headers: {
          'Cache-Control': 'no-cache'
        },
        timeout: 10000 // 10 second timeout
      }
    );
    
    if (response.data && response.data.accessToken) {
      debugLog('Token refreshed successfully');
      accessToken = response.data.accessToken;
      onTokenRefreshed(response.data.accessToken);
      
      // Make sure we still have the user data in localStorage
      const user = getCurrentUser();
      if (!user && accessToken) {
        try {
          // Try to get user data from the token
          const decoded = jwtDecode<JwtPayloadType & { email?: string; role?: string }>(accessToken);
          if (decoded && decoded.id) {
            // Create minimal user object from token data
            const minimalUser = {
              id: decoded.id,
              email: decoded.email || 'unknown@example.com',
              firstName: 'Unknown', // Can be updated later
              lastName: 'User',     // Can be updated later
              role: decoded.role || 'user'
            };
            localStorage.setItem('user', JSON.stringify(minimalUser));
            debugLog('Recreated minimal user data from token');
          }
        } catch (userRecoveryError) {
          console.error('Failed to recover user data from token:', userRecoveryError);
        }
      }
      
      return true;
    }
    
    debugLog('No token received in refresh response');
    // Notify subscribers with an empty token to unblock them
    onTokenRefreshed('');
    return false;
  } catch (error) {
    console.error('Error refreshing token:', error);
    // Notify subscribers to unblock them
    onTokenRefreshed('');
    return false;
  } finally {
    isRefreshing = false;
  }
};

const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    return JSON.parse(userStr);
  }
  return null;
};

const getToken = () => accessToken;

// Check if token is expired
const isTokenExpired = () => {
  const token = getToken();
  if (!token) {
    debugLog('No access token found, considering token expired');
    return true;
  }

  try {
    const decoded = jwtDecode<JwtPayloadType>(token);
    const currentTime = Date.now() / 1000;

    // Get token expiry time from decoded JWT
    const expTime = decoded.exp || 0;

    // Standard strategy: consider token expired if it's within 2 minutes of expiry
    // or if it has less than 1/3 of its lifetime remaining
    const tokenLifetime = (decoded.exp || 0) - (decoded.iat || 0);
    const timeElapsed = currentTime - (decoded.iat || 0);
    const lifetimePercentUsed = timeElapsed / tokenLifetime;
    
    // Expire if less than 2 minutes remain OR we've used more than 2/3 of the lifetime
    const isExpired = (expTime - currentTime < 120) || (lifetimePercentUsed > 0.67);
    
    // Only log detailed info in development
    if (isDevelopment && isExpired) {
      console.debug('Token expiry check:', {
        tokenExp: new Date(expTime * 1000).toISOString(),
        currentTime: new Date(currentTime * 1000).toISOString(),
        timeRemaining: Math.floor(expTime - currentTime),
        isExpired
      });
    }
    
    return isExpired;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
};

const isTokenValid = (): boolean => {
  if (!accessToken) {
    console.log('No access token found, token is invalid');
    return false;
  }
  
  try {
    const decoded = jwtDecode<JwtPayloadType>(accessToken);
    const currentTime = Date.now() / 1000;
    
    const isValid = decoded.exp > currentTime;
    console.log('Token validity check:', { 
      tokenExp: new Date(decoded.exp * 1000).toISOString(),
      currentTime: new Date(currentTime * 1000).toISOString(),
      isValid
    });
    
    return isValid;
  } catch (error) {
    console.error('Error validating token:', error);
    return false;
  }
};

const isAuthenticated = (): boolean => {
  return !!getToken() && isTokenValid();
};

// Request password reset email
const requestPasswordReset = async (data: ForgotPasswordData): Promise<MessageResponse> => {
  console.log('Requesting password reset for email:', data.email);
  try {
    // Log the full URL construction
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const endpoint = '/api/auth/forgot-password';
    const fullUrl = `${baseUrl}${endpoint}`;
    console.log('Full URL would be:', fullUrl);
    console.log('API object baseURL:', api.defaults.baseURL);
    console.log('Sending POST request to endpoint:', endpoint);
    
    const response = await api.post(endpoint, data, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('Password reset request successful:', response.data);
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Password reset request error:', error.message);
      console.error('Error details:', error);
    } else {
      console.error('Unknown password reset error:', error);
    }
    // Return a success message even on error to prevent email enumeration
    return { message: 'Password reset email sent' };
  }
};

// Reset password with token
const resetPassword = async (data: ResetPasswordData): Promise<MessageResponse> => {
  try {
    const response = await api.post('/api/auth/reset-password', data, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Password reset error:', error);
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

// Get all active user sessions
const getUserSessions = async (): Promise<SessionData[]> => {
  try {
    const response = await api.get('/api/auth/sessions', { withCredentials: true });
    return response.data.sessions || [];
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    return [];
  }
};

// Terminate a specific session
const terminateSession = async (sessionId: string): Promise<boolean> => {
  try {
    const response = await api.delete(`/api/auth/sessions/${sessionId}`, { withCredentials: true });
    return response.data.success || false;
  } catch (error) {
    console.error('Error terminating session:', error);
    return false;
  }
};

/**
 * Check if current session is valid and refresh token if needed
 * @returns Promise that resolves to true if session is valid, false otherwise
 */
const checkSessionStatus = async (): Promise<boolean> => {
  // Apply debounce to prevent excessive calls
  const now = Date.now();
  if (now - apiCallDebounce.checkSession.lastCall < apiCallDebounce.checkSession.cooldown) {
    debugLog('Session check debounced, too soon since last call');
    return !!accessToken; // Return current token status
  }
  apiCallDebounce.checkSession.lastCall = now;

  // Check for cookies in browser
  const cookieString = document.cookie;
  debugLog(`Session Check - Cookies present: ${cookieString ? 'Yes' : 'No'}`);
  
  try {
    // If we have a token and it's not expired, we're authenticated
    if (accessToken && !isTokenExpired()) {
      debugLog('Access token is valid, session is active');
      return true;
    }
    
    // If token is expired, try to refresh it
    debugLog('Token expired or missing, attempting refresh');
    const success = await refreshToken();
    return success;
  } catch (error) {
    console.error('Error checking session status:', error);
    return false;
  }
};

// Auto-check session on page load
(async () => {
  // Only run in browser environment
  if (typeof window === 'undefined') return;
  
  try {
    // Only check session if there's a user in localStorage
    const userInStorage = localStorage.getItem('user');
    if (userInStorage) {
      debugLog('User found in storage, checking session status');
      await checkSessionStatus();
    } else {
      debugLog('No user in storage, skipping session check');
    }
  } catch (error) {
    console.error('Error during automatic session check:', error);
  }
})();

// Check cookie status - streamlined version
const checkCookies = async (): Promise<{
  cookies?: Record<string, string>,
  hasRefreshToken?: boolean,
  serverTime?: string,
  environment?: string,
  cookieSettings?: Record<string, unknown>,
  error?: boolean,
  status?: number,
  message?: string
}> => {
  debugLog('Checking cookie status');
  
  try {
    const response = await api.get('/api/auth/check-cookies', {
      withCredentials: true
    });
    
    return response.data;
  } catch (error) {
    console.error('Error checking cookies:', error);
    if (axios.isAxiosError(error) && error.response) {
      return {
        error: true,
        status: error.response.status,
        message: error.response.data?.message || 'Error checking cookies'
      };
    }
    return { error: true, message: 'Network error checking cookies' };
  }
};

// Export all service methods
const authService = {
  login,
  register,
  refreshToken,
  logout,
  getToken,
  getCurrentUser,
  isTokenExpired,
  isAuthenticated,
  checkPermission,
  getUserSessions,
  terminateSession,
  requestPasswordReset,
  resetPassword,
  subscribeTokenRefresh,
  checkSessionStatus,
  checkCookies
};

export default authService; 