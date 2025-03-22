/**
 * Token Debug Utility
 * 
 * This utility helps debug authentication and token refresh issues.
 * Only active in development mode.
 */

import api from './api';

// Check if we're in development mode
const isDevelopment = import.meta.env.DEV === true;

// Setup token debugging
export const setupTokenDebug = (): void => {
  // Only run debugging in development mode
  if (!isDevelopment) {
    console.log('[TokenDebug] Debug logging disabled in production');
    return;
  }
  
  // Lower frequency of checks in any mode - from 10 seconds to 30 seconds
  const checkInterval = 30000; // 30 seconds
  
  // Check periodically for cookie and token state
  setInterval(() => {
    // Check cookies without logging them
    if (document.cookie) {
      console.debug('[TokenDebug] Cookies present');
    }
    
    // Try to fetch the current auth state silently
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
        console.error('[TokenDebug] Auth state error:', error);
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
  try {
    const response = await api.get('/api/auth/check-cookies', { withCredentials: true });
    console.log('[TokenDebug] Manual auth state check:', response.data);
  } catch (error) {
    console.error('[TokenDebug] Manual auth state check error:', error);
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