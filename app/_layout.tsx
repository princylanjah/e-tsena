import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { initDatabase, checkDatabase } from '@db/init';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator, Text, TouchableOpacity, Alert, StatusBar } from 'react-native';

// 👇 MODIFICATION ICI : On utilise ".." pour remonter à la racine si le dossier est hors de "app"
// Si cela ne marche pas, essaie : import { COLORS } from '@/constants/colors';
import { COLORS } from '../src/constants/colors'; 

export default function Layout() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function prepare() {
      try {
        console.log('🚀 Démarrage de l\'application E-tsena...');
        await Font.loadAsync({ ...Ionicons.font });
        setFontsLoaded(true);
        
        const dbInitialized = initDatabase();
        const dbChecked = checkDatabase();
        
        if (dbChecked) {
          setDbReady(true);
        } else {
          throw new Error('La vérification de la base de données a échoué');
        }
      } catch (e: any) {
        console.error('❌ ERREUR CRITIQUE:', e);
        setError(e.message || 'Erreur inconnue');
        Alert.alert('Erreur d\'initialisation', e.message, [
          { 
            text: 'Réessayer', 
            onPress: () => { setError(null); setFontsLoaded(false); setDbReady(false); prepare(); } 
          }
        ]);
      }
    }
    prepare();
  }, []);

  // --- 1. Écran d'erreur ---
  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#FFF5F5' }}>
        <StatusBar backgroundColor="#FFF5F5" barStyle="dark-content" />
        
        {/* Utilisation de COLORS.danger (si l'import échoue encore, remplace par '#f44336') */}
        <Ionicons name="warning" size={64} color={COLORS.danger} />
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginTop: 16, color: COLORS.text }}>
          Erreur d'initialisation
        </Text>
        <Text style={{ fontSize: 14, color: COLORS.textLight, marginTop: 8, textAlign: 'center' }}>
          {error}
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 24 }}
          onPress={() => { setError(null); setFontsLoaded(false); setDbReady(false); }}
        >
          <Text style={{ color: COLORS.white, fontWeight: 'bold' }}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- 2. Écran de chargement ---
  if (!fontsLoaded || !dbReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primaryPale }}>
        <StatusBar backgroundColor={COLORS.primaryPale} barStyle="dark-content" />
        
        <Ionicons name="basket" size={64} color={COLORS.primary} />
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginTop: 16, color: COLORS.primary }}>
          E-tsena
        </Text>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 24 }} />
        <Text style={{ fontSize: 14, color: COLORS.primaryDark, marginTop: 12 }}>
          {!fontsLoaded ? 'Chargement des fonts...' : 'Initialisation de la base de données...'}
        </Text>
      </View>
    );
  }

  // --- 3. Application Principale ---
  return (
    <>
      {/* ✅ StatusBar VIOLETTE (#7143b5) pour correspondre à ton thème Violet/Accueil */}
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        
        <Stack.Screen 
          name="achat/[id]/index" 
          options={{ 
            headerShown: false, 
            title: 'Détails achat',
            headerStyle: { backgroundColor: COLORS.primary },
            headerTintColor: COLORS.white,
            headerTitleStyle: { fontWeight: 'bold' }
          }} 
        />
        
        <Stack.Screen name="analyse-produit/index" options={{ headerShown: false }} />
        
        <Stack.Screen 
          name="nouvel-achat/index" 
          options={{ 
            headerShown: true,
            title: 'Nouvelle liste',
            headerStyle: { backgroundColor: COLORS.primary },
            headerTintColor: COLORS.white,
            headerTitleStyle: { fontWeight: 'bold' },
          }} 
        />
        
        <Stack.Screen name="rapports/index" options={{ headerShown: false }} />
        <Stack.Screen name="statistiques/index" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}