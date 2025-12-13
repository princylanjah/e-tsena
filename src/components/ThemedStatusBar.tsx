import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../context/ThemeContext';
import { View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native'; // 👇 IMPORT IMPORTANT

interface Props {
  transparent?: boolean;
}

export const ThemedStatusBar = ({ transparent = false }: Props) => {
  const { activeTheme } = useTheme();
  const insets = useSafeAreaInsets();
  
  // 👇 Vérifie si l'écran est actif/visible
  const isFocused = useIsFocused();

  // Si l'écran n'est pas focus (il est en arrière-plan), on ne rend rien
  // Cela empêche les anciens écrans d'écraser la couleur actuelle
  if (!isFocused) {
    return null;
  }

  const backgroundColor = transparent ? 'transparent' : activeTheme.primary;

  return (
    <>
      <StatusBar 
        style="light" 
        backgroundColor={backgroundColor}
        translucent={transparent} 
        // Force la mise à jour sur Android
        animated={true}
      />

      {!transparent && Platform.OS === 'ios' && (
        <View 
          style={{ 
            height: insets.top, 
            backgroundColor: activeTheme.primary,
            position: 'absolute',
            top: 0, left: 0, right: 0, zIndex: 999
          }} 
        />
      )}
    </>
  );
};