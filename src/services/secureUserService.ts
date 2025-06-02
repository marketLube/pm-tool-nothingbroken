import { supabase } from '../utils/supabase';
import { User, Role, TeamType } from '../types';
import { hashPassword, verifyPassword, generateSecurePassword } from './passwordService';
import { validateCreateUser, validateUpdateUser, validateBusinessRules } from './validationService';
import { userOperationQueue, passwordOperationQueue } from '../utils/asyncQueue';
import { measureDatabaseQuery } from './performanceService';

// Audit log interface
interface UserAuditLog {
  userId: string;
  action: 'USER_CREATED' | 'USER_UPDATED' | 'PASSWORD_CHANGED' | 'USER_DELETED' | 'LOGIN_ATTEMPT' | 'LOGIN_SUCCESS' | 'LOGIN_FAILED';
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  performedBy: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// Enhanced user creation data
interface SecureCreateUserData {
  name: string;
  email: string;
  role: Role;
  team: TeamType;
  isActive?: boolean;
  joinDate: string;
  allowedStatuses?: string[];
  password: string;
}

interface SecureUpdateUserData {
  name?: string;
  email?: string;
  role?: Role;
  team?: TeamType;
  isActive?: boolean;
  joinDate?: string;
  allowedStatuses?: string[];
}

class SecureUserService {
  
  // Create user with proper security measures
  async createUser(userData: SecureCreateUserData, performedBy: string): Promise<User> {
    return userOperationQueue.enqueue(async () => {
      return measureDatabaseQuery('create_user', async () => {
        // Validate input data
        const validation = validateCreateUser(userData);
        if (!validation.success) {
          throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
        }
        
        // Get existing users for business rule validation
        const { data: existingUsers, error: fetchError } = await supabase
          .from('users')
          .select('email, role')
          .eq('isActive', true);
        
        if (fetchError) {
          throw new Error(`Failed to fetch existing users: ${fetchError.message}`);
        }
        
        // Validate business rules
        const businessValidation = validateBusinessRules.userCreation(userData, existingUsers || []);
        if (!businessValidation.isValid) {
          throw new Error(`Business rule violation: ${businessValidation.errors.join(', ')}`);
        }
        
        // Hash password securely
        const hashedPassword = await hashPassword(userData.password);
        
        // Prepare user data without plaintext password
        const userToCreate = {
          ...validation.data,
          password_hash: hashedPassword,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Remove plaintext password from the object
        delete (userToCreate as any).password;
        
        // Create user in transaction
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert(userToCreate)
          .select()
          .single();
        
        if (createError) {
          throw new Error(`Failed to create user: ${createError.message}`);
        }
        
        // Log the creation
        await this.createAuditLog({
          userId: newUser.id,
          action: 'USER_CREATED',
          newValues: { ...userToCreate, password_hash: '[REDACTED]' },
          performedBy,
          timestamp: new Date().toISOString()
        });
        
        // Return user without password hash
        const { password_hash, ...userWithoutPassword } = newUser;
        return userWithoutPassword as User;
      });
    });
  }
  
  // Update user with proper validation
  async updateUser(userId: string, updateData: SecureUpdateUserData, performedBy: string): Promise<User> {
    return userOperationQueue.enqueue(async () => {
      return measureDatabaseQuery('update_user', async () => {
        // Validate input data
        const validation = validateUpdateUser(updateData);
        if (!validation.success) {
          throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
        }
        
        // Get current user data
        const { data: currentUser, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (fetchError || !currentUser) {
          throw new Error('User not found');
        }
        
        // Check if email is being changed and validate uniqueness
        if (updateData.email && updateData.email !== currentUser.email) {
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', updateData.email)
            .neq('id', userId)
            .single();
          
          if (existingUser) {
            throw new Error('Email address already exists');
          }
        }
        
        // Prepare update data
        const dataToUpdate = {
          ...validation.data,
          updated_at: new Date().toISOString()
        };
        
        // Update user
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update(dataToUpdate)
          .eq('id', userId)
          .select()
          .single();
        
        if (updateError) {
          throw new Error(`Failed to update user: ${updateError.message}`);
        }
        
        // Log the update
        await this.createAuditLog({
          userId,
          action: 'USER_UPDATED',
          oldValues: currentUser,
          newValues: dataToUpdate,
          performedBy,
          timestamp: new Date().toISOString()
        });
        
        // Return user without password hash
        const { password_hash, ...userWithoutPassword } = updatedUser;
        return userWithoutPassword as User;
      });
    });
  }
  
  // Change password with proper security
  async changePassword(userId: string, newPassword: string, performedBy: string): Promise<void> {
    return passwordOperationQueue.enqueue(async () => {
      return measureDatabaseQuery('change_password', async () => {
        // Hash new password
        const hashedPassword = await hashPassword(newPassword);
        
        // Update password
        const { error } = await supabase
          .from('users')
          .update({ 
            password_hash: hashedPassword,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
        
        if (error) {
          throw new Error(`Failed to update password: ${error.message}`);
        }
        
        // Log password change
        await this.createAuditLog({
          userId,
          action: 'PASSWORD_CHANGED',
          performedBy,
          timestamp: new Date().toISOString(),
          metadata: { passwordStrength: 'strong' }
        });
      });
    });
  }
  
  // Generate secure password for user
  async generatePasswordForUser(userId: string, performedBy: string): Promise<string> {
    return passwordOperationQueue.enqueue(async () => {
      const newPassword = generateSecurePassword(12);
      await this.changePassword(userId, newPassword, performedBy);
      return newPassword;
    });
  }
  
  // Authenticate user with secure password verification
  async authenticateUser(email: string, password: string, ipAddress?: string, userAgent?: string): Promise<User | null> {
    return measureDatabaseQuery('authenticate_user', async () => {
      // Get user with password hash
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('isActive', true)
        .single();
      
      if (error || !user) {
        // Log failed login attempt
        await this.createAuditLog({
          userId: 'unknown',
          action: 'LOGIN_FAILED',
          performedBy: email,
          ipAddress,
          userAgent,
          timestamp: new Date().toISOString(),
          metadata: { reason: 'user_not_found' }
        });
        return null;
      }
      
      // Verify password
      const isPasswordValid = await verifyPassword(password, user.password_hash);
      
      if (!isPasswordValid) {
        // Log failed login attempt
        await this.createAuditLog({
          userId: user.id,
          action: 'LOGIN_FAILED',
          performedBy: email,
          ipAddress,
          userAgent,
          timestamp: new Date().toISOString(),
          metadata: { reason: 'invalid_password' }
        });
        return null;
      }
      
      // Log successful login
      await this.createAuditLog({
        userId: user.id,
        action: 'LOGIN_SUCCESS',
        performedBy: email,
        ipAddress,
        userAgent,
        timestamp: new Date().toISOString()
      });
      
      // Return user without password hash
      const { password_hash, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    });
  }
  
  // Get users with proper filtering and pagination
  async getUsers(filters: {
    searchQuery?: string;
    team?: TeamType | 'all';
    role?: Role | 'all';
    isActive?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ users: User[]; total: number }> {
    return measureDatabaseQuery('get_users', async () => {
      let query = supabase
        .from('users')
        .select('id, name, email, role, team, isActive, joinDate, allowedStatuses, created_at, updated_at', { count: 'exact' });
      
      // Apply filters
      if (filters.searchQuery) {
        const searchTerm = filters.searchQuery.trim();
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }
      
      if (filters.team && filters.team !== 'all') {
        query = query.eq('team', filters.team);
      }
      
      if (filters.role && filters.role !== 'all') {
        query = query.eq('role', filters.role);
      }
      
      if (filters.isActive !== undefined) {
        query = query.eq('isActive', filters.isActive);
      }
      
      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      
      if (filters.offset) {
        query = query.range(filters.offset, (filters.offset + (filters.limit || 100)) - 1);
      }
      
      // Execute query
      const { data: users, error, count } = await query;
      
      if (error) {
        throw new Error(`Failed to fetch users: ${error.message}`);
      }
      
      return {
        users: users as User[],
        total: count || 0
      };
    });
  }
  
  // Soft delete user
  async deleteUser(userId: string, performedBy: string): Promise<void> {
    return userOperationQueue.enqueue(async () => {
      return measureDatabaseQuery('delete_user', async () => {
        // Get current user data for audit
        const { data: currentUser, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (fetchError || !currentUser) {
          throw new Error('User not found');
        }
        
        // Soft delete (set isActive to false)
        const { error } = await supabase
          .from('users')
          .update({ 
            isActive: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
        
        if (error) {
          throw new Error(`Failed to delete user: ${error.message}`);
        }
        
        // Log the deletion
        await this.createAuditLog({
          userId,
          action: 'USER_DELETED',
          oldValues: currentUser,
          performedBy,
          timestamp: new Date().toISOString()
        });
      });
    });
  }
  
  // Create audit log entry
  private async createAuditLog(logData: UserAuditLog): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_audit_log')
        .insert(logData);
      
      if (error) {
        console.error('Failed to create audit log:', error);
        // Don't throw error to avoid breaking the main operation
      }
    } catch (error) {
      console.error('Audit logging error:', error);
    }
  }
  
  // Get audit logs for a user
  async getUserAuditLogs(userId: string, limit: number = 50): Promise<UserAuditLog[]> {
    return measureDatabaseQuery('get_audit_logs', async () => {
      const { data: logs, error } = await supabase
        .from('user_audit_log')
        .select('*')
        .eq('userId', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);
      
      if (error) {
        throw new Error(`Failed to fetch audit logs: ${error.message}`);
      }
      
      return logs as UserAuditLog[];
    });
  }
  
  // Check if user exists
  async userExists(email: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    
    return !error && !!data;
  }
  
  // Get user by ID
  async getUserById(userId: string): Promise<User | null> {
    return measureDatabaseQuery('get_user_by_id', async () => {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, name, email, role, team, isActive, joinDate, allowedStatuses, created_at, updated_at')
        .eq('id', userId)
        .single();
      
      if (error || !user) {
        return null;
      }
      
      return user as User;
    });
  }
}

// Export singleton instance
export const secureUserService = new SecureUserService(); 