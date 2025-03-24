/**
 * Network status utility functions with improved debouncing and cooldown
 */

// Track network status listeners
const networkStatusListeners: Array<(online: boolean) => void> = [];

// Initialize online status
let isOnline: boolean = navigator.onLine;

// Debounce timers
let statusChangeTimeout: number | null = null;
let lastStatusChangeTime: number = Date.now();
const NETWORK_STATUS_COOLDOWN = 10000; // 10 seconds cooldown between status changes

// For checking actual connectivity
let connectivityCheckInProgress = false;

// Set up listeners for online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    handleNetworkStatusChange(true);
  });
  
  window.addEventListener('offline', () => {
    handleNetworkStatusChange(false);
  });
}

/**
 * Handle network status change with debouncing
 */
function handleNetworkStatusChange(online: boolean) {
  // If already in this state, no need to continue
  if (online === isOnline) return;
  
  // Check if we're still in cooldown period
  const now = Date.now();
  const timeSinceLastChange = now - lastStatusChangeTime;
  if (timeSinceLastChange < NETWORK_STATUS_COOLDOWN) {
    console.log(`[Network] Status change debounced, too soon since last change (${Math.round(timeSinceLastChange/1000)}s, need ${NETWORK_STATUS_COOLDOWN/1000}s)`);
    return;
  }
  
  // Clear any pending debounce timeout
  if (statusChangeTimeout !== null) {
    window.clearTimeout(statusChangeTimeout);
  }
  
  // Set a timeout to validate status hasn't flapped before notifying
  statusChangeTimeout = window.setTimeout(async () => {
    // Verify connectivity if switching to online
    if (online) {
      const isActuallyOnline = await checkActualConnectivity();
      if (!isActuallyOnline) {
        console.log('[Network] Browser reported online, but connectivity check failed');
        return; // Don't update status if we can't reach server
      }
    }
    
    // Update state and notify
    isOnline = online;
    lastStatusChangeTime = Date.now();
    notifyListeners();
    console.log(`[Network] Status changed to ${online ? 'online' : 'offline'}`);
  }, 2000); // Wait for 2 seconds to ensure connection state is stable
}

/**
 * Test actual connectivity by making a lightweight request
 */
async function checkActualConnectivity(): Promise<boolean> {
  if (connectivityCheckInProgress) return navigator.onLine;
  
  connectivityCheckInProgress = true;
  
  try {
    // Request a tiny response from server, with short timeout
    // We use a timestamp to bypass cache
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('/api/health?t=' + Date.now(), {
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    connectivityCheckInProgress = false;
    return response.ok;
  } catch (error) {
    console.log('[Network] Connectivity check failed:', error);
    connectivityCheckInProgress = false;
    return false;
  }
}

/**
 * Notify all listeners of network status change
 */
function notifyListeners() {
  networkStatusListeners.forEach(listener => listener(isOnline));
}

/**
 * Check if the device is currently online
 */
export const checkOnlineStatus = (): boolean => {
  return isOnline;
};

/**
 * Subscribe to network status changes
 * Returns an unsubscribe function
 */
export const subscribeToNetworkStatus = (
  callback: (online: boolean) => void
): () => void => {
  networkStatusListeners.push(callback);
  
  // Immediately call with current status
  callback(isOnline);
  
  // Return unsubscribe function
  return () => {
    const index = networkStatusListeners.indexOf(callback);
    if (index !== -1) {
      networkStatusListeners.splice(index, 1);
    }
  };
};

/**
 * Utility to retry a function with backoff when offline
 */
export const retryWhenOnline = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  initialDelay: number = 1000
): Promise<T> => {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    if (checkOnlineStatus()) {
      return fn();
    }
    
    attempts++;
    
    // Wait for online status or use exponential backoff
    await new Promise<void>(resolve => {
      // Set up a one-time listener for online event
      const onlineListener = () => {
        window.removeEventListener('online', onlineListener);
        resolve();
      };
      
      // Set a timeout as a fallback
      const backoffDelay = initialDelay * Math.pow(2, attempts - 1);
      const timeoutId = setTimeout(() => {
        window.removeEventListener('online', onlineListener);
        resolve();
      }, backoffDelay);
      
      // Add listener for online event
      window.addEventListener('online', onlineListener);
      
      // Clean up if component unmounts
      return () => {
        window.removeEventListener('online', onlineListener);
        clearTimeout(timeoutId);
      };
    });
  }
  
  // If we're still offline after max attempts, try anyway
  return fn();
}; 