import React from 'react';
import { useAuthorization } from '../../../hooks/useAuthorization';

type UserRole = 'user' | 'admin';

interface RoleGatedProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * RoleGated - Component for conditionally rendering content based on user role
 * 
 * @param {Array} allowedRoles - Roles that can see the content
 * @param {React.ReactNode} children - Content to show if authorized
 * @param {React.ReactNode} fallback - Optional content to show if not authorized
 */
export const RoleGated: React.FC<RoleGatedProps> = ({
  allowedRoles,
  children,
  fallback = null
}) => {
  const { hasRole } = useAuthorization();
  
  return hasRole(allowedRoles) ? <>{children}</> : <>{fallback}</>;
};

export default RoleGated; 