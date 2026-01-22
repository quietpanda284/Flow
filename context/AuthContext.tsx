
import React, { createContext, useContext, useState, useEffect } from 'react';
import { checkAuthStatus, loginUser, logoutUser } from '../services/api';

interface User {
  id: string;
  username: string;
  isGuest?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (u: string, p: string) => Promise<void>;
  loginAsGuest: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check session on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const userData = await checkAuthStatus();
        setUser(userData);
      } catch (error) {
        // If 401 or network error, assume not logged in
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    const response = await loginUser(username, password);
    if (response.success && response.user) {
        setUser(response.user);
    }
  };

  const loginAsGuest = () => {
      setUser({ id: 'guest', username: 'Guest', isGuest: true });
  };

  const logout = async () => {
    try {
        if (!user?.isGuest) {
            await logoutUser();
        }
    } finally {
        setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, loginAsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
