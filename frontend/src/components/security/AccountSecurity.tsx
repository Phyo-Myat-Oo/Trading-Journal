import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import userService from '../../services/userService';
import TwoFactorSetup from './TwoFactorSetup';

interface AccountSecurityProps {
  userId?: string;
}

interface SecurityStatus {
  twoFactorEnabled: boolean;
  lastPasswordChange?: Date;
  lastLogin?: Date;
}

const AccountSecurity: React.FC<AccountSecurityProps> = ({ userId }) => {
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSetup2FA, setShowSetup2FA] = useState(false);
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    const fetchSecurityStatus = async () => {
      setIsLoading(true);
      try {
        const status = await userService.getSecurityStatus();
        setSecurityStatus(status);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load security settings';
        setError(errorMessage);
        console.error('Error fetching security status:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSecurityStatus();
  }, []);
  
  const handleToggle2FA = () => {
    if (securityStatus?.twoFactorEnabled) {
      setShowDisable2FA(true);
    } else {
      setShowSetup2FA(true);
    }
  };
  
  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      setError('Password is required to disable two-factor authentication');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      await userService.disableTwoFactor(password);
      
      // Update security status
      setSecurityStatus(prev => prev ? { ...prev, twoFactorEnabled: false } : null);
      setShowDisable2FA(false);
      setPassword('');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disable two-factor authentication';
      setError(errorMessage);
      console.error('Error disabling 2FA:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSetupComplete = async () => {
    try {
      // Refresh security status
      const status = await userService.getSecurityStatus();
      setSecurityStatus(status);
      setShowSetup2FA(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh security status';
      setError(errorMessage);
      console.error('Error refreshing security status:', err);
    }
  };
  
  if (isLoading) {
    return (
      <div className="text-center py-6">
        <p>Loading security settings...</p>
      </div>
    );
  }
  
  if (showSetup2FA) {
    return (
      <TwoFactorSetup 
        onSetupComplete={handleSetupComplete} 
        onCancel={() => setShowSetup2FA(false)} 
      />
    );
  }
  
  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h2 className="text-lg leading-6 font-medium text-gray-900">
          Account Security
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Manage your account security settings
        </p>
      </div>
      <div className="border-t border-gray-200">
        <dl>
          {/* Two-Factor Authentication */}
          <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">
              Two-Factor Authentication
            </dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    securityStatus?.twoFactorEnabled 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {securityStatus?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <p className="mt-1 text-xs text-gray-500">
                    {securityStatus?.twoFactorEnabled 
                      ? 'Your account is protected with two-factor authentication'
                      : 'Enable two-factor authentication for additional security'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggle2FA}
                  className={`inline-flex items-center px-3 py-1.5 border ${
                    securityStatus?.twoFactorEnabled 
                      ? 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100'
                      : 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
                  } rounded-md text-sm leading-4 font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                >
                  {securityStatus?.twoFactorEnabled ? 'Disable' : 'Enable'}
                </button>
              </div>
              
              {/* Disable 2FA Dialog */}
              {showDisable2FA && (
                <div className="mt-4 p-4 border border-gray-200 rounded-md bg-white">
                  <h3 className="text-md font-medium text-gray-900 mb-3">
                    Disable Two-Factor Authentication
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    For security reasons, please enter your password to disable two-factor authentication.
                  </p>
                  
                  <form onSubmit={handleDisable2FA}>
                    <div className="mb-4">
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                        Password
                      </label>
                      <div className="mt-1">
                        <input
                          id="password"
                          name="password"
                          type="password"
                          autoComplete="current-password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>
                    
                    {error && (
                      <div className="text-sm text-red-600 mb-4">{error}</div>
                    )}
                    
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDisable2FA(false);
                          setPassword('');
                          setError('');
                        }}
                        className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || !password}
                        className={`px-3 py-2 text-sm font-medium text-white rounded-md ${
                          isSubmitting || !password
                            ? 'bg-red-300'
                            : 'bg-red-600 hover:bg-red-700'
                        }`}
                      >
                        {isSubmitting ? 'Processing...' : 'Disable 2FA'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </dd>
          </div>
          
          {/* Password Security */}
          <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">
              Password Security
            </dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">
                    {securityStatus?.lastPasswordChange 
                      ? `Last changed: ${new Date(securityStatus.lastPasswordChange).toLocaleDateString()}`
                      : 'No password change history found'}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    It's recommended to change your password regularly
                  </p>
                </div>
                <Link
                  to="/change-password"
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-md text-sm leading-4 font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Change Password
                </Link>
              </div>
            </dd>
          </div>
          
          {/* Recent Activity */}
          <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">
              Recent Activity
            </dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              <div>
                <p className="text-sm">
                  {securityStatus?.lastLogin 
                    ? `Last login: ${new Date(securityStatus.lastLogin).toLocaleString()}`
                    : 'No recent login activity found'}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  <Link to="/activity-log" className="text-blue-600 hover:text-blue-500">
                    View full account activity log
                  </Link>
                </p>
              </div>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
};

export default AccountSecurity; 