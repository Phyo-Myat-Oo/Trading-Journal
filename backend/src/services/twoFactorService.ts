import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';

/**
 * Generate a new TOTP secret
 */
export const generateSecret = (email: string, issuer: string = 'Trading Journal') => {
  const secretObj = speakeasy.generateSecret({
    length: 20,
    name: `${issuer}:${email}`,
    issuer
  });
  
  return {
    secret: secretObj.base32,
    otpAuthUrl: secretObj.otpauth_url || ''
  };
};

/**
 * Generate a QR code URL for the given otpAuthUrl
 */
export const generateQRCode = async (otpAuthUrl: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(otpAuthUrl);
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Verify a TOTP token against a secret
 */
export const verifyToken = (token: string, secret: string): boolean => {
  try {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1 // Allow 1 step skew (30 sec before and after)
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    return false;
  }
};

/**
 * Generate backup codes for 2FA recovery
 * @param count Number of backup codes to generate
 * @returns Array of backup codes
 */
export const generateBackupCodes = (count: number = 10): string[] => {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    // Generate a 10-character backup code
    const code = crypto.randomBytes(5).toString('hex').toUpperCase();
    // Format as XXXX-XXXX-XX
    codes.push(code.slice(0, 4) + '-' + code.slice(4, 8) + '-' + code.slice(8));
  }
  
  return codes;
};

/**
 * Hash backup codes for secure storage
 */
export const hashBackupCodes = (codes: string[]): string[] => {
  return codes.map(code => {
    const hash = crypto.createHash('sha256');
    hash.update(code);
    return hash.digest('hex');
  });
};

/**
 * Verify a backup code against stored hashed codes
 */
export const verifyBackupCode = (
  providedCode: string,
  hashedCodes: string[]
): { isValid: boolean; remainingCodes: string[] } => {
  // Remove any spaces or dashes the user might have entered
  const normalizedCode = providedCode.replace(/[\s-]/g, '').toUpperCase();
  
  // Hash the provided code
  const hash = crypto.createHash('sha256');
  hash.update(normalizedCode);
  const hashedProvidedCode = hash.digest('hex');
  
  // Check if the code exists in our hashed codes
  const codeIndex = hashedCodes.indexOf(hashedProvidedCode);
  
  if (codeIndex === -1) {
    return { isValid: false, remainingCodes: hashedCodes };
  }
  
  // Remove the used code from the array
  const remainingCodes = [...hashedCodes];
  remainingCodes.splice(codeIndex, 1);
  
  return { isValid: true, remainingCodes };
}; 