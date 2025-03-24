import { CSRFManager } from '../CSRFManager';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockAxios = axios as jest.Mocked<typeof axios>;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
      // Simulate storage event for other tabs
      if (typeof window.dispatchEvent === 'function') {
        const event = new StorageEvent('storage', {
          key,
          newValue: value,
          oldValue: store[key],
          storageArea: localStorage
        });
        window.dispatchEvent(event);
      }
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('CSRFManager', () => {
  let csrfManager: CSRFManager;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset localStorage
    localStorageMock.clear();
    
    // Mock successful API response
    mockAxios.get.mockResolvedValue({
      data: { csrfToken: 'test-csrf-token', expiresIn: 1800 }
    });
    
    // Get instance of CSRFManager
    csrfManager = CSRFManager.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = CSRFManager.getInstance();
      const instance2 = CSRFManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Token Management', () => {
    it('should fetch a new token when none exists', async () => {
      const token = await csrfManager.getToken();
      
      // Verify API call was made
      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/csrf-token'),
        expect.objectContaining({ withCredentials: true })
      );
      
      // Verify token was returned
      expect(token).toBe('test-csrf-token');
    });

    it('should use cached token if within expiry', async () => {
      // First call to get token
      await csrfManager.getToken();
      
      // Reset mock to verify second call doesn't trigger API
      mockAxios.get.mockClear();
      
      // Second call should use cached token
      const token = await csrfManager.getToken();
      
      // API should not be called again
      expect(mockAxios.get).not.toHaveBeenCalled();
      
      // Token should still be returned
      expect(token).toBe('test-csrf-token');
    });

    it('should fetch new token when forced', async () => {
      // First call to get token
      await csrfManager.getToken();
      
      // Reset mock to verify forced refresh triggers API
      mockAxios.get.mockClear();
      
      // Force refresh
      const token = await csrfManager.getToken(true);
      
      // API should be called again
      expect(mockAxios.get).toHaveBeenCalled();
      
      // Token should be returned
      expect(token).toBe('test-csrf-token');
    });

    it('should handle API errors', async () => {
      // Mock API failure
      mockAxios.get.mockRejectedValueOnce(new Error('API error'));
      
      // Expect rejection
      await expect(csrfManager.getToken()).rejects.toThrow('API error');
    });
  });

  describe('Multi-Tab Synchronization', () => {
    it('should broadcast token updates to other tabs', async () => {
      // Spy on localStorage.setItem
      const setItemSpy = jest.spyOn(localStorage, 'setItem');
      
      // Get token
      await csrfManager.getToken();
      
      // Verify broadcast was made
      expect(setItemSpy).toHaveBeenCalledWith(
        'csrf_token_sync',
        expect.stringContaining('test-csrf-token')
      );
    });

    it('should process token updates from other tabs', async () => {
      // Initialize csrfManager
      await csrfManager.getToken();
      
      // Mock a newer token from another tab
      const syncData = {
        tabId: 'other-tab',
        token: 'new-csrf-token',
        expiry: Date.now() + 1800000,
        timestamp: Date.now() + 1000 // Newer timestamp
      };
      
      // Manually trigger storage event
      const storageEvent = new StorageEvent('storage', {
        key: 'csrf_token_sync',
        newValue: JSON.stringify(syncData)
      });
      window.dispatchEvent(storageEvent);
      
      // Verify token was updated
      // We need to use getToken() to check internal state
      const token = await csrfManager.getToken();
      expect(token).toBe('new-csrf-token');
    });
  });

  describe('Debug Info', () => {
    it('should provide debug info', async () => {
      // Get token first
      await csrfManager.getToken();
      
      // Get debug info
      const debugInfo = csrfManager.getDebugInfo();
      
      // Verify structure
      expect(debugInfo).toHaveProperty('token');
      expect(debugInfo).toHaveProperty('expiry');
      expect(debugInfo).toHaveProperty('isExpiringSoon');
      expect(debugInfo).toHaveProperty('tabId');
    });
  });
}); 