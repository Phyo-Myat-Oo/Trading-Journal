import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AxiosError } from 'axios';

const Login = () => {
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const { login, error: authError } = useAuth();
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationNeeded, setVerificationNeeded] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');

  // Sync with auth context errors
  useEffect(() => {
    console.log('Auth error effect triggered:', authError);
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  // Clear error when user starts typing again, but with a slight delay
  useEffect(() => {
    console.log('Input change effect triggered. Verification needed:', verificationNeeded);
    
    // Don't clear errors immediately on every keystroke
    // Only clear validation errors, not server response errors
    if (error && !verificationNeeded && 
        (error.includes('required') || error.includes('invalid'))) {
      console.log('Clearing validation errors due to input change');
      // Only clear local validation errors, not auth context errors
      setError('');
    }
  }, [formData.email, formData.password]);

  // Add a global form submission detector
  useEffect(() => {
    const detectFormSubmission = (e: Event) => {
      console.log('%c GLOBAL FORM SUBMISSION DETECTED', 'background: #ff00ff; color: white; font-size: 16px');
      console.log('Event:', e);
      console.log('Target:', e.target);
      
      // Always prevent default for any form submission while on login page
      e.preventDefault();
      e.stopPropagation();
      
      // Immediately return false to try to stop the propagation
      return false;
    };
    
    // Capture phase to intercept before any other handlers
    document.addEventListener('submit', detectFormSubmission, true);
    
    // Also add a beforeunload listener to try to prevent navigation
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only prevent unload if we're in the middle of form submission
      if (isSubmitting) {
        console.log('Preventing page unload during submission');
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      document.removeEventListener('submit', detectFormSubmission, true);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isSubmitting]);

  // Debug logging for mounting/unmounting
  useEffect(() => {
    console.log('Login component mounted');
    
    // Log DOM state
    const logDomState = () => {
      console.log('Current document.location:', document.location.href);
      console.log('Current history state:', window.history.state);
    };
    
    // Log initial state
    logDomState();
    
    // Set up interval to check for DOM changes
    const interval = setInterval(logDomState, 2000);
    
    return () => {
      console.log('Login component unmounted');
      clearInterval(interval);
    };
  }, []);

  // Logging input focus for debugging  
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    console.log('Input focused:', e.target.name);
  };
  
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    console.log('Input blurred:', e.target.name);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    }
    
    // Only return validation result, don't set error state here
    // This prevents setting error during input validation
    return {
      isValid: Object.keys(errors).length === 0,
      errorMessage: Object.values(errors)[0] || ''
    };
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Clear verification needed state when email changes
    if (name === 'email' && verificationNeeded) {
      setVerificationNeeded(false);
    }
  };

  // Create a button click handler that bypasses form submission
  const handleButtonClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('%c BUTTON CLICK - MANUAL SUBMISSION', 'background: blue; color: white; font-size: 16px');
    
    // Don't clear errors when resubmitting if verification is needed
    if (!verificationNeeded) {
      setError('');
    }
    
    const validation = validateForm();
    if (!validation.isValid) {
      console.log('Form validation failed:', validation.errorMessage);
      setError(validation.errorMessage);
      return;
    }
    
    console.log('Form validation passed, starting login process');
      setIsSubmitting(true);
    
    try {
      console.log('Attempting login for:', formData.email);
      console.log('API URL:', import.meta.env.VITE_API_URL);
      
      // Use the context login function which updates auth state and returns success/failure
      const loginSuccess = await login({
          email: formData.email,
          password: formData.password
        });
      
      console.log('Login result:', loginSuccess ? 'success' : 'failed');
      
      // Only navigate on successful login
      if (loginSuccess) {
        console.log('Login successful, navigating to home');
        // Use a small delay to ensure state is updated before redirect
        setTimeout(() => {
        navigate('/');
        }, 100);
      } else {
        console.log('Login failed, staying on login page');
        // Clear only the password field
        setFormData(prevData => ({
          ...prevData,
          password: ''
        }));
      }
      } catch (err) {
      console.error('%c LOGIN ERROR', 'background: #ff0000; color: white; font-size: 16px', err);
      
      // Clear only the password field on failed login attempts
      setFormData(prevData => ({
        ...prevData,
        password: ''
      }));
      
      // Check if verification is required
      if (err instanceof AxiosError && err.response?.data?.requiresVerification) {
        console.log('Email verification required');
        setVerificationNeeded(true);
        // Important: Clear any previous error to prevent confusion
        setError('');
      } else {
        let errorMessage = 'An unexpected error occurred. Please try again later.';
        
        if (err instanceof AxiosError) {
          if (err.response?.status === 401) {
            errorMessage = 'Invalid email or password. Please try again.';
          } else if (err.response?.data?.message) {
            errorMessage = err.response.data.message;
          }
        } else if (err instanceof Error) {
          // Show the specific error message if it's available
          errorMessage = err.message || errorMessage;
        }
        
        console.log('Login failed with error message:', errorMessage);
        setError(errorMessage);
      }
      } finally {
      console.log('Resetting submission state');
        setIsSubmitting(false);
      console.log('%c BUTTON CLICK - END', 'background: blue; color: white; font-size: 16px');
      
      // Add a check to see if the component is still mounted
      setTimeout(() => {
        console.log('%c COMPONENT MOUNT CHECK', 'background: #00ff00; color: black; font-size: 16px');
        console.log('If you see this, the component is still mounted and has not navigated');
      }, 500);
    }
  };

  const handleResendVerification = async () => {
    setResendingVerification(true);
    setResendSuccess(false);
    setResendError('');
    
    try {
      console.log('Attempting to resend verification email to:', formData.email);
      
      // Use the api instance here for consistency
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email }),
        credentials: 'include'
      });
      
      const data = await response.json();
      console.log('Resend verification response:', data);
      
      if (response.ok) {
        setResendSuccess(true);
      } else {
        setResendError(data.message || 'Failed to resend verification email.');
      }
    } catch (err) {
      console.error('Resend verification error:', err);
      setResendError('An unexpected error occurred. Please try again later.');
    } finally {
      setResendingVerification(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
              create a new account
            </Link>
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {verificationNeeded && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">Your email has not been verified. Please check your inbox for the verification link.</p>
                {!resendSuccess && (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendingVerification}
                    className="mt-2 inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                  >
                    {resendingVerification ? 'Sending...' : 'Resend verification email'}
                  </button>
                )}
                {resendSuccess && (
                  <p className="mt-2 text-sm text-green-700">Verification email has been sent. Please check your inbox.</p>
                )}
                {resendError && (
                  <p className="mt-2 text-sm text-red-700">{resendError}</p>
                )}
              </div>
            </div>
          </div>
        )}
        
        <form 
          ref={formRef}
          className="mt-8 space-y-6 login-form" 
          onSubmit={(e) => {
            console.log('%c FORM SUBMIT EVENT', 'background: purple; color: white');
            e.preventDefault();
            e.stopPropagation();
            // Don't do anything here - we'll handle submission from button click
          }} 
          noValidate
        >
          <input type="hidden" name="remember" defaultValue="true" />
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                  error && error.toLowerCase().includes('email') ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                  error && error.toLowerCase().includes('password') ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="Password"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <Link to="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                Forgot your password?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={handleButtonClick}
              disabled={isSubmitting}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                isSubmitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login; 