import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import authService from '../services/authService';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, setAuthState } = useAuth() as any;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const processOAuthCallback = async () => {
      try {
        // Parse query parameters
        const params = new URLSearchParams(location.search);
        const token = params.get('token');
        
        if (!token) {
          setError('Authentication failed. No token received.');
          setLoading(false);
          return;
        }
        
        // Extract user info from URL params
        const firstName = params.get('firstName') || '';
        const lastName = params.get('lastName') || '';
        const email = params.get('email') || '';
        
        // Store token
        authService.setToken(token);
        
        // Set user in auth context
        const user = {
          id: '', // We don't have the ID from the URL, but it's in the token
          firstName,
          lastName,
          email,
          role: 'user',
          isVerified: true
        };
        
        setUser(user);
        setAuthState('authenticated');
        
        // Redirect to home page
        navigate('/');
      } catch (err) {
        console.error('Error processing OAuth callback:', err);
        setError('Failed to process authentication. Please try again.');
        setLoading(false);
      }
    };

    processOAuthCallback();
  }, [location, navigate, setUser, setAuthState]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Completing Sign In</h2>
          <div className="flex justify-center mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
          <p className="text-gray-600">Please wait while we complete your sign in...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <h2 className="text-2xl font-semibold text-red-600 mb-6">Authentication Failed</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default OAuthCallback; 