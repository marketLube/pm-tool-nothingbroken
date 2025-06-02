import bcrypt from 'bcryptjs';

// Password strength validation
export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  score: number; // 0-100
}

export const validatePasswordStrength = (password: string): PasswordValidation => {
  const errors: string[] = [];
  let score = 0;
  
  // Length check
  if (password.length < 12) {
    errors.push('Must be at least 12 characters long');
  } else {
    score += 25;
  }
  
  // Uppercase check
  if (!/[A-Z]/.test(password)) {
    errors.push('Must contain at least one uppercase letter');
  } else {
    score += 20;
  }
  
  // Lowercase check
  if (!/[a-z]/.test(password)) {
    errors.push('Must contain at least one lowercase letter');
  } else {
    score += 20;
  }
  
  // Number check
  if (!/[0-9]/.test(password)) {
    errors.push('Must contain at least one number');
  } else {
    score += 15;
  }
  
  // Special character check
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Must contain at least one special character');
  } else {
    score += 20;
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    score: Math.min(score, 100)
  };
};

// Secure password hashing
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12; // Industry standard for high security
  return await bcrypt.hash(password, saltRounds);
};

// Password verification
export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

// Generate secure random password
export const generateSecurePassword = (length: number = 12): string => {
  const uppercase = 'ABCDEFGHIJKLMNPQRSTUVWXYZ'; // Exclude O to avoid confusion with 0
  const lowercase = 'abcdefghijklmnpqrstuvwxyz'; // Exclude o to avoid confusion with 0
  const numbers = '23456789'; // Exclude 0, 1 to avoid confusion with O, I, l
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = uppercase + lowercase + numbers + special;
  
  let password = '';
  
  // Ensure at least one character from each category
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password to avoid predictable patterns
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

// Password reset token generation (for future use)
export const generateResetToken = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
};

// Check for common weak passwords
const commonWeakPasswords = [
  'password', '123456', 'admin', 'user', 'test', 'guest', 'welcome',
  'password123', 'admin123', 'qwerty', 'letmein', 'monkey', 'dragon'
];

export const isCommonWeakPassword = (password: string): boolean => {
  const lowerPassword = password.toLowerCase();
  return commonWeakPasswords.some(weak => 
    lowerPassword.includes(weak) || weak.includes(lowerPassword)
  );
};

// Enhanced password validation with all checks
export const validatePasswordSecurity = (password: string): PasswordValidation => {
  const basicValidation = validatePasswordStrength(password);
  
  if (isCommonWeakPassword(password)) {
    basicValidation.errors.push('Cannot use common weak passwords');
    basicValidation.isValid = false;
    basicValidation.score = Math.max(0, basicValidation.score - 30);
  }
  
  return basicValidation;
}; 