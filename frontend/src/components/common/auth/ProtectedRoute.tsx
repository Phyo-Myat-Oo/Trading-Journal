import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { loading, user, twoFactorRequired, twoFactorPendingUserId, authState } = useAuth();
  
  console.log('ProtectedRoute check:', { loading, authState, user, twoFactorRequired });
  
  // Show loading during initialization or token refresh
  if (loading || authState === 'initializing' || authState === 'refreshing') {
    console.log('Auth is still loading or refreshing');
    return <div>Loading...</div>;
  }
  
  // If 2FA verification is required, redirect to login page
  if (twoFactorRequired && twoFactorPendingUserId) {
    console.log('2FA verification required, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  // Only redirect if explicitly not authenticated
  if (authState === 'unauthenticated' || !user) {
    console.log('Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  console.log('User authenticated, rendering protected route');
  return <>{children}</>;
}; 