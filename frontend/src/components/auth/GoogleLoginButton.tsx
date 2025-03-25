import React from 'react';
import { FcGoogle } from 'react-icons/fc';

interface GoogleLoginButtonProps {
  className?: string;
}

const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({ 
  className = ''
}) => {
  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  
  const handleLogin = () => {
    // Redirect to Google OAuth endpoint on our backend
    window.location.href = `${backendUrl}/api/auth/google`;
  };
  
  return (
    <button
      type="button"
      onClick={handleLogin}
      className={`flex items-center justify-center w-full py-2 px-4 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors ${className}`}
    >
      <FcGoogle className="mr-2 text-xl" />
      <span>Sign in with Google</span>
    </button>
  );
};

export default GoogleLoginButton; 