import { z } from 'zod';
import { Role, TeamType } from '../types';
import { validatePasswordSecurity } from './passwordService';

// Input sanitization
export const sanitizeString = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '&#x27;') // Escape quotes
    .replace(/&/g, '&amp;') // Escape ampersands
    .slice(0, 1000); // Limit length
};

export const sanitizeEmail = (email: string): string => {
  return sanitizeString(email).toLowerCase();
};

// Validation schemas using Zod
export const userSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  
  email: z.string()
    .email('Must be a valid email address')
    .max(255, 'Email must not exceed 255 characters')
    .transform(sanitizeEmail),
  
  role: z.enum(['admin', 'manager', 'employee'] as const),
  
  team: z.enum(['creative', 'web'] as const),
  
  isActive: z.boolean().optional().default(true),
  
  joinDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine((date) => {
      const parsedDate = new Date(date);
      const now = new Date();
      const oneYearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      
      return parsedDate >= oneYearAgo && parsedDate <= oneYearFromNow;
    }, 'Join date must be within reasonable range'),
  
  allowedStatuses: z.array(z.string().uuid()).optional()
});

export const passwordSchema = z.string()
  .min(12, 'Password must be at least 12 characters')
  .refine((password) => {
    const validation = validatePasswordSecurity(password);
    return validation.isValid;
  }, 'Password does not meet security requirements');

export const createUserSchema = userSchema.extend({
  password: passwordSchema
});

export const updateUserSchema = userSchema.partial();

// Task validation
export const taskSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must not exceed 200 characters')
    .transform(sanitizeString),
  
  description: z.string()
    .max(2000, 'Description must not exceed 2000 characters')
    .transform(sanitizeString)
    .optional(),
  
  dueDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine((date) => {
      const parsedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return parsedDate >= today;
    }, 'Due date cannot be in the past'),
  
  assigneeId: z.string().uuid('Invalid assignee ID'),
  clientId: z.string().uuid('Invalid client ID'),
  statusId: z.string().uuid('Invalid status ID'),
  estimatedHours: z.number().min(0.5).max(100).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium')
});

// Client validation
export const clientSchema = z.object({
  name: z.string()
    .min(2, 'Client name must be at least 2 characters')
    .max(100, 'Client name must not exceed 100 characters')
    .transform(sanitizeString),
  
  email: z.string()
    .email('Must be a valid email address')
    .max(255, 'Email must not exceed 255 characters')
    .transform(sanitizeEmail)
    .optional(),
  
  phone: z.string()
    .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number format')
    .optional(),
  
  company: z.string()
    .max(100, 'Company name must not exceed 100 characters')
    .transform(sanitizeString)
    .optional(),
  
  isActive: z.boolean().optional().default(true)
});

// Report validation
export const reportSchema = z.object({
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine((date) => {
      const parsedDate = new Date(date);
      const today = new Date();
      const thirtyDaysAgo = new Date(today.setDate(today.getDate() - 30));
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      return parsedDate >= thirtyDaysAgo && parsedDate <= tomorrow;
    }, 'Report date must be within last 30 days or today'),
  
  tasks: z.array(z.object({
    taskId: z.string().uuid('Invalid task ID'),
    hours: z.number().min(0.25).max(24, 'Hours must be between 0.25 and 24'),
    notes: z.string()
      .max(500, 'Notes must not exceed 500 characters')
      .transform(sanitizeString)
      .optional()
  })).min(1, 'At least one task is required'),
  
  totalHours: z.number().min(0).max(24)
});

// Database query validation
export const searchFiltersSchema = z.object({
  searchQuery: z.string().max(100).transform(sanitizeString).optional(),
  team: z.enum(['all', 'creative', 'web']).optional(),
  role: z.enum(['all', 'admin', 'manager', 'employee']).optional(),
  status: z.string().optional(),
  dateStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.number().min(1).max(1000).optional().default(100),
  offset: z.number().min(0).optional().default(0)
});

// Enhanced validation functions
export const validateUserData = (data: any) => {
  try {
    return {
      success: true,
      data: userSchema.parse(data),
      errors: []
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      };
    }
    throw error;
  }
};

export const validateCreateUser = (data: any) => {
  try {
    return {
      success: true,
      data: createUserSchema.parse(data),
      errors: []
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      };
    }
    throw error;
  }
};

export const validateUpdateUser = (data: any) => {
  try {
    return {
      success: true,
      data: updateUserSchema.parse(data),
      errors: []
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      };
    }
    throw error;
  }
};

export const validateTaskData = (data: any) => {
  try {
    return {
      success: true,
      data: taskSchema.parse(data),
      errors: []
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      };
    }
    throw error;
  }
};

export const validateSearchFilters = (data: any) => {
  try {
    return {
      success: true,
      data: searchFiltersSchema.parse(data),
      errors: []
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      };
    }
    throw error;
  }
};

// SQL injection prevention
export const sanitizeForDatabase = (value: any): string => {
  if (typeof value !== 'string') {
    return String(value);
  }
  
  // Remove or escape dangerous SQL characters
  return value
    .replace(/'/g, "''") // Escape single quotes
    .replace(/;/g, '') // Remove semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove block comment start
    .replace(/\*\//g, '') // Remove block comment end
    .replace(/xp_/gi, '') // Remove SQL Server extended procedures
    .replace(/sp_/gi, '') // Remove SQL Server stored procedures
    .slice(0, 1000); // Limit length
};

// Business rule validations
export const validateBusinessRules = {
  userCreation: (userData: any, existingUsers: any[]) => {
    const errors: string[] = [];
    
    // Check for duplicate email
    if (existingUsers.some(user => user.email.toLowerCase() === userData.email.toLowerCase())) {
      errors.push('Email address already exists');
    }
    
    // Admin role restrictions
    if (userData.role === 'admin') {
      const adminCount = existingUsers.filter(user => user.role === 'admin').length;
      if (adminCount >= 5) {
        errors.push('Maximum number of administrators reached');
      }
    }
    
    // Team assignment rules
    if (userData.role === 'admin' && userData.team) {
      // Admins can be assigned to any team, but it's informational
    } else if (!userData.team) {
      errors.push('Team assignment is required for non-admin users');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },
  
  taskAssignment: (taskData: any, assignee: any, currentUser: any) => {
    const errors: string[] = [];
    
    // Check if assignee is active
    if (!assignee.isActive) {
      errors.push('Cannot assign task to inactive user');
    }
    
    // Check team permissions for task assignment
    if (currentUser.role !== 'admin' && currentUser.team !== assignee.team) {
      errors.push('Cannot assign tasks to users from different teams');
    }
    
    // Check workload limits (example: max 20 active tasks per user)
    // This would require checking existing active tasks for the assignee
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}; 