import { useAuth } from '../contexts/AuthContext';
import { useState, useCallback } from 'react';
import authService from '../services/authService';

type UserRole = 'user' | 'admin';

/**
 * Custom hook for checking role-based permissions
 * 
 * @returns Object with authorization helper methods
 */
export const useAuthorization = () => {
  const { user, isAuthenticated } = useAuth();
  const [permissionCache, setPermissionCache] = useState<Record<string, boolean>>({});
  
  /**
   * Check if user has one of the allowed roles
   * 
   * @param allowedRoles - Array of roles that can perform the action
   * @returns boolean indicating if the user is authorized
   */
  const hasRole = (allowedRoles: UserRole[]): boolean => {
    if (!isAuthenticated || !user) return false;
    return allowedRoles.includes(user.role);
  };
  
  /**
   * Check if user is an admin
   * 
   * @returns boolean indicating if the user is an admin
   */
  const isAdmin = (): boolean => {
    if (!isAuthenticated || !user) return false;
    return user.role === 'admin';
  };

  /**
   * Check with the server if the user has permission for a specific resource
   * Results are cached to avoid repeated API calls for the same resource
   * 
   * @param resource - The resource or action to check permissions for
   * @returns Promise that resolves to a boolean indicating if access is allowed
   */
  const checkPermission = useCallback(async (resource: string): Promise<boolean> => {
    // Check cache first
    if (permissionCache[resource] !== undefined) {
      return permissionCache[resource];
    }
    
    // If not authenticated, don't bother checking with server
    if (!isAuthenticated || !user) {
      return false;
    }
    
    try {
      const result = await authService.checkPermission(resource);
      
      // Cache the result
      setPermissionCache(prev => ({
        ...prev,
        [resource]: result.allowed
      }));
      
      return result.allowed;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }, [isAuthenticated, user, permissionCache]);

  return {
    hasRole,
    isAdmin,
    checkPermission,
    userRole: user?.role,
  };
};

export default useAuthorization; 