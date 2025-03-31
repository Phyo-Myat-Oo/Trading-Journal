/**
 * Utility functions for handling name parsing and formatting
 */

/**
 * Splits a display name into first name and last name components
 * 
 * @param displayName - The full display name to split
 * @returns An object containing firstName and lastName
 */
export const splitDisplayName = (displayName: string | undefined): { firstName: string, lastName: string } => {
  // Handle undefined or empty display name
  if (!displayName || displayName.trim() === '') {
    return {
      firstName: 'User',
      lastName: 'Unknown'
    };
  }
  
  // Trim and split the display name by spaces
  const nameParts = displayName.trim().split(/\s+/);
  
  // If only one word, use it as firstName and provide a generic lastName
  if (nameParts.length === 1) {
    return {
      firstName: nameParts[0],
      lastName: 'FromGoogle'
    };
  }
  
  // For names with multiple parts, use first part as firstName and the rest as lastName
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');
  
  return { firstName, lastName };
}; 