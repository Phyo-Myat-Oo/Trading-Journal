/**
 * Email validation function
 * @param email Email address to validate
 * @returns Boolean indicating if the email is valid
 */
export const isEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * Validate minimum length for strings
 * @param value String to validate
 * @param minLength Minimum length required
 * @returns Boolean indicating if the string meets minimum length
 */
export const minLength = (value: string, minLength: number): boolean => {
  return value.length >= minLength;
}; 