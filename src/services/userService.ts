import { supabase } from '../utils/supabase';
import { User, TeamType, Role } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { getIndiaDateTime, getIndiaDate } from '../utils/timezone';

// NOTE: This service now uses the regular supabase client instead of admin client
// Ensure proper Row Level Security (RLS) policies are set up in Supabase for:
// - users table: Allow authenticated users to read/write their own data
// - Admin operations should be handled through proper RLS policies

// Database mapping functions
const mapToDbUser = (user: User, isUpdate: boolean = false) => {
  const baseData: any = {
    id: user.id,
    email: user.email?.toLowerCase().trim(), // Ensure consistent email format
    name: user.name?.trim(),
    role: user.role,
    team: user.team,
    is_active: user.isActive,
    avatar_url: user.avatar || null,
    join_date: user.joinDate || getIndiaDate(),
    allowed_statuses: user.allowedStatuses || []
  };

  // Add password only if it exists (for creation or password updates)
  if (user.password && user.password.trim()) {
    baseData.password = user.password.trim();
  }

  // Only add created_at for new records (don't add updated_at since column doesn't exist)
  if (!isUpdate) {
    baseData.created_at = getIndiaDateTime().toISOString();
  }

  return baseData;
};

const mapFromDbUser = (dbUser: any): User => {
  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role as Role,
    team: dbUser.team as TeamType,
    isActive: dbUser.is_active,
    avatar: dbUser.avatar_url,
    allowedStatuses: dbUser.allowed_statuses,
    joinDate: dbUser.join_date || dbUser.created_at?.split('T')[0] || getIndiaDate()
  };
};

// Get all users
export const getUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('users')
    .select('*');
  
  if (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
  
  return data.map(mapFromDbUser);
};

// Database-level user filtering interface
export interface UserSearchFilters {
  team?: TeamType;
  isActive?: boolean;
  role?: 'admin' | 'manager' | 'employee';
  searchQuery?: string;
}

// Get filtered users with database-level filtering
export const searchUsers = async (filters: UserSearchFilters): Promise<User[]> => {
  let query = supabase
    .from('users')
    .select('*');

  // Apply team filter
  if (filters.team) {
    query = query.eq('team', filters.team);
  }

  // Apply active status filter
  if (filters.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive);
  }

  // Apply role filter
  if (filters.role) {
    query = query.eq('role', filters.role);
  }

  // Apply search query
  if (filters.searchQuery && filters.searchQuery.trim()) {
    const searchTerm = filters.searchQuery.trim();
    query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
  }

  // Default sorting by name
  query = query.order('name', { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error('Error searching users:', error);
    throw error;
  }

  return data.map(mapFromDbUser);
};

// Get users by team with database filtering
export const getUsersByTeam = async (teamId: TeamType, includeAdmins: boolean = true): Promise<User[]> => {
  const filters: UserSearchFilters = {
    team: teamId,
    isActive: true
  };

  const teamUsers = await searchUsers(filters);
  
  if (includeAdmins) {
    // Also get admin users
    const adminUsers = await searchUsers({ role: 'admin', isActive: true });
    // Merge and remove duplicates
    const allUsers = [...teamUsers, ...adminUsers];
    const uniqueUsers = Array.from(new Map(allUsers.map(user => [user.id, user])).values());
    return uniqueUsers;
  }
  
  return teamUsers;
};

// Get user by ID
export const getUserById = async (id: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      return null; // User not found
    }
    console.error(`Error fetching user ${id}:`, error);
    throw error;
  }
  
  return mapFromDbUser(data);
};

// Check user credentials
export const checkUserCredentials = async (email: string, password: string): Promise<User | null> => {
  try {
    // First try to get the user with credentials
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase()) // Case insensitive email
      .eq('password', password)
      .eq('is_active', true)
      .limit(1); // Only get one result

    if (error) {
      console.error(`Authentication error for ${email}:`, error.message);
      return null;
    }

    // If no data or empty array, invalid credentials
    if (!data || data.length === 0) {
      console.error(`Invalid credentials for email ${email}`);
      return null;
    }

    // Return the first (and should be only) user
    return mapFromDbUser(data[0]);

  } catch (error) {
    console.error(`Error checking credentials for ${email}:`, error);
    return null;
  }
};

// Create a new user
export const createUser = async (user: Omit<User, 'id'>): Promise<User> => {
  try {
    const id = crypto.randomUUID();
    
    // Validate required fields
    if (!user.name?.trim()) {
      throw new Error('Name is required');
    }
    if (!user.email?.trim()) {
      throw new Error('Email is required');
    }
    if (!user.password?.trim()) {
      throw new Error('Password is required');
    }
    
    const userDbData = mapToDbUser({ ...user, id } as User, false);
    
    console.log('Creating user with data:', {
      email: userDbData.email,
      name: userDbData.name,
      role: userDbData.role,
      team: userDbData.team,
      hasPassword: !!userDbData.password
    });
    
    const { data, error } = await supabase
      .from('users')
      .insert([userDbData])
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating user:', error);
      if (error.code === '23505') {
        throw new Error('A user with this email already exists');
      }
      throw new Error(`Failed to create user: ${error.message}`);
    }

    console.log('User created successfully:', data.id);
    return mapFromDbUser(data);
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

// Update user
export const updateUser = async (user: User): Promise<User> => {
  try {
    // Validate required fields
    if (!user.id) {
      throw new Error('User ID is required for updates');
    }
    if (!user.name?.trim()) {
      throw new Error('Name is required');
    }
    if (!user.email?.trim()) {
      throw new Error('Email is required');
    }

    const updateData = mapToDbUser(user, true);
    
    console.log('Updating user with data:', {
      id: user.id,
      email: updateData.email,
      name: updateData.name,
      role: updateData.role,
      team: updateData.team,
      hasPassword: !!updateData.password
    });

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      if (error.code === '23505') {
        throw new Error('A user with this email already exists');
      }
      if (error.code === 'PGRST116') {
        throw new Error('User not found');
      }
      throw new Error(`Failed to update user: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('Failed to update user: No data returned');
    }

    console.log('User updated successfully:', data.id);
    return mapFromDbUser(data);
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

// Update user password specifically
export const updateUserPassword = async (userId: string, newPassword: string): Promise<User> => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    if (!newPassword?.trim() || newPassword.trim().length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    console.log('Updating password for user:', userId);

    const { data, error } = await supabase
      .from('users')
      .update({ 
        password: newPassword.trim()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user password:', error);
      if (error.code === 'PGRST116') {
        throw new Error('User not found');
      }
      throw new Error(`Failed to update password: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('Failed to update password: No data returned');
    }

    console.log('Password updated successfully for user:', userId);
    return mapFromDbUser(data);
  } catch (error) {
    console.error('Error updating user password:', error);
    throw error;
  }
};

// Update user avatar
export const updateUserAvatar = async (userId: string, avatar: string): Promise<void> => {
  const { error } = await supabase
    .from('users')
    .update({ 
      avatar_url: avatar
    })
    .eq('id', userId);
  
  if (error) {
    console.error(`Error updating avatar for user ${userId}:`, error);
    throw error;
  }
};

// Delete user
export const deleteUser = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId);
  
  if (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

export const toggleUserStatus = async (userId: string): Promise<User> => {
  // First get the current user to toggle their status
  const user = await getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const newStatus = !user.isActive;
  
  const { data, error } = await supabase
    .from('users')
    .update({ is_active: newStatus })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error toggling user status:', error);
    throw error;
  }

  return mapFromDbUser(data);
};

export const createUserInSupabase = async (userData: {
  id?: string;
  email: string;
  name: string;
  role?: Role;
  team?: TeamType;
  isActive?: boolean;
  avatar?: string;
  allowedStatuses?: string[];
  joinDate?: string;
}): Promise<User | null> => {
  try {
    const newUser: User = {
      id: userData.id || crypto.randomUUID(),
      email: userData.email,
      name: userData.name,
      role: (userData.role as Role) || 'employee',
      team: (userData.team as TeamType) || 'creative',
      isActive: userData.isActive ?? true,
      avatar: userData.avatar,
      allowedStatuses: userData.allowedStatuses || [],
      joinDate: userData.joinDate || getIndiaDate()
    };

    return await createUser(newUser);
  } catch (error) {
    console.error('Error creating user in Supabase:', error);
    return null;
  }
}; 