import { TokenManager } from '../TokenManager';
import { TokenState, TokenEventType } from '../../types/token';
import { jwtDecode } from 'jwt-decode';

// Mock jwt-decode
jest.mock('jwt-decode', () => ({
  jwtDecode: jest.fn()
}));

// Mock fetch
global.fetch = jest.fn();

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

describe('TokenManager Refresh Tests', () => {
  let tokenManager: TokenManager;
  const mockToken = 'mock.jwt.token';
  const mockTokenInfo = {
    id: '123',
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    iat: Math.floor(Date.now() / 1000),
    email: 'test@example.com',
    role: 'user'
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset localStorage
    localStorageMock.clear();
    
    // Mock jwtDecode
    (jwtDecode as jest.Mock).mockReturnValue(mockTokenInfo);
    
    // Get fresh instance
    tokenManager = TokenManager.getInstance();
  });

  afterEach(() => {
    tokenManager.destroy();
  });

  describe('Basic Token Refresh', () => {
    beforeEach(() => {
      tokenManager.initializeToken(mockToken);
    });

    it('should refresh token successfully', async () => {
      const newToken = 'new.jwt.token';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ accessToken: newToken })
      });

      // Subscribe to refresh event
      const refreshCallback = jest.fn();
      tokenManager.on(TokenEventType.TOKEN_REFRESH, refreshCallback);

      // Refresh token
      await tokenManager.refreshToken();
      
      // Verify fetch was called correctly
      expect(global.fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        method: 'POST',
        credentials: 'include'
      }));
      
      // Verify token was updated
      expect(tokenManager.getToken()).toBe(newToken);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', newToken);
      
      // Verify event was emitted
      expect(refreshCallback).toHaveBeenCalledWith(newToken);
    });

    it('should handle refresh error gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Invalid refresh token' })
      });

      // Subscribe to error event
      const errorCallback = jest.fn();
      tokenManager.on(TokenEventType.TOKEN_ERROR, errorCallback);

      // Refresh token and expect it to fail
      try {
        await tokenManager.refreshToken();
        fail('Should have thrown an error');
      } catch (error) {
        // Expected error, do nothing
        expect(error).toBeTruthy();
      }
      
      // Verify error event was emitted
      expect(errorCallback).toHaveBeenCalled();
      expect(tokenManager.getTokenState()).toBe(TokenState.ERROR);
    });

    it('should debounce multiple refresh calls', async () => {
      const newToken = 'new.jwt.token';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ accessToken: newToken })
      });

      // Make multiple refresh calls in quick succession
      const promise1 = tokenManager.refreshToken();
      const promise2 = tokenManager.refreshToken();
      const promise3 = tokenManager.refreshToken();

      // Wait for all promises to resolve
      await Promise.all([promise1, promise2, promise3]);
      
      // Verify fetch was only called once
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Multi-Tab Synchronization', () => {
    let secondTokenManager: TokenManager;

    beforeEach(() => {
      tokenManager.initializeToken(mockToken);
      secondTokenManager = TokenManager.getInstance();
    });

    afterEach(() => {
      secondTokenManager.destroy();
    });

    it('should synchronize token across tabs on refresh', async () => {
      const newToken = 'new.jwt.token';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ accessToken: newToken })
      });

      // Subscribe to refresh event on second instance
      const refreshCallback = jest.fn();
      secondTokenManager.on(TokenEventType.TOKEN_REFRESH, refreshCallback);

      // Refresh token in first instance
      await tokenManager.refreshToken();
      
      // Manually trigger storage event since Jest doesn't do it automatically
      const syncEvent = new StorageEvent('storage', {
        key: 'token_sync_state',
        newValue: JSON.stringify({
          tabId: 'mock-tab-id',
          token: newToken,
          state: TokenState.VALID,
          timestamp: Date.now()
        })
      });
      window.dispatchEvent(syncEvent);
      
      // Verify second instance received the update
      expect(refreshCallback).toHaveBeenCalled();
      expect(secondTokenManager.getToken()).toBe(newToken);
    });

    it('should propagate token revocation across tabs', () => {
      // Subscribe to revoke event on second instance
      const revokeCallback = jest.fn();
      secondTokenManager.on(TokenEventType.TOKEN_REVOKED, revokeCallback);

      // Revoke token in first instance
      tokenManager.revokeToken();
      
      // Manually trigger storage event
      const syncEvent = new StorageEvent('storage', {
        key: 'token_sync_action',
        newValue: JSON.stringify({
          tabId: 'mock-tab-id',
          action: 'REVOKE_TOKEN',
          timestamp: Date.now()
        })
      });
      window.dispatchEvent(syncEvent);
      
      // Verify second instance received the revocation
      expect(revokeCallback).toHaveBeenCalled();
      expect(secondTokenManager.getToken()).toBeNull();
    });
  });

  describe('Performance Tracking', () => {
    beforeEach(() => {
      tokenManager.initializeToken(mockToken);
    });

    it('should track refresh performance metrics', async () => {
      const newToken = 'new.jwt.token';
      
      // Add a delay to the mock to simulate network latency
      (global.fetch as jest.Mock).mockImplementationOnce(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: () => Promise.resolve({ accessToken: newToken })
            });
          }, 50);
        });
      });

      // Refresh token
      await tokenManager.refreshToken();
      
      // Get stats
      const stats = tokenManager.getStats();
      
      // Verify performance metrics were tracked
      expect(stats.refreshCount).toBe(1);
      expect(stats.averageRefreshTime).toBeGreaterThan(0);
      expect(stats.lastRefreshTime).toBeGreaterThan(0);
    });
  });
}); 