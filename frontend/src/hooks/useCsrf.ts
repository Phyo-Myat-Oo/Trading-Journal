import { useState, useCallback } from 'react';
import { csrfUtils } from '../utils/api';

interface UseCsrfReturn {
  csrfToken: string | null;
  isLoading: boolean;
  error: Error | null;
  fetchToken: () => Promise<void>;
  clearToken: () => void;
  debugInfo?: Record<string, unknown>;
}

export const useCsrf = (): UseCsrfReturn => {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchToken = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Force a fresh token
      const token = await csrfUtils.refreshToken();
      setCsrfToken(token);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch CSRF token'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearToken = useCallback(() => {
    csrfUtils.clearToken();
    setCsrfToken(null);
  }, []);

  return {
    csrfToken,
    isLoading,
    error,
    fetchToken,
    clearToken,
    // Only in development mode
    debugInfo: process.env.NODE_ENV === 'development' ? csrfUtils.getDebugInfo() : undefined
  };
}; 