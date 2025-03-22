import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import authService from '../services/authService';
import { LoginData, RegisterData } from '../services/authService';
import { AxiosError } from 'axios';

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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenCheckInterval, setTokenCheckInterval] = useState<number | null>(null);

  // Set up token refresh mechanism
  useEffect(() => {
    // Check if user is already logged in
    const initAuth = async () => {
      console.log('Starting auth initialization...');
      const currentUser = authService.getCurrentUser();
      
      if (currentUser) {
        console.log('User found in localStorage, restoring session', currentUser);
        setUser(currentUser);
        
        // Skip token validation if there's no token
        if (!authService.getToken()) {
          console.log('No token found despite user in localStorage, logging out silently');
          await logout(true);
          setLoading(false);
          return;
        }
        
        // If token is expired or about to expire, try to refresh it
        if (authService.isTokenExpired()) {
          console.log('Token is expired during initialization, attempting refresh');
          try {
            const success = await authService.refreshToken();
            if (!success) {
              console.log('Token refresh failed during init, logging out');
              // Silent logout if refresh fails during initialization
              await logout(true);
            } else {
              console.log('Token refreshed successfully during init');
              // Start periodic token validation after successful refresh
              startTokenRefreshTimer();
            }
          } catch (error) {
            console.error('Error during initialization token refresh:', error);
            await logout(true);
          }
        } else {
          console.log('Token is still valid during initialization');
          // Token is still valid, start refresh timer
        startTokenRefreshTimer();
        }
      } else {
        console.log('No user found in localStorage');
      }
      
      setLoading(false);
    };

    initAuth();

    // Cleanup function to clear the interval when component unmounts
    return () => {
      if (tokenCheckInterval) {
        console.log('Clearing token check interval on component unmount');
        window.clearInterval(tokenCheckInterval);
      }
    };
  }, []);

  // Setup periodic token refresh
  const startTokenRefreshTimer = () => {
    // Clear any existing interval
    if (tokenCheckInterval) {
      console.log('Clearing existing token check interval');
      window.clearInterval(tokenCheckInterval);
    }

    console.log('Starting new token refresh timer');
    
    // Check token every minute (adequate balance between responsiveness and efficiency)
    const intervalId = window.setInterval(async () => {
      try {
        console.log('Token refresh check triggered by timer');
        
        // Check if token exists and decode it
        const token = authService.getToken();
        if (!token) {
          console.log('No token found, cannot check expiration');
          return;
        }
        
        if (authService.isTokenExpired()) {
          console.log('Token is expired, attempting refresh...');
          const success = await authService.refreshToken();
          if (!success) {
            console.warn('Scheduled token refresh failed, logging out user');
            // If refresh fails, logout user
            await logout();
          } else {
            console.log('Scheduled token refresh succeeded');
          }
        } else {
          console.log('Token still valid, no refresh needed');
        }
      } catch (error) {
        console.error('Error during token refresh check:', error);
      }
    }, 60000); // Check every minute

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
    console.log('Logout called, silent mode:', silent);
    
    // Clear the token refresh interval
    if (tokenCheckInterval) {
      console.log('Clearing token check interval during logout');
      window.clearInterval(tokenCheckInterval);
      setTokenCheckInterval(null);
    }
    
    if (!silent) {
      try {
        console.log('Calling logout endpoint');
    await authService.logout();
      } catch (err) {
        console.error('Error during logout API call:', err);
        // Continue with local logout even if API call fails
      }
    }
    
    console.log('Resetting user state');
    setUser(null);
    setError(null);
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

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 