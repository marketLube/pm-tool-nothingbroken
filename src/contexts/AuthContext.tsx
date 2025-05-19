import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Role, TeamType, User } from '../types';
import { users } from '../utils/mockData';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isManager: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  userTeam: TeamType | null;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isAuthenticated: false,
  isAdmin: false,
  isManager: false,
  login: async () => false,
  logout: () => {},
  userTeam: null
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // For demo purposes, default to an admin user
  const [currentUser, setCurrentUser] = useState<User | null>(users[0]);
  
  const isAuthenticated = !!currentUser;
  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';
  const userTeam = currentUser?.team || null;

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
        login,
        logout,
        userTeam
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};