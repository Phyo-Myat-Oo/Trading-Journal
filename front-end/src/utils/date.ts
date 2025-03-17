/**
 * Formats a date string into the specified format
 * @param date - Date string in ISO format (YYYY-MM-DD)
 * @param format - Target format (e.g., 'dd/MM/yyyy')
 */
export function formatDate(date: string, format: string = 'dd/MM/yyyy'): string {
  const [year, month, day] = date.split('-').map(Number);
  const d = new Date(year, month - 1, day);

  if (isNaN(d.getTime())) {
    throw new Error('Invalid date');
  }

  return format
    .replace('dd', day.toString().padStart(2, '0'))
    .replace('MM', month.toString().padStart(2, '0'))
    .replace('yyyy', year.toString());
}

/**
 * Parses a date string from the specified format to a Date object
 * @param dateStr - Date string in the specified format
 * @param format - Source format (e.g., 'dd/MM/yyyy')
 */
export function parseDate(dateStr: string, format: string = 'dd/MM/yyyy'): Date | null {
  const dayIndex = format.indexOf('dd');
  const monthIndex = format.indexOf('MM');
  const yearIndex = format.indexOf('yyyy');

  if (dayIndex === -1 || monthIndex === -1 || yearIndex === -1) {
    throw new Error('Invalid format');
  }

  const day = parseInt(dateStr.slice(dayIndex, dayIndex + 2));
  const month = parseInt(dateStr.slice(monthIndex, monthIndex + 2));
  const year = parseInt(dateStr.slice(yearIndex, yearIndex + 4));

  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    return null;
  }

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

/**
 * Checks if a date string is valid
 * @param dateStr - Date string to validate
 * @param format - Format of the date string
 */
export function isValidDate(dateStr: string, format: string = 'dd/MM/yyyy'): boolean {
  try {
    return parseDate(dateStr, format) !== null;
  } catch {
    return false;
  }
}

/**
 * Gets the current date in ISO format (YYYY-MM-DD)
 */
export function getCurrentDate(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    (now.getMonth() + 1).toString().padStart(2, '0'),
    now.getDate().toString().padStart(2, '0')
  ].join('-');
}

/**
 * Adds days to a date
 * @param date - Date string in ISO format
 * @param days - Number of days to add
 */
export function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * Subtracts days from a date
 * @param date - Date string in ISO format
 * @param days - Number of days to subtract
 */
export function subtractDays(date: string, days: number): string {
  return addDays(date, -days);
}

/**
 * Compares two dates
 * @param date1 - First date in ISO format
 * @param date2 - Second date in ISO format
 * @returns -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
export function compareDates(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1 < d2 ? -1 : d1 > d2 ? 1 : 0;
} 