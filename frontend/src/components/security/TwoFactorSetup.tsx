import React, { useState, useEffect } from 'react';
import userService from '../../services/userService';
import { useCsrf } from '../../hooks/useCsrf';

interface TwoFactorSetupProps {
  onSetupComplete: () => void;
  onCancel: () => void;
}

const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({ onSetupComplete, onCancel }) => {
  const [qrCode, setQrCode] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { csrfToken, fetchToken, isLoading: isCsrfLoading } = useCsrf();
  const [secret, setSecret] = useState<string>('');

  useEffect(() => {
    const setupTwoFactor = async () => {
      try {
        setIsLoading(true);
        setError('');
        
        // Ensure we have a CSRF token
        if (!csrfToken) {
          await fetchToken();
        }

        const response = await userService.setupTwoFactor();
        setQrCode(response.data.qrCode);
        setSecret(response.data.secret);
      } catch (err) {
        setError('Failed to setup 2FA. Please try again.');
        console.error('2FA setup error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    setupTwoFactor();
  }, [csrfToken, fetchToken]);

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate code format
    if (!/^\d{6}$/.test(verificationCode)) {
      setError('Please enter a valid 6-digit code');
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      
      console.log(`Attempting to verify code: ${verificationCode}`);
      
      const response = await userService.verifyTwoFactorSetup(verificationCode);
      console.log('2FA verification successful:', response);
      
      // Show backup codes if provided
      if (response.backupCodes && response.backupCodes.length > 0) {
        // We could show backup codes here or pass them to a different component
        console.log('Store these backup codes safely:', response.backupCodes);
      }
      
      // Show success message
      onSetupComplete();
    } catch (err: unknown) {
      // Extract the error message
      let errorMessage = 'Invalid verification code. Please try again.';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      console.error('2FA verification error:', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || isCsrfLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Setup Two-Factor Authentication</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="mb-6">
        <p className="mb-4">
          1. Install an authenticator app like Google Authenticator or Authy on your phone
        </p>
        
        {qrCode ? (
          <>
            <p className="mb-2">
              2. Scan this QR code with your authenticator app:
            </p>
            <div className="mb-4 p-4 bg-gray-100 rounded-lg flex justify-center">
              <img 
                src={qrCode} 
                alt="QR Code for 2FA setup" 
                className="w-48 h-48"
              />
            </div>
            
            {secret && (
              <div className="mb-4">
                <p className="mb-2 text-sm">If you can't scan the QR code, enter this code manually:</p>
                <div className="p-2 bg-gray-100 border border-gray-300 rounded font-mono text-sm">
                  {secret}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex justify-center p-4">
            <div className="w-48 h-48 bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
              <span className="text-gray-500">Loading QR code...</span>
            </div>
          </div>
        )}
        <p className="mb-4">
          3. Enter the 6-digit code shown in your authenticator app:
        </p>
      </div>

      <form onSubmit={handleVerification} className="space-y-4">
        <div>
          <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700">
            Verification Code
          </label>
          <input
            type="text"
            id="verificationCode"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Enter 6-digit code"
            maxLength={6}
            pattern="[0-9]{6}"
            required
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            Verify and Enable
          </button>
        </div>
      </form>
    </div>
  );
};

export default TwoFactorSetup; 