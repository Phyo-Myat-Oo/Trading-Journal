import React from 'react';
import { useAuthorization } from '../../../hooks/useAuthorization';

interface RoleBasedPermissionsProps {
  requiredRole: 'user' | 'admin';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component that demonstrates using the useAuthorization hook
 * to conditionally render content based on user role permissions
 */
export const RoleBasedPermissions: React.FC<RoleBasedPermissionsProps> = ({
  requiredRole,
  children,
  fallback = null
}) => {
  const { hasRole } = useAuthorization();
  const isAuthorized = hasRole([requiredRole]);

  return isAuthorized ? <>{children}</> : <>{fallback}</>;
};

/**
 * Component that only renders content for admin users
 */
export const AdminOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback = null
}) => {
  const { isAdmin } = useAuthorization();
  
  return isAdmin() ? <>{children}</> : <>{fallback}</>;
};

export default RoleBasedPermissions; 