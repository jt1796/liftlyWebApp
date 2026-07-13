import React, { useState } from 'react';
import { AppContext, type AppContextType } from './app-context-utils';
import { getThemeById } from '../themes';

const getLocalStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const value = localStorage.getItem(key);
    if (value) {
      return JSON.parse(value) as T;
    }
    return defaultValue;
  } catch (e) {
    console.error('Error reading from localStorage', e);
    return defaultValue;
  }
};

const setLocalStorage = <T,>(key: string, value: T) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Error writing to localStorage', e);
  }
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [colorThemeId, setColorThemeIdState] = useState<string>(() => {
    // Migrate from legacy 'darkmode' key if 'colorTheme' isn't set yet
    const stored = getLocalStorage<string | null>('colorTheme', null);
    if (stored) return stored;
    // Fall back to legacy value
    const legacy = getLocalStorage<'light' | 'dark'>('darkmode', 'dark');
    return legacy === 'light' ? 'light' : 'dark';
  });

  const themeDef = getThemeById(colorThemeId);

  const setColorTheme = (themeId: string) => {
    const resolved = getThemeById(themeId);
    setColorThemeIdState(resolved.id);
    setLocalStorage('colorTheme', resolved.id);
    // Keep legacy key in sync so older code/service-workers still work
    setLocalStorage('darkmode', resolved.baseMode);
  };

  // Backward-compatible setDarkMode: picks the default light/dark theme
  const setDarkMode = (mode: 'light' | 'dark') => {
    setColorTheme(mode);
  };

  const value: AppContextType = {
    darkMode: themeDef.baseMode,
    setDarkMode,
    colorTheme: themeDef.id,
    setColorTheme,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
