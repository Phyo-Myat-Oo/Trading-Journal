import React, { lazy, Suspense } from 'react';

// Lazy load the password strength bar component
const PasswordStrengthBar = lazy(() => import('react-password-strength-bar'));

interface LazyPasswordStrengthBarProps {
  password: string;
  minLength?: number;
  scoreWords?: string[];
  shortScoreWord?: string;
  className?: string;
  style?: React.CSSProperties;
}

const LazyPasswordStrengthBar: React.FC<LazyPasswordStrengthBarProps> = ({ 
  password, 
  minLength = 8, 
  scoreWords = ['Weak', 'Weak', 'Okay', 'Good', 'Strong'],
  shortScoreWord = 'Too short',
  className,
  style
}) => {
  // Only render when there's a password
  if (!password) {
    return null;
  }

  return (
    <Suspense fallback={<div className="h-4 w-full bg-gray-100 my-2"></div>}>
      <PasswordStrengthBar
        password={password}
        minLength={minLength}
        scoreWords={scoreWords}
        shortScoreWord={shortScoreWord}
        className={className}
        style={style}
      />
    </Suspense>
  );
};

export default LazyPasswordStrengthBar; 