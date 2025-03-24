import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import authService from '../services/authService';

const ResetPassword = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateForm = () => {
    if (!password) {
      setError('Password is required');
      return false;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!token) {
      setError('Reset token is missing. Please use the link from your email.');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    console.log('Token from URL:', token);
    console.log('Token length:', token.length);
    console.log('Attempting to reset password');
    
    try {
      // First try decoding the token to check its structure
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
          console.warn('Token does not appear to be a valid JWT (should have 3 parts separated by dots)');
        } else {
          // Try to decode the payload (middle part)
          const encodedPayload = tokenParts[1];
          const decodedPayload = atob(encodedPayload.replace(/-/g, '+').replace(/_/g, '/'));
          const payload = JSON.parse(decodedPayload);
          console.log('Token payload:', {
            ...payload,
            // Don't log the full payload for security, just the properties we're interested in
            id: payload.id,
            exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'undefined',
            iat: payload.iat ? new Date(payload.iat * 1000).toISOString() : 'undefined',
          });
          
          // Check if token is expired
          if (payload.exp) {
            const expTime = payload.exp * 1000; // Convert to milliseconds
            const currentTime = Date.now();
            console.log('Token expires:', new Date(expTime).toISOString());
            console.log('Current time:', new Date(currentTime).toISOString());
            console.log('Token expired:', expTime < currentTime);
          }
        }
      } catch (decodeErr) {
        console.error('Error decoding token:', decodeErr);
      }
      
      // Use authService instead of direct fetch
      console.log('Using authService.resetPassword to reset password');
      const response = await authService.resetPassword({ token, password });
      
      console.log('Password reset response:', response);
      
      if (response.success === false) {
        throw new Error(response.message || 'Failed to reset password');
      }
      
      setIsSuccess(true);
      
      // Redirect to login page after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error('Error resetting password:', err);
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      
      // When error occurs, add a debug message with troubleshooting information
      console.log('Password reset troubleshooting info:', {
        tokenProvided: !!token,
        tokenFormat: token ? 'JWT format' : 'unknown',
        apiUrl: import.meta.env.VITE_API_URL,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset Your Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your new password below
          </p>
        </div>
        
        {isSuccess && (
          <div className={`border-l-4 p-4 bg-green-50 border-green-400`}>
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">
                  Your password has been reset successfully!
                </p>
                <p className="text-sm text-green-700 mt-2">
                  You will be redirected to the login page shortly.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {!isSuccess && (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="password" className="sr-only">New Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                    error ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                  placeholder="New Password"
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="sr-only">Confirm Password</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                    error ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                  placeholder="Confirm Password"
                />
              </div>
            </div>
            
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                  isSubmitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              >
                {isSubmitting ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
            
            <div className="text-sm text-center">
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Back to login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword; 