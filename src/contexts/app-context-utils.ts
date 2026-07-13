import { createContext, useContext } from 'react';

export interface AppContextType {
  /** Base light/dark mode – derived from the active color theme */
  darkMode: 'light' | 'dark';
  /** @deprecated Prefer setColorTheme. Kept for backward compat. */
  setDarkMode: (mode: 'light' | 'dark') => void;
  /** Active color‑theme ID (e.g. 'dark', 'midnight-blue', 'sakura') */
  colorTheme: string;
  /** Switch to a named color theme */
  setColorTheme: (themeId: string) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
