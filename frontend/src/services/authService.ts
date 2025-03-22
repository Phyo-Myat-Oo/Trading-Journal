import api from '../utils/api';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';

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

interface JwtPayload {
  id: string;
  exp: number;
  iat: number;
}

// In-memory token storage (more secure than localStorage)
let accessToken: string | null = null;

// For refreshing token semaphore - prevents multiple refresh requests
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

// Subscribe to token refresh
const subscribeTokenRefresh = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

// On token refreshed, notify subscribers
const onTokenRefreshed = (newToken: string) => {
  refreshSubscribers.forEach(callback => callback(newToken));
  refreshSubscribers = [];
};

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
  try {
    // Call logout endpoint to clear the HTTP-only cookie
    await api.post('/api/auth/logout', {}, { withCredentials: true });
  } catch (error) {
    console.error('Error during logout:', error);
  } finally {
    // Clear local state regardless of server response
    accessToken = null;
    localStorage.removeItem('user');
  }
};

const refreshToken = async (): Promise<boolean> => {
  // If already refreshing, don't make another request
  if (isRefreshing) {
    console.log('Another refresh already in progress, waiting for it to complete...');
    return new Promise<boolean>((resolve) => {
      subscribeTokenRefresh(() => {
        console.log('Refresh completed by another request');
        resolve(true);
      });
    });
  }
  
  // If there's no token at all, don't even try to refresh
  if (!getToken()) {
    console.log('No token to refresh');
    return false;
  }
  
  isRefreshing = true;
  
  try {
    console.log('Attempting to refresh token...');
    
    // Send request to refresh token endpoint
    // The refresh token is in the HTTP-only cookie which is automatically included
    const response = await api.post<RefreshTokenResponse>(
      '/api/auth/refresh-token', 
      {}, 
      { 
        withCredentials: true,
        headers: {
          'Cache-Control': 'no-cache'
        },
        timeout: 8000 // 8 second timeout
      }
    );
    
    console.log('Token refresh response status:', response.status);
    
    if (response.data && response.data.accessToken) {
      console.log('New token received, length:', response.data.accessToken.length);
      accessToken = response.data.accessToken;
      onTokenRefreshed(response.data.accessToken);
      console.log('Token refreshed successfully');
      return true;
    }
    console.warn('No token received in refresh response');
    return false;
  } catch (error: unknown) {
    console.error('Error refreshing token:', error);
    // Log more details about the error
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        code: error.code
      });
    } else if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
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

const getToken = (): string | null => {
  return accessToken;
};

// Check if we're in development mode
const isDevelopment = import.meta.env.DEV === true;

// A safer console.debug that only logs in development
const debugLog = (...args: unknown[]): void => {
  if (isDevelopment) {
    console.debug(...args);
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
    const expTime = decoded.exp || 0;

    // Consider token expired if it's within 60 seconds of expiry
    // This gives us a buffer to refresh before it actually expires
    const isExpired = expTime < currentTime + 60;
    
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

const authService = {
  register,
  login,
  logout,
  refreshToken,
  getCurrentUser,
  getToken,
  isTokenExpired,
  isTokenValid,
  isAuthenticated,
  requestPasswordReset,
  resetPassword,
  subscribeTokenRefresh,
  checkPermission
};

export default authService; 