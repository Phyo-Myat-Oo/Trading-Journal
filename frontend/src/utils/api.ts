import axios from 'axios';
import authService from '../services/authService';

// Use the environment variable or fallback to default
// Make sure it doesn't end with /api since our routes already include that
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/api\/?$/, '');

console.log('API URL configured as:', API_URL);

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies in requests
});

// Track if a token refresh is in progress
let isRefreshing = false;

// Debounce initial API calls to prevent race conditions on page load
const initialRequestDebounce = {
  lastCall: 0,
  cooldown: 200, // 200ms cooldown for initial calls
  initialLoadComplete: false
};

// Debug logging function that only logs in development
const debugLog = (message: string, data?: unknown) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[API] ${message}`, data || '');
  }
};

// Helper to determine if an endpoint is an auth endpoint
const isAuthEndpoint = (url?: string): boolean => {
  if (!url) return false;
  return (
    url.includes('/api/auth/login') ||
    url.includes('/api/auth/register') ||
    url.includes('/api/auth/refresh-token')
  );
};

// Request interceptor for adding auth token
api.interceptors.request.use(
  async (config) => {
    // Skip logging for specific endpoints or silent requests
    const isSilentRequest = config.headers?.['X-Silent-Request'] === 'true';
    const isCheckCookiesEndpoint = config.url?.includes('/api/auth/check-cookies');
    
    // Throttle initial requests to prevent race conditions during page load
    if (!initialRequestDebounce.initialLoadComplete) {
      const now = Date.now();
      if (now - initialRequestDebounce.lastCall < initialRequestDebounce.cooldown) {
        await new Promise(resolve => setTimeout(resolve, initialRequestDebounce.cooldown));
      }
      initialRequestDebounce.lastCall = Date.now();
      
      // After a few seconds, consider initial load complete
      if (!initialRequestDebounce.initialLoadComplete) {
        setTimeout(() => {
          initialRequestDebounce.initialLoadComplete = true;
          debugLog('Initial load debouncing complete');
        }, 5000);
      }
    }
    
    // Only log requests that are not silent or check-cookies
    if (!isSilentRequest && !isCheckCookiesEndpoint) {
      debugLog(`Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    // Don't refresh token for auth endpoints
    if (!isAuthEndpoint(config.url)) {
      // Only check token expiration for non-auth endpoints
      const shouldAttemptRefresh = !isRefreshing && authService.isTokenExpired();
      
      if (shouldAttemptRefresh) {
        // Skip logging for silent requests
        if (!isSilentRequest) {
          debugLog('Token is expired, attempting proactive refresh');
        }
        
        // Try to refresh the token before making the request
        try {
          await authService.refreshToken();
        } catch (error) {
          // If refresh fails, continue with request (will be caught by response interceptor)
          if (!isSilentRequest) {
            console.error('Proactive token refresh failed:', error);
          }
        }
      }
    }

    // Get (potentially new) token
    const token = authService.getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Create a custom marker to identify authentication errors that shouldn't trigger redirects
export const isAuthError = (error: { config?: { url?: string } }): boolean => {
  return Boolean(error?.config?.url?.includes('/api/auth/login') || error?.config?.url?.includes('/api/auth/register'));
};

// Response interceptor for handling auth errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // If the error is from a token refresh attempt, don't retry
    if (originalRequest?.url?.includes('/api/auth/refresh-token')) {
      console.error('Refresh token request failed:', error.response?.status);
      // Don't trigger logout here
      return Promise.reject(error);
    }
    
    // Skip token refresh for login/register endpoints
    if (isAuthEndpoint(originalRequest?.url)) {
      debugLog('Auth endpoint error, skipping token refresh');
      return Promise.reject(error);
    }

    // Handle 401 errors - token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // If we're already refreshing, wait for that to complete
      if (isRefreshing) {
        try {
          // Wait for the existing refresh to complete
          await new Promise(resolve => {
            const checkRefreshing = () => {
              if (!isRefreshing) {
                resolve(true);
              } else {
                setTimeout(checkRefreshing, 100);
              }
            };
            checkRefreshing();
          });
          
          // After refresh completes, retry with new token
          const token = authService.getToken();
          if (token) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          }
        } catch {
          // Ignore the error and just reject the original request
          return Promise.reject(error);
        }
      }
      
      isRefreshing = true;
      
      try {
        // Attempt to refresh the token
        const refreshSuccess = await authService.refreshToken();
        
        if (refreshSuccess) {
          // Token refreshed successfully, update header and retry
          const token = authService.getToken();
          if (token) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest); // Retry the original request
          }
        }
        
        // If we get here, token refresh failed
        return Promise.reject(error);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);

export default api; 