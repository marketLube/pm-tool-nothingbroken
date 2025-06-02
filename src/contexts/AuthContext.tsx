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
            avatar: user.avatar || '',
            isActive: user.is_active ?? true,
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

      // For development: Check against mock data password if provided
      if (user.password && user.password !== password) {
        console.log('❌ Invalid password (mock data check)');
        return false;
      }

      // Attempt Supabase authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password: password
      });

      if (error) {
        console.log('❌ Supabase auth error:', error.message);
        
        // For development: Allow mock data fallback if Supabase fails
        if (user.password === password) {
          console.log('🔄 Falling back to mock data authentication');
          setCurrentUser(user);
          setIsLoggedIn(true);
          
          console.log(`✅ Login successful for: ${user.name} (${user.role}) - ID: ${user.id}`);
          console.log(`📋 User teams: ${user.team}, Active: ${user.isActive}`);
          console.log(`🚫 REMOVED: Automatic check-in on login. Users must manually check-in via Attendance module.`);
          
          return true;
        }
        return false;
      }

      if (data.user) {
        setCurrentUser(user);
        setIsLoggedIn(true);
        
        console.log(`✅ Login successful for: ${user.name} (${user.role}) - ID: ${user.id}`);
        console.log(`📋 User teams: ${user.team}, Active: ${user.isActive}`);
        console.log(`🚫 REMOVED: Automatic check-in on login. Users must manually check-in via Attendance module.`);
        
        return true;
      }

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