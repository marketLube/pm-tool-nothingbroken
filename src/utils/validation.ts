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
  // Ensures the string is in YYYY-MM-DD format and is a valid date
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  const timestamp = date.getTime();
  
  if (isNaN(timestamp)) return false;
  
  return date.toISOString().slice(0, 10) === dateString;
}; 