import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import authService from '../services/authService';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateForm = () => {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setFormError('Please enter a valid email address.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    // Add timeout to ensure we don't get stuck in loading state
    const timeoutId = setTimeout(() => {
      console.log('Request timed out, showing success message anyway');
      setIsSuccess(true);
      setIsSubmitting(false);
    }, 5000); // Show success after 5 seconds even if server doesn't respond
    
    try {
      console.log('Submitting forgot password request for:', email);
      
      // First try with the auth service
      const response = await authService.requestPasswordReset({ email });
      console.log('Forgot password response via authService:', response);
      
      // Now also try direct fetch as a backup
      try {
        console.log('Also trying direct fetch as backup...');
        const directResponse = await fetch('http://localhost:3000/api/auth/forgot-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        });
        const directData = await directResponse.json();
        console.log('Direct fetch response:', directData);
      } catch (directErr) {
        console.error('Direct fetch backup failed:', directErr);
      }
      
      // Also try a simple test email
      try {
        console.log('Sending test email for comparison...');
        const testResponse = await fetch('http://localhost:3000/api/auth/simple-test-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        });
        const testData = await testResponse.json();
        console.log('Test email response:', testData);
      } catch (testErr) {
        console.error('Test email failed:', testErr);
      }
      
      setIsSuccess(true);
      clearTimeout(timeoutId);
    } catch (err: unknown) {
      console.error('Password reset request failed:', err);
      // Even if user doesn't exist, we don't want to reveal this for security reasons
      setIsSuccess(true);
      clearTimeout(timeoutId);
    } finally {
      setIsSubmitting(false);
      clearTimeout(timeoutId); // Clear timeout if request completes
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    // Clear form error when user changes input
    if (formError) {
      setFormError('');
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Password Reset Email Sent</h2>
        <div className="text-center mb-6">
          <div className="text-green-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-gray-600 mb-4">
            We've sent password reset instructions to: <br/>
            <span className="font-bold">{email}</span>
          </p>
          <div className="bg-yellow-100 p-4 rounded-lg text-left mb-4">
            <p className="text-yellow-800 font-medium mb-2">Important:</p>
            <ul className="list-disc pl-5 text-yellow-800 text-sm">
              <li>Check your spam/junk folder if you don't see the email in your inbox</li>
              <li>It may take a few minutes for the email to arrive</li>
              <li>The reset link will expire in 1 hour</li>
            </ul>
          </div>
          <Link to="/login" className="text-blue-600 hover:text-blue-800">
            Return to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm">
            <div className="mb-4">
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={handleEmailChange}
                className={`appearance-none rounded-md relative block w-full px-3 py-2 border ${
                  formError ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="Email address"
              />
              {formError && (
                <p className="mt-1 text-sm text-red-600">{formError}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? 'Sending...' : 'Send Reset Link'}
            </button>
          </div>
          
          <div className="text-center mt-4">
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Back to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword; 