/**
 * Validates a custom date range
 */
export function validateCustomDate(startDate: string, endDate: string): { success: boolean; error?: string } {
  try {
    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Check if dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { success: false, error: 'Invalid date format' };
    }
    
    // Check if start date is before end date
    if (start > end) {
      return { success: false, error: 'Start date must be before end date' };
    }
    
    // Check if date range is too large (e.g., more than 1 year)
    const oneYear = 365 * 24 * 60 * 60 * 1000; // milliseconds in a year
    if (end.getTime() - start.getTime() > oneYear) {
      return { success: false, error: 'Date range cannot exceed 1 year' };
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Error validating dates' };
  }
} 