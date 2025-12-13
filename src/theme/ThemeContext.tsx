import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const THEMES = {
  violet: { name: 'Royal Purple', primary: '#7C3AED', secondary: '#EDE9FE', gradient: ['#7C3AED', '#A78BFA'] },
  blue: { name: 'Ocean Blue', primary: '#2563EB', secondary: '#DBEAFE', gradient: ['#2563EB', '#60A5FA'] },
  green: { name: 'Emerald', primary: '#059669', secondary: '#D1FAE5', gradient: ['#059669', '#34D399'] },
  orange: { name: 'Sunset', primary: '#EA580C', secondary: '#FFEDD5', gradient: ['#EA580C', '#FB923C'] },
  rose: { name: 'Velvet', primary: '#E11D48', secondary: '#FFE4E6', gradient: ['#E11D48', '#FB7185'] },
  brown: { name: 'Terre', primary: '#795548', secondary: '#D7CCC8', gradient: ['#8D6E63', '#A1887F'] },
  beige: { name: 'Sable', primary: '#D4A373', secondary: '#FEFAE0', gradient: ['#D4A373', '#E9EDC9'] },
  indigo: { name: 'Indigo', primary: '#4F46E5', secondary: '#E0E7FF', gradient: ['#4F46E5', '#6366F1'] },
  teal: { name: 'Canard', primary: '#00897B', secondary: '#B2DFDB', gradient: ['#00897B', '#4DB6AC'] },
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
      const newVal = !prev;
      AsyncStorage.setItem('userDarkMode', String(newVal));
      return newVal;
    });
  };

  const getStyles = <T,>(styleBuilder: (colors: any) => T): T => {
    const theme = THEMES[currentTheme];
    const colors = {
      primary: theme.primary,
      secondary: isDarkMode ? '#2A2A2A' : theme.secondary,
      gradient: theme.gradient,
      bg: isDarkMode ? '#121212' : '#F3F4F6',
      card: isDarkMode ? '#1E1E1E' : '#FFFFFF',
      modal: isDarkMode ? '#252525' : '#FFFFFF',
      input: isDarkMode ? '#2C2C2C' : '#F9FAFB',
      text: isDarkMode ? '#E5E7EB' : '#1F2937',
      textSec: isDarkMode ? '#9CA3AF' : '#6B7280',
      textInv: isDarkMode ? '#121212' : '#FFFFFF',
      border: isDarkMode ? '#374151' : '#E5E7EB',
      danger: '#EF4444',
      dangerLight: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2',
      success: '#10B981',
      icon: isDarkMode ? '#E5E7EB' : '#4B5563'
    };
    return styleBuilder(colors);
  };

  const value = React.useMemo(() => ({
    currentTheme,
    setTheme: changeTheme,
    activeTheme: THEMES[currentTheme],
    isDarkMode,
    toggleDarkMode,
    getStyles
  }), [currentTheme, isDarkMode]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
