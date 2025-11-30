import { createContext, useContext } from 'react';

export interface AppContextType {
  darkMode: 'light' | 'dark';
  setDarkMode: (mode: 'light' | 'dark') => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
