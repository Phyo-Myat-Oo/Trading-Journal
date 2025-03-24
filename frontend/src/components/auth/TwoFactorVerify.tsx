import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthResponse } from '../../services/authService';

interface TwoFactorVerifyProps {
  userId: string;
  onVerificationSuccess: (response: AuthResponse) => void;
  onCancel: () => void;
}

const TwoFactorVerify: React.FC<TwoFactorVerifyProps> = ({
  userId,
  onVerificationSuccess,
  onCancel
}) => {
  const { verifyTwoFactor, verifyWithBackupCode, error: authError } = useAuth();
  const [verificationCode, setVerificationCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  
  // Validate that we have a userId
  useEffect(() => {
    if (!userId) {
      setError('Missing user ID for verification. Please try logging in again.');
    }
  }, [userId]);
  
  // Sync errors from auth context
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);
  
  // Monitor verification attempts - if too many, suggest using backup code
  useEffect(() => {
    if (verificationAttempts >= 3 && !useBackupCode) {
      setError('Multiple verification attempts failed. Try using a backup code instead.');
    }
  }, [verificationAttempts, useBackupCode]);
  
  // Auto-focus the input when switching between code types
  useEffect(() => {
    const input = document.getElementById('verification-code');
    if (input) {
      input.focus();
    }
  }, [useBackupCode]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    
    // Apply specific formatting for backup codes vs regular codes
    if (useBackupCode) {
      // Allow only alphanumeric characters and format backup codes (removing hyphens on input)
      const cleaned = rawValue.replace(/[^a-zA-Z0-9]/g, '');
      
      // Format backup code as user types (XXXX-XXXX-XX)
      if (cleaned.length <= 10) {
        let formatted = cleaned;
        if (cleaned.length > 4) {
          formatted = `${cleaned.substring(0, 4)}-${cleaned.substring(4)}`;
        }
        if (cleaned.length > 8) {
          formatted = `${formatted.substring(0, 9)}-${formatted.substring(9)}`;
        }
        setVerificationCode(formatted);
      }
    } else {
      // For TOTP codes, only allow digits and limit to 6
      const cleaned = rawValue.replace(/\D/g, '');
      if (cleaned.length <= 6) {
        setVerificationCode(cleaned);
      }
    }
    
    if (error) setError('');
  };

  const toggleCodeType = () => {
    setUseBackupCode(!useBackupCode);
    setVerificationCode('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      setError('Missing user ID for verification. Please try logging in again.');
      return;
    }
    
    if (!verificationCode) {
      setError('Please enter a verification code');
      return;
    }
    
    // Validate input format based on code type
    if (!useBackupCode && !/^\d{6}$/.test(verificationCode)) {
      setError('Please enter a valid 6-digit code');
      return;
    }
    
    // For backup codes, remove formatting before submission
    const codeToSubmit = useBackupCode ? verificationCode.replace(/-/g, '') : verificationCode;
    
    setIsLoading(true);
    setError('');
    
    try {
      console.log(`Attempting to verify ${useBackupCode ? 'backup code' : 'verification code'}`);
      
      let response;
      
      if (useBackupCode) {
        response = await verifyWithBackupCode(userId, codeToSubmit);
      } else {
        response = await verifyTwoFactor(userId, codeToSubmit);
      }
      
      if (response.success === false) {
        setVerificationAttempts(prev => prev + 1);
        setError(response.message || 'Verification failed. Please try again.');
        return;
      }
      
      if (!response.user) {
        setVerificationAttempts(prev => prev + 1);
        setError('Verification succeeded but no user data was returned. Please try again.');
        return;
      }
      
      // Success
      onVerificationSuccess(response);
    } catch (err: unknown) {
      console.error('2FA verification error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Verification failed. Please try again.';
      setError(errorMessage);
      setVerificationAttempts(prev => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10">
      <h2 className="mb-6 text-xl font-bold text-gray-900">
        Two-Factor Authentication
      </h2>
      
      <form className="mb-0 space-y-6" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="verification-code" className="block text-sm font-medium text-gray-700">
            {useBackupCode ? 'Backup Code' : 'Verification Code'}
          </label>
          <div className="mt-1">
            <input
              id="verification-code"
              name="verificationCode"
              type="text"
              autoComplete={useBackupCode ? 'off' : 'one-time-code'}
              required
              value={verificationCode}
              onChange={handleCodeChange}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder={useBackupCode ? 'XXXX-XXXX-XX' : '6-digit code'}
              maxLength={useBackupCode ? 12 : 6}
              autoFocus
              disabled={isLoading}
            />
          </div>
          
          {!useBackupCode && (
            <p className="mt-2 text-sm text-gray-500">
              Enter the 6-digit code from your authenticator app
            </p>
          )}
          
          {useBackupCode && (
            <p className="mt-2 text-sm text-gray-500">
              Enter one of your backup codes (format: XXXX-XXXX-XX)
            </p>
          )}
        </div>

        {error && (
          <div className="text-sm text-red-600">{error}</div>
        )}

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={toggleCodeType}
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
            disabled={isLoading}
          >
            {useBackupCode 
              ? 'Use authenticator app instead' 
              : 'Use a backup code instead'}
          </button>
          
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-medium text-gray-600 hover:text-gray-500"
            disabled={isLoading}
          >
            Cancel
          </button>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              isLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
          >
            {isLoading ? 'Verifying...' : 'Verify'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TwoFactorVerify; 