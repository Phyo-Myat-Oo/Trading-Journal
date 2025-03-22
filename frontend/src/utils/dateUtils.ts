// Get start of day
export const getStartOfDay = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

// Get end of day
export const getEndOfDay = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
};

// Get start of week (Monday)
export const getStartOfWeek = (date: Date): Date => {
  const newDate = new Date(date);
  const day = newDate.getDay();
  const diff = newDate.getDate() - day + (day === 0 ? -6 : 1);
  newDate.setDate(diff);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

// Get end of week (Sunday)
export const getEndOfWeek = (date: Date): Date => {
  const newDate = new Date(date);
  const day = newDate.getDay();
  const diff = newDate.getDate() + (7 - day);
  newDate.setDate(diff);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
};

// Get start of month
export const getStartOfMonth = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setDate(1);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

// Get end of month
export const getEndOfMonth = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setMonth(newDate.getMonth() + 1);
  newDate.setDate(0);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
};

// Get start of year
export const getStartOfYear = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setMonth(0, 1);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

// Get end of year
export const getEndOfYear = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setMonth(11, 31);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
};

// Format date for display
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

// Format time for display
export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Convert date to slider value
export const dateToValue = (date: Date, start: Date, end: Date): number => {
  const total = end.getTime() - start.getTime();
  const current = date.getTime() - start.getTime();
  return (current / total) * 100;
};

// Convert slider value to date
export const valueToDate = (value: number, start: Date, end: Date): Date => {
  const total = end.getTime() - start.getTime();
  const offset = (value / 100) * total;
  return new Date(start.getTime() + offset);
}; 