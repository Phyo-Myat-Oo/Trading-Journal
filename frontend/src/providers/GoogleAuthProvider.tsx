import React, { ReactNode } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';

interface GoogleAuthProviderProps {
  children: ReactNode;
}

const GoogleAuthProvider: React.FC<GoogleAuthProviderProps> = ({ children }) => {
  // Get the client ID from environment variables
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  
  if (!clientId) {
    console.warn('Google OAuth client ID is not configured. Social login will not work.');
    return <>{children}</>;
  }
  
  return (
    <GoogleOAuthProvider clientId={clientId}>
      {children}
    </GoogleOAuthProvider>
  );
};

export default GoogleAuthProvider; 