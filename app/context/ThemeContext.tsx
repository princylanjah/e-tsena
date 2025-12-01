import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const THEMES = {
  rose: { name: 'Rose', primary: '#EC4899', secondary: '#FCE7F3', gradient: ['#EC4899', '#F472B6'] },
  framboise: { name: 'Framboise', primary: '#E91E63', secondary: '#FCE4EC', gradient: ['#E91E63', '#F06292'] },
  violet: { name: 'Royal Purple', primary: '#7C3AED', secondary: '#EDE9FE', gradient: ['#7C3AED', '#A78BFA'] },
  blue: { name: 'Ocean Blue', primary: '#2563EB', secondary: '#DBEAFE', gradient: ['#2563EB', '#60A5FA'] },
  green: { name: 'Emerald', primary: '#059669', secondary: '#D1FAE5', gradient: ['#059669', '#34D399'] },
  orange: { name: 'Sunset', primary: '#EA580C', secondary: '#FFEDD5', gradient: ['#EA580C', '#FB923C'] },
  jaune: { name: 'Jaune', primary: '#CA8A04', secondary: '#FEF08A', gradient: ['#CA8A04', '#EAB308'] },
  beige: { name: 'Beige', primary: '#D4A373', secondary: '#FAEDCD', gradient: ['#D4A373', '#E9C46A'] },
  brown: { name: 'Coffee', primary: '#78350F', secondary: '#FEF3C7', gradient: ['#78350F', '#92400E'] },
  indigo: { name: 'Midnight', primary: '#4338CA', secondary: '#E0E7FF', gradient: ['#4338CA', '#6366F1'] },
  teal: { name: 'Duck Blue', primary: '#0D9488', secondary: '#CCFBF1', gradient: ['#0D9488', '#14B8A6'] },
};

export type ThemeKey = keyof typeof THEMES;

interface ThemeContextType {
  currentTheme: ThemeKey;
  setTheme: (key: ThemeKey) => void;
  activeTheme: typeof THEMES['violet'];
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  getStyles: <T>(builder: (colors: any) => T) => T;
}

const defaultContext: ThemeContextType = {
  currentTheme: 'violet',
  setTheme: () => {},
  activeTheme: THEMES.violet,
  isDarkMode: false,
  toggleDarkMode: () => {},
  getStyles: (b) => b({ primary: '#7C3AED', bg: '#fff', text: '#000' })
};

const ThemeContext = createContext<ThemeContextType>(defaultContext);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeKey>('violet');
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('userTheme').then(t => t && setCurrentTheme(t as ThemeKey));
    AsyncStorage.getItem('userDarkMode').then(d => d && setIsDarkMode(d === 'true'));
  }, []);

  const changeTheme = (key: ThemeKey) => {
    setCurrentTheme(key);
    AsyncStorage.setItem('userTheme', key);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      AsyncStorage.setItem('userDarkMode', String(!prev));
      return !prev;
    });
  };

  const getStyles = <T,>(styleBuilder: (colors: any) => T): T => {
    const theme = THEMES[currentTheme];
    const colors = {
      primary: theme.primary,
      secondary: theme.secondary,
      gradient: theme.gradient,
      bg: isDarkMode ? '#121212' : '#F3F4F6',
      card: isDarkMode ? '#1E1E1E' : '#FFFFFF',
      text: isDarkMode ? '#FFFFFF' : '#1F2937',
      textSec: isDarkMode ? '#AAAAAA' : '#6B7280',
      border: isDarkMode ? '#333333' : '#E5E7EB',
      input: isDarkMode ? '#2C2C2C' : '#F9FAFB',
      modal: isDarkMode ? '#1E1E1E' : '#FFFFFF',
      danger: '#EF4444',
      dangerLight: isDarkMode ? '#450a0a' : '#FEE2E2',
      success: '#10B981'
    };
    return styleBuilder(colors);
  };

  return (
    <ThemeContext.Provider value={{
      currentTheme,
      setTheme: changeTheme,
      activeTheme: THEMES[currentTheme],
      isDarkMode,
      toggleDarkMode,
      getStyles
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);