import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import { Role, TeamType, User } from '../types';
import { isSupabaseConfigured } from '../utils/supabase';
import * as userService from '../services/userService';
import * as attendanceService from '../services/attendanceService';
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
  const [isLoading, setIsLoading] = useState(true); // Start with loading true to check session
  
  // Helper function to store user session
  const storeUserSession = (user: User) => {
    try {
      // Set session to expire in 24 hours
      const expiryTime = Date.now() + (24 * 60 * 60 * 1000);
      localStorage.setItem('currentUser', JSON.stringify(user));
      localStorage.setItem('sessionExpiry', expiryTime.toString());
      setCurrentUser(user);
    } catch (error) {
      console.error('Error storing user session:', error);
      setCurrentUser(user); // Still set in memory even if storage fails
    }
  };

  const logout = () => {
    // Clear session storage
    localStorage.removeItem('currentUser');
    localStorage.removeItem('sessionExpiry');
    setCurrentUser(null);
    console.log('User logged out, session cleared');
  };
  
  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = () => {
      try {
        const storedUser = localStorage.getItem('currentUser');
        const sessionExpiry = localStorage.getItem('sessionExpiry');
        
        if (storedUser && sessionExpiry) {
          const expiryTime = parseInt(sessionExpiry);
          const currentTime = Date.now();
          
          // Check if session is still valid (24 hours)
          if (currentTime < expiryTime) {
            const user = JSON.parse(storedUser);
            setCurrentUser(user);
            console.log('Restored user session for:', user.email);
          } else {
            // Session expired, clear storage
            localStorage.removeItem('currentUser');
            localStorage.removeItem('sessionExpiry');
            console.log('Session expired, cleared storage');
          }
        }
      } catch (error) {
        console.error('Error checking existing session:', error);
        // Clear corrupted data
        localStorage.removeItem('currentUser');
        localStorage.removeItem('sessionExpiry');
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingSession();

    // Set up periodic session validation (every 5 minutes)
    const sessionCheckInterval = setInterval(() => {
      const sessionExpiry = localStorage.getItem('sessionExpiry');
      if (sessionExpiry) {
        const expiryTime = parseInt(sessionExpiry);
        const currentTime = Date.now();
        
        if (currentTime >= expiryTime) {
          console.log('Session expired during use, logging out');
          logout();
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    // Clear interval on cleanup
    return () => clearInterval(sessionCheckInterval);
  }, []);
  
  // Listen for window focus to validate session
  useEffect(() => {
    const handleWindowFocus = () => {
      const sessionExpiry = localStorage.getItem('sessionExpiry');
      if (sessionExpiry && currentUser) {
        const expiryTime = parseInt(sessionExpiry);
        const currentTime = Date.now();
        
        if (currentTime >= expiryTime) {
          console.log('Session expired while away, logging out');
          logout();
        }
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [currentUser]);
  
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
        
        storeUserSession(adminUser);
        
        // Record automatic check-in
        await attendanceService.recordLoginAsCheckIn(adminUser.id);
        
        console.log('Admin login successful!');
        return true;
      }
      
      // Check user credentials for normal users
      const user = await userService.checkUserCredentials(email, password);
      
      if (user && user.isActive) {
        storeUserSession(user);
        
        // Record automatic check-in for the user
        await attendanceService.recordLoginAsCheckIn(user.id);
        
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
  
  // Function to update current user when modified in the DataContext
  const updateCurrentUser = (updatedUser: User) => {
    if (currentUser && currentUser.id === updatedUser.id) {
      storeUserSession(updatedUser); // Update stored session as well
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