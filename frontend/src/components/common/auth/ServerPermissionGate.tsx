import React, { useEffect, useState } from 'react';
import { useAuthorization } from '../../../hooks/useAuthorization';

interface ServerPermissionGateProps {
  resource: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loading?: React.ReactNode;
}

/**
 * Component that uses server-side permission checks to conditionally render content
 * 
 * @param resource - The resource or action to check permissions for
 * @param children - Content to show if permission is granted
 * @param fallback - Optional content to show if permission is denied
 * @param loading - Optional content to show while checking permissions
 */
export const ServerPermissionGate: React.FC<ServerPermissionGateProps> = ({
  resource,
  children,
  fallback = null,
  loading = <div>Checking permissions...</div>
}) => {
  const { checkPermission } = useAuthorization();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  useEffect(() => {
    let isMounted = true;
    
    const checkAccess = async () => {
      try {
        const allowed = await checkPermission(resource);
        if (isMounted) {
          setHasPermission(allowed);
        }
      } catch (error) {
        console.error('Error checking permission:', error);
        if (isMounted) {
          setHasPermission(false);
        }
      }
    };
    
    checkAccess();
    
    return () => {
      isMounted = false;
    };
  }, [resource, checkPermission]);
  
  // While loading, show loading content
  if (hasPermission === null) {
    return <>{loading}</>;
  }
  
  // Once loaded, show appropriate content based on permission
  return hasPermission ? <>{children}</> : <>{fallback}</>;
};

export default ServerPermissionGate; 