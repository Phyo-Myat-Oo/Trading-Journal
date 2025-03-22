import React, { useEffect, useState, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './providers/ToastProvider';
import { MantineProvider, createTheme } from '@mantine/core';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import Stats from './pages/Stats';
import Calendar from './pages/Calendar';
import Trades from './pages/Trades';
import Journal from './pages/Journal';
import Help from './pages/Help';
import { Settings } from './pages/Settings';
import { Admin } from './pages/Admin';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { RoleBasedRoute } from './components/common/auth/RoleBasedRoute';
import authService from './services/authService';

import './styles/dateSlider.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const theme = createTheme({
  primaryColor: 'blue',
  primaryShade: 6
});

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading, user } = useAuth();
  
  console.log('ProtectedRoute check:', { isAuthenticated, loading, user });
  
  if (loading) {
    console.log('Auth is still loading');
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated || !user) {
    console.log('Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  console.log('User authenticated, rendering protected route');
  return <>{children}</>;
};

function App() {
  const [initializing, setInitializing] = useState(true);
  // Use a ref to track if the session check has been performed
  const sessionCheckPerformed = useRef(false);

  // Check session status on app initialization
  useEffect(() => {
    // Prevent duplicate session checks
    if (sessionCheckPerformed.current) {
      console.log('App: Session check already performed, skipping duplicate');
      return;
    }

    const checkSession = async () => {
      try {
        sessionCheckPerformed.current = true;
        console.log('App: Starting session check on initialization');
        
        // Only check if we have a user in localStorage
        const user = localStorage.getItem('user');
        if (user) {
          console.log('App: User found in localStorage, checking session validity');
          try {
            const sessionValid = await authService.checkSessionStatus();
            console.log('App: Session check result:', sessionValid);
            
            if (!sessionValid) {
              console.log('App: Invalid session, clearing stale user data');
              localStorage.removeItem('user');
            }
          } catch (error) {
            console.error('App: Error checking session status:', error);
            // Don't clear user data on network errors
            // Let the auth context handle the error
          }
        } else {
          console.log('App: No user found in localStorage, proceeding as unauthenticated');
        }
      } catch (error) {
        console.error('App: Error initializing app:', error);
      } finally {
        setInitializing(false);
      }
    };

    checkSession();
  }, []);

  // Show a minimal loading indicator while checking session
  if (initializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#1A1B1E]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme}>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                {/* Auth routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />
                <Route path="/verify-email/:token" element={<VerifyEmail />} />
                
                {/* Protected routes */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Dashboard />} />
                  <Route path="trades" element={<Trades />} />
                  <Route path="journal" element={<Journal />} />
                  <Route path="stats" element={<Stats />} />
                  <Route path="calendar" element={<Calendar />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="help" element={<Help />} />
                  <Route path="admin" element={
                    <RoleBasedRoute allowedRoles={['admin']}>
                      <Admin />
                    </RoleBasedRoute>
                  } />
                </Route>
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </MantineProvider>
    </QueryClientProvider>
  );
}

export default App;
