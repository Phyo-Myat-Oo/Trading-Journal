import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';

interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles: ('user' | 'admin')[];
  fallbackPath?: string;
  loading?: React.ReactNode;
}

/**
 * RoleBasedRoute - Component for protecting routes based on user roles
 * 
 * @param {React.ReactNode} children - The components to render if authorized
 * @param {Array} allowedRoles - Array of roles that can access this route
 * @param {string} fallbackPath - Where to redirect if unauthorized (defaults to '/')
 * @param {React.ReactNode} loading - Custom loading component
 */
export const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({
  children,
  allowedRoles,
  fallbackPath = '/',
  loading = <div>Loading...</div>
}) => {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  
  // Show loading component while checking auth
  if (authLoading) {
    return <>{loading}</>;
  }
  
  // If not authenticated at all, redirect to login
  if (!isAuthenticated || !user) {
    console.log('User not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  // Check if user has permission based on their role
  if (!allowedRoles.includes(user.role)) {
    console.log(`User role ${user.role} not authorized for this route. Allowed roles: ${allowedRoles.join(', ')}`);
    return <Navigate to={fallbackPath} replace />;
  }
  
  // User has correct role, allow access
  return <>{children}</>;
};

export default RoleBasedRoute; 