import crypto from 'crypto';

/**
 * Generates a set of backup codes for 2FA
 * @returns Array of backup codes
 */
export const generateBackupCodes = (): string[] => {
  const codes: string[] = [];
  const codeLength = 8;
  const numCodes = 10;

  for (let i = 0; i < numCodes; i++) {
    // Generate a random code using crypto
    const code = crypto.randomBytes(codeLength)
      .toString('base64')
      .toUpperCase()
      .replace(/=/g, '')
      .slice(0, codeLength);

    codes.push(code);
  }

  return codes;
}; 