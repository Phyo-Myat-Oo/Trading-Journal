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
import tokenDebug from './utils/tokenDebug';
import { RoleBasedRoute } from './components/common/auth/RoleBasedRoute';

import './styles/dateSlider.css';

// Initialize token debugging in development
const isDev = import.meta.env.DEV;
if (isDev) {
  console.log('Initializing token debugging in development mode');
  tokenDebug.setupTokenDebug();
}

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

export default function App() {
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
