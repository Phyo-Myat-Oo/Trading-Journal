import { createBrowserRouter, Outlet } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Dashboard } from '../pages/Dashboard';
import Stats from '../pages/Stats';
import Calendar from '../pages/Calendar';
import Trades from '../pages/Trades';
import Journal from '../pages/Journal';
import Help from '../pages/Help';
import { Settings } from '../pages/Settings';
import SecuritySettings from '../pages/SecuritySettings';
import { Admin } from '../pages/Admin';
import Login from '../pages/Login';
import Register from '../pages/Register';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import VerifyEmailChange from '../pages/VerifyEmailChange';
import NotFound from '../pages/NotFound';
import { RoleBasedRoute } from '../components/common/auth/RoleBasedRoute';
import { ProtectedRoute } from '../components/common/auth/ProtectedRoute';
import { TokenDebug } from '../components/debug/TokenDebug';
import { AuthProvider } from '../contexts/AuthContext';
import OAuthCallback from '../pages/OAuthCallback';

// Create a root component that wraps everything with AuthProvider
const Root = () => (
  <AuthProvider>
    <Outlet />
  </AuthProvider>
);

const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      {
        path: '/',
        element: (
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: <Dashboard />
          },
          {
            path: 'trades',
            element: <Trades />
          },
          {
            path: 'journal',
            element: <Journal />
          },
          {
            path: 'stats',
            element: <Stats />
          },
          {
            path: 'calendar',
            element: <Calendar />
          },
          {
            path: 'settings',
            element: <Settings />
          },
          {
            path: 'security',
            element: <SecuritySettings />
          },
          {
            path: 'help',
            element: <Help />
          },
          {
            path: 'admin',
            element: (
              <RoleBasedRoute allowedRoles={['admin']}>
                <Admin />
              </RoleBasedRoute>
            )
          }
        ]
      },
      {
        path: '/login',
        element: <Login />
      },
      {
        path: '/register',
        element: <Register />
      },
      {
        path: '/forgot-password',
        element: <ForgotPassword />
      },
      {
        path: '/reset-password/:token',
        element: <ResetPassword />
      },
      {
        path: '/verify-email/:token',
        element: <VerifyEmailChange />
      },
      {
        path: '/verify-email-change/:token',
        element: <VerifyEmailChange />
      },
      {
        path: '/oauth-callback',
        element: <OAuthCallback />
      },
      {
        path: '/debug/token',
        element: <TokenDebug />
      },
      {
        path: '*',
        element: <NotFound />
      }
    ]
  }
]);

export default router; 