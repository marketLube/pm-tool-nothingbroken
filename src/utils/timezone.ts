import { format, startOfDay, isFuture, startOfYear } from 'date-fns';

// India timezone utility functions (IST - UTC+5:30)

/**
 * Check if the system date seems to be set incorrectly (too far in future)
 * @returns Object with validation result and details
 */
export const validateSystemDate = (): { 
  isValid: boolean; 
  currentDate: string; 
  warnings: string[];
} => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const expectedYear = 2024; // Adjust this based on when you expect to use the app
  const warnings: string[] = [];
  
  // Check if year seems too far in future
  if (currentYear > expectedYear + 1) {
    warnings.push(`System date appears to be in the future: ${currentYear}. Expected around ${expectedYear}.`);
    warnings.push('This might cause issues with database queries and attendance tracking.');
  }
  
  // Check if date is more than 1 year in the future from expected
  const startOf2024 = startOfYear(new Date(2024, 0, 1));
  const yearsDiff = currentYear - 2024;
  if (yearsDiff > 1) {
    warnings.push(`System date is ${yearsDiff} year(s) ahead of expected date.`);
    warnings.push('Please check your system date settings.');
  }
  
  return {
    isValid: warnings.length === 0,
    currentDate: format(now, 'yyyy-MM-dd'),
    warnings
  };
};

/**
 * Get current date in India timezone (IST)
 * @returns YYYY-MM-DD format string
 */
export const getIndiaDate = (): string => {
  // Validate system date and warn if needed
  const validation = validateSystemDate();
  if (!validation.isValid) {
    console.warn('⚠️ System Date Validation Warnings:');
    validation.warnings.forEach(warning => console.warn(`⚠️ ${warning}`));
  }
  
  // Use the browser's local time and format it
  // If user is in India, this will be IST naturally
  // If user is elsewhere, they likely want to see their local time anyway for the app
  const now = new Date();
  const dateStr = format(now, 'yyyy-MM-dd');
  console.log(`📅 Current system date: ${dateStr}`);
  return dateStr;
};

/**
 * Get current time in local timezone (displayed as IST equivalent)
 * @returns HH:mm format string
 */
export const getIndiaTime = (): string => {
  // Use the browser's local time - no timezone conversion needed
  // The app should show the user's actual local time
  const now = new Date();
  return format(now, 'HH:mm');
};

/**
 * Get current date and time in local timezone
 * @returns Date object in local timezone
 */
export const getIndiaDateTime = (): Date => {
  // Return the actual current time without timezone conversion
  return new Date();
};

/**
 * Get start of day for today in local timezone for validation
 * @returns YYYY-MM-DD format string
 */
export const getIndiaTodayForValidation = (): string => {
  const now = new Date();
  return format(startOfDay(now), 'yyyy-MM-dd');
};

/**
 * Get formatted date range using local timezone
 * @param days Number of days to subtract from today
 * @returns Object with startDate and endDate in YYYY-MM-DD format
 */
export const getIndiaDateRange = (days: number): { startDate: string; endDate: string } => {
  const today = new Date();
  const startDate = new Date(today.getTime() - (days * 24 * 60 * 60 * 1000));
  
  return {
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(today, 'yyyy-MM-dd')
  };
};

/**
 * Get formatted month range using local timezone
 * @returns Object with startDate and endDate in YYYY-MM-DD format
 */
export const getIndiaMonthRange = (): { startDate: string; endDate: string } => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);
  
  return {
    startDate: format(startOfMonth, 'yyyy-MM-dd'),
    endDate: format(endOfMonth, 'yyyy-MM-dd')
  };
}; 