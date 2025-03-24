import { jwtDecode } from 'jwt-decode';

// Define types
interface JwtPayload {
  id: string;
  exp: number;
  iat: number;
  email?: string;
  role?: string;
}

interface TokenFingerprint {
  hash: string;
  expires: number;
  created: number;
}

/**
 * Create a hash from a string (for token fingerprinting)
 */
export const createHash = (data: string): string => {
  // Simple hash function for fingerprinting
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
};

/**
 * Get token expiration time in milliseconds
 */
export const getTokenExpiration = (token: string): number => {
  try {
    const decoded = jwtDecode<JwtPayload>(token);
    return decoded.exp * 1000; // Convert to milliseconds
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return Date.now(); // Default to current time if invalid
  }
};

/**
 * Get the remaining time for a token in milliseconds
 */
export const getTokenRemainingTime = (token: string): number => {
  try {
    const expiration = getTokenExpiration(token);
    return Math.max(0, expiration - Date.now());
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return 0;
  }
};

/**
 * Simple encryption for localStorage data
 * Note: This is not secure for highly sensitive data
 * but provides a basic level of obfuscation
 */
export const encryptData = (data: string): string => {
  // Simple encryption for localStorage (can be enhanced)
  return btoa(encodeURIComponent(data));
};

/**
 * Decrypt data from localStorage
 */
export const decryptData = (data: string): string => {
  try {
    return decodeURIComponent(atob(data));
  } catch (e) {
    console.error('Error decrypting data:', e);
    return '';
  }
};

/**
 * Create a token fingerprint for storage
 */
export const createTokenFingerprint = (token: string): TokenFingerprint => {
  return {
    hash: createHash(token),
    expires: getTokenExpiration(token),
    created: Date.now()
  };
};

/**
 * Check if a token fingerprint is still valid
 */
export const isTokenFingerprintValid = (
  fingerprint: TokenFingerprint, 
  currentToken?: string | null
): boolean => {
  // Check expiration
  if (fingerprint.expires < Date.now()) {
    return false;
  }
  
  // If we have current token, verify the hash
  if (currentToken) {
    return fingerprint.hash === createHash(currentToken);
  }
  
  // If no current token, just check expiration
  return true;
}; 