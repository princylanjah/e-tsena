import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🎨 1. TOUTES VOS COULEURS RESTAURÉES (Plus de suppression !)
export const THEMES = {
  rose: { name: 'Rose', primary: '#EC4899', secondary: '#FCE7F3', gradient: ['#EC4899', '#F472B6'] },
  framboise: { name: 'Framboise', primary: '#E91E63', secondary: '#FCE4EC', gradient: ['#E91E63', '#F06292'] },
  violet: { name: 'Original', primary: '#7143b5', secondary: '#e8dff5', gradient: ['#7143b5', '#8b5fd4'] },
  teal:   { name: 'Canard',   primary: '#2D9596', secondary: '#e0f5f5', gradient: ['#2D9596', '#52b5b6'] },
 // rose:   { name: 'Nude',     primary: '#D4A5A5', secondary: '#f9eded', gradient: ['#D4A5A5', '#e8c5c5'] },
  ocean:  { name: 'Océan',    primary: '#0284C7', secondary: '#E0F2FE', gradient: ['#0284C7', '#38BDF8'] },
  amber:  { name: 'Soleil',   primary: '#D97706', secondary: '#FEF3C7', gradient: ['#D97706', '#FBBF24'] },
  green: { name: 'Emerald', primary: '#059669', secondary: '#D1FAE5', gradient: ['#059669', '#34D399'] },
 
  jaune: { name: 'Jaune', primary: '#CA8A04', secondary: '#FEF08A', gradient: ['#CA8A04', '#EAB308'] },
  beige: { name: 'Beige', primary: '#D4A373', secondary: '#FAEDCD', gradient: ['#D4A373', '#E9C46A'] },
  brown: { name: 'Coffee', primary: '#8d5433ff', secondary: '#FEF3C7', gradient: ['#e7a782ff', '#92400E'] },
  indigo: { name: 'Midnight', primary: '#4338CA', secondary: '#E0E7FF', gradient: ['#4338CA', '#6366F1'] },
 // teal: { name: 'Duck', primary: '#0D9488', secondary: '#CCFBF1', gradient: ['#0D9488', '#14B8A6'] },
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
    const loadSettings = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('userTheme');
        const savedMode = await AsyncStorage.getItem('userDarkMode');

        // 🛡️ SÉCURITÉ ANTI-CRASH : On vérifie si le thème existe vraiment
        if (savedTheme && Object.keys(THEMES).includes(savedTheme)) {
          setCurrentTheme(savedTheme as ThemeKey);
        } else {
          // Si le thème n'existe pas, on met violet par défaut (sans planter)
          setCurrentTheme('violet'); 
        }

        if (savedMode) setIsDarkMode(savedMode === 'true');
      } catch (e) {
        console.warn("Erreur chargement thème:", e);
      }
    };
    loadSettings();
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
    // 🛡️ SÉCURITÉ : Fallback sur violet si currentTheme est invalide
    const theme = THEMES[currentTheme] || THEMES.violet;
    
    const colors = {
      primary: theme.primary,
      secondary: theme.secondary,
      gradient: theme.gradient,
      
      // Mode Sombre amélioré (Gris bleuté nuit au lieu de noir pur)
      bg: isDarkMode ? '#0F172A' : '#F8FAFC', 
      card: isDarkMode ? '#1E293B' : '#FFFFFF',
      text: isDarkMode ? '#F1F5F9' : '#1E293B',
      textSec: isDarkMode ? '#94A3B8' : '#64748B',
      border: isDarkMode ? '#334155' : '#E2E8F0',
      borderAlt: isDarkMode ? '#475569' : '#CBD5E1', // Pour les traits fins
      
      input: isDarkMode ? '#020617' : '#FFFFFF',
      modal: isDarkMode ? '#1E293B' : '#FFFFFF',
      
      danger: '#EF4444',
      dangerLight: isDarkMode ? '#7F1D1D' : '#FEE2E2',
      success: '#10B981',
      
      shadow: isDarkMode ? 0.3 : 0.08,
    };
    return styleBuilder(colors);
  };

  const safeActiveTheme = THEMES[currentTheme] || THEMES.violet;

  return (
    <ThemeContext.Provider value={{
      currentTheme,
      setTheme: changeTheme,
      activeTheme: safeActiveTheme,
      isDarkMode,
      toggleDarkMode,
      getStyles
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);