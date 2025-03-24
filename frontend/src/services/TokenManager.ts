import { jwtDecode } from 'jwt-decode';
import { EventEmitter } from '../utils/EventEmitter';
import {
  TokenState,
  TokenEventType,
  RefreshRequest,
  TokenManagerConfig,
  TokenInfo,
  TokenManagerStats,
  RefreshLock,
  QueueItem,
  TokenStateInfo,
  TokenError,
  TokenErrorCode,
  DeviceType,
  TokenExpirationConfig
} from '../types/token';
import { debounce } from '../utils/debounce';

// Use the environment variable or fallback to default
// Make sure it doesn't end with /api since our routes already include that
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/api\/?$/, '');

const DEFAULT_CONFIG: TokenManagerConfig = {
  refreshThreshold: 0.75, // Refresh at 75% of token lifetime
  minRefreshInterval: 5000, // 5 seconds
  maxRetries: 3,
  backoffFactor: 2,
  maxBackoffTime: 30000, // 30 seconds
  queueMaxSize: 10,
  expiringThreshold: 60, // 60 seconds before expiration to consider token as expiring soon
  circuitBreakerTimeout: 60000, // 60 seconds before resetting circuit breaker
  circuitBreakerFailureThreshold: 5 // 5 consecutive failures before tripping circuit breaker
};

// Default expiration configuration for different device types and scenarios
const DEFAULT_EXPIRATION_CONFIG: TokenExpirationConfig = {
  desktop: {
    standard: '30m',    // 30 minutes for desktop regular session
    rememberMe: '7d'    // 7 days for desktop with "remember me"
  },
  mobile: {
    standard: '15m',    // 15 minutes for mobile regular session
    rememberMe: '3d'    // 3 days for mobile with "remember me"
  },
  tablet: {
    standard: '20m',    // 20 minutes for tablet regular session
    rememberMe: '5d'    // 5 days for tablet with "remember me"
  },
  unknown: {
    standard: '15m',    // 15 minutes for unknown device regular session
    rememberMe: '1d'    // 1 day for unknown device with "remember me"
  }
};

// Helper for debugging
const debugLog = (message: string, data?: unknown): void => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[TokenManager] ${message}`, data || '');
  }
};

// Constants for storage keys
const TOKEN_SYNC_KEY = 'token_sync_state';
const TOKEN_SYNC_ACTION_KEY = 'token_sync_action';
const USER_ACTIVITY_KEY = 'user_last_activity';
const DEVICE_TYPE_KEY = 'device_type';
const REMEMBER_ME_KEY = 'remember_me';

export class TokenManager extends EventEmitter {
  private static instance: TokenManager;
  private config: TokenManagerConfig;
  private expirationConfig: TokenExpirationConfig;
  private state: TokenState = TokenState.VALID;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private refreshQueue: RefreshRequest[] = [];
  private isRefreshing = false;
  private lastRefreshTime: number = 0;
  private consecutiveFailures: number = 0;
  private stats: TokenManagerStats = {
    refreshCount: 0,
    errorCount: 0,
    averageRefreshTime: 0,
    lastRefreshTime: 0,
    queueSize: 0,
    consecutiveFailures: 0,
    lastErrorTime: 0,
    circuitBreakerTripped: false,
    circuitBreakerResetTime: 0
  };

  private monitoringInterval: ReturnType<typeof setInterval> | null = null;
  private activityMonitorInterval: ReturnType<typeof setInterval> | null = null;
  private securityChecks: Map<string, number> = new Map();
  private readonly SECURITY_CHECK_INTERVAL = 60000; // 1 minute
  private readonly ACTIVITY_CHECK_INTERVAL = 60000; // 1 minute
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly SUSPICIOUS_PATTERN_THRESHOLD = 10; // 10 refresh attempts per minute
  private readonly INACTIVITY_THRESHOLD = 30 * 60 * 1000; // 30 minutes of inactivity

  private token: string | null = null;
  private refreshLock: RefreshLock = {
    isLocked: false,
    lockTime: 0,
    lockTimeout: 5000, // 5 seconds default timeout
    lockId: ''
  };
  private queueItems: QueueItem[] = [];
  private currentState: TokenStateInfo = {
    token: null,
    state: TokenState.VALID,
    lastRefresh: 0,
    nextRefresh: 0,
    error: null,
    isLocked: false,
    expiresAt: 0,
    timeToExpiration: 0
  };

  private tabId: string; // Unique identifier for this tab
  private lastBroadcast: number = 0;
  private processingExternalEvent: boolean = false;
  private deviceType: DeviceType = 'unknown';
  private rememberMe: boolean = false;
  private lastUserActivity: number = Date.now();
  
  // ======= PUBLIC API =======

  public get refreshing(): boolean {
    return this.isRefreshing;
  }

  private constructor(config: Partial<TokenManagerConfig> = {}, expirationConfig: Partial<TokenExpirationConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.expirationConfig = { ...DEFAULT_EXPIRATION_CONFIG, ...expirationConfig };
    this.token = null;
    this.state = TokenState.INITIALIZING;
    this.refreshQueue = [];
    this.securityChecks = new Map();
    this.refreshLock = { isLocked: false, lockTime: 0, lockTimeout: 0, lockId: '' };
    this.stats = this.initializeStats();
    
    // Initialize tab ID - generate a random ID for this tab instance
    this.tabId = crypto.randomUUID ? crypto.randomUUID() : `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Initialize device type
    this.detectDeviceType();
    
    // Load remember me preference
    this.loadRememberMePreference();
    
    // Initialize storage listener for multi-tab synchronization
    this.initializeStorageListener();
    
    // Start monitoring user activity
    this.startActivityMonitoring();
  }

  public static getInstance(config?: Partial<TokenManagerConfig>, expirationConfig?: Partial<TokenExpirationConfig>): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager(config, expirationConfig);
    }
    return TokenManager.instance;
  }

  /**
   * Initialize the TokenManager with a token
   * @param token The JWT token to initialize with
   */
  public initializeToken(token: string): void {
    try {
      this.setState(TokenState.INITIALIZING);
      this.emit(TokenEventType.TOKEN_STATE_CHANGE, TokenState.INITIALIZING);
      
      const decodedToken = jwtDecode(token) as TokenInfo;
      localStorage.setItem('token', token);
      
      if (this.validateToken(token)) {
        this.token = token;
        this.startRefreshTimer(decodedToken);
        this.setState(TokenState.VALID);
        this.startMonitoring(); // Start monitoring when token is initialized
        
        // Emit the tokenInitialized event
        this.emit(TokenEventType.TOKEN_INITIALIZED, token);
      } else {
        this.setState(TokenState.EXPIRED);
        this.emit(TokenEventType.TOKEN_EXPIRED);
      }
      
      this.stats.lastRefreshTime = Date.now();
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Set the "Remember Me" preference
   * @param enabled Whether to enable the "Remember Me" feature
   */
  public setRememberMe(enabled: boolean): void {
    this.rememberMe = enabled;
    localStorage.setItem(REMEMBER_ME_KEY, String(enabled));
    debugLog(`Remember me set to: ${enabled}`);
  }

  /**
   * Check if "Remember Me" is enabled
   * @returns true if "Remember Me" is enabled, false otherwise
   */
  public isRememberMeEnabled(): boolean {
    return this.rememberMe;
  }

  /**
   * Update user activity timestamp
   * Call this method when user interaction is detected
   */
  public updateUserActivity(): void {
    const now = Date.now();
    this.lastUserActivity = now;
    localStorage.setItem(USER_ACTIVITY_KEY, String(now));
  }

  /**
   * Get the current token
   * @returns The current token or null if not available
   */
  public getToken(): string | null {
    return this.token;
  }

  /**
   * Get detailed information about the current token state
   * @returns TokenStateInfo object with detailed state information
   */
  public getTokenStatus(): TokenStateInfo {
    const tokenInfo = this.token ? this.getTokenInfo() : null;
    const currentTime = Date.now() / 1000;
    const expiresAt = tokenInfo?.exp || 0;
    const timeToExpiration = Math.max(0, expiresAt - currentTime);
    
    return {
      ...this.currentState,
      expiresAt,
      timeToExpiration
    };
  }

  /**
   * Check if the token is valid
   * @returns true if the token is valid, false otherwise
   */
  public isTokenValid(): boolean {
    return this.state === TokenState.VALID || this.state === TokenState.EXPIRING_SOON;
  }

  /**
   * Check if the token is expiring soon
   * @returns true if the token is expiring soon, false otherwise
   */
  public isTokenExpiringSoon(): boolean {
    if (!this.token) return false;
    
    try {
      const decodedToken = jwtDecode(this.token) as TokenInfo;
      const currentTime = Date.now() / 1000;
      const timeToExpiration = decodedToken.exp - currentTime;
      
      return timeToExpiration < (this.config.expiringThreshold || 60);
    } catch {
      return false;
    }
  }

  /**
   * Check if the token is expired
   * @returns true if the token is expired, false otherwise
   */
  public isTokenExpired(): boolean {
    return this.state === TokenState.EXPIRED;
  }

  /**
   * Get the time remaining before the token expires
   * @returns Time in seconds before the token expires, or 0 if the token is invalid or expired
   */
  public getTimeToExpiration(): number {
    if (!this.token) return 0;
    
    try {
      const decodedToken = jwtDecode(this.token) as TokenInfo;
      const currentTime = Date.now() / 1000;
      
      return Math.max(0, decodedToken.exp - currentTime);
    } catch {
      return 0;
    }
  }

  /**
   * Manually trigger a token refresh
   * @param priority Priority of the refresh request
   * @returns Promise resolving to the new token or null if refresh failed
   */
  public async refreshToken(priority: 'high' | 'normal' | 'low' = 'high'): Promise<string | null> {
    // Update user activity timestamp when manual refresh is requested
    this.updateUserActivity();
    
    return new Promise((resolve, reject) => {
      // If we're already refreshing, wait for it to complete
      if (this.isRefreshing) {
        const handleRefresh = (token: unknown) => {
          this.off(TokenEventType.TOKEN_REFRESH, handleRefresh);
          this.off(TokenEventType.REFRESH_FAILED, handleError);
          resolve(token as string);
        };
        
        const handleError = (error: unknown) => {
          this.off(TokenEventType.TOKEN_REFRESH, handleRefresh);
          this.off(TokenEventType.REFRESH_FAILED, handleError);
          reject(error instanceof Error ? error : new Error('Token refresh failed'));
        };
        
        this.on(TokenEventType.TOKEN_REFRESH, handleRefresh);
        this.on(TokenEventType.REFRESH_FAILED, handleError);
        return;
      }
      
      // Check if circuit breaker is tripped
      if (this.stats.circuitBreakerTripped) {
        const now = Date.now();
        if (now < (this.stats.circuitBreakerResetTime || 0)) {
          reject(new TokenError(
            'Circuit breaker tripped, token refresh not allowed',
            TokenErrorCode.CIRCUIT_BREAKER_TRIPPED,
            { resetAt: this.stats.circuitBreakerResetTime }
          ));
          return;
        }
        
        // Reset circuit breaker
        this.stats.circuitBreakerTripped = false;
      }
      
      // Queue refresh with the given priority
      this.queueRefresh(priority);
      
      // Set up handlers for the refresh
      const handleRefresh = (token: unknown) => {
        this.off(TokenEventType.TOKEN_REFRESH, handleRefresh);
        this.off(TokenEventType.REFRESH_FAILED, handleError);
        resolve(token as string);
      };
      
      const handleError = (error: unknown) => {
        this.off(TokenEventType.TOKEN_REFRESH, handleRefresh);
        this.off(TokenEventType.REFRESH_FAILED, handleError);
        reject(error instanceof Error ? error : new Error('Token refresh failed'));
      };
      
      this.on(TokenEventType.TOKEN_REFRESH, handleRefresh);
      this.on(TokenEventType.REFRESH_FAILED, handleError);
    });
  }

  /**
   * Revoke the current token
   * This will clear the token from memory and storage, and emit a token revoked event
   */
  public revokeToken(): void {
    if (this.token) {
      // Perform the regular revocation
      this.token = null;
      localStorage.removeItem('token');
      this.clearError();
      this.setState(TokenState.REVOKED);
      this.emit(TokenEventType.TOKEN_REVOKED);
      
      // Broadcast revocation to other tabs
      this.broadcastAction('REVOKE_TOKEN');
    }
  }
  
  // ======= ENHANCED METHODS =======

  /**
   * Get the current device type
   * @returns The detected device type
   */
  public getDeviceType(): DeviceType {
    return this.deviceType;
  }

  /**
   * Manually set the device type
   * @param deviceType The device type to set
   */
  public setDeviceType(deviceType: DeviceType): void {
    this.deviceType = deviceType;
    localStorage.setItem(DEVICE_TYPE_KEY, deviceType);
  }

  /**
   * Get the appropriate token expiration time based on device type and remember me preference
   * @returns The token expiration time as a string (e.g., '15m', '7d')
   */
  public getTokenExpiration(): string {
    const deviceConfig = this.expirationConfig[this.deviceType] || this.expirationConfig.unknown;
    return this.rememberMe ? deviceConfig.rememberMe : deviceConfig.standard;
  }

  /**
   * Check if user is inactive
   * @returns true if user is inactive, false otherwise
   */
  public isUserInactive(): boolean {
    const now = Date.now();
    return (now - this.lastUserActivity) > this.INACTIVITY_THRESHOLD;
  }

  /**
   * Get time since last user activity
   * @returns Time in milliseconds since last user activity
   */
  public getTimeSinceLastActivity(): number {
    return Date.now() - this.lastUserActivity;
  }

  // ======= EXISTING METHODS =======

  public queueRefresh(priority: 'high' | 'normal' | 'low' = 'normal'): void {
    const now = Date.now();
    
    // Check if we need to refresh immediately
    if (now - this.lastRefreshTime >= this.config.minRefreshInterval) {
      this.performRefresh();
      return;
    }

    // Add to queue if within minimum interval
    if (this.refreshQueue.length < this.config.queueMaxSize) {
      this.refreshQueue.push({
        timestamp: now,
        priority,
        retryCount: 0
      });
      this.updateQueueStats();
      this.emit(TokenEventType.QUEUE_UPDATE, this.refreshQueue.length);
    }
  }

  // ======= PRIVATE METHODS =======

  /**
   * Detect device type based on user agent
   */
  private detectDeviceType(): void {
    // Try to load from localStorage first
    const savedDeviceType = localStorage.getItem(DEVICE_TYPE_KEY) as DeviceType | null;
    if (savedDeviceType && (savedDeviceType === 'desktop' || savedDeviceType === 'mobile' || 
                            savedDeviceType === 'tablet' || savedDeviceType === 'unknown')) {
      this.deviceType = savedDeviceType;
      return;
    }
    
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/mobile|android|iphone|ipad|ipod|windows phone/i.test(userAgent)) {
      if (/ipad|tablet/i.test(userAgent)) {
        this.deviceType = 'tablet';
      } else {
        this.deviceType = 'mobile';
      }
    } else {
      this.deviceType = 'desktop';
    }
    
    // Save to localStorage
    localStorage.setItem(DEVICE_TYPE_KEY, this.deviceType);
    debugLog(`Device type detected: ${this.deviceType}`);
  }

  /**
   * Load remember me preference from localStorage
   */
  private loadRememberMePreference(): void {
    const savedPreference = localStorage.getItem(REMEMBER_ME_KEY);
    this.rememberMe = savedPreference === 'true';
    debugLog(`Remember me loaded: ${this.rememberMe}`);
  }

  /**
   * Start monitoring user activity
   */
  private startActivityMonitoring(): void {
    // Try to load last activity from localStorage first
    const savedActivity = localStorage.getItem(USER_ACTIVITY_KEY);
    if (savedActivity) {
      this.lastUserActivity = parseInt(savedActivity, 10);
    }
    
    // Set up activity monitoring
    if (typeof window !== 'undefined') {
      // User interaction events
      const activityEvents = [
        'mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart',
        'click', 'keydown', 'DOMMouseScroll', 'mousewheel'
      ];
      
      const handleUserActivity = debounce(() => {
        this.updateUserActivity();
      }, 300);
      
      activityEvents.forEach(event => {
        window.addEventListener(event, handleUserActivity, { passive: true });
      });
      
      // Set up interval to check for inactivity
      this.activityMonitorInterval = setInterval(() => {
        if (this.isUserInactive() && this.isTokenValid()) {
          // If user is inactive and token is valid, consider shortening token lifetime
          debugLog('User inactive, token may expire sooner', {
            inactiveSince: new Date(this.lastUserActivity).toISOString(),
            inactiveFor: this.getTimeSinceLastActivity() / 1000
          });
          
          // If inactive for too long, validate token more frequently
          if (this.getTimeSinceLastActivity() > this.INACTIVITY_THRESHOLD * 2) {
            this.validateToken(this.token || '');
          }
        }
      }, this.ACTIVITY_CHECK_INTERVAL);
    }
  }

  /**
   * Stop activity monitoring
   */
  private stopActivityMonitoring(): void {
    if (this.activityMonitorInterval) {
      clearInterval(this.activityMonitorInterval);
      this.activityMonitorInterval = null;
    }
  }

  private startRefreshTimer(tokenInfo: TokenInfo): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    const tokenLifetime = tokenInfo.exp - tokenInfo.iat;
    
    // Use a more aggressive refresh threshold for inactive users
    let refreshThreshold = this.config.refreshThreshold;
    if (this.isUserInactive()) {
      // Refresh sooner for inactive users (at 60% of token lifetime instead of 75%)
      refreshThreshold = 0.6;
    }
    
    const refreshTime = tokenLifetime * refreshThreshold;
    
    this.refreshTimer = setTimeout(() => {
      this.queueRefresh();
    }, refreshTime * 1000);
    
    debugLog('Refresh timer started', {
      tokenLifetime: Math.round(tokenLifetime),
      refreshThreshold,
      refreshTime: Math.round(refreshTime),
      willRefreshAt: new Date(Date.now() + (refreshTime * 1000)).toISOString()
    });
  }

  private stopRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private async performRefresh(): Promise<void> {
    // Update user activity when refreshing token
    this.updateUserActivity();
    
    // Start timing the refresh operation for performance metrics
    
    // Check if circuit breaker is tripped
    if (this.stats.circuitBreakerTripped) {
      const now = Date.now();
      // If circuit breaker timeout hasn't elapsed, abort refresh
      if (now < (this.stats.circuitBreakerResetTime || 0)) {
        this.emit(TokenEventType.REFRESH_FAILED, new TokenError(
          'Circuit breaker tripped, token refresh not allowed',
          TokenErrorCode.CIRCUIT_BREAKER_TRIPPED,
          { resetAt: this.stats.circuitBreakerResetTime }
        ));
        return;
      }
      
      // Reset circuit breaker
      this.stats.circuitBreakerTripped = false;
    }
    
    const lockId = `refresh_${Date.now()}`;
    if (!this.acquireLock(lockId)) {
      this.addToQueue({
        timestamp: Date.now(),
        priority: 'high',
        retryCount: 0,
        lockId
      });
      return;
    }

    try {
      this.isRefreshing = true;
      this.setState(TokenState.REFRESHING);
      this.emit(TokenEventType.REFRESH_STARTED);
      
      const startTime = Date.now();
      debugLog('Starting token refresh');
      
      this.securityChecks.set(`refresh_${startTime}`, startTime);
      
      // Broadcast refresh request to other tabs before making the request
      // This can help coordinate refresh attempts across tabs
      this.broadcastAction('REFRESH_REQUESTED');
      
      // Include additional parameters in refresh request
      const requestBody = {
        deviceType: this.deviceType,
        rememberMe: this.rememberMe,
        inactiveTime: this.getTimeSinceLastActivity() / 1000 // Convert to seconds
      };
      
      // Make token refresh request
      const response = await fetch(`${API_URL}/api/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        credentials: 'include',
      });

      if (!response.ok) {
        const statusCode = response.status;
        let errorCode: TokenErrorCode;
        
        switch (statusCode) {
          case 401:
            errorCode = TokenErrorCode.UNAUTHORIZED;
            break;
          case 403:
            errorCode = TokenErrorCode.UNAUTHORIZED;
            break;
          case 500:
          case 502:
          case 503:
          case 504:
            errorCode = TokenErrorCode.SERVER_ERROR;
            break;
          default:
            errorCode = TokenErrorCode.REFRESH_FAILED;
        }
        
        const error = new TokenError(
          `Refresh failed with status: ${response.status}`,
          errorCode,
          { status: response.status }
        );
        
        throw error;
      }

      // Parse response
      const data = await response.json();
      debugLog('Refresh response received:', { hasAccessToken: !!data.accessToken });
      
      // Store the new access token
      if (data.accessToken) {
        const token = data.accessToken;
        localStorage.setItem('token', token);
        debugLog('New access token stored in localStorage');
        
        this.token = token;
        this.clearError();
        this.setState(TokenState.VALID);
        this.lastRefreshTime = Date.now();
        this.consecutiveFailures = 0;
        
        // Reset circuit breaker if it was approaching the threshold
        if (this.consecutiveFailures > 0) {
          this.consecutiveFailures = 0;
        }
        
        // Decode the token to get expiration info
        const tokenInfo = this.getTokenInfo();
        if (tokenInfo) {
          this.startRefreshTimer(tokenInfo);
        }
        
        // Update state with the new token and refresh schedule
        this.updateState({
          token,
          state: TokenState.VALID,
          lastRefresh: Date.now(),
          nextRefresh: this.calculateNextRefresh(token),
          isLocked: false
        });
        
        this.updateStats(startTime);
        
        // Emit success events
        this.emit(TokenEventType.REFRESH_SUCCEEDED);
        this.emit(TokenEventType.TOKEN_REFRESH, token);
        
        // Broadcast to other tabs
        this.broadcastTokenState();
        
        return;
      } else {
        const error = new TokenError(
          'No access token received in refresh response',
          TokenErrorCode.REFRESH_FAILED
        );
        throw error;
      }
    } catch (error) {
      debugLog('Token refresh error:', error);
      
      // Handle error based on type
      if (error instanceof TokenError) {
        this.handleError(error);
      } else if (error instanceof Error) {
        // Check for network errors
        if (error.message.includes('fetch') || error.message.includes('network')) {
          this.handleError(new TokenError(
            'Network error during token refresh',
            TokenErrorCode.NETWORK_ERROR,
            { originalError: error.message }
          ));
        } else {
          this.handleError(new TokenError(
            error.message,
            TokenErrorCode.UNKNOWN_ERROR,
            { originalError: error.message }
          ));
        }
      } else {
        this.handleError(new TokenError(
          'Unknown error during token refresh',
          TokenErrorCode.UNKNOWN_ERROR
        ));
      }
    } finally {
      this.isRefreshing = false;
      this.releaseLock();
      this.processQueue();
    }
  }

  private handleError(error: Error): void {
    // Update error stats
    this.stats.errorCount++;
    this.stats.lastErrorTime = Date.now();
    this.consecutiveFailures++;
    
    // Check if we need to trip the circuit breaker
    if (this.consecutiveFailures >= (this.config.circuitBreakerFailureThreshold || 5)) {
      this.tripCircuitBreaker();
    }
    
    // Update state to error
    this.setState(TokenState.ERROR);
    
    // Update error in state
    this.updateState({
      error: error,
      state: TokenState.ERROR
    });
    
    // If token is expired, also set expired state
    if (error instanceof TokenError && error.code === TokenErrorCode.EXPIRED_TOKEN) {
      this.setState(TokenState.EXPIRED);
      this.emit(TokenEventType.TOKEN_EXPIRED);
    }
    
    // Emit error events
    this.emit(TokenEventType.TOKEN_ERROR, error);
    this.emit(TokenEventType.REFRESH_FAILED, error);
  }

  private tripCircuitBreaker(): void {
    this.stats.circuitBreakerTripped = true;
    const timeout = this.config.circuitBreakerTimeout || 60000;
    this.stats.circuitBreakerResetTime = Date.now() + timeout;
    
    debugLog('Circuit breaker tripped, will reset after timeout', {
      timeout,
      resetAt: new Date(this.stats.circuitBreakerResetTime).toISOString()
    });
  }

  private clearError(): void {
    this.updateState({
      error: null
    });
  }

  private setState(state: TokenState): void {
    // Only update if the state is actually changing
    if (this.state !== state) {
      const prevState = this.state;
      this.state = state;
      this.currentState.state = state;
      
      // Additional actions based on state transition
      if (state === TokenState.EXPIRED && prevState !== TokenState.EXPIRED) {
        this.emit(TokenEventType.TOKEN_EXPIRED);
      } else if (state === TokenState.EXPIRING_SOON && prevState !== TokenState.EXPIRING_SOON) {
        const timeToExpiration = this.getTimeToExpiration();
        this.emit(TokenEventType.TOKEN_EXPIRING, timeToExpiration);
      }
      
      // Always emit state change
      this.emit(TokenEventType.TOKEN_STATE_CHANGE, state);
      
      // Broadcast state to other tabs for significant changes
      if (state === TokenState.VALID || 
          state === TokenState.EXPIRED || 
          state === TokenState.REVOKED) {
        this.broadcastTokenState();
      }
    }
  }

  private transitionToState(state: TokenState): void {
    // Only transition if the state is actually changing
    if (this.state !== state) {
      const prevState = this.state;
      this.state = state;
      this.currentState.state = state;
      
      // Additional actions based on state transition
      if (state === TokenState.EXPIRED && prevState !== TokenState.EXPIRED) {
        this.emit(TokenEventType.TOKEN_EXPIRED);
      } else if (state === TokenState.EXPIRING_SOON && prevState !== TokenState.EXPIRING_SOON) {
        const timeToExpiration = this.getTimeToExpiration();
        this.emit(TokenEventType.TOKEN_EXPIRING, timeToExpiration);
      }
      
      // Always emit state change
      this.emit(TokenEventType.TOKEN_STATE_CHANGE, state);
    }
  }

  private validateToken(token: string): boolean {
    try {
      const decodedToken = jwtDecode(token) as TokenInfo;
      const currentTime = Date.now() / 1000;

      // Check if token is expired
      if (decodedToken.exp < currentTime) {
        this.setState(TokenState.EXPIRED);
        return false;
      }

      // Check if token is about to expire (within threshold seconds)
      const expiringThreshold = this.config.expiringThreshold || 60; // Default 60 seconds
      if (decodedToken.exp - currentTime < expiringThreshold) {
        this.setState(TokenState.EXPIRING_SOON);
        this.emit(TokenEventType.TOKEN_EXPIRING, decodedToken.exp - currentTime);
        return true;
      }

      // Token is valid
      this.setState(TokenState.VALID);
      return true;
    } catch (error) {
      this.handleError(
        new TokenError(
          'Failed to validate token',
          TokenErrorCode.INVALID_TOKEN,
          { originalError: error instanceof Error ? error.message : String(error) }
        )
      );
      return false;
    }
  }

  private startMonitoring(): void {
    // Clear any existing monitoring interval
    this.stopMonitoring();
    
    // Set up monitoring interval (check token validity and suspicious patterns)
    this.monitoringInterval = setInterval(() => {
      try {
        // Check token validity if we have a token
        if (this.token) {
          this.validateToken(this.token);
        }
        
        // Clean up old security checks
        this.cleanupSecurityChecks();
        
        // Check for suspicious patterns
        this.detectSuspiciousPatterns();
      } catch (error) {
        console.error('[TokenManager] Error in monitoring interval:', error);
      }
    }, this.SECURITY_CHECK_INTERVAL);
  }

  private stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  private cleanupSecurityChecks(): void {
    const now = Date.now();
    const cutoff = now - this.SECURITY_CHECK_INTERVAL * 2; // Remove entries older than 2 intervals
    
    for (const [key, timestamp] of this.securityChecks.entries()) {
      if (timestamp < cutoff) {
        this.securityChecks.delete(key);
      }
    }
  }

  private detectSuspiciousPatterns(): void {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Count refresh attempts in the last minute
    let refreshCount = 0;
    for (const [key, timestamp] of this.securityChecks.entries()) {
      if (key.startsWith('refresh_') && timestamp > oneMinuteAgo) {
        refreshCount++;
      }
    }
    
    // If too many refresh attempts, trip the circuit breaker
    if (refreshCount > this.SUSPICIOUS_PATTERN_THRESHOLD) {
      debugLog('Suspicious pattern detected: too many refresh attempts', { refreshCount });
      this.tripCircuitBreaker();
    }
  }

  private calculateNextRefresh(token: string): number {
    const decodedToken = jwtDecode(token) as TokenInfo;
    const tokenLifetime = decodedToken.exp - decodedToken.iat;
    return Date.now() + (tokenLifetime * this.config.refreshThreshold * 1000);
  }

  private updateStats(startTime: number): void {
    const refreshTime = Date.now() - startTime;
    this.stats.refreshCount++;
    this.stats.averageRefreshTime = 
      (this.stats.averageRefreshTime * (this.stats.refreshCount - 1) + refreshTime) / 
      this.stats.refreshCount;
  }

  private updateQueueStats(): void {
    this.stats.queueSize = this.refreshQueue.length;
  }

  public getStats(): TokenManagerStats {
    return { ...this.stats };
  }

  public getState(): TokenState {
    return this.state;
  }

  public destroy(): void {
    this.stopRefreshTimer();
    this.stopMonitoring();
    this.stopActivityMonitoring();
    this.refreshQueue = [];
    this.securityChecks.clear();
    this.removeAllListeners();
  }

  public validateCurrentToken(): boolean {
    const token = localStorage.getItem('token');
    if (!token) {
      this.setState(TokenState.EXPIRED);
      return false;
    }

    return this.validateToken(token);
  }

  public getTokenState(): TokenState {
    return this.state;
  }

  public getTokenInfo(): TokenInfo | null {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      return jwtDecode(token) as TokenInfo;
    } catch (error) {
      console.error('Error getting token info:', error);
      return null;
    }
  }

  // Lock Management Methods
  private acquireLock(lockId: string): boolean {
    if (this.refreshLock.isLocked) {
      const lockAge = Date.now() - this.refreshLock.lockTime;
      if (lockAge > this.refreshLock.lockTimeout) {
        this.releaseLock();
      } else {
        return false;
      }
    }
    this.refreshLock = {
      isLocked: true,
      lockTime: Date.now(),
      lockTimeout: this.refreshLock.lockTimeout,
      lockId
    };
    this.currentState.isLocked = true;
    return true;
  }

  private releaseLock(): void {
    this.refreshLock = {
      isLocked: false,
      lockTime: 0,
      lockTimeout: this.refreshLock.lockTimeout,
      lockId: ''
    };
    this.currentState.isLocked = false;
  }

  private isLockValid(lockId: string): boolean {
    return this.refreshLock.isLocked && 
           this.refreshLock.lockId === lockId && 
           (Date.now() - this.refreshLock.lockTime) <= this.refreshLock.lockTimeout;
  }

  // Queue Management Methods
  private addToQueue(item: QueueItem): void {
    if (this.queueItems.length >= this.config.queueMaxSize) {
      this.queueItems.shift(); // Remove oldest item
    }
    this.queueItems.push(item);
    this.queueItems.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority] || a.timestamp - b.timestamp;
    });
    this.stats.queueSize = this.queueItems.length;
    this.emit(TokenEventType.QUEUE_UPDATE, this.queueItems.length);
  }

  private removeFromQueue(lockId: string): void {
    this.queueItems = this.queueItems.filter(item => item.lockId !== lockId);
    this.stats.queueSize = this.queueItems.length;
    this.emit(TokenEventType.QUEUE_UPDATE, this.queueItems.length);
  }

  private getNextQueueItem(): QueueItem | undefined {
    return this.queueItems[0];
  }

  // State Management Methods
  private updateState(newState: Partial<TokenStateInfo>): void {
    this.currentState = { ...this.currentState, ...newState };
    this.emit(TokenEventType.TOKEN_STATE_CHANGE, {
      previous: this.currentState.state,
      current: newState.state
    });
  }

  // Event handling methods
  public on(event: string, handler: (...args: unknown[]) => void): void {
    super.on(event, handler);
  }

  public off(event: string, handler: (...args: unknown[]) => void): void {
    super.off(event, handler);
  }

  public once(event: string, handler: (...args: unknown[]) => void): void {
    const onceHandler = (...args: unknown[]) => {
      handler(...args);
      this.off(event, onceHandler);
    };
    this.on(event, onceHandler);
  }

  public emit(event: string, ...args: unknown[]): void {
    super.emit(event, ...args);
  }

  private processQueue(): void {
    // Only process queue if not refreshing and not locked
    if (this.isRefreshing || this.refreshLock.isLocked) {
      return;
    }

    // Get the next queue item
    const queueItem = this.getNextQueueItem();
    if (!queueItem) {
      return;
    }

    // If queue item has a lockId, check if it's valid
    if (queueItem.lockId && !this.isLockValid(queueItem.lockId)) {
      // Remove invalid items
      this.removeFromQueue(queueItem.lockId);
      return this.processQueue();
    }

    // Remove the item from queue
    if (queueItem.lockId) {
      this.removeFromQueue(queueItem.lockId);
    }

    // Process the queue item
    this.performRefresh();
  }

  /**
   * Initialize storage event listener for cross-tab communication
   */
  private initializeStorageListener(): void {
    // Listen for storage events from other tabs
    window.addEventListener('storage', (event) => {
      // Only process events from our sync keys
      if (event.key === TOKEN_SYNC_KEY && event.newValue) {
        try {
          // Parse the sync data from other tabs
          const syncData = JSON.parse(event.newValue) as {
            tabId: string;
            token: string | null;
            state: TokenState;
            timestamp: number;
          };
          
          // Ignore events from this tab
          if (syncData.tabId === this.tabId) {
            return;
          }
          
          // Process the sync data
          this.processSyncData(syncData);
        } catch (error) {
          console.error('Error processing token sync data:', error);
        }
      } else if (event.key === TOKEN_SYNC_ACTION_KEY && event.newValue) {
        try {
          // Parse the action data
          const actionData = JSON.parse(event.newValue) as {
            tabId: string;
            action: string;
            timestamp: number;
          };
          
          // Ignore events from this tab
          if (actionData.tabId === this.tabId) {
            return;
          }
          
          // Process the action
          this.processSyncAction(actionData);
        } catch (error) {
          console.error('Error processing token sync action:', error);
        }
      }
    });
  }
  
  /**
   * Process sync data from another tab
   */
  private processSyncData(syncData: {
    tabId: string;
    token: string | null;
    state: TokenState;
    timestamp: number;
  }): void {
    // Avoid processing if we're already handling an event
    if (this.processingExternalEvent) {
      return;
    }
    
    this.processingExternalEvent = true;
    
    try {
      // Only update if the sync data is newer than our state
      if (syncData.timestamp > this.lastRefreshTime) {
        if (syncData.state === TokenState.REVOKED) {
          // If token was revoked in another tab, revoke it here too
          this.revokeToken();
        } else if (syncData.token && syncData.state === TokenState.VALID) {
          // Update token if it's valid and different from current
          if (this.token !== syncData.token) {
            this.token = syncData.token;
            localStorage.setItem('token', syncData.token);
            
            // Use validateToken to update token state and decode the token
            this.validateToken(syncData.token);
            
            this.emit(TokenEventType.TOKEN_REFRESH, syncData.token);
          }
        }
      }
    } finally {
      this.processingExternalEvent = false;
    }
  }
  
  /**
   * Process sync action from another tab
   */
  private processSyncAction(actionData: {
    tabId: string;
    action: string;
    timestamp: number;
  }): void {
    // Avoid processing if we're already handling an event
    if (this.processingExternalEvent) {
      return;
    }
    
    this.processingExternalEvent = true;
    
    try {
      switch (actionData.action) {
        case 'REVOKE_TOKEN':
          // Revoke token in this tab
          this.revokeToken();
          break;
        case 'REFRESH_REQUESTED':
          // Another tab is requesting a refresh
          // Only respond if we're not already refreshing and have a valid token
          if (!this.isRefreshing && this.state === TokenState.VALID) {
            this.debouncedQueueRefresh();
          }
          break;
      }
    } finally {
      this.processingExternalEvent = false;
    }
  }
  
  /**
   * Broadcast token state to other tabs
   */
  private broadcastTokenState(): void {
    // Avoid broadcasting if we're processing an external event
    if (this.processingExternalEvent) {
      return;
    }
    
    const now = Date.now();
    
    // Don't broadcast too frequently
    if (now - this.lastBroadcast < 1000) {
      return;
    }
    
    this.lastBroadcast = now;
    
    // Create sync data
    const syncData = {
      tabId: this.tabId,
      token: this.token,
      state: this.state,
      timestamp: now
    };
    
    // Broadcast state via localStorage
    try {
      localStorage.setItem(TOKEN_SYNC_KEY, JSON.stringify(syncData));
    } catch (error) {
      console.error('Error broadcasting token state:', error);
    }
  }
  
  /**
   * Broadcast specific action to other tabs
   */
  private broadcastAction(action: string): void {
    // Avoid broadcasting if we're processing an external event
    if (this.processingExternalEvent) {
      return;
    }
    
    // Create action data
    const actionData = {
      tabId: this.tabId,
      action,
      timestamp: Date.now()
    };
    
    // Broadcast action via localStorage
    try {
      localStorage.setItem(TOKEN_SYNC_ACTION_KEY, JSON.stringify(actionData));
    } catch (error) {
      console.error('Error broadcasting token action:', error);
    }
  }

  // Debounced version of queueRefresh to prevent excessive calls
  private debouncedQueueRefresh = debounce(() => {
    this.queueRefresh('normal');
  }, 300);

  /**
   * Initialize statistics object
   */
  private initializeStats(): TokenManagerStats {
    return {
      refreshCount: 0,
      errorCount: 0,
      averageRefreshTime: 0,
      lastRefreshTime: 0,
      queueSize: 0,
      consecutiveFailures: 0
    };
  }
} 