import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth, AuthUser } from './AuthContext';
import { ActiveProfile } from '../types';

export interface UserContextType {
  activeUser: ActiveProfile | null;
  profiles: ActiveProfile[];
  switchUser: (profile: ActiveProfile) => void;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const mapAuthUserToActiveProfile = (user: AuthUser | null): ActiveProfile | null => {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    email: user.email,
    department: user.department,
    rollNumber: user.rollNumber,
  };
};

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const activeUser = mapAuthUserToActiveProfile(user);

  return (
    <UserContext.Provider
      value={{
        activeUser,
        profiles: activeUser ? [activeUser] : [],
        switchUser: () => {},
        isLoading,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context) {
    return context;
  }

  // Gracefully fallback to useAuth if UserProvider is not in tree
  try {
    const { user, isLoading } = useAuth();
    const activeUser = mapAuthUserToActiveProfile(user);
    return {
      activeUser,
      profiles: activeUser ? [activeUser] : [],
      switchUser: () => {},
      isLoading,
    };
  } catch {
    return {
      activeUser: null,
      profiles: [],
      switchUser: () => {},
      isLoading: false,
    };
  }
};
