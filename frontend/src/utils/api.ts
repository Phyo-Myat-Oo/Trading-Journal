import axios, { AxiosRequestConfig } from 'axios';
import { TokenManager } from '../services/TokenManager';
import { TokenEventType } from '../types/token';
import { CSRFManager } from '../services/CSRFManager';

// Use the environment variable or fallback to default
// Make sure it doesn't end with /api since our routes already include that
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/api\/?$/, '');

console.log('API URL configured as:', API_URL);

// Initialize managers
const tokenManager = TokenManager.getInstance();
const csrfManager = CSRFManager.getInstance();

// Queue for requests that failed due to expired token
let requestQueue: { 
  resolve: (value: unknown) => void; 
  config: AxiosRequestConfig
}[] = [];
let isRefreshing = false;

// Debug logging function
const debugLog = (...args: unknown[]): void => {
  if (process.env.NODE_ENV === 'development' || localStorage.getItem('debug_api') === 'true') {
    console.log('[API]', ...args);
  }
};

// Helper to determine if an endpoint needs CSRF protection
const isCsrfProtectedEndpoint = (url: string | null | undefined): boolean => {
  if (!url) return false;
  
  // List of endpoints that need CSRF protection
  return (
    url.includes('/api/auth/reset-password') ||
    url.includes('/api/users/profile') ||
    url.includes('/api/users/password') ||
    url.includes('/api/users/delete-account') ||
    url.includes('/api/users/2fa/verify') ||
    url.includes('/api/users/2fa/setup') ||
    url.includes('/api/users/2fa/disable') ||
    url.includes('/api/users/preferences') ||
    url.includes('/api/sessions/revoke') ||
    url.includes('/api/dashboard/settings')
  );
};

// Create and configure axios instance
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Needed for cookies
});

// Process the queue of requests that were waiting for a token refresh
const processRequestQueue = (error: Error | null) => {
  requestQueue.forEach(({ resolve, config }) => {
    if (!error) {
      // Get the latest token
      const token = tokenManager.getToken();
      // Update the authorization header with the new token
      if (token) {
        if (!config.headers) {
          config.headers = {};
        }
        config.headers.Authorization = `Bearer ${token}`;
      }
      resolve(api(config));
    } else {
      // If token refresh failed, reject all queued requests
      resolve(Promise.reject(error));
    }
  });
  
  // Clear the queue
  requestQueue = [];
};

// Set up TokenManager event listeners
tokenManager.on(TokenEventType.TOKEN_REFRESH, () => {
  debugLog('Token refreshed, processing request queue');
  processRequestQueue(null);
});

tokenManager.on(TokenEventType.REFRESH_FAILED, (error: unknown) => {
  debugLog('Token refresh failed, rejecting request queue', error);
  const errorObj = error instanceof Error ? error : new Error('Token refresh failed');
  processRequestQueue(errorObj);
});

// Add request interceptor
api.interceptors.request.use(async (config) => {
  // Add Authorization header if token exists
  try {
    // Get token from TokenManager
    const token = tokenManager.getToken();
    if (!token) {
      // Check localStorage as a fallback
      const localToken = localStorage.getItem('token');
      if (localToken) {
        // Initialize TokenManager with the token from localStorage
        tokenManager.initializeToken(localToken);
        if (tokenManager.isTokenValid()) {
          config.headers.Authorization = `Bearer ${localToken}`;
        }
      }
      return config;
    }

    // Check if token is expiring soon and queue a refresh
    if (tokenManager.isTokenExpiringSoon()) {
      debugLog('Token expiring soon, queuing refresh');
      // Queue a refresh but don't wait for it to complete
      tokenManager.queueRefresh('normal');
    }

    // Add token to request header
    config.headers.Authorization = `Bearer ${token}`;

    // Add CSRF token for protected endpoints
    if (isCsrfProtectedEndpoint(config.url) || 
        (config.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(config.method.toUpperCase()))) {
      try {
        // Get token from CSRFManager, will fetch if needed
        const csrfToken = await csrfManager.getToken();
        config.headers['X-CSRF-Token'] = csrfToken;
      } catch (error) {
        console.error('Error setting CSRF token:', error);
      }
    }
  } catch (error) {
    console.error('Error in request interceptor:', error);
  }
  
  return config;
});

// Define a proper interface for errors with response property
interface ErrorWithResponse extends Error {
  response?: unknown;
}

// Response interceptor for handling auth errors and CSRF errors
api.interceptors.response.use(
  response => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If there was no config (e.g., network error), just reject
    if (!originalRequest) {
      return Promise.reject(error);
    }
    
    // Handle password reset and forgot password errors specially 
    // to preserve error messages for user feedback
    if (originalRequest.url?.includes('/api/auth/reset-password') || 
        originalRequest.url?.includes('/api/auth/forgot-password')) {
      
      const errorMessage = error.response?.data?.message || 'Request failed';
      debugLog(`Password related error (${originalRequest.url}):`, errorMessage);
      
      // Create a custom error with the server's message and add response info
      const enhancedError = new Error(errorMessage) as ErrorWithResponse;
      enhancedError.response = error.response;
      return Promise.reject(enhancedError);
    }
    
    // Handle 401 errors (except for login/register which handle their own errors)
    const is401Error = error.response?.status === 401;
    const isAuthEndpoint = isAuthenticationEndpoint(originalRequest.url);
    
    if (is401Error && !isAuthEndpoint && !originalRequest._retry) {
      // Mark as retried to prevent loops
      originalRequest._retry = true;
      
      // Try to refresh the token
      try {
        // Add to queue if already refreshing
        if (isRefreshing) {
          debugLog('Token refresh already in progress, adding request to queue');
          return new Promise(resolve => {
            requestQueue.push({ resolve, config: originalRequest });
          });
        }
        
        // Start refreshing
        isRefreshing = true;
        debugLog('Token expired, attempting refresh');
        
        // Try to refresh token
        await tokenManager.refreshToken();
        
        // Renewal successful, update header with new token
        const newToken = tokenManager.getToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        
        // Finish refreshing
        isRefreshing = false;
        
        // Process any queued requests
        processRequestQueue(null);
        
        // Retry original request with new token
        return api(originalRequest);
      } catch (refreshError) {
        // Finish refreshing and process queued requests with error
        isRefreshing = false;
        processRequestQueue(refreshError instanceof Error 
          ? refreshError 
          : new Error('Failed to refresh token'));
        
        // Rethrow to propagate to UI
        return Promise.reject(refreshError);
      }
    }
    
    // Handle CSRF errors
    const isCsrfError = error.response?.status === 403 && (
      (error.response?.data?.code === 'INVALID_CSRF_TOKEN' ||
       error.response?.data?.message?.includes('CSRF')));
    
    if (isCsrfError && !originalRequest._csrfRetry) {
      // Clear existing token
      csrfManager.clearToken();
      
      // If this was a retry, don't try again
      if (originalRequest._csrfRetry) {
        console.warn('Failed to retry with new CSRF token');
        return Promise.reject(error);
      }
      
      debugLog('CSRF token validation failed, refreshing token and retrying request');
      
      // Get a new token
      try {
        const csrfToken = await csrfManager.getToken(true);
        
        // Clone the original request
        const newRequest = { ...originalRequest };
        newRequest.headers['X-CSRF-Token'] = csrfToken;
        newRequest._csrfRetry = true;
        
        // Retry with new token
        return api(newRequest);
      } catch (tokenError) {
        console.error('Failed to refresh CSRF token:', tokenError);
        return Promise.reject(error);
      }
    }
    
    // Handle all other errors
    return Promise.reject(error);
  }
);

// Helper to determine if an endpoint is for authentication
const isAuthenticationEndpoint = (url: string | undefined): boolean => {
  if (!url) return false;
  
  return (
    url.includes('/api/auth/login') ||
    url.includes('/api/auth/register') ||
    url.includes('/api/auth/refresh-token') ||
    url.includes('/api/auth/logout') ||
    url.includes('/api/auth/verify-email') ||
    url.includes('/api/auth/resend-verification') ||
    url.includes('/api/auth/reset-password') ||
    url.includes('/api/auth/forgot-password') ||
    url.includes('/api/auth/2fa/verify') ||
    url.includes('/api/auth/2fa/backup')
  );
};

// Export the API instance
export default api;

// Export the CSRF token management functions
export const csrfUtils = {
  getToken: () => csrfManager.getToken(),
  refreshToken: () => csrfManager.getToken(true),
  clearToken: () => csrfManager.clearToken(),
  getDebugInfo: () => csrfManager.getDebugInfo()
}; 