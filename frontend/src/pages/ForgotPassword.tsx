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
    setFormError('');
    
    try {
      console.log('Submitting forgot password request for:', email);
      
      // Use forgotPassword method directly (which is also aliased as requestPasswordReset)
      const response = await authService.forgotPassword({ email });
      console.log('Forgot password response:', response);
      
      // Always show success even if email doesn't exist (for security reasons)
      setIsSuccess(true);
    } catch (err) {
      console.error('Password reset request failed:', err);
      // For security reasons, don't reveal if the email exists or not
      // Just show success message anyway
      setIsSuccess(true);
    } finally {
      setIsSubmitting(false);
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
        <p className="text-center text-gray-600 mb-4">
          If an account exists with the email <span className="font-semibold">{email}</span>, 
          we've sent instructions to reset your password.
        </p>
        <p className="text-center text-gray-600 mb-6">
          Please check your email inbox and spam folder.
        </p>
        <div className="text-center">
          <Link 
            to="/login" 
            className="inline-block px-4 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition-colors"
          >
            Return to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Reset Your Password</h2>
      <p className="text-center text-gray-600 mb-6">
        Enter your email address below and we'll send you instructions to reset your password.
      </p>
      
      {formError && (
        <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700">
          <p>{formError}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="email" className="block text-gray-700 font-medium mb-2">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={handleEmailChange}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="your.email@example.com"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-2 px-4 rounded-lg font-medium text-white ${
            isSubmitting
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isSubmitting ? 'Sending Instructions...' : 'Send Reset Instructions'}
        </button>
      </form>
      
      <div className="mt-4 text-center">
        <Link to="/login" className="text-blue-600 hover:text-blue-800">
          Back to Login
        </Link>
      </div>
    </div>
  );
};

export default ForgotPassword; 