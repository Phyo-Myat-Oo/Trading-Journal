import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { AxiosError } from 'axios';
import authService, { LoginData, RegisterData, AuthResponse } from '../services/authService';
import { checkOnlineStatus, subscribeToNetworkStatus } from '../utils/auth';
import { TokenManager } from '../services/TokenManager';
import { TokenEventType } from '../types/token';
import { jwtDecode } from 'jwt-decode';
import type { JwtPayload } from 'jwt-decode';
import SessionExpirationDialog from '../components/auth/SessionExpirationDialog';
import { useToast } from '../providers/ToastProvider';
import { useNavigate } from 'react-router-dom';

// Add a simple debug logging function to control verbosity
const debugLog = (...args: unknown[]) => {
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
    console.log('[AuthContext]', ...args);
  }
};

// Define AuthContext types
export type AuthStateType = 'initializing' | 'authenticated' | 'unauthenticated' | 'refreshing';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin';
  profilePicture: string | null;
  isVerified?: boolean;
  phone?: string;
  timezone?: string;
  currency?: string;
  language?: string;
  notifications?: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}

// Define Auth Context value interface
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  authState: AuthStateType;
  twoFactorRequired: boolean;
  twoFactorPendingUserId: string | null;
  login: (data: LoginData) => Promise<AuthResponse>;
  register: (data: RegisterData) => Promise<void>;
  logout: (silent?: boolean) => Promise<void>;
  refreshToken: () => Promise<boolean>;
  error: string | null;
  clearError: () => void;
  verifyTwoFactor: (userId: string, code: string) => Promise<AuthResponse>;
  verifyWithBackupCode: (userId: string, backupCode: string) => Promise<AuthResponse>;
  cancelTwoFactor: () => void;
  // Add setters needed for OAuth callback
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  setAuthState: React.Dispatch<React.SetStateAction<AuthStateType>>;
  updateUserProfile: (userData: Partial<User>) => Promise<void>;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

// Use the Auth Context hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Add navigation sync constants
const NAVIGATION_SYNC_KEY = 'auth_navigation_sync';
const NAVIGATION_RETRY_KEY = 'auth_navigation_retry';
const MAX_NAVIGATION_RETRIES = 10; // Increased from 3 to 10
const NAVIGATION_RETRY_INTERVAL = 500; // Reduced from 1000 to 500ms
const NAVIGATION_STATE_KEY = 'auth_navigation_state'; // New key for persistent state

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenCheckInterval, setTokenCheckInterval] = useState<number | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [tokenRefreshAttempts, setTokenRefreshAttempts] = useState(0);
  const [authState, setAuthState] = useState<AuthStateType>('initializing');
  
  // 2FA state variables
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [twoFactorPendingUserId, setTwoFactorPendingUserId] = useState<string | null>(null);
  
  // Add a ref to track initialization state
  const isInitializing = useRef(false);
  const isInitialized = useRef(false);

  // New state for session expiration dialog
  const [showExpirationDialog, setShowExpirationDialog] = useState(false);
  const [timeToExpiration, setTimeToExpiration] = useState(0);
  
  // Track online/offline status with improved debouncing
  const [isOnline, setIsOnline] = useState(checkOnlineStatus());
  const lastRefreshAttempt = useRef<number>(0);
  const lastNetworkChange = useRef<number>(0);
  const MIN_REFRESH_INTERVAL = 30000; // 30 seconds minimum between network-triggered refreshes
  const NETWORK_CHANGE_COOLDOWN = 5000; // 5 seconds cooldown between network status changes
  
  // Initialize TokenManager
  const tokenManagerRef = useRef<TokenManager>(TokenManager.getInstance());
  const toast = useToast();

  // Add debounce for token refresh
  const REFRESH_DEBOUNCE = 1000; // 1 second debounce

  // Add navigate hook
  const navigate = useNavigate();

  // Add navigation sync effect with retry mechanism
  useEffect(() => {
    const handleNavigationSync = (event: StorageEvent) => {
      if (event.key === NAVIGATION_SYNC_KEY && event.newValue) {
        try {
          const syncData = JSON.parse(event.newValue) as {
            tabId: string;
            action: 'login' | 'logout';
            timestamp: number;
            retryCount?: number;
          };
          
          // Ignore events from this tab
          if (syncData.tabId === tokenManagerRef.current.getTabId()) {
            return;
          }
          
          // Handle navigation based on action
          if (syncData.action === 'login') {
            navigate('/', { replace: true });
            // Update persistent state
            localStorage.setItem(NAVIGATION_STATE_KEY, JSON.stringify({
              action: 'login',
              timestamp: Date.now()
            }));
          } else if (syncData.action === 'logout') {
            navigate('/login', { replace: true });
            // Update persistent state
            localStorage.setItem(NAVIGATION_STATE_KEY, JSON.stringify({
              action: 'logout',
              timestamp: Date.now()
            }));
          }
        } catch (error) {
          console.error('Error processing navigation sync:', error);
        }
      } else if (event.key === NAVIGATION_RETRY_KEY && event.newValue) {
        try {
          const retryData = JSON.parse(event.newValue) as {
            tabId: string;
            action: 'login' | 'logout';
            retryCount: number;
            timestamp: number;
          };
          
          // Ignore events from this tab
          if (retryData.tabId === tokenManagerRef.current.getTabId()) {
            return;
          }
          
          // Only process if retry count is within limits
          if (retryData.retryCount <= MAX_NAVIGATION_RETRIES) {
            // Handle navigation based on action
            if (retryData.action === 'login') {
              navigate('/', { replace: true });
            } else if (retryData.action === 'logout') {
              navigate('/login', { replace: true });
            }
          }
        } catch (error) {
          console.error('Error processing navigation retry:', error);
        }
      }
    };

    // Check for existing navigation state on mount
    const checkExistingState = () => {
      try {
        const stateStr = localStorage.getItem(NAVIGATION_STATE_KEY);
        if (stateStr) {
          const state = JSON.parse(stateStr);
          // Only apply if state is less than 5 seconds old
          if (Date.now() - state.timestamp < 5000) {
            if (state.action === 'login') {
              navigate('/', { replace: true });
            } else if (state.action === 'logout') {
              navigate('/login', { replace: true });
            }
          }
        }
      } catch (error) {
        console.error('Error checking existing navigation state:', error);
      }
    };

    window.addEventListener('storage', handleNavigationSync);
    checkExistingState();
    
    return () => window.removeEventListener('storage', handleNavigationSync);
  }, [navigate]);

  // Enhanced navigation broadcast function with retry mechanism
  const broadcastNavigation = (action: 'login' | 'logout') => {
    const syncData = {
      tabId: tokenManagerRef.current.getTabId(),
      action,
      timestamp: Date.now(),
      retryCount: 0
    };
    
    try {
      // Update persistent state first
      localStorage.setItem(NAVIGATION_STATE_KEY, JSON.stringify({
        action,
        timestamp: Date.now()
      }));
      
      // Broadcast initial navigation
      localStorage.setItem(NAVIGATION_SYNC_KEY, JSON.stringify(syncData));
      
      // Set up retry mechanism
      let retryCount = 0;
      const retryInterval = setInterval(() => {
        retryCount++;
        if (retryCount <= MAX_NAVIGATION_RETRIES) {
          const retryData = {
            ...syncData,
            retryCount,
            timestamp: Date.now()
          };
          localStorage.setItem(NAVIGATION_RETRY_KEY, JSON.stringify(retryData));
        } else {
          clearInterval(retryInterval);
        }
      }, NAVIGATION_RETRY_INTERVAL);
      
      // Clear retry interval after max retries
      setTimeout(() => {
        clearInterval(retryInterval);
      }, MAX_NAVIGATION_RETRIES * NAVIGATION_RETRY_INTERVAL);
      
    } catch (error) {
      console.error('Error broadcasting navigation:', error);
    }
  };

  // Handle token refresh with debouncing
  const refreshToken = useCallback(async (): Promise<boolean> => {
    const now = Date.now();
    if (now - lastRefreshAttempt.current < REFRESH_DEBOUNCE) {
      console.log('Token refresh debounced, too soon since last attempt');
      return false;
    }
    
    lastRefreshAttempt.current = now;
    try {
      setTokenRefreshAttempts(prev => prev + 1);
      const newToken = await tokenManagerRef.current.refresh();
      return !!newToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // If we get a 401, we should logout
      if (error instanceof Error && error.message.includes('401')) {
        await logout(true);
      }
      return false;
    }
  }, []);

  // Setup network status listener
  useEffect(() => {
    debugLog('Setting up network status listener');
    
    const handleNetworkChange = (online: boolean) => {
      const now = Date.now();
      // Prevent rapid toggling by adding a cooldown
      if (now - lastNetworkChange.current < NETWORK_CHANGE_COOLDOWN) {
        debugLog(`Ignoring network change, still in cooldown (${(now - lastNetworkChange.current) / 1000}s)`);
        return;
      }
      
      lastNetworkChange.current = now;
      debugLog(`Network status changed to ${online ? 'online' : 'offline'}`);
      
      setIsOnline(online);
      
      // If we're coming back online after being offline, try to refresh the token
      if (online && authState === 'authenticated') {
        // Only refresh if it's been a while since last attempt
        const timeSinceLastRefresh = now - lastRefreshAttempt.current;
        if (timeSinceLastRefresh > MIN_REFRESH_INTERVAL) {
          debugLog(`Refreshing token after reconnection (${timeSinceLastRefresh / 1000}s since last attempt)`);
          lastRefreshAttempt.current = now;
          refreshToken().catch(err => {
            console.error('Failed to refresh token after reconnection:', err);
          });
        } else {
          debugLog(`Skipping refresh, too soon since last attempt (${timeSinceLastRefresh / 1000}s)`);
        }
      }
    };
    
    const unsubscribe = subscribeToNetworkStatus(handleNetworkChange);
    return unsubscribe;
  }, [authState]);
  
  // Save 2FA state to localStorage when it changes
  useEffect(() => {
    if (twoFactorRequired && twoFactorPendingUserId) {
      localStorage.setItem('twoFactorState', JSON.stringify({
        required: twoFactorRequired,
        userId: twoFactorPendingUserId
      }));
    } else {
      localStorage.removeItem('twoFactorState');
    }
  }, [twoFactorRequired, twoFactorPendingUserId]);

  // Handle session extension
  const handleExtendSession = async (): Promise<void> => {
    await refreshToken();
  };

  // Handle session expiration dialog close
  const handleExpirationDialogClose = () => {
    setShowExpirationDialog(false);
  };

  // Handle absolute timeout event
  const handleAbsoluteTimeout = useCallback(() => {
    debugLog('TokenManager reported absolute session timeout');
    
    // Close any open dialogs
    setShowExpirationDialog(false);
    
    // Clear auth state
    setAuthState('unauthenticated');
    setUser(null);
    
    // Show notification to user
    toast.showToast({
      message: 'Your session has expired for security reasons. Please log in again.',
      type: 'info',
      duration: 5000,
      position: 'top-center'
    });
    
    // Redirect to login page using window.location
    const currentPath = window.location.pathname;
    const loginUrl = `/login?redirectTo=${encodeURIComponent(currentPath)}&reason=absolute_timeout`;
    window.location.href = loginUrl;
  }, [toast]);

  // Listen to TokenManager events
  useEffect(() => {
    const tokenManager = tokenManagerRef.current;
    
    // Handle token refreshed event
    const handleTokenRefresh = (token: unknown) => {
      debugLog('TokenManager refreshed token');
      setAuthState('authenticated');
      setTokenRefreshAttempts(0);
      
      // Close expiration dialog if open
      if (showExpirationDialog) {
        setShowExpirationDialog(false);
      }
      
      // Make sure we have user data
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        try {
          // Try to extract user info from token
          const stringToken = token as string;
          const decoded = jwtDecode<JwtPayload & {id: string; email?: string; firstName?: string; lastName?: string; role?: string}>(stringToken);
          if (decoded && decoded.id) {
            // Create minimal user object
            const minimalUser = {
              id: decoded.id,
              email: decoded.email || 'unknown@example.com',
              firstName: decoded.firstName || 'Unknown',
              lastName: decoded.lastName || 'User',
              role: (decoded.role === 'admin' ? 'admin' : 'user') as 'user' | 'admin',
              profilePicture: null
            };
            setUser(minimalUser);
          }
        } catch (error) {
          console.error('Failed to extract user data from token:', error);
        }
      }
    };
    
    // Handle token expired event
    const handleTokenExpired = () => {
      debugLog('TokenManager reported token expired');
      
      // Close expiration dialog if it was showing
      if (showExpirationDialog) {
        setShowExpirationDialog(false);
      }
      
      if (isOnline) {
        refreshToken().catch(err => {
          console.error('Failed to refresh expired token:', err);
          setAuthState('unauthenticated');
        });
      } else {
        // If offline, keep authenticated state but mark for refresh when online
        debugLog('Token expired while offline, will refresh when online');
      }
    };
    
    // Handle token expiring soon event
    const handleTokenExpiring = (timeToExpiration: unknown) => {
      const secondsToExpiry = Math.round(timeToExpiration as number);
      debugLog(`TokenManager reported token expiring soon (${secondsToExpiry}s remaining)`);
      
      // If there's less than 2 minutes remaining, show the expiration dialog
      if (secondsToExpiry <= 120 && secondsToExpiry > 10) {
        setTimeToExpiration(secondsToExpiry);
        setShowExpirationDialog(true);
      }
      
      // Proactively refresh token if we're online and the dialog is not showing
      // or there's very little time left (for background tabs)
      if (isOnline && (!showExpirationDialog || secondsToExpiry <= 10)) {
        refreshToken().catch(err => {
          console.error('Failed to proactively refresh token:', err);
        });
      }
    };
    
    // Handle token error event
    const handleTokenError = (error: unknown) => {
      console.error('Token error:', error);
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('unauthorized')) {
          logout(true).catch(console.error);
        }
      }
    };
    
    // Subscribe to events
    tokenManager.on(TokenEventType.TOKEN_REFRESH, handleTokenRefresh);
    tokenManager.on(TokenEventType.TOKEN_EXPIRED, handleTokenExpired);
    tokenManager.on(TokenEventType.TOKEN_EXPIRING, handleTokenExpiring);
    tokenManager.on(TokenEventType.TOKEN_ERROR, handleTokenError);
    tokenManager.on(TokenEventType.ABSOLUTE_TIMEOUT, handleAbsoluteTimeout);

    // Cleanup subscriptions
    return () => {
      tokenManager.off(TokenEventType.TOKEN_REFRESH, handleTokenRefresh);
      tokenManager.off(TokenEventType.TOKEN_EXPIRED, handleTokenExpired);
      tokenManager.off(TokenEventType.TOKEN_EXPIRING, handleTokenExpiring);
      tokenManager.off(TokenEventType.TOKEN_ERROR, handleTokenError);
      tokenManager.off(TokenEventType.ABSOLUTE_TIMEOUT, handleAbsoluteTimeout);
    };
  }, [showExpirationDialog, isOnline, refreshToken, toast, handleAbsoluteTimeout]);

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
      setAuthState('initializing');
      
      debugLog('Starting auth initialization');
      try {
        // Check for 2FA pending state first
        if (twoFactorRequired && twoFactorPendingUserId) {
          debugLog('Found pending 2FA verification during initialization');
          setAuthState('unauthenticated');
          setLoading(false);
          isInitializing.current = false;
          isInitialized.current = true;
          return;
        }
        
        // Use the new initialize auth method from auth service
        const isAuthenticated = await authService.initializeAuth();
        
        if (isAuthenticated) {
          debugLog('User is authenticated, restoring session');
          const currentUser = authService.getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
            setAuthState('authenticated');
            startTokenRefreshTimer();
          } else {
            // This shouldn't happen, but handle just in case
            setAuthState('unauthenticated');
          }
        } else {
          debugLog('User is not authenticated');
          setAuthState('unauthenticated');
        }
        
        // Mark as initialized at the end of successful initialization
        isInitialized.current = true;
      } catch (error) {
        console.error('Error during auth initialization:', error);
        setAuthState('unauthenticated');
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
  }, [tokenRefreshAttempts, twoFactorRequired, twoFactorPendingUserId, isOnline]);

  // Setup periodic token refresh using the TokenManager's events instead of interval
  const startTokenRefreshTimer = () => {
    // Clear any existing interval
    if (tokenCheckInterval) {
      debugLog('Clearing existing token check interval');
      window.clearInterval(tokenCheckInterval);
      setTokenCheckInterval(null);
    }
    
    // TokenManager will automatically handle token refresh via events
    // So we don't need a timer-based refresh anymore
    debugLog('Using TokenManager events for automatic refresh');
    
    // Make sure TokenManager is initialized with the current token
    const token = authService.getToken();
    if (token) {
      tokenManagerRef.current.initializeToken(token);
    }
  };

  const login = async (data: LoginData) => {
    try {
      // Only clear errors when starting a new login attempt
      setError(null);
      setLoading(true);
      
      // Clear any pending 2FA state
      setTwoFactorRequired(false);
      setTwoFactorPendingUserId(null);
      
      console.log('AuthContext: Calling login service');
      
      // Set remember me preference in TokenManager if provided
      if (data.rememberMe !== undefined) {
        console.log('AuthContext: Setting Remember Me preference:', data.rememberMe);
        tokenManagerRef.current.setRememberMe(data.rememberMe);
      }
      
      const response = await authService.login(data);
      console.log('AuthContext: Login response received', response);
      
      // Check if 2FA is required
      if (response.requireTwoFactor && response.userId) {
        console.log('AuthContext: 2FA required, setting 2FA state');
        setTwoFactorRequired(true);
        setTwoFactorPendingUserId(response.userId);
        setAuthState('unauthenticated'); // Not authenticated until 2FA is complete
        return response;
      }
      
      if (response.user) {
        console.log('AuthContext: Setting user in state', response.user);
        setUser(response.user);
        setAuthState('authenticated');
        
        // Start token refresh timer
        startTokenRefreshTimer();
        
        // Broadcast login navigation
        broadcastNavigation('login');
        
        return response;
      } else {
        console.error('AuthContext: User data missing from login response');
        setError('Invalid login response: missing user data');
        setAuthState('unauthenticated');
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
      setAuthState('unauthenticated');
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Allow canceling 2FA verification
  const cancelTwoFactor = () => {
    setTwoFactorRequired(false);
    setTwoFactorPendingUserId(null);
    localStorage.removeItem('twoFactorState');
  };

  const register = async (data: RegisterData) => {
    try {
      setError(null);
      setLoading(true);
      const response = await authService.register(data);
      if (response.user) {
        setUser(response.user);
      }
      
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
    try {
      // Prevent multiple logout calls
      if (isLoggingOut) {
        console.log('Already logging out, ignoring duplicate request');
        return;
      }
      
      setIsLoggingOut(true);
      console.log(`AuthContext: Logging out (silent: ${silent})`);
      
      // Clear user state
      setUser(null);
      setAuthState('unauthenticated');
      
      // Clear token refresh timer
      if (tokenCheckInterval) {
        window.clearInterval(tokenCheckInterval);
        setTokenCheckInterval(null);
      }
      
      // Revoke token in TokenManager
      tokenManagerRef.current.revokeToken();
      
      // Call logout API
      if (!silent) {
        await authService.logout();
      }

      // Broadcast logout navigation
      broadcastNavigation('logout');
    } catch (err) {
      // Even if the API call fails, we still want to clear local state
      console.error('Error during logout API call:', err);
    } finally {
      // Reset logging out state after a small delay
      setTimeout(() => {
        setIsLoggingOut(false);
      }, 1000);
    }
  };

  const clearError = () => {
    setError(null);
  };

  /**
   * Verify a TOTP code during 2FA login
   */
  const verifyTwoFactor = async (userId: string, code: string): Promise<AuthResponse> => {
    // Input validation
    if (!userId || !code) {
      const errorMessage = 'User ID and verification code are required';
      console.error('AuthContext: 2FA verification error -', errorMessage);
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
    
    try {
      setError(null);
      setLoading(true);
      console.log('AuthContext: Verifying 2FA code');
      
      const response = await authService.verifyTwoFactorLogin(userId, code);
      console.log('AuthContext: 2FA verification response', response);
      
      if (response.user) {
        console.log('AuthContext: Setting user in state after 2FA', response.user);
        setUser(response.user);
        
        // Clear 2FA state since verification was successful
        setTwoFactorRequired(false);
        setTwoFactorPendingUserId(null);
        
        // Set auth state to authenticated
        setAuthState('authenticated');
        
        // Start token refresh timer
        startTokenRefreshTimer();
        return response;
      } else {
        console.error('AuthContext: User data missing from 2FA response');
        setError('Invalid 2FA verification response: missing user data');
        throw new Error('Invalid 2FA verification response: missing user data');
      }
    } catch (err: unknown) {
      console.error('AuthContext: 2FA verification error', err);
      let errorMessage = 'Failed to verify code';
      
      if (err instanceof AxiosError) {
        if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err.response?.status === 400) {
          errorMessage = 'Invalid verification code or session expired';
        } else if (err.response?.status === 404) {
          errorMessage = 'User not found or session expired';
        } else if (!err.response && err.message.includes('Network Error')) {
          errorMessage = 'Network error - please check your connection';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Verify a backup code during 2FA login
   */
  const verifyWithBackupCode = async (userId: string, backupCode: string): Promise<AuthResponse> => {
    // Input validation
    if (!userId || !backupCode) {
      const errorMessage = 'User ID and backup code are required';
      console.error('AuthContext: Backup code verification error -', errorMessage);
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
    
    try {
      setError(null);
      setLoading(true);
      console.log('AuthContext: Verifying backup code');
      
      const response = await authService.verifyBackupCode(userId, backupCode);
      console.log('AuthContext: Backup code verification response', response);
      
      if (response.user) {
        console.log('AuthContext: Setting user in state after backup code', response.user);
        setUser(response.user);
        
        // Clear 2FA state since verification was successful
        setTwoFactorRequired(false);
        setTwoFactorPendingUserId(null);
        
        // Set auth state to authenticated
        setAuthState('authenticated');
        
        // Start token refresh timer
        startTokenRefreshTimer();
        return response;
      } else {
        console.error('AuthContext: User data missing from backup code response');
        setError('Invalid backup code verification response: missing user data');
        throw new Error('Invalid backup code verification response: missing user data');
      }
    } catch (err: unknown) {
      console.error('AuthContext: Backup code verification error', err);
      let errorMessage = 'Failed to verify backup code';
      
      if (err instanceof AxiosError) {
        if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err.response?.status === 400) {
          errorMessage = 'Invalid backup code or session expired';
        } else if (err.response?.status === 404) {
          errorMessage = 'User not found or session expired';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = async (userData: Partial<User>) => {
    if (!user) return;
    
    try {
      // Update the local state with the new user data
      setUser(prevUser => {
        if (!prevUser) return null;
        const updatedUser = { ...prevUser, ...userData };
        
        // Update localStorage with the new user data
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Use localStorage event for cross-tab communication
        const event = new StorageEvent('storage', {
          key: 'user',
          newValue: JSON.stringify(updatedUser),
          oldValue: JSON.stringify(prevUser)
        });
        window.dispatchEvent(event);
        
        // Also dispatch the custom event for backward compatibility
        const customEvent = new CustomEvent('userProfileUpdated', { detail: updatedUser });
        window.dispatchEvent(customEvent);
        
        return updatedUser;
      });
    } catch (error) {
      console.error('Failed to update user profile:', error);
      throw error;
    }
  };

  // Initialize user data from localStorage
  useEffect(() => {
    const initializeUser = () => {
      try {
        const storedUser = localStorage.getItem('user');
        console.log('Stored user data:', storedUser);
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          console.log('Parsed user data:', userData);
          // Ensure profile picture is included
          if (userData.profilePicture) {
            console.log('Profile picture URL:', userData.profilePicture);
          }
          setUser(userData);
          // Also update form data in Settings if needed
          if (window.location.pathname === '/settings') {
            const event = new CustomEvent('userDataInitialized', { detail: userData });
            window.dispatchEvent(event);
          }
        }
      } catch (error) {
        console.error('Error initializing user data:', error);
      }
    };
    initializeUser();
  }, []);

  const value = {
    user,
    isAuthenticated: Boolean(user && authState === 'authenticated' && !twoFactorRequired),
    loading,
    authState,
    twoFactorRequired,
    twoFactorPendingUserId,
    login,
    register,
    logout,
    refreshToken,
    error,
    clearError,
    verifyTwoFactor,
    verifyWithBackupCode,
    cancelTwoFactor,
    setUser,
    setAuthState,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      
      {/* Session Expiration Dialog */}
      <SessionExpirationDialog
        isOpen={showExpirationDialog}
        timeToExpiration={timeToExpiration}
        onExtend={handleExtendSession}
        onClose={handleExpirationDialogClose}
      />
    </AuthContext.Provider>
  );
}; 