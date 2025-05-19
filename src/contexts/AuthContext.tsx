import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import { Role, TeamType, User } from '../types';
import { users } from '../utils/mockData';
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
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // For demo purposes, ensure Althameem is set as the default admin user
  const adminUser = users.find(user => user.name === 'Althameem' && user.role === 'admin' && user.isActive) || 
                    users.find(user => user.role === 'admin' && user.isActive) || 
                    users[0];
  const [currentUser, setCurrentUser] = useState<User | null>(adminUser);
  
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
    // In a real app, we would validate against a server
    // For demo, just find a matching user by email and auto-login
    const user = users.find(u => u.email === email && u.isActive);
    
    if (user) {
      setCurrentUser(user);
      return true;
    }
    
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
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
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};