import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SecuritySettings: React.FC = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to the settings page with security tab active
    navigate('/settings', { state: { activeTab: 'security' } });
  }, [navigate]);

  return null; // No need to render anything as we're redirecting
};

export default SecuritySettings; 