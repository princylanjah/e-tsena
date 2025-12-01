import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../../src/context/SettingsContext';
import { getDb } from '../../src/db/init';

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  date: string;
  read: number;
  achatId?: number;
}

export default function Notifications() {
  const { activeTheme, isDarkMode } = useTheme();
  const { t, language } = useSettings();
  const insets = useSafeAreaInsets();
  const s = getStyles(activeTheme, isDarkMode);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = () => {
    try {
      const db = getDb();
      // Filtrer pour ne montrer que les notifications dont la date est passée ou présente
      const res = db.getAllSync("SELECT * FROM Notification WHERE date <= datetime('now') ORDER BY date DESC") as NotificationItem[];
      setNotifications(res);
      
      // Marquer tout comme lu après chargement (optionnel, ou au clic)
      if (res.length > 0) {
        db.runSync('UPDATE Notification SET read = 1 WHERE read = 0');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const clearAll = () => {
    try {
      const db = getDb();
      db.runSync('DELETE FROM Notification');
      setNotifications([]);
    } catch (e) { console.error(e); }
  };

  const handlePress = (item: NotificationItem) => {
    if (item.achatId) {
      router.push(`/achat/${item.achatId}`);
    }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      
      {/* HEADER */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={activeTheme.primary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('notifications')}</Text>
        <TouchableOpacity onPress={clearAll}>
           <Text style={{ color: activeTheme.primary, fontSize: 12 }}>{t('clear')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={{ padding: 20 }}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[s.card, item.read === 0 && s.unreadCard]} 
            onPress={() => handlePress(item)}
            activeOpacity={0.7}
          >
            <View style={[s.iconBox, { backgroundColor: activeTheme.secondary }]}>
              <Ionicons name={item.achatId ? "alarm" : "notifications"} size={24} color={activeTheme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={s.title}>{item.title}</Text>
                <Text style={s.date}>{format(new Date(item.date), 'dd MMM HH:mm', { locale: language === 'en' ? enUS : fr })}</Text>
              </View>
              <Text style={s.message}>{item.message}</Text>
              {item.achatId && (
                 <Text style={{ color: activeTheme.primary, fontSize: 12, marginTop: 5, fontWeight: '600' }}>
                    {t('see_list')} <Ionicons name="arrow-forward" size={12} />
                 </Text>
              )}
            </View>
            {item.read === 0 && <View style={[s.dot, { backgroundColor: activeTheme.primary }]} />}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <Ionicons name="notifications-off-outline" size={48} color="#ccc" />
            <Text style={s.emptyText}>{t('no_notifications')}</Text>
          </View>
        }
      />
    </View>
  );
}

const getStyles = (theme: any, dark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: dark ? '#0F172A' : '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 20, backgroundColor: dark ? '#1E293B' : '#fff', borderBottomWidth: 1, borderColor: dark ? '#334155' : '#F1F5F9' },
  backBtn: { padding: 8, borderRadius: 12, backgroundColor: dark ? '#334155' : '#F1F5F9' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: dark ? '#fff' : '#333' },
  
  card: { 
    flexDirection: 'row', gap: 15, padding: 16, 
    backgroundColor: dark ? '#1E293B' : '#fff', 
    borderRadius: 20, marginBottom: 12, alignItems: 'center', 
    borderWidth: 1, borderColor: theme.primary + '60', // Contour couleur thème
    shadowColor: theme.primary, shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3
  },
  unreadCard: { 
    backgroundColor: dark ? '#1E293B' : '#F0F9FF',
    borderColor: theme.primary, borderWidth: 2 // Plus épais si non lu
  },
  iconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: dark ? '#fff' : '#333', marginBottom: 4 },
  message: { fontSize: 14, color: dark ? '#94A3B8' : '#64748B', lineHeight: 20 },
  date: { fontSize: 12, color: dark ? '#64748B' : '#94A3B8' },
  dot: { width: 8, height: 8, borderRadius: 4, position: 'absolute', top: 16, right: 16 },
  
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 10, color: '#999', fontSize: 16 }
});
