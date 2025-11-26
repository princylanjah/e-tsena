import React, { createContext, useContext, useState } from 'react';

// 🎨 PALETTE PREMIUM
export const THEMES = {
  violet: { 
    name: 'Royal Purple',
    primary: '#7C3AED', 
    gradient: ['#7C3AED', '#A78BFA', '#DDD6FE'], 
    secondary: '#EDE9FE',
    text: '#4C1D95'
  },
  blue: { 
    name: 'Ocean Blue',
    primary: '#2563EB', 
    gradient: ['#2563EB', '#60A5FA', '#BFDBFE'], 
    secondary: '#DBEAFE',
    text: '#1E3A8A'
  },
  green: { 
    name: 'Mint Forest',
    primary: '#059669', 
    gradient: ['#059669', '#34D399', '#A7F3D0'], 
    secondary: '#D1FAE5',
    text: '#064E3B'
  },
  orange: { 
    name: 'Sunset',
    primary: '#EA580C', 
    gradient: ['#EA580C', '#FB923C', '#FFedd5'], 
    secondary: '#FFEDD5',
    text: '#7C2D12'
  },
  pink: { 
    name: 'Berry',
    primary: '#DB2777', 
    gradient: ['#DB2777', '#F472B6', '#FBCFE8'], 
    secondary: '#FCE7F3',
    text: '#831843'
  },
};

export type ThemeKey = keyof typeof THEMES;

interface ThemeContextType {
  currentTheme: ThemeKey;
  setTheme: (theme: ThemeKey) => void;
  activeTheme: typeof THEMES['violet'];
}

const ThemeContext = createContext<ThemeContextType>({
  currentTheme: 'violet',
  setTheme: () => {},
  activeTheme: THEMES.violet,
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentTheme, setCurrentThemeState] = useState<ThemeKey>('violet');

  return (
    <ThemeContext.Provider value={{
      currentTheme,
      setTheme: (key) => setCurrentThemeState(key),
      activeTheme: THEMES[currentTheme],
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);