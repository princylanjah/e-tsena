import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Animated, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../../src/context/ThemeContext';
import { useSettings } from '../../src/context/SettingsContext';
import { getDb } from '../../src/db/init';

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  date: string;
  estLu: number;
  achatId?: number;
}

export default function Notifications() {
  const { activeTheme, isDarkMode } = useTheme();
  const { t, language } = useSettings();
  const insets = useSafeAreaInsets();
  
  // 🎨 COULEURS (Définies ici pour être utilisées dans les props)
  const colors = {
    bg: isDarkMode ? '#0F172A' : '#F8FAFC',
    text: isDarkMode ? '#F1F5F9' : '#1E293B',
    textSec: isDarkMode ? '#94A3B8' : '#64748B',
    bgAlt: isDarkMode ? '#334155' : '#F1F5F9',
  };

  const s = getStyles(activeTheme, isDarkMode);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(useCallback(() => { loadNotifications(); }, [filter]));

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [notifications]);

  const loadNotifications = async () => {
    try {
      const db = getDb();
      let query = "SELECT * FROM Notification WHERE date <= datetime('now')";
      if (filter === 'unread') query += " AND estLu = 0";
      query += " ORDER BY date DESC";
      const res = db.getAllSync(query);
      setNotifications(res);
    } catch (e) { console.error(e); } finally { setRefreshing(false); }
  };

  const onRefresh = () => { setRefreshing(true); loadNotifications(); };

  const markAsRead = (id: number) => {
    try { getDb().runSync('UPDATE Notification SET estLu = 1 WHERE id = ?', [id]); loadNotifications(); } catch (e) {}
  };

  const markAllAsRead = () => {
    Alert.alert("Tout marquer comme lu", "Voulez-vous marquer tout comme lu ?", [
      { text: "Annuler", style: 'cancel' },
      { text: "Confirmer", onPress: () => { try { getDb().runSync('UPDATE Notification SET estLu = 1 WHERE estLu = 0'); loadNotifications(); } catch(e){} }}
    ]);
  };

  const deleteNotification = (id: number) => {
    Alert.alert("Supprimer", "Supprimer cette notification ?", [
      { text: "Annuler", style: 'cancel' },
      { text: "Supprimer", style: 'destructive', onPress: () => { try { getDb().runSync('DELETE FROM Notification WHERE id = ?', [id]); loadNotifications(); } catch(e){} }}
    ]);
  };

  const clearAll = () => {
    if (notifications.length === 0) return;
    Alert.alert("Tout effacer", "Voulez-vous tout effacer ?", [
      { text: "Annuler", style: 'cancel' },
      { text: "Effacer", style: 'destructive', onPress: () => { try { getDb().runSync('DELETE FROM Notification'); setNotifications([]); } catch(e){} }}
    ]);
  };

  const handlePress = (item: NotificationItem) => {
    if (item.estLu === 0) markAsRead(item.id);
    if (item.achatId) router.push(`/achat/${item.achatId}`);
  };

  const unreadCount = notifications.filter(n => n.estLu === 0).length;

  return (
    <View style={s.container}>
      <LinearGradient colors={activeTheme?.gradient || ['#7143b5', '#8b5fd4']} style={[s.header, { paddingTop: insets.top + 10 }]}>
        <View style={s.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
          <Text style={s.headerTitle}>Notifications</Text>
          <TouchableOpacity onPress={clearAll} style={s.iconBtn} disabled={notifications.length === 0}><Ionicons name="trash-outline" size={22} color={notifications.length === 0 ? 'rgba(255,255,255,0.4)' : '#fff'} /></TouchableOpacity>
        </View>

        <View style={s.segmentContainer}>
           <View style={s.segmentWrapper}>
              <TouchableOpacity style={[s.segmentBtn, filter === 'all' && s.segmentActive]} onPress={() => setFilter('all')}>
                 <Text style={[s.segmentText, filter === 'all' && s.segmentTextActive]}>Tout</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.segmentBtn, filter === 'unread' && s.segmentActive]} onPress={() => setFilter('unread')}>
                 <Text style={[s.segmentText, filter === 'unread' && s.segmentTextActive]}>Non lues</Text>
                 {unreadCount > 0 && filter === 'all' && <View style={s.tabBadge} />}
              </TouchableOpacity>
           </View>
        </View>
      </LinearGradient>

      <View style={s.contentContainer}>
         {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllAsRead} style={s.markAllLink}>
               <Text style={[s.markAllText, { color: activeTheme.primary }]}>Tout marquer comme lu</Text>
               <Ionicons name="checkmark-done" size={16} color={activeTheme.primary} />
            </TouchableOpacity>
         )}

         <Animated.FlatList
            data={notifications}
            keyExtractor={item => item.id.toString()}
            style={{ opacity: fadeAnim }}
            contentContainerStyle={{ paddingBottom: 50 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[activeTheme.primary]} />}
            ListEmptyComponent={
              <View style={s.emptyState}>
                <Ionicons name="notifications-off-outline" size={60} color={colors.textSec} style={{ opacity: 0.5 }} />
                <Text style={s.emptyTitle}>{filter === 'unread' ? "Vous êtes à jour !" : "Aucune notification"}</Text>
                <Text style={s.emptyText}>Vos alertes apparaîtront ici.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity style={[s.card, item.estLu === 0 && s.unreadCard]} onPress={() => handlePress(item)} activeOpacity={0.7}>
                {item.estLu === 0 && <View style={[s.unreadDot, { backgroundColor: activeTheme.primary }]} />}
                
                {/* Utilisation de `colors` ici pour éviter les erreurs TypeScript */}
                <View style={[s.iconBox, { backgroundColor: item.estLu === 0 ? activeTheme.primary + '15' : colors.bgAlt }]}>
                  <Ionicons name={item.achatId ? "cart" : "notifications"} size={24} color={item.estLu === 0 ? activeTheme.primary : colors.textSec} />
                </View>

                <View style={{ flex: 1 }}>
                   <View style={s.cardHeader}>
                      <Text style={[s.title, item.estLu === 0 && { color: colors.text, fontWeight: '700' }]} numberOfLines={1}>{item.title}</Text>
                      <Text style={s.date}>{format(new Date(item.date), 'dd MMM', { locale: fr })}</Text>
                   </View>
                   <Text style={s.message} numberOfLines={2}>{item.message}</Text>
                </View>
                <TouchableOpacity onPress={() => deleteNotification(item.id)} style={s.deleteAction}>
                   <Ionicons name="close" size={18} color={colors.textSec} />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
         />
      </View>
    </View>
  );
}

const getStyles = (theme: any, dark: boolean) => {
  const bg = dark ? '#0F172A' : '#F8FAFC';
  const cardBg = dark ? '#1E293B' : '#FFFFFF';
  const text = dark ? '#F1F5F9' : '#1E293B';
  const textSec = dark ? '#94A3B8' : '#64748B';
  const border = dark ? '#334155' : '#E2E8F0';

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: bg },
    header: { paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
    iconBtn: { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    segmentContainer: { alignItems: 'center', marginTop: 5 },
    segmentWrapper: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 12, padding: 3 },
    segmentBtn: { paddingVertical: 8, paddingHorizontal: 25, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
    segmentActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
    segmentText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
    segmentTextActive: { color: theme.primary },
    tabBadge: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444', marginLeft: 6, position: 'absolute', top: 6, right: 6 },
    contentContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
    markAllLink: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 5, marginVertical: 10 },
    markAllText: { fontSize: 12, fontWeight: '600' },
    card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: cardBg, padding: 16, borderRadius: 18, marginBottom: 10, borderWidth: 1, borderColor: border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
    unreadCard: { backgroundColor: dark ? '#1E293B' : '#fff', borderColor: theme.primary },
    unreadDot: { width: 8, height: 8, borderRadius: 4, position: 'absolute', top: 16, right: 16 },
    iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, paddingRight: 15 },
    title: { fontSize: 15, fontWeight: '600', color: text, flex: 1 },
    date: { fontSize: 11, color: textSec },
    message: { fontSize: 13, color: textSec, lineHeight: 18 },
    deleteAction: { padding: 5, position: 'absolute', bottom: 10, right: 10 },
    emptyState: { alignItems: 'center', marginTop: 80, opacity: 0.8 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: text, marginVertical: 10 },
    emptyText: { fontSize: 14, color: textSec },
  });
};