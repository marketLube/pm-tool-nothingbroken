import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect, useRef } from 'react';
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
  const currentUserRef = useRef<User | null>(null);
  
  // Update ref whenever currentUser changes
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);
  
  // Session timeout in milliseconds (30 minutes)
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  
  // Helper function to store user session
  const storeUserSession = (user: User) => {
    try {
      // Set session to expire in 30 minutes from now
      const expiryTime = Date.now() + SESSION_TIMEOUT;
      localStorage.setItem('currentUser', JSON.stringify(user));
      localStorage.setItem('sessionExpiry', expiryTime.toString());
      localStorage.setItem('lastActivity', Date.now().toString());
      setCurrentUser(user);
      console.log(`👤 User session stored for: ${user.email} (expires in 30 min)`);
    } catch (error) {
      console.error('Error storing user session:', error);
      setCurrentUser(user); // Still set in memory even if storage fails
    }
  };

  // Helper function to extend session on activity
  const extendSession = () => {
    if (currentUserRef.current) {
      try {
        const newExpiryTime = Date.now() + SESSION_TIMEOUT;
        localStorage.setItem('sessionExpiry', newExpiryTime.toString());
        localStorage.setItem('lastActivity', Date.now().toString());
        console.log('🔄 Session extended due to activity');
      } catch (error) {
        console.error('Error extending session:', error);
      }
    }
  };

  // Helper function to check if session is still valid
  const isSessionValid = () => {
    try {
      const sessionExpiry = localStorage.getItem('sessionExpiry');
      if (!sessionExpiry) return false;
      
      const expiryTime = parseInt(sessionExpiry);
      const currentTime = Date.now();
      
      return currentTime < expiryTime;
    } catch (error) {
      console.error('Error checking session validity:', error);
      return false;
    }
  };

  const logout = () => {
    // Clear session storage
    localStorage.removeItem('currentUser');
    localStorage.removeItem('sessionExpiry');
    localStorage.removeItem('lastActivity');
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
          
          // Check if session is still valid
          if (currentTime < expiryTime) {
            const user = JSON.parse(storedUser);
            setCurrentUser(user);
            
            // Extend session since user is returning to the app
            extendSession();
            console.log('Restored user session for:', user.email);
          } else {
            // Session expired, clear storage
            localStorage.removeItem('currentUser');
            localStorage.removeItem('sessionExpiry');
            localStorage.removeItem('lastActivity');
            console.log('Session expired due to inactivity, cleared storage');
          }
        }
      } catch (error) {
        console.error('Error checking existing session:', error);
        // Clear corrupted data
        localStorage.removeItem('currentUser');
        localStorage.removeItem('sessionExpiry');
        localStorage.removeItem('lastActivity');
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingSession();

    // Set up periodic session validation (every minute)
    const sessionCheckInterval = setInterval(() => {
      if (currentUserRef.current && !isSessionValid()) {
        console.log('Session expired due to inactivity, logging out');
        logout();
      }
    }, 60 * 1000); // Check every minute

    // Clear interval on cleanup
    return () => clearInterval(sessionCheckInterval);
  }, []); // Remove currentUser dependency to prevent infinite loop

  // Listen for window focus to validate and extend session
  useEffect(() => {
    const handleWindowFocus = () => {
      if (currentUserRef.current) {
        if (isSessionValid()) {
          // Session is still valid, extend it since user is back
          extendSession();
          console.log('Window focused, session extended');
        } else {
          console.log('Session expired while away, logging out');
          logout();
        }
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, []); // Remove currentUser dependency

  // Track user activity to extend session
  useEffect(() => {
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleUserActivity = () => {
      if (currentUserRef.current && isSessionValid()) {
        extendSession();
      }
    };

    // Throttle activity tracking to avoid too frequent updates
    let activityTimeout: NodeJS.Timeout;
    const throttledActivityHandler = () => {
      clearTimeout(activityTimeout);
      activityTimeout = setTimeout(handleUserActivity, 5 * 60 * 1000); // Extend session max once every 5 minutes
    };

    // Add event listeners for user activity
    activityEvents.forEach(event => {
      document.addEventListener(event, throttledActivityHandler, true);
    });

    // Cleanup event listeners
    return () => {
      clearTimeout(activityTimeout);
      activityEvents.forEach(event => {
        document.removeEventListener(event, throttledActivityHandler, true);
      });
    };
  }, []); // Remove currentUser dependency
  
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
      
      // Use standard authentication for all users (including admins)
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