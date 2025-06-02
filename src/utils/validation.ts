/**
 * Email validation function
 * Validates that a string is a proper email format
 * 
 * @param email The email string to validate
 * @returns True if the email is valid, false otherwise
 */
export const isValidEmail = (email: string): boolean => {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
};

/**
 * Validates if a date string is valid
 * @param dateString The date string to validate (YYYY-MM-DD format)
 * @returns True if the date is valid, false otherwise
 */
export const isValidDate = (dateString: string): boolean => {
  if (!dateString) return false;
  
  // Check if the date string is in YYYY-MM-DD format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;
  
  // Parse the date and check if it's valid
  const date = new Date(dateString + 'T00:00:00'); // Add time to avoid timezone issues
  return !isNaN(date.getTime()) && date.toISOString().split('T')[0] === dateString;
}; 