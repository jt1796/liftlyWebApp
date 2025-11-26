import { createContext, useContext } from 'react';
import { type User } from 'firebase/auth';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({ currentUser: null, loading: true, logout: async () => {} });

export const useAuth = () => {
  return useContext(AuthContext);
};
