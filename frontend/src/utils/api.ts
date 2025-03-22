import axios, { AxiosRequestConfig } from 'axios';
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

// Queue for storing requests that failed due to expired token
let requestQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
  config: AxiosRequestConfig;
}> = [];

// Request interceptor for adding auth token
api.interceptors.request.use(
  async (config) => {
    // Skip logging for specific endpoints or silent requests
    const isSilentRequest = config.headers?.['X-Silent-Request'] === 'true';
    const isCheckCookiesEndpoint = config.url?.includes('/api/auth/check-cookies');
    
    // Only log requests that are not silent or check-cookies
    if (!isSilentRequest && !isCheckCookiesEndpoint) {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, config);
    }
    
    // Don't refresh token for auth endpoints
    const isAuthEndpoint = config.url && (
      config.url.includes('/api/auth/login') || 
      config.url.includes('/api/auth/register') || 
      config.url.includes('/api/auth/refresh-token')
    );
    
    // Only check token expiration for non-auth endpoints
    if (authService.isTokenExpired() && !isAuthEndpoint) {
      // Skip logging for silent requests
      if (!isSilentRequest) {
        console.log('Token is expired, attempting proactive refresh...');
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

    // Get (potentially new) token
    const token = authService.getToken();
    if (token && config.headers) {
      console.log('Adding auth token to request:', config.url);
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
      authService.logout();
      return Promise.reject(error);
    }
    
    // Skip token refresh for login/register endpoints
    if (isAuthError(error)) {
      console.log('Auth endpoint error, skipping token refresh', error.config.url);
      return Promise.reject(error);
    }
    
    // Handle 401 Unauthorized errors or 403 Forbidden errors
    if (error.response && (error.response.status === 401 || error.response.status === 403) && !originalRequest._retry) {
      originalRequest._retry = true;
      console.log(`Received ${error.response.status} error, attempting to refresh token...`);
      
      // Create a new promise that will be resolved when token refresh completes
      return new Promise((resolve, reject) => {
        // Add this request to the queue
        requestQueue.push({
          resolve,
          reject,
          config: originalRequest,
        });
        
        // Only attempt to refresh token if this is the first request in the queue
        if (requestQueue.length === 1) {
          console.log('First request in queue, attempting token refresh...');
          // Attempt to refresh token
          authService.refreshToken()
            .then(success => {
              console.log('Token refresh result:', success ? 'success' : 'failed');
              if (success) {
                // Process all requests in queue with new token
                console.log('Processing queued requests with new token...');
                requestQueue.forEach(request => {
                  const token = authService.getToken();
                  if (token && request.config.headers) {
                    request.config.headers.Authorization = `Bearer ${token}`;
                  }
                  // Retry the request
                  resolve(api(request.config));
                });
              } else {
                // If refresh fails, reject all requests
                console.warn('Token refresh failed, rejecting requests');
                requestQueue.forEach(request => {
                  request.reject(error);
                });
                // Logout user but don't redirect - let components handle redirect
                authService.logout();
              }
              // Clear the queue
              requestQueue = [];
            })
            .catch(refreshError => {
              // If refresh throws an error, reject all requests
              console.error('Token refresh error details:', refreshError);
              if (refreshError.response) {
                console.error('Refresh error status:', refreshError.response.status);
                console.error('Refresh error data:', refreshError.response.data);
              }
              requestQueue.forEach(request => {
                request.reject(error);
              });
              // Clear the queue
              requestQueue = [];
              // Logout user but don't redirect - let components handle redirect
              authService.logout();
            });
        } else {
          console.log('Request added to queue, waiting for token refresh...');
        }
      });
    }
    
    return Promise.reject(error);
  }
);

export default api; 