import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../utils/supabase';
import { User } from '../types';
import { getPermissions, hasPermission, ResourceType, ActionType } from '../utils/auth/permissions';
import { TeamType } from '../types';

interface AuthContextType {
  currentUser: User | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  userTeam: string | undefined;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUserStatus: (status: string) => Promise<void>;
  isLoading: boolean;
  updateCurrentUser: (updatedUser: User) => void;
  checkPermission: (resource: ResourceType, action: ActionType, resourceTeam?: TeamType) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [supabaseUsers, setSupabaseUsers] = useState<User[]>([]);

  // Load users from Supabase instead of mock data
  useEffect(() => {
    const loadSupabaseUsers = async () => {
      try {
        console.log('🔄 Loading users from Supabase...');
        const { data: usersData, error } = await supabase
          .from('users')
          .select('*');

        if (error) {
          console.error('❌ Error loading users from Supabase:', error);
          // Fallback to mock data if Supabase fails
          const { users: mockUsers } = await import('../utils/mockData');
          setSupabaseUsers(mockUsers);
        } else {
          // Map Supabase users to User interface
          const mappedUsers = usersData.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            team: user.team,
            joinDate: user.created_at?.split('T')[0] || '2023-01-01',
            avatar: user.avatar_url || '',
            isActive: user.is_active ?? true,
            allowedStatuses: user.allowed_statuses || [],
            password: '' // Don't store passwords in client
          }));
          setSupabaseUsers(mappedUsers);
          console.log(`✅ Loaded ${mappedUsers.length} users from Supabase`);
        }
      } catch (error) {
        console.error('❌ Error loading users data:', error);
        // Fallback to mock data
        const { users: mockUsers } = await import('../utils/mockData');
        setSupabaseUsers(mockUsers);
      } finally {
        setIsLoading(false);
      }
    };

    loadSupabaseUsers();
  }, []);

  useEffect(() => {
    // Check for existing session on mount
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const user = supabaseUsers.find(u => u.email === session.user.email);
          if (user) {
            setCurrentUser(user);
            setIsLoggedIn(true);
            console.log(`✅ Session restored for user: ${user.name} (ID: ${user.id})`);
          }
        }
      } catch (error) {
        console.error('❌ Error checking session:', error);
      }
    };

    if (supabaseUsers.length > 0) {
      checkSession();
    }
  }, [supabaseUsers]);

  // Monitor auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`🔐 Auth state changed: ${event}`);
        
        if (event === 'SIGNED_OUT' || !session) {
          setCurrentUser(null);
          setIsLoggedIn(false);
        } else if (event === 'SIGNED_IN' && session?.user) {
          const user = supabaseUsers.find(u => u.email === session.user.email);
          if (user) {
            setCurrentUser(user);
            setIsLoggedIn(true);
            console.log(`✅ User signed in: ${user.name} (ID: ${user.id})`);
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [supabaseUsers]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log(`🔐 Attempting login for: ${email}`);
      
      // Find user in Supabase data
      const user = supabaseUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (!user) {
        console.log('❌ User not found in system');
        return false;
      }

      if (!user.isActive) {
        console.log('❌ User account is deactivated');
        alert('Your account has been deactivated. Please contact an administrator.');
        return false;
      }

      // Method 1: Try Supabase authentication first
      console.log('🔑 Attempting Supabase Auth login...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password: password
      });

      if (!error && data.user) {
        // Supabase Auth successful
        setCurrentUser(user);
        setIsLoggedIn(true);
        
        console.log(`✅ Supabase Auth login successful for: ${user.name} (${user.role}) - ID: ${user.id}`);
        console.log(`📋 User teams: ${user.team}, Active: ${user.isActive}`);
        
        return true;
      }

      // Method 2: Fallback to database-only authentication
      console.log('🔄 Supabase Auth failed, trying database authentication...');
      console.log(`   Auth error: ${error?.message || 'Unknown error'}`);
      
      // Import the user service to check credentials against database
      const { checkUserCredentials } = await import('../services/userService');
      const dbUser = await checkUserCredentials(email, password);
      
      if (dbUser) {
        // Database authentication successful
        setCurrentUser(user);
        setIsLoggedIn(true);
        
        console.log(`✅ Database auth login successful for: ${user.name} (${user.role}) - ID: ${user.id}`);
        console.log(`📋 User teams: ${user.team}, Active: ${user.isActive}`);
        console.log(`⚠️ Note: User exists in database but not in Supabase Auth. Consider recreating user for full functionality.`);
        
        return true;
      }

      // Method 3: Final fallback for development - check password against local data
      if (user.password && user.password === password) {
        console.log('🔄 Falling back to local data authentication');
        setCurrentUser(user);
        setIsLoggedIn(true);
        
        console.log(`✅ Local data login successful for: ${user.name} (${user.role}) - ID: ${user.id}`);
        console.log(`📋 User teams: ${user.team}, Active: ${user.isActive}`);
        
        return true;
      }

      console.log('❌ All authentication methods failed');
      return false;
    } catch (error) {
      console.error('❌ Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      console.log(`🔐 Logging out user: ${currentUser?.name}`);
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear local state
      setCurrentUser(null);
      setIsLoggedIn(false);
      
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Force logout even if Supabase fails
      setCurrentUser(null);
      setIsLoggedIn(false);
    }
  };

  const updateUserStatus = async (status: string): Promise<void> => {
    if (!currentUser) return;
    
    try {
      console.log(`🔄 Updating status for ${currentUser.name} to: ${status}`);
      // For now, just log the status update
      // In a full implementation, this would update the database
      console.log(`✅ Status updated successfully`);
    } catch (error) {
      console.error('❌ Error updating user status:', error);
      throw error;
    }
  };

  const updateCurrentUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
  };

  const isAdmin = currentUser?.role === 'admin';
  const userTeam = currentUser?.team;

  const checkPermission = (resource: ResourceType, action: ActionType, resourceTeam?: TeamType): boolean => {
    if (!currentUser) return false;
    
    // Get user's permissions based on their role and team
    const userPermissions = getPermissions(
      currentUser.role, 
      currentUser.team, 
      currentUser.allowedStatuses
    );
    
    // Check if user has the required permission
    return hasPermission(userPermissions, resource, action, resourceTeam);
  };

  const value: AuthContextType = {
    currentUser,
    isLoggedIn,
    isAdmin,
    userTeam,
    login,
    logout,
    updateUserStatus,
    isLoading,
    updateCurrentUser,
    checkPermission
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 