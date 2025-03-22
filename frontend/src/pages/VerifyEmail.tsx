import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';

const VerifyEmail = () => {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<{
    success: boolean;
    message: string;
  }>({
    success: false,
    message: 'Verifying your email...',
  });

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) return;
      
      setIsVerifying(true);
      
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/verify-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
          setVerificationStatus({
            success: true,
            message: data.message || 'Your email has been verified successfully!'
          });
          // Wait 3 seconds before redirecting to login
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        } else {
          setVerificationStatus({
            success: false,
            message: data.message || 'Email verification failed. The link may be invalid or expired.'
          });
        }
      } catch {
        setVerificationStatus({
          success: false,
          message: 'An error occurred during verification. Please try again later.'
        });
      } finally {
        setIsVerifying(false);
      }
    };
    
    verifyEmail();
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Email Verification
          </h2>
        </div>
        
        <div className={`border-l-4 p-4 my-4 ${
          isVerifying 
            ? 'bg-blue-50 border-blue-400' 
            : verificationStatus.success 
              ? 'bg-green-50 border-green-400' 
              : 'bg-red-50 border-red-400'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {isVerifying ? (
                <svg className="h-5 w-5 text-blue-400 animate-spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : verificationStatus.success ? (
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm ${
                isVerifying 
                  ? 'text-blue-700' 
                  : verificationStatus.success 
                    ? 'text-green-700' 
                    : 'text-red-700'
              }`}>
                {verificationStatus.message}
              </p>
              {verificationStatus.success && (
                <p className="text-sm text-green-700 mt-2">
                  You will be redirected to the login page shortly.
                </p>
              )}
            </div>
          </div>
          
          {!isVerifying && (
            <div className="mt-4 text-center">
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                {verificationStatus.success ? 'Go to login' : 'Back to login'}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail; 