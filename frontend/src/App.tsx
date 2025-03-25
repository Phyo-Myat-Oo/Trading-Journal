import React, { useEffect, useState, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { ToastProvider } from './providers/ToastProvider';
import { MantineProvider, createTheme } from '@mantine/core';
import { router } from './router/config.tsx';
import { ErrorBoundary } from './components/common/feedback/ErrorBoundary';
import authService from './services/authService';
import GoogleAuthProvider from './providers/GoogleAuthProvider';
 
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
 
function App() {
  const [initializing, setInitializing] = useState(true);
  const sessionCheckPerformed = useRef(false);
 
  // Check session status on app initialization
  useEffect(() => {
    if (sessionCheckPerformed.current) {
      console.log('App: Session check already performed, skipping duplicate');
      return;
    }
 
    const checkSession = async () => {
      try {
        sessionCheckPerformed.current = true;
        console.log('App: Starting session check on initialization');
        
        const user = localStorage.getItem('user');
        if (user) {
          console.log('App: User found in localStorage, checking session validity');
          try {
            const sessionValid = await authService.initializeAuth();
            console.log('App: Session check result:', sessionValid);
            
            if (!sessionValid) {
              console.log('App: Invalid session, clearing stale user data');
              localStorage.removeItem('user');
            }
          } catch (error) {
            console.error('App: Error checking session status:', error);
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
 
  if (initializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#1A1B1E]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
 
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <MantineProvider theme={theme}>
          <ToastProvider>
            <GoogleAuthProvider>
              <RouterProvider router={router} />
            </GoogleAuthProvider>
          </ToastProvider>
        </MantineProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
 
export default App; 