import { supabase, supabaseAdmin } from '../utils/supabase';
import { User } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Map from App User to Supabase DB schema
const mapToDbUser = (user: Omit<User, 'id'>) => {
  return {
    name: user.name,
    email: user.email,
    role: user.role,
    team: user.team,
    join_date: user.joinDate,
    avatar_url: user.avatar || null,
    is_active: user.isActive,
    allowed_statuses: user.allowedStatuses || null,
    password: user.password || null
  };
};

// Map from Supabase DB schema to App User
const mapFromDbUser = (dbUser: any): User => {
  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role,
    team: dbUser.team,
    joinDate: dbUser.join_date,
    avatar: dbUser.avatar_url || undefined,
    isActive: dbUser.is_active,
    allowedStatuses: dbUser.allowed_statuses || [],
    password: dbUser.password
  };
};

// Get all users
export const getUsers = async (): Promise<User[]> => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*');
  
  if (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
  
  return data.map(mapFromDbUser);
};

// Get user by ID
export const getUserById = async (id: string): Promise<User | null> => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error(`Error fetching user ${id}:`, error);
    return null;
  }
  
  return mapFromDbUser(data);
};

// Get user by email
export const getUserByEmail = async (email: string): Promise<User | null> => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', email)
    .single();
  
  if (error) {
    console.error(`Error fetching user with email ${email}:`, error);
    return null;
  }
  
  return mapFromDbUser(data);
};

// Check user credentials
export const checkUserCredentials = async (email: string, password: string): Promise<User | null> => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', email)
    .eq('password', password)
    .single();
  
  if (error || !data) {
    console.error(`Invalid credentials for email ${email}`);
    return null;
  }
  
  return mapFromDbUser(data);
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
    hasPassword: !!user.password
  });
  
  const userDbData = {
    id,
    ...mapToDbUser(user),
    created_at: new Date().toISOString()
  };
  
  console.log('Raw insert data:', JSON.stringify(userDbData));
  
  try {
    const { data, error } = await supabaseAdmin
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
      const { data: existingUser } = await supabaseAdmin
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

// Update a user
export const updateUser = async (user: User): Promise<User> => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .update(mapToDbUser(user))
    .eq('id', user.id)
    .select()
    .single();
  
  if (error) {
    console.error(`Error updating user ${user.id}:`, error);
    throw error;
  }
  
  return mapFromDbUser(data);
};

// Toggle user active status
export const toggleUserStatus = async (userId: string): Promise<User> => {
  try {
    // First get current user
    const currentUser = await getUserById(userId);
    
    if (!currentUser) {
      const error = new Error(`User ${userId} not found`);
      console.error(error);
      throw error;
    }
    
    console.log(`Toggling status for user ${userId} from ${currentUser.isActive ? 'active' : 'inactive'} to ${!currentUser.isActive ? 'active' : 'inactive'}`);
    
    // Toggle status
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ is_active: !currentUser.isActive })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error(`Error toggling status for user ${userId}:`, error);
      throw error;
    }
    
    if (!data) {
      const noDataError = new Error(`No data returned when toggling status for user ${userId}`);
      console.error(noDataError);
      throw noDataError;
    }
    
    console.log(`Successfully toggled status for user ${userId} to ${!currentUser.isActive ? 'active' : 'inactive'}`);
    return mapFromDbUser(data);
  } catch (error) {
    console.error('Exception in toggleUserStatus:', error);
    throw error;
  }
};

// Get users by team
export const getUsersByTeam = async (teamId: string): Promise<User[]> => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('team', teamId);
  
  if (error) {
    console.error(`Error fetching users for team ${teamId}:`, error);
    throw error;
  }
  
  return data.map(mapFromDbUser);
}; 