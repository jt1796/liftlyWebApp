import React, { useState } from 'react';
import { AppContext, type AppContextType } from './app-context-utils';

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
  const [darkMode, setDarkModeState] = useState<'light' | 'dark'>(() => {
    const storedValue = getLocalStorage<'light' | 'dark'>('darkmode', 'dark');
    return storedValue === 'dark' ? 'dark' : 'light';
  });

  const setDarkMode = (mode: 'light' | 'dark') => {
    setDarkModeState(mode);
    setLocalStorage('darkmode', mode);
  };

  const value: AppContextType = {
    darkMode,
    setDarkMode,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
