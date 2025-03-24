import axios from 'axios';
import { debounce } from '../utils/debounce';

// Use the environment variable or fallback to default
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/api\/?$/, '');

// Constants for storage keys
const CSRF_SYNC_KEY = 'csrf_token_sync';

/**
 * Debug log function that only logs in development
 */
const debugLog = (...args: unknown[]): void => {
  if (process.env.NODE_ENV === 'development' || localStorage.getItem('debug_csrf') === 'true') {
    console.log('[CSRFManager]', ...args);
  }
};

/**
 * Interface for CSRF token response from API
 */
interface CSRFTokenResponse {
  csrfToken: string;
  expiresIn?: number;
}

/**
 * Class to manage CSRF tokens across the application
 * Implements singleton pattern to ensure only one instance exists
 */
export class CSRFManager {
  private static instance: CSRFManager;
  
  private token: string | null = null;
  private tokenExpiry: number | null = null;
  private lastUpdated: number = 0;
  private fetchPromise: Promise<string> | null = null;
  private refreshThreshold = 5 * 60 * 1000; // 5 minutes before expiry
  private defaultTokenExpiry = 30 * 60 * 1000; // 30 minutes
  private tabId: string;
  private processingExternalEvent: boolean = false;
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Generate a unique ID for this tab
    this.tabId = crypto.randomUUID ? crypto.randomUUID() : `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Initialize storage listener for cross-tab communication
    this.initializeStorageListener();
    
    debugLog('CSRFManager initialized with tab ID:', this.tabId);
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): CSRFManager {
    if (!CSRFManager.instance) {
      CSRFManager.instance = new CSRFManager();
    }
    return CSRFManager.instance;
  }
  
  /**
   * Get the current CSRF token, fetching a new one if needed
   * @param forceRefresh Force a refresh of the token
   * @returns Promise resolving to the CSRF token
   */
  public async getToken(forceRefresh = false): Promise<string> {
    // If a fetch is already in progress, return that promise
    if (this.fetchPromise) {
      debugLog('Token fetch already in progress, returning existing promise');
      return this.fetchPromise;
    }
    
    // Check if token needs refresh
    if (forceRefresh || !this.token || this.isTokenExpiringSoon()) {
      debugLog('Token needs refresh, fetching new token');
      return this.fetchNewToken();
    }
    
    debugLog('Using existing token, valid until', new Date(this.tokenExpiry || 0).toISOString());
    return this.token!;
  }
  
  /**
   * Clear the current token
   */
  public clearToken(): void {
    debugLog('Clearing CSRF token');
    this.token = null;
    this.tokenExpiry = null;
    this.lastUpdated = Date.now();
    this.broadcastTokenUpdate();
  }
  
  /**
   * Check if token is expiring soon
   */
  private isTokenExpiringSoon(): boolean {
    if (!this.tokenExpiry) return true;
    return Date.now() + this.refreshThreshold > this.tokenExpiry;
  }
  
  /**
   * Fetch a new CSRF token from the server
   */
  private async fetchNewToken(): Promise<string> {
    this.fetchPromise = (async () => {
      try {
        debugLog('Fetching new CSRF token');
        const response = await axios.get<CSRFTokenResponse>(`${API_URL}/api/auth/csrf-token`, { 
          withCredentials: true 
        });
        
        if (!response.data.csrfToken) {
          throw new Error('No CSRF token received');
        }
        
        this.token = response.data.csrfToken;
        
        // Parse expiry from response or set default (30 min)
        const expiryMs = (response.data.expiresIn || 30 * 60) * 1000;
        this.tokenExpiry = Date.now() + expiryMs;
        this.lastUpdated = Date.now();
        
        debugLog('New token received, valid until', new Date(this.tokenExpiry).toISOString());
        
        // Broadcast to other tabs
        this.broadcastTokenUpdate();
        
        return this.token;
      } catch (error) {
        debugLog('Error fetching CSRF token:', error);
        throw error;
      } finally {
        this.fetchPromise = null;
      }
    })();
    
    return this.fetchPromise;
  }
  
  /**
   * Initialize storage event listener for cross-tab communication
   */
  private initializeStorageListener(): void {
    // Listen for storage events from other tabs
    window.addEventListener('storage', (event) => {
      // Only process events from our sync key
      if (event.key === CSRF_SYNC_KEY && event.newValue) {
        try {
          // Parse the sync data from other tabs
          const syncData = JSON.parse(event.newValue) as {
            tabId: string;
            token: string | null;
            expiry: number | null;
            timestamp: number;
          };
          
          // Ignore events from this tab
          if (syncData.tabId === this.tabId) {
            return;
          }
          
          // Process the sync data
          this.processSyncData(syncData);
        } catch (error) {
          console.error('Error processing CSRF sync data:', error);
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
    expiry: number | null;
    timestamp: number;
  }): void {
    // Avoid processing if we're already handling an event
    if (this.processingExternalEvent) {
      return;
    }
    
    this.processingExternalEvent = true;
    
    try {
      // Only update if the sync data is newer than our last update
      if (syncData.timestamp > this.lastUpdated) {
        debugLog('Received newer CSRF token from another tab');
        
        this.token = syncData.token;
        this.tokenExpiry = syncData.expiry;
        this.lastUpdated = syncData.timestamp;
        
        if (this.token) {
          debugLog('Updated token, valid until', syncData.expiry ? new Date(syncData.expiry).toISOString() : 'unknown');
        } else {
          debugLog('Token was cleared in another tab');
        }
      }
    } finally {
      this.processingExternalEvent = false;
    }
  }
  
  /**
   * Broadcast token state to other tabs
   */
  private broadcastTokenUpdate(): void {
    // Avoid broadcasting if we're processing an external event
    if (this.processingExternalEvent) {
      return;
    }
    
    // Create sync data
    const syncData = {
      tabId: this.tabId,
      token: this.token,
      expiry: this.tokenExpiry,
      timestamp: Date.now()
    };
    
    // Broadcast state via localStorage
    try {
      localStorage.setItem(CSRF_SYNC_KEY, JSON.stringify(syncData));
      debugLog('Broadcasted token update to other tabs');
    } catch (error) {
      console.error('Error broadcasting CSRF token:', error);
    }
  }
  
  /**
   * Get debug information about the current token state
   * Only available in development mode
   */
  public getDebugInfo(): Record<string, unknown> {
    return {
      token: this.token ? `${this.token.substring(0, 10)}...` : null,
      expiry: this.tokenExpiry ? new Date(this.tokenExpiry).toISOString() : null,
      isExpiringSoon: this.isTokenExpiringSoon(),
      lastUpdated: this.lastUpdated ? new Date(this.lastUpdated).toISOString() : null,
      tabId: this.tabId,
    };
  }
  
  // Debounced version of fetchNewToken to prevent too many concurrent requests
  public debouncedRefresh = debounce(async () => {
    await this.fetchNewToken();
  }, 500);
} 