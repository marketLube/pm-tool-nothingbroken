import { format, startOfDay } from 'date-fns';

// India timezone utility functions (IST - UTC+5:30)

/**
 * Get current date in India timezone (IST)
 * @returns YYYY-MM-DD format string
 */
export const getIndiaDate = (): string => {
  const now = new Date();
  // Convert to India timezone (UTC+5:30)
  const indiaTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  return format(indiaTime, 'yyyy-MM-dd');
};

/**
 * Get current time in India timezone (IST)
 * @returns HH:mm format string
 */
export const getIndiaTime = (): string => {
  const now = new Date();
  // Convert to India timezone (UTC+5:30)
  const indiaTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  return format(indiaTime, 'HH:mm');
};

/**
 * Get current date and time in India timezone (IST)
 * @returns Date object in India timezone
 */
export const getIndiaDateTime = (): Date => {
  const now = new Date();
  // Convert to India timezone (UTC+5:30)
  return new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
};

/**
 * Get start of day for today in India timezone for validation
 * @returns YYYY-MM-DD format string
 */
export const getIndiaTodayForValidation = (): string => {
  const indiaTime = getIndiaDateTime();
  return format(startOfDay(indiaTime), 'yyyy-MM-dd');
};

/**
 * Get formatted date range using India timezone
 * @param days Number of days to subtract from today
 * @returns Object with startDate and endDate in YYYY-MM-DD format
 */
export const getIndiaDateRange = (days: number): { startDate: string; endDate: string } => {
  const today = getIndiaDateTime();
  const startDate = new Date(today.getTime() - (days * 24 * 60 * 60 * 1000));
  
  return {
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(today, 'yyyy-MM-dd')
  };
};

/**
 * Get formatted month range using India timezone
 * @returns Object with startDate and endDate in YYYY-MM-DD format
 */
export const getIndiaMonthRange = (): { startDate: string; endDate: string } => {
  const today = getIndiaDateTime();
  const year = today.getFullYear();
  const month = today.getMonth();
  
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);
  
  return {
    startDate: format(startOfMonth, 'yyyy-MM-dd'),
    endDate: format(endOfMonth, 'yyyy-MM-dd')
  };
}; 