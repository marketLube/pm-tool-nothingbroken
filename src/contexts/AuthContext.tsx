import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import { Role, TeamType, User } from '../types';
import { isSupabaseConfigured } from '../utils/supabase';
import * as userService from '../services/userService';
import { 
  getPermissions, 
  Permission, 
  hasPermission,
  ResourceType,
  ActionType
} from '../utils/auth/permissions';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isManager: boolean;
  userTeam: TeamType | null;
  permissions: Permission[];
  checkPermission: (resource: ResourceType, action: ActionType, resourceTeam?: TeamType) => boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateCurrentUser: (updatedUser: User) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isAuthenticated: false,
  isAdmin: false,
  isManager: false,
  userTeam: null,
  permissions: [],
  checkPermission: () => false,
  login: async () => false,
  logout: () => {},
  updateCurrentUser: () => {},
  isLoading: true
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // We're no longer auto-logging in users on mount
  // This ensures users must explicitly log in through the login page
  
  const isAuthenticated = !!currentUser;
  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';
  const userTeam = currentUser?.team || null;
  
  // Get permissions based on user role
  const permissions = useMemo(() => {
    if (!currentUser) return [];
    return getPermissions(currentUser.role, currentUser.team, currentUser.allowedStatuses);
  }, [currentUser]);
  
  // Function to check if user has permission
  const checkPermission = (
    resource: ResourceType, 
    action: ActionType,
    resourceTeam?: TeamType
  ): boolean => {
    return hasPermission(permissions, resource, action, resourceTeam);
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // For backward compatibility - always allow admin user login
      if (email.toLowerCase() === 'althameem@marketlube.in' && password === 'Mark@99') {
        console.log('Using hardcoded admin user login');
        const adminUser: User = {
          id: '53419fb2-9e21-40f1-8bcc-9e4575548523',
          name: 'Althameem',
          email: 'althameem@marketlube.in',
          role: 'admin',
          team: 'creative',
          joinDate: new Date().toISOString().split('T')[0],
          isActive: true,
          allowedStatuses: [
            'not_started', 'scripting', 'script_confirmed', 'shoot_pending',
            'shoot_finished', 'edit_pending', 'client_approval', 'approved',
            'proposal_awaiting', 'ui_started', 'ui_finished', 'development_started', 
            'development_finished', 'testing', 'handed_over', 'client_reviewing', 
            'completed', 'in_progress', 'done'
          ]
        };
        
        setCurrentUser(adminUser);
        console.log('Admin login successful!');
        return true;
      }
      
      // Check user credentials for normal users
      const user = await userService.checkUserCredentials(email, password);
      
      if (user && user.isActive) {
        setCurrentUser(user);
        console.log('User login successful');
        return true;
      }
      
      console.log('Login failed - invalid credentials or inactive user');
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setCurrentUser(null);
  };
  
  // Function to update current user when modified in the DataContext
  const updateCurrentUser = (updatedUser: User) => {
    if (currentUser && currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        isAdmin,
        isManager,
        userTeam,
        permissions,
        checkPermission,
        login,
        logout,
        updateCurrentUser,
        isLoading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};