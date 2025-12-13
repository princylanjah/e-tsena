import React from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, THEMES, ThemeKey } from '../../src/context/ThemeContext';
import { useSettings } from '../../src/context/SettingsContext';
import { router } from 'expo-router';

export default function ThemeSelectorPage() {
  const { activeTheme, currentTheme, setTheme, isDarkMode, toggleDarkMode, getStyles } = useTheme();
  const { t } = useSettings();
  const insets = useSafeAreaInsets();
  const s = getStyles(styles);

  return (
    <View style={s.container}>
      
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        {/* FIL D'ARIANE */}
        <TouchableOpacity 
          onPress={() => router.push('/')} 
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, opacity: 0.7 }}
        >
          <Ionicons name="home-outline" size={14} color={isDarkMode ? '#94A3B8' : '#6B7280'} />
          <Text style={{ color: isDarkMode ? '#94A3B8' : '#6B7280', fontSize: 11, marginLeft: 4 }}>{t('home')}</Text>
          <Ionicons name="chevron-forward" size={12} color={isDarkMode ? '#94A3B8' : '#6B7280'} style={{ marginHorizontal: 3 }} />
          <Text style={{ color: activeTheme.primary, fontSize: 11, fontWeight: 'bold' }}>{t('customization')}</Text>
        </TouchableOpacity>
        
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color={s.text.color} />
          </TouchableOpacity>
          <Text style={s.title}>{t('customization')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        
        {/* Dark Mode Switch */}
        <View style={s.card}>
          <View style={s.rowBetween}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[s.iconBox, { backgroundColor: isDarkMode ? '#333' : '#eee' }]}>
                <Ionicons name={isDarkMode ? "moon" : "sunny"} size={22} color={activeTheme.primary} />
              </View>
              <View>
                <Text style={s.cardTitle}>{t('dark_mode')}</Text>
                <Text style={s.cardSub}>{t('dark_mode_desc')}</Text>
              </View>
            </View>
            <Switch 
              value={isDarkMode} 
              onValueChange={toggleDarkMode}
              trackColor={{ false: '#E5E7EB', true: activeTheme.primary }}
              thumbColor={'#fff'}
            />
          </View>
        </View>

        <Text style={s.sectionTitle}>{t('available_themes')}</Text>
        
        <View style={s.grid}>
          {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
            const theme = THEMES[key];
            const isActive = currentTheme === key;
            
            return (
              <TouchableOpacity 
                key={key} 
                style={[s.themeCard, isActive && { borderColor: theme.primary, borderWidth: 2 }]}
                onPress={() => setTheme(key)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={theme.gradient as any}
                  style={s.previewGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {isActive && (
                    <View style={s.checkCircle}>
                      <Ionicons name="checkmark" size={16} color={theme.primary} />
                    </View>
                  )}
                </LinearGradient>
                <Text style={[s.themeName, isActive && { color: theme.primary, fontWeight: 'bold' }]}>
                  {theme.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = (c: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20 },
  backBtn: { marginRight: 16, padding: 4 },
  title: { fontSize: 24, fontWeight: 'bold', color: c.text },
  content: { padding: 20 },
  card: { backgroundColor: c.card, borderRadius: 16, padding: 20, marginBottom: 30, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: c.text },
  cardSub: { fontSize: 13, color: c.textSec, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: c.text, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  themeCard: { width: '48%', backgroundColor: c.card, borderRadius: 16, padding: 8, elevation: 2, marginBottom: 4, borderWidth: 2, borderColor: 'transparent' },
  previewGradient: { height: 80, borderRadius: 12, marginBottom: 10, justifyContent: 'center', alignItems: 'center' },
  themeName: { textAlign: 'center', fontSize: 14, fontWeight: '500', color: c.text, marginBottom: 4 },
  checkCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  
  // Helpers
  text: { color: c.text }
});
