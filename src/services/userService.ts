import { supabase } from '../utils/supabase';
import { User } from '../types';
import { v4 as uuidv4 } from 'uuid';

// NOTE: This service now uses the regular supabase client instead of admin client
// Ensure proper Row Level Security (RLS) policies are set up in Supabase for:
// - users table: Allow authenticated users to read/write their own data
// - Admin operations should be handled through proper RLS policies

// Database mapping functions
const mapToDbUser = (user: Omit<User, 'id'> | User) => ({
  name: user.name,
  email: user.email,
  team: user.team,
  role: user.role,
  password: user.password,
  avatar: user.avatar || null,
  join_date: user.joinDate || new Date().toISOString().split('T')[0],
  is_active: user.isActive !== undefined ? user.isActive : true,
  allowed_statuses: user.allowedStatuses || [],
  created_at: new Date().toISOString()
});

const mapFromDbUser = (dbUser: any): User => ({
  id: dbUser.id,
  name: dbUser.name,
  email: dbUser.email,
  team: dbUser.team,
  role: dbUser.role,
  password: dbUser.password,
  avatar: dbUser.avatar,
  joinDate: dbUser.join_date || dbUser.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
  isActive: dbUser.is_active !== undefined ? dbUser.is_active : true,
  allowedStatuses: dbUser.allowed_statuses || []
});

// Get all users
export const getUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('name');
  
  if (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
  
  return data.map(mapFromDbUser);
};

// Get users by team
export const getUsersByTeam = async (team: string): Promise<User[]> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('team', team)
    .order('name');
  
  if (error) {
    console.error(`Error fetching users for team ${team}:`, error);
    throw error;
  }
  
  return data.map(mapFromDbUser);
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
  const id = uuidv4();
  console.log('Preparing to insert user with data:', {
    id,
    name: user.name,
    email: user.email,
    team: user.team,
    role: user.role,
    hasPassword: !!user.password,
    joinDate: user.joinDate || new Date().toISOString().split('T')[0]
  });
  
  const userDbData = {
    id,
    ...mapToDbUser(user)
  };
  
  console.log('Raw insert data:', JSON.stringify(userDbData));
  
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([userDbData])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating user:', error);
      console.error('Failed insertion data:', userDbData);
      throw error;
    }
    
    if (!data) {
      console.error('No data returned after user creation');
      throw new Error('Failed to create user: No data returned');
    }
    
    console.log('User created successfully with data:', data);
    return mapFromDbUser(data);
  } catch (insertError) {
    console.error('Exception during user creation:', insertError);
    
    // Check if the user already exists
    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email)
        .single();
      
      if (existingUser) {
        console.error('User with email already exists:', user.email);
        throw new Error(`User with email ${user.email} already exists`);
      }
    } catch (checkError) {
      console.error('Error checking for existing user:', checkError);
    }
    
    throw insertError;
  }
};

// Update user
export const updateUser = async (user: User): Promise<User> => {
  const { data, error } = await supabase
    .from('users')
    .update(mapToDbUser(user))
    .eq('id', user.id)
    .select()
    .single();
  
  if (error) {
    console.error(`Error updating user ${user.id}:`, error);
    throw error;
  }
  
  if (!data) {
    throw new Error('Failed to update user: No data returned');
  }
  
  return mapFromDbUser(data);
};

// Update user avatar
export const updateUserAvatar = async (userId: string, avatar: string): Promise<void> => {
  const { error } = await supabase
    .from('users')
    .update({ 
      avatar
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