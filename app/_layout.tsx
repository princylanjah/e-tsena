import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { initDatabase, checkDatabase } from '../src/db/init';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator, Text } from 'react-native';
import { ThemedStatusBar } from '../src/components/ThemedStatusBar';
import { useTheme, ThemeProvider } from '../src/context/ThemeContext';
import { SettingsProvider } from '../src/context/SettingsContext';

// 👇 1. Import du service de notification
import { Notifications } from '../src/services/notificationService';

function RootLayoutNav() {
  const { activeTheme } = useTheme();
  const headerColor = activeTheme?.primary || '#7143b5';

  return (
    <>
      <ThemedStatusBar />
      <Stack screenOptions={{ headerShown: false }}>
        {/* Onglets principaux */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        
        {/* Détail Achat - Notez que c'est souvent "achat/[id]" ou "achat/[id]/index" selon votre dossier. 
            Si ça plante, essayez juste "achat/[id]" */}
        <Stack.Screen 
          name="achat/[id]/index" 
          options={{ 
            headerShown: false, 
            title: 'Détails achat',
            headerStyle: { backgroundColor: headerColor },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' }
          }} 
        />
        
        {/* ✅ CORRECTION ICI : On retire "/index" des noms */}
        <Stack.Screen name="analyse_produit" options={{ headerShown: false }} />
        <Stack.Screen name="rapports/index" options={{ headerShown: false }} />
        <Stack.Screen name="statistiques/index" options={{ headerShown: false }} />
        <Stack.Screen name="notifications/index" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function Layout() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter(); 

  useEffect(() => {
    async function prepare() {
      try {
        await Font.loadAsync({ ...Ionicons.font });
        setFontsLoaded(true);
        initDatabase();
        if (checkDatabase()) setDbReady(true);
      } catch (e: any) {
        console.error(e);
        setError(e.message);
      }
    }
    prepare();

    // 👇 3. GESTION DES CLICS SUR NOTIFICATION
    let responseListener: any;
    
    if (Notifications) {
      responseListener = Notifications.addNotificationResponseReceivedListener((response: any) => {
        const data = response.notification.request.content.data;
        if (data?.url) {
          setTimeout(() => {
            router.push(data.url);
          }, 500);
        }
      });
    }

    return () => {
      if (Notifications && responseListener) {
        Notifications.removeNotificationSubscription(responseListener);
      }
    };
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF5F5' }}>
         <Ionicons name="warning" size={50} color="red" />
         <Text style={{ marginTop: 20 }}>Erreur: {error}</Text>
      </View>
    );
  }

  if (!fontsLoaded || !dbReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#7143b5" />
      </View>
    );
  }

  return (
    <SettingsProvider>
      <ThemeProvider>
        <RootLayoutNav />
      </ThemeProvider>
    </SettingsProvider>
  );
}