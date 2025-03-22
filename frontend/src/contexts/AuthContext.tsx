import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { AxiosError } from 'axios';
import authService, { LoginData, RegisterData } from '../services/authService';

// Add a simple debug logging function to control verbosity
const debugLog = (message: string, data?: unknown) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Auth] ${message}`, data || '');
  }
};

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (data: LoginData) => Promise<boolean>;
  register: (data: RegisterData) => Promise<void>;
  logout: (silent?: boolean) => Promise<void>;
  refreshToken: () => Promise<boolean>;
  error: string | null;
  clearError: () => void;
}

type AuthProviderProps = {
  children: React.ReactNode;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenCheckInterval, setTokenCheckInterval] = useState<number | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Add a ref to track initialization state
  const isInitializing = useRef(false);
  const isInitialized = useRef(false);

  // Set up token refresh mechanism
  useEffect(() => {
    // Only initialize once
    if (isInitialized.current) {
      debugLog('Auth already initialized, skipping');
      return;
    }
    
    // Prevent concurrent initializations
    if (isInitializing.current) {
      debugLog('Auth initialization already in progress, skipping duplicate');
      return;
    }
    
    // Check if user is already logged in
    const initAuth = async () => {
      // Set initializing flag
      isInitializing.current = true;
      
      debugLog('Starting auth initialization');
      try {
        // Get user from localStorage (might be null)
        const currentUser = authService.getCurrentUser();
        
        // Simple initialization path: if we have a user, try to refresh the token
        if (currentUser) {
          debugLog('User found in localStorage, attempting token refresh');
          const refreshSuccessful = await authService.refreshToken();
          
          if (refreshSuccessful) {
            debugLog('Token refresh successful, restoring user session');
            setUser(currentUser);
            startTokenRefreshTimer();
          } else {
            // Clear stale user data if refresh fails
            debugLog('Token refresh failed, clearing user data');
            localStorage.removeItem('user');
          }
        } else {
          debugLog('No user found in localStorage, proceeding as unauthenticated');
        }
        
        // Mark as initialized at the end of successful initialization
        isInitialized.current = true;
      } catch (error) {
        console.error('Error during auth initialization:', error);
      } finally {
        // Clear initializing flag
        isInitializing.current = false;
        setLoading(false);
      }
    };

    initAuth();
    
    // Cleanup function
    return () => {
      if (tokenCheckInterval) {
        debugLog('Cleaning up token check interval');
        window.clearInterval(tokenCheckInterval);
      }
    };
  }, []);

  // Setup periodic token refresh using the standardized strategy
  const startTokenRefreshTimer = () => {
    // Clear any existing interval
    if (tokenCheckInterval) {
      debugLog('Clearing existing token check interval');
      window.clearInterval(tokenCheckInterval);
    }

    debugLog('Starting new token refresh timer');
    
    // Check token every 5 minutes (better balance to prevent expiration edge cases)
    const intervalId = window.setInterval(async () => {
      try {
        // Check if token exists
        const token = authService.getToken();
        if (!token) {
          debugLog('No token found, cannot check expiration');
          return;
        }
        
        // Use the standard expiration check
        if (authService.isTokenExpired()) {
          debugLog('Token needs refresh');
          const success = await authService.refreshToken();
          if (!success) {
            debugLog('Scheduled token refresh failed, logging out user');
            await logout();
          } else {
            debugLog('Scheduled token refresh succeeded');
          }
        } else {
          debugLog('Token still valid, no refresh needed');
        }
      } catch (error) {
        console.error('Error during token refresh check:', error);
      }
    }, 300000); // Check every 5 minutes

    setTokenCheckInterval(intervalId);
  };

  const login = async (data: LoginData) => {
    try {
      // Only clear errors when starting a new login attempt
      setError(null);
      setLoading(true);
      console.log('AuthContext: Calling login service');
      const response = await authService.login(data);
      console.log('AuthContext: Login response received', response);
      
      if (response.user) {
        console.log('AuthContext: Setting user in state', response.user);
      setUser(response.user);
      
      // Start token refresh timer
      startTokenRefreshTimer();
        return true; // Success flag
      } else {
        console.error('AuthContext: User data missing from login response');
        setError('Invalid login response: missing user data');
        throw new Error('Invalid login response: missing user data');
      }
    } catch (err: unknown) {
      console.error('AuthContext: Login error', err);
      // Set a descriptive error message based on the error type
      let errorMessage = 'Failed to login';
      
      if (err instanceof AxiosError) {
        if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err.response?.status === 401) {
          errorMessage = 'Invalid email or password';
        } else if (err.response?.status === 403) {
          errorMessage = 'Account access denied';
        } else if (!err.response && err.message.includes('Network Error')) {
          errorMessage = 'Network error - please check your connection';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      console.log('AuthContext: Setting error message:', errorMessage);
      setError(errorMessage);
      return false; // Failure flag
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    try {
      setError(null);
      setLoading(true);
      const response = await authService.register(data);
      setUser(response.user);
      
      // Start token refresh timer
      startTokenRefreshTimer();
    } catch (err: unknown) {
      const errorMessage = err instanceof AxiosError
        ? err.response?.data?.message || 'Failed to register'
        : 'Failed to register';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (silent: boolean = false) => {
    // Prevent multiple logout calls
    if (isLoggingOut) {
      console.log('AuthContext: Logout already in progress, ignoring duplicate call');
      return;
    }
    
    console.log('AuthContext: Logout called, silent mode:', silent);
    setIsLoggingOut(true);
    
    // Clear the token refresh interval immediately
    if (tokenCheckInterval) {
      console.log('Clearing token check interval during logout');
      window.clearInterval(tokenCheckInterval);
      setTokenCheckInterval(null);
    }
    
    // Clear user data immediately to prevent further API calls
    console.log('Resetting user state before API call');
    setUser(null);
    setError(null);
    
    // Call the API only after clearing local state
    if (!silent) {
      try {
        console.log('Calling logout endpoint');
        // Wait at most 3 seconds for the logout call
        const logoutPromise = authService.logout();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Logout timeout')), 3000);
        });
        
        try {
          await Promise.race([logoutPromise, timeoutPromise]);
          console.log('Logout API call completed successfully');
        } catch {
          console.warn('Logout API call timed out, but local logout completed');
        }
      } catch (err) {
        console.error('Error during logout API call:', err);
        // Continue with local logout even if API call fails
      }
    }
    
    // Reset logout state after a delay
    setTimeout(() => {
      setIsLoggingOut(false);
    }, 2000);
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const success = await authService.refreshToken();
      return success;
    } catch (err) {
      console.error('Error refreshing token:', err);
      return false;
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    isAuthenticated: !!user && !!authService.getToken(),
    loading,
    login,
    register,
    logout,
    refreshToken,
    error,
    clearError
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 