import { TokenManager } from '../TokenManager';
import { TokenState } from '../../types/token';
import { jwtDecode } from 'jwt-decode';

// Mock jwt-decode
jest.mock('jwt-decode', () => ({
  jwtDecode: jest.fn()
}));

// Mock fetch
global.fetch = jest.fn();

describe('TokenManager', () => {
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
    localStorage.clear();
    
    // Mock jwtDecode
    (jwtDecode as jest.Mock).mockReturnValue(mockTokenInfo);
    
    // Get fresh instance
    tokenManager = TokenManager.getInstance();
  });

  afterEach(() => {
    tokenManager.destroy();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = TokenManager.getInstance();
      const instance2 = TokenManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Token Initialization', () => {
    it('should initialize token successfully', () => {
      tokenManager.initializeToken(mockToken);
      expect(localStorage.getItem('token')).toBe(mockToken);
      expect(tokenManager.getTokenState()).toBe(TokenState.VALID);
    });

    it('should handle expired token', () => {
      const expiredTokenInfo = {
        ...mockTokenInfo,
        exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      };
      (jwtDecode as jest.Mock).mockReturnValue(expiredTokenInfo);
      
      tokenManager.initializeToken(mockToken);
      expect(tokenManager.getTokenState()).toBe(TokenState.EXPIRED);
    });

    it('should handle invalid token', () => {
      (jwtDecode as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      tokenManager.initializeToken(mockToken);
      expect(tokenManager.getTokenState()).toBe(TokenState.ERROR);
    });
  });

  describe('Token Refresh', () => {
    beforeEach(() => {
      tokenManager.initializeToken(mockToken);
    });

    it('should refresh token successfully', async () => {
      const newToken = 'new.jwt.token';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ accessToken: newToken })
      });

      await tokenManager.queueRefresh('high');
      
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/refresh-token', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      expect(localStorage.getItem('token')).toBe(newToken);
    });

    it('should handle refresh failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized'
      });

      await tokenManager.queueRefresh('high');
      expect(tokenManager.getTokenState()).toBe(TokenState.ERROR);
    });

    it('should respect minimum refresh interval', async () => {
      const newToken = 'new.jwt.token';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ accessToken: newToken })
      });

      await tokenManager.queueRefresh('high');
      await tokenManager.queueRefresh('high');

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('State Management', () => {
    it('should handle valid state transitions', () => {
      tokenManager.initializeToken(mockToken);
      expect(tokenManager.getTokenState()).toBe(TokenState.VALID);
      
      // Simulate token expiring soon
      const expiringTokenInfo = {
        ...mockTokenInfo,
        exp: Math.floor(Date.now() / 1000) + 15 // 15 seconds from now
      };
      (jwtDecode as jest.Mock).mockReturnValue(expiringTokenInfo);
      
      tokenManager.validateCurrentToken();
      expect(tokenManager.getTokenState()).toBe(TokenState.EXPIRING_SOON);
    });

    it('should prevent invalid state transitions', () => {
      tokenManager.initializeToken(mockToken);
      expect(tokenManager.getTokenState()).toBe(TokenState.VALID);
      
      // Attempt invalid transition
      tokenManager.validateCurrentToken();
      expect(tokenManager.getTokenState()).toBe(TokenState.VALID);
    });
  });

  describe('Security Monitoring', () => {
    beforeEach(() => {
      tokenManager.initializeToken(mockToken);
    });

    it('should detect suspicious refresh patterns', async () => {
      const newToken = 'new.jwt.token';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ accessToken: newToken })
      });

      // Simulate multiple rapid refreshes
      for (let i = 0; i < 15; i++) {
        await tokenManager.queueRefresh('high');
      }

      const securityStatus = tokenManager.getSecurityStatus();
      expect(securityStatus.suspiciousPatterns).toBe(true);
    });

    it('should adjust security parameters on suspicious activity', async () => {
      const newToken = 'new.jwt.token';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ accessToken: newToken })
      });

      // Trigger suspicious pattern detection
      for (let i = 0; i < 15; i++) {
        await tokenManager.queueRefresh('high');
      }

      const securityStatus = tokenManager.getSecurityStatus();
      expect(securityStatus.refreshThreshold).toBeGreaterThan(0.75); // Should increase from default
      expect(securityStatus.minRefreshInterval).toBeLessThan(5000); // Should decrease from default
    });

  });

  describe('Statistics', () => {
    it('should track refresh statistics', async () => {
      const newToken = 'new.jwt.token';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ accessToken: newToken })
      });

      await tokenManager.queueRefresh('high');
      const stats = tokenManager.getStats();
      
      expect(stats.refreshCount).toBe(1);
      expect(stats.errorCount).toBe(0);
      expect(stats.averageRefreshTime).toBeGreaterThan(0);
    });

    it('should track error statistics', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Unauthorized'
      });

      await tokenManager.queueRefresh('high');
      const stats = tokenManager.getStats();
      
      expect(stats.errorCount).toBe(1);
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources on destroy', () => {
      tokenManager.initializeToken(mockToken);
      tokenManager.destroy();
      
      expect(localStorage.getItem('token')).toBeNull();
      expect(tokenManager.getTokenState()).toBe(TokenState.VALID);
    });
  });
}); 