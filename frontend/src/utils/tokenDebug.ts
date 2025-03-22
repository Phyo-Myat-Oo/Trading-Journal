/**
 * Token Debug Utility
 * 
 * This utility helps debug authentication and token refresh issues.
 * Only active in development mode.
 */

import api from './api';

// Check if we're in development mode
const isDevelopment = import.meta.env.DEV === true;

// Track last check time to prevent excessive requests
let lastCheckTime = 0;
// Minimum time between checks (2 minutes)
const MIN_CHECK_INTERVAL = 120000;

// Setup token debugging
export const setupTokenDebug = (): void => {
  // Only run debugging in development mode
  if (!isDevelopment) {
    console.log('[TokenDebug] Debug logging disabled in production');
    return;
  }
  
  console.log('[TokenDebug] Debug utility initialized with reduced frequency checks');
  
  // Greatly reduced frequency - check once every 2 minutes instead of every 30 seconds
  const checkInterval = 120000; // 2 minutes
  
  // Check periodically for cookie and token state
  setInterval(() => {
    const now = Date.now();
    
    // Skip this check if another check happened recently
    // This prevents multiple components from causing too many requests
    if (now - lastCheckTime < MIN_CHECK_INTERVAL) {
      console.debug('[TokenDebug] Skipping check - too soon since last check');
      return;
    }
    
    // Update the last check time
    lastCheckTime = now;
    
    // Check cookies without logging them
    if (document.cookie) {
      console.debug('[TokenDebug] Cookies present');
    }
    
    // Try to fetch the current auth state silently - with reduced frequency
    api.get('/api/auth/check-cookies', { 
      withCredentials: true,
      // Add silent header to tell backend not to log
      headers: {
        'X-Silent-Request': 'true'
      }
    })
      .then(response => {
        // Only log failures or changes
        if (response.status !== 304) {
          console.debug('[TokenDebug] Auth state updated');
        }
      })
      .catch(error => {
        // Type guard for axios error
        const axiosError = error as { response?: { status: number } };
        
        // Don't log 429 errors to reduce console noise
        if (axiosError.response && axiosError.response.status === 429) {
          console.debug('[TokenDebug] Rate limit hit, will try later');
        } else {
          console.error('[TokenDebug] Auth state error:', error);
        }
      });
  }, checkInterval);
  
  // Only patch fetch and XHR in development mode
  if (isDevelopment) {
    // Patch fetch and XMLHttpRequest to log all requests
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const request = args[0];
      const url = typeof request === 'string' 
        ? request 
        : request instanceof Request ? request.url : (request as URL).toString();
      
      // Don't log check-cookies requests
      if (!url.includes('check-cookies')) {
        console.debug(`[TokenDebug] Fetch request: ${url}`);
      }
      
      return originalFetch.apply(this, args)
        .then(response => {
          // Don't log check-cookies responses
          if (!url.includes('check-cookies')) {
            console.debug(`[TokenDebug] Fetch response: ${url}`, response.status);
          }
          return response;
        })
        .catch(error => {
          console.error(`[TokenDebug] Fetch error: ${url}`, error);
          throw error;
        });
    };
  }
};

// Add a debugging endpoint to check auth state
export const checkAuthState = async (): Promise<void> => {
  const now = Date.now();
  
  // Prevent manual checks from happening too frequently
  if (now - lastCheckTime < 5000) { // 5 second cooldown for manual checks
    console.log('[TokenDebug] Please wait at least 5 seconds between manual checks');
    return;
  }
  
  lastCheckTime = now;
  
  try {
    const response = await api.get('/api/auth/check-cookies', { withCredentials: true });
    console.log('[TokenDebug] Manual auth state check:', response.data);
  } catch (error: unknown) {
    const axiosError = error as { response?: { status: number } };
    
    if (axiosError.response && axiosError.response.status === 429) {
      console.error('[TokenDebug] Rate limit hit. Please wait a few minutes before trying again.');
    } else {
      console.error('[TokenDebug] Manual auth state check error:', error);
    }
  }
};

// Define interface for the global window object extension
interface WindowWithTokenDebug extends Window {
  tokenDebug: {
    checkAuthState: () => Promise<void>;
  };
}

// Export a global version of this for console usage - but only in development
if (typeof window !== 'undefined' && isDevelopment) {
  (window as unknown as WindowWithTokenDebug).tokenDebug = {
    checkAuthState
  };
}

export default {
  setupTokenDebug,
  checkAuthState
}; 