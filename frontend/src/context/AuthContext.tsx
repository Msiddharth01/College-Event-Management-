import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { loginApi, registerApi, registerOrganizerApi, setActiveUser } from '../api/client';
import { ActiveProfile, RegisterStudentPayload, RegisterOrganizerPayload } from '../types';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'organizer';
  department?: string;
  rollNumber?: string;
  year?: number;
}

export interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<AuthUser>;
  register: (data: RegisterStudentPayload) => Promise<AuthUser>;
  registerOrganizer: (data: RegisterOrganizerPayload) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore stored session from localStorage on application load
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUserJson = localStorage.getItem(USER_KEY);

      if (storedToken && storedUserJson) {
        const parsedUser = JSON.parse(storedUserJson) as AuthUser;
        setToken(storedToken);
        setUser(parsedUser);
        setActiveUser({
          id: parsedUser.id,
          name: parsedUser.name,
          role: parsedUser.role,
          email: parsedUser.email,
          department: parsedUser.department,
        });
      }
    } catch (err) {
      console.warn('Failed to restore authentication state:', err);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password?: string): Promise<AuthUser> => {
    const res = await loginApi(email, password);
    const authUser: AuthUser = {
      id: res.user.id,
      name: res.user.name,
      email: res.user.email,
      role: res.user.role,
      department: res.user.department,
      rollNumber: res.user.rollNumber,
      year: res.user.year,
    };

    setToken(res.token);
    setUser(authUser);

    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(authUser));

    setActiveUser({
      id: authUser.id,
      name: authUser.name,
      role: authUser.role,
      email: authUser.email,
      department: authUser.department,
    });

    return authUser;
  };

  const register = async (data: RegisterStudentPayload): Promise<AuthUser> => {
    const res = await registerApi(data);
    const authUser: AuthUser = {
      id: res.user.id,
      name: res.user.name,
      email: res.user.email,
      role: res.user.role,
      department: res.user.department,
      rollNumber: res.user.rollNumber,
      year: res.user.year,
    };

    setToken(res.token);
    setUser(authUser);

    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(authUser));

    setActiveUser({
      id: authUser.id,
      name: authUser.name,
      role: authUser.role,
      email: authUser.email,
      department: authUser.department,
    });

    return authUser;
  };

  const registerOrganizer = async (data: RegisterOrganizerPayload): Promise<AuthUser> => {
    const res = await registerOrganizerApi(data);
    const authUser: AuthUser = {
      id: res.user.id,
      name: res.user.name,
      email: res.user.email,
      role: res.user.role,
      department: res.user.department,
    };

    setToken(res.token);
    setUser(authUser);

    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(authUser));

    setActiveUser({
      id: authUser.id,
      name: authUser.name,
      role: authUser.role,
      email: authUser.email,
      department: authUser.department,
    });

    return authUser;
  };

  const logout = (): void => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setActiveUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        registerOrganizer,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Backwards-compatible adapter for existing components
export const useUser = () => {
  const { user } = useAuth();
  return {
    activeUser: user ? (user as ActiveProfile) : null,
  };
};

