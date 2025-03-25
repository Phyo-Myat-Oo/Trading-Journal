import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AxiosError } from 'axios';
import TwoFactorVerify from '../components/auth/TwoFactorVerify';
import { AuthResponse } from '../services/authService';
import EmailVerificationBanner from '../components/auth/EmailVerificationBanner';
import authService from '../services/authService';
import GoogleLoginButton from '../components/auth/GoogleLoginButton';

const Login = () => {
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const { login, error: authError, twoFactorRequired, twoFactorPendingUserId, cancelTwoFactor } = useAuth();
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationNeeded, setVerificationNeeded] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  // These state variables are used by the handleResendVerification function
  // but their values are managed within the function and not directly referenced in JSX
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');
  
  // Remember Me state
  const [rememberMe, setRememberMe] = useState(false);
  
  // 2FA states
  const [requireTwoFactor, setRequireTwoFactor] = useState(false);
  const [tempUserId, setTempUserId] = useState('');
  
  // Load previous Remember Me setting
  useEffect(() => {
    const savedPreference = localStorage.getItem('remember_me');
    if (savedPreference) {
      setRememberMe(savedPreference === 'true');
    }
  }, []);

  // Check for existing 2FA verification state on mount
  useEffect(() => {
    if (twoFactorRequired && twoFactorPendingUserId) {
      console.log('Found pending 2FA verification on component mount');
      setRequireTwoFactor(true);
      setTempUserId(twoFactorPendingUserId);
    }
  }, [twoFactorRequired, twoFactorPendingUserId]);

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
      // Only prevent default if we're submitting the login form
      const target = e.target as HTMLElement;
      if (target.closest('form')?.id === 'login-form') {
        console.log('Login form submission detected');
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      return true;
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
    
    // Log DOM state only once on component mount
    console.log('Current document.location:', document.location.href);
    console.log('Current history state:', window.history.state);
    
    return () => {
      console.log('Login component unmounted');
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

  // Handle Remember Me checkbox changes
  const handleRememberMeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRememberMe(e.target.checked);
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
      console.log('Remember Me enabled:', rememberMe);
      console.log('API URL:', import.meta.env.VITE_API_URL);
      
      // Store rememberMe preference in localStorage
      localStorage.setItem('remember_me', rememberMe.toString());
      
      // Use the context login function which updates auth state and returns success/failure
      const loginResponse = await login({
        email: formData.email,
        password: formData.password,
        rememberMe: rememberMe
      });
      
      console.log('Login result:', loginResponse);
      
      // Check if 2FA is required
      if (loginResponse && loginResponse.requireTwoFactor && loginResponse.userId) {
        setRequireTwoFactor(true);
        setTempUserId(loginResponse.userId);
        return;
      }
      
      // Only navigate on successful login
      if (loginResponse && loginResponse.success) {
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

  // Handle resending verification email
  const handleResendVerification = async () => {
    if (resendingVerification) return;
    
    setResendingVerification(true);
    setResendSuccess(false);
    setResendError('');
    
    try {
      console.log('Attempting to resend verification email to:', formData.email);
      
      // Use the authService for better consistency with other API calls
      const response = await authService.resendVerificationEmail(formData.email);
      console.log('Resend verification response:', response);
      
      if (response.success !== false) {
        setResendSuccess(true);
        console.log(`Verification email sent to ${formData.email} successfully`);
      } else {
        const errorMsg = response.message || 'Failed to resend verification email.';
        setResendError(errorMsg);
        console.error('Resend verification error:', errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again later.';
      console.error('Resend verification error:', err);
      setResendError(errorMsg);
    } finally {
      setResendingVerification(false);
    }
  };

  // Handle successful 2FA verification
  const handleTwoFactorSuccess = (response: AuthResponse) => {
    console.log('2FA verification successful:', response);
    
    // Redirect to home page
    setTimeout(() => {
      navigate('/');
    }, 100);
  };
  
  // Handle 2FA verification cancellation
  const handleTwoFactorCancel = () => {
    setRequireTwoFactor(false);
    setTempUserId('');
    
    // Also clear 2FA state in context
    cancelTwoFactor();
    
    // Clear the password field
    setFormData(prevData => ({
      ...prevData,
      password: ''
    }));
  };

  // If 2FA verification is required, show the verification form
  if (requireTwoFactor && tempUserId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Two-Factor Authentication Required
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Please enter the verification code from your authenticator app
            </p>
          </div>
          
          <TwoFactorVerify 
            userId={tempUserId}
            onVerificationSuccess={handleTwoFactorSuccess}
            onCancel={handleTwoFactorCancel}
          />
        </div>
      </div>
    );
  }

  // Main login form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">Sign in to your account</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
              create a new account
            </Link>
          </p>
        </div>
        
        {verificationNeeded && (
          <EmailVerificationBanner 
            email={formData.email} 
            onResend={handleResendVerification}
            showBanner={true}
          />
        )}
        
        {/* Display general error messages (not related to verification) */}
        {error && !verificationNeeded && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        {/* Display verification-related success/error messages when not showing the banner */}
        {!verificationNeeded && resendSuccess && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mt-4" role="alert">
            <span className="block sm:inline">Verification email sent! Please check your inbox.</span>
          </div>
        )}
        
        {!verificationNeeded && resendError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4" role="alert">
            <span className="block sm:inline">{resendError}</span>
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={(e) => e.preventDefault()} ref={formRef}>
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
                checked={rememberMe}
                onChange={handleRememberMeChange}
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
          
          <div className="mt-4 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">
                Or continue with
              </span>
            </div>
          </div>
          
          <div className="mt-4">
            <GoogleLoginButton />
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login; 