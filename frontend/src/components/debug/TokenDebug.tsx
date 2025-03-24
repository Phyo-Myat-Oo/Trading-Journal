import React, { useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { JwtPayload } from 'jwt-decode';

interface TokenInfo {
  hasToken: boolean;
  tokenPreview: string | null;
  decoded: JwtPayload | null;
  user: Record<string, unknown> | null;
  expired: boolean | null;
  expiresIn: string | null;
  error?: string;
}

export const TokenDebug = () => {
  const [tokenInfo, setTokenInfo] = useState<TokenInfo>({
    hasToken: false,
    tokenPreview: null,
    decoded: null,
    user: null,
    expired: null,
    expiresIn: null
  });
  
  useEffect(() => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    try {
      // Decode token if it exists
      let decodedToken = null;
      if (token) {
        decodedToken = jwtDecode(token);
      }
      
      // Parse user if it exists
      let parsedUser = null;
      if (user) {
        parsedUser = JSON.parse(user);
      }
      
      setTokenInfo({
        hasToken: !!token,
        tokenPreview: token ? `${token.substring(0, 10)}...` : null,
        decoded: decodedToken,
        user: parsedUser,
        expired: decodedToken?.exp ? (decodedToken.exp * 1000 < Date.now()) : null,
        expiresIn: decodedToken?.exp ? new Date(decodedToken.exp * 1000).toLocaleString() : null
      });
    } catch (error) {
      setTokenInfo({
        hasToken: false,
        tokenPreview: null,
        decoded: null,
        user: null,
        expired: null,
        expiresIn: null,
        error: `Error parsing token: ${error}`
      });
    }
  }, []);
  
  return (
    <div style={{ padding: 20 }}>
      <h1>Token Debug</h1>
      <pre>{JSON.stringify(tokenInfo, null, 2)}</pre>
    </div>
  );
}; 