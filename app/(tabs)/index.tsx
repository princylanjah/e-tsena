import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, 
  TextInput, Modal, Switch, StatusBar, Dimensions, Animated, Alert, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleShoppingReminder } from '../../src/services/notificationService';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';

import { getDb } from '../../src/db/init';
import { Logo } from '../../src/components/Logo';
import { useTheme, THEMES, ThemeKey } from '../context/ThemeContext'; 
import { useSettings } from '../../src/context/SettingsContext'; 
import { ConfirmModal } from '../../src/components/ConfirmModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- HEADER ANIMÉ (BAZAR STYLE) ---
const BazarHeader = () => {
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim1, { toValue: 1, duration: 4000, useNativeDriver: true }),
          Animated.timing(anim1, { toValue: 0, duration: 4000, useNativeDriver: true })
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim2, { toValue: 1, duration: 5000, delay: 1000, useNativeDriver: true }),
          Animated.timing(anim2, { toValue: 0, duration: 5000, useNativeDriver: true })
        ])
      )
    ]).start();
  }, []);

  const translateY1 = anim1.interpolate({ inputRange: [0, 1], outputRange: [0, -15] });
  const translateY2 = anim2.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const rotate1 = anim1.interpolate({ inputRange: [0, 1], outputRange: ['-5deg', '0deg'] });
  const rotate2 = anim2.interpolate({ inputRange: [0, 1], outputRange: ['10deg', '5deg'] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Cercles décoratifs d'arrière-plan */}
      <View style={{ position: 'absolute', top: -80, right: -60, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,255,255,0.04)' }} />
      <View style={{ position: 'absolute', top: 80, left: -40, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.03)' }} />
      
      {/* Animation des sacs overlapping */}
      <View style={{ position: 'absolute', top: 40, right: 20, width: 200, height: 200 }}>
         {/* Sac arrière (plus grand, flou) */}
         <Animated.View style={{ 
             position: 'absolute', top: 0, right: 40, opacity: 0.08,
             transform: [{ translateY: translateY2 }, { rotate: rotate1 }, { scale: 1.1 }] 
         }}>
            <Ionicons name="bag-handle" size={180} color="#fff" />
         </Animated.View>

         {/* Sac avant (plus net) */}
         <Animated.View style={{ 
             position: 'absolute', top: 40, right: 10, opacity: 0.15,
             transform: [{ translateY: translateY1 }, { rotate: rotate2 }] 
         }}>
            <Ionicons name="bag" size={140} color="#fff" />
            {/* Détail brillant */}
            <View style={{ position: 'absolute', top: 40, left: 30, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)' }} />
         </Animated.View>
      </View>
    </View>
  );
};

interface Achat {
  id: number;
  nomListe: string;
  dateAchat: string;
  totalDepense: number;
  nombreArticles: number;
}

export default function Home() {
  // 🎨 THEME & SETTINGS
  const { currentTheme, setTheme, activeTheme, isDarkMode, toggleDarkMode } = useTheme();
  const { currency, setCurrency, language, setLanguage, t } = useSettings();
  const insets = useSafeAreaInsets();
  
  // ÉTATS
  const [achats, setAchats] = useState<Achat[]>([]);
  const [filteredAchats, setFilteredAchats] = useState<Achat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortMode, setSortMode] = useState<'date' | 'name' | 'amount'>('date');

  // MODALS
  const [showSettings, setShowSettings] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [selectedAchat, setSelectedAchat] = useState<Achat | null>(null);
  const [deleteModal, setDeleteModal] = useState(false);
  
  // Rappel & Notifications
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reminderDate, setReminderDate] = useState(new Date());
  const [mode, setMode] = useState<'date' | 'time'>('date');
  const [unreadCount, setUnreadCount] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // --- NETTOYAGE (Mandeha rehefa miverina eto ianao) ---
  const cleanEmptyLists = (db: any) => {
    try {
      // Fafana ny liste izay "Nouvelle Liste" sady tsy misy entana (0 articles)
      db.runSync(`
        DELETE FROM Achat 
        WHERE (nomListe = 'Nouvelle Liste' OR nomListe = '' OR nomListe IS NULL)
        AND id NOT IN (SELECT DISTINCT idAchat FROM LigneAchat)
      `);
    } catch (e) { console.log("Erreur nettoyage:", e); }
  };

  // --- CHARGEMENT ---
  const loadData = useCallback(() => {
    try {
      const db = getDb();
      
      // 1. Diovina aloha
      cleanEmptyLists(db);

      // 2. Avy eo alaina ny marina
      const result = db.getAllSync(`
        SELECT a.id, a.nomListe, a.dateAchat, 
        COALESCE(SUM(l.prixTotal), 0) as totalDepense,
        COUNT(l.id) as nombreArticles
        FROM Achat a
        LEFT JOIN LigneAchat l ON a.id = l.idAchat
        GROUP BY a.id
        ORDER BY a.dateAchat DESC
      `) as Achat[];

      // Compter les notifications non lues
      const unread = db.getFirstSync('SELECT count(*) as c FROM Notification WHERE read = 0') as {c: number};
      setUnreadCount(unread?.c || 0);

      let sorted = [...result];
      if (sortMode === 'name') sorted.sort((a, b) => a.nomListe.localeCompare(b.nomListe));
      else if (sortMode === 'amount') sorted.sort((a, b) => b.totalDepense - a.totalDepense);
      
      setAchats(sorted);
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();

    } catch (e) { console.error(e); }
  }, [sortMode]);

  // Mampiasa useFocusEffect mba hi-refresh isaky ny miverina
  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  useEffect(() => {
    if (searchQuery === '') setFilteredAchats(achats);
    else setFilteredAchats(achats.filter(a => a.nomListe.toLowerCase().includes(searchQuery.toLowerCase())));
  }, [searchQuery, achats]);

  // Création
  const handleCreate = () => {
    try {
      const db = getDb();
      const res = db.runSync('INSERT INTO Achat (nomListe, dateAchat) VALUES (?, ?)', [t('new_list'), new Date().toISOString()]);
      // Tsy misy suppression eto, lasa avy hatrany any amin'ny page manaraka
      router.push(`/achat/${res.lastInsertRowId}`);
    } catch (e) { console.error(e); }
  };

  // Rappel
  const handleReminder = () => {
    setMode('date');
    setShowDatePicker(true);
    setShowActions(false);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type === 'set' && selectedDate) {
        if (mode === 'date') {
          const newDate = new Date(reminderDate);
          newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
          setReminderDate(newDate);
          setTimeout(() => {
            setMode('time');
            setShowDatePicker(true);
          }, 100);
        } else {
          const newDate = new Date(reminderDate);
          newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
          setReminderDate(newDate);
          scheduleReminder(newDate);
          setMode('date');
        }
      } else {
        setMode('date');
      }
    } else {
      if (selectedDate) setReminderDate(selectedDate);
    }
  };

  const scheduleReminder = async (date: Date) => {
      if (!selectedAchat) return;
      const id = await scheduleShoppingReminder(selectedAchat.nomListe, date, selectedAchat.id);
      if (id) {
          Alert.alert(t('reminder_title'), `${t('reminder_set')} ${format(date, 'dd/MM HH:mm')}`);
      } else {
          Alert.alert(t('error'), t('reminder_error'));
      }
  };

  // Suppression Manuelle (Demande)
  const handleDelete = () => {
    setShowActions(false);
    setTimeout(() => setDeleteModal(true), 300);
  };

  // Confirmation réelle
  const confirmDelete = () => {
    if (!selectedAchat) return;
    try {
      getDb().runSync('DELETE FROM LigneAchat WHERE idAchat = ?', [selectedAchat.id]);
      getDb().runSync('DELETE FROM Achat WHERE id = ?', [selectedAchat.id]);
      setDeleteModal(false);
      loadData();
    } catch (e) { console.error(e); }
  };

  // Styles dynamiques
  const s = getStyles(isDarkMode, activeTheme);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyExpenses = achats
    .filter(a => {
      const d = new Date(a.dateAchat);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((acc, item) => acc + item.totalDepense, 0);
  
  const totalArticles = achats.reduce((acc, item) => acc + item.nombreArticles, 0);
  const monthName = format(new Date(), 'MMMM', { locale: language === 'en' ? enUS : fr });

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* HEADER */}
      <LinearGradient colors={activeTheme.gradient as any} style={[s.header, { paddingTop: insets.top + 10 }]}>
        <BazarHeader />
        <View style={s.headerTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Logo size={42} colors={['#fff', '#E0E7FF'] as any} />
            <View>
              <Text style={s.appName}>E-tsena</Text>
              <Text style={s.appSub}>{t('my_groceries')}</Text>
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', gap: 8 }}>
             <TouchableOpacity style={s.iconBtn} onPress={() => router.push('/notifications')}>
                <Ionicons name="notifications-outline" size={20} color="#fff" />
                {unreadCount > 0 && <View style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1, borderColor: '#fff' }} />}
             </TouchableOpacity>
             <TouchableOpacity style={s.iconBtn} onPress={() => setShowThemes(true)}>
                <Ionicons name="color-palette-outline" size={20} color="#fff" />
             </TouchableOpacity>
             <TouchableOpacity style={s.iconBtn} onPress={() => setShowSettings(true)}>
                <Ionicons name="settings-outline" size={20} color="#fff" />
             </TouchableOpacity>
          </View>
        </View>

        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={20} color="rgba(255,255,255,0.7)" />
          <TextInput 
            style={s.searchInput} placeholder={t('search')} placeholderTextColor="rgba(255,255,255,0.6)"
            value={searchQuery} onChangeText={setSearchQuery}
          />
        </View>

        {/* SUMMARY ROW */}
        <View style={s.summaryRow}>
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>{t('expenses')} ({monthName})</Text>
            <Text style={[s.summaryValue, { color: activeTheme.primary }]}>{monthlyExpenses.toLocaleString()} {currency}</Text>
          </View>
          <View style={s.verticalDivider} />
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>{t('articles')}</Text>
            <Text style={[s.summaryValue, { color: activeTheme.primary }]}>{totalArticles} pcs</Text>
          </View>
        </View>
      </LinearGradient>

      {/* CONTENU */}
      <View style={s.content}>
        
        <View style={s.controlBar}>
          <Text style={s.sectionTitle}>{t('recent_lists')}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={s.outlineBtn} onPress={() => setShowSort(true)}>
               <Ionicons name="filter-outline" size={18} color={s.textSec.color} />
               <Text style={{ fontSize: 12, color: s.textSec.color }}>{t('sort')}</Text>
            </TouchableOpacity>
            <View style={s.viewToggle}>
               <TouchableOpacity onPress={() => setViewMode('list')} style={[s.toggleBtn, viewMode === 'list' && s.toggleActive]}>
                 <Ionicons name="list" size={20} color={viewMode === 'list' ? activeTheme.primary : s.text.color} />
               </TouchableOpacity>
               <TouchableOpacity onPress={() => setViewMode('grid')} style={[s.toggleBtn, viewMode === 'grid' && s.toggleActive]}>
                 <Ionicons name="grid" size={18} color={viewMode === 'grid' ? activeTheme.primary : s.text.color} />
               </TouchableOpacity>
            </View>
          </View>
        </View>

        <Animated.ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false} style={{ opacity: fadeAnim }}>
          {filteredAchats.length > 0 ? (
            <View style={viewMode === 'grid' ? s.grid : s.list}>
              {filteredAchats.map((item) => (
                <TouchableOpacity 
                  key={item.id}
                  style={viewMode === 'grid' ? s.cardGrid : s.cardList}
                  onPress={() => router.push(`/achat/${item.id}`)}
                  activeOpacity={0.7}
                >
                  {viewMode === 'grid' ? (
                    <>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <View style={[s.miniBadge, { backgroundColor: activeTheme.secondary }]}>
                           <Ionicons name="cart-outline" size={18} color={activeTheme.primary} />
                        </View>
                        <TouchableOpacity onPress={() => { setSelectedAchat(item); setShowActions(true); }}>
                           <Ionicons name="ellipsis-horizontal" size={20} color="#999" />
                        </TouchableOpacity>
                      </View>
                      <Text style={s.cardTitle} numberOfLines={1}>{item.nomListe}</Text>
                      <Text style={s.cardDate}>{format(new Date(item.dateAchat), 'dd MMM', { locale: language === 'en' ? enUS : fr })}</Text>
                      <Text style={[s.cardPrice, { color: activeTheme.primary }]}>{item.totalDepense.toLocaleString()} {currency}</Text>
                    </>
                  ) : (
                    <>
                       <View style={[s.dateBox, { backgroundColor: activeTheme.secondary }]}>
                          <Text style={{ fontWeight: 'bold', color: activeTheme.primary }}>{format(new Date(item.dateAchat), 'dd')}</Text>
                          <Text style={{ fontSize: 10, color: activeTheme.primary }}>{format(new Date(item.dateAchat), 'MMM', { locale: language === 'en' ? enUS : fr })}</Text>
                       </View>
                       <View style={{ flex: 1, paddingHorizontal: 10 }}>
                          <Text style={s.cardTitle} numberOfLines={1}>{item.nomListe}</Text>
                          <Text style={s.cardDate}>{item.nombreArticles} articles • {item.totalDepense.toLocaleString()} {currency}</Text>
                       </View>
                       <TouchableOpacity onPress={() => { setSelectedAchat(item); setShowActions(true); }} style={{ padding: 5 }}>
                          <Ionicons name="ellipsis-vertical" size={20} color="#999" />
                       </TouchableOpacity>
                    </>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={{ alignItems: 'center', marginTop: 50, opacity: 0.6 }}>
               <Ionicons name="basket-outline" size={50} color="#999" />
               <Text style={{ color: "#999", marginTop: 10 }}>{t('empty_list')}</Text>
            </View>
          )}
        </Animated.ScrollView>
      </View>

      {/* NAVBAR */}
      <View style={[s.navbar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 10, height: 60 + (insets.bottom > 0 ? insets.bottom : 10) }]}>
         <TouchableOpacity style={s.navItem} onPress={loadData}>
            <Ionicons name="home" size={24} color={activeTheme.primary} />
            <Text style={[s.navText, { color: activeTheme.primary }]}>{t('welcome')}</Text>
         </TouchableOpacity>
         <View style={{ top: -25 }}>
            <TouchableOpacity style={[s.fab, { shadowColor: activeTheme.primary }]} onPress={handleCreate} activeOpacity={0.8}>
               <LinearGradient colors={activeTheme.gradient as any} style={s.fabGradient}>
                  <Ionicons name="add" size={32} color="#fff" />
               </LinearGradient>
            </TouchableOpacity>
         </View>
         <TouchableOpacity style={s.navItem} onPress={() => router.push('/rapports')}>
            <Ionicons name="pie-chart-outline" size={24} color="#9CA3AF" />
            <Text style={[s.navText, { color: "#9CA3AF" }]}>{t('reports')}</Text>
         </TouchableOpacity>
      </View>

      {/* MODAL THEMES */}
      <Modal visible={showThemes} transparent animationType="fade">
         <TouchableOpacity style={s.backdrop} onPress={() => setShowThemes(false)}>
            <View style={s.alertBox}>
               <Text style={[s.modalTitle, { marginBottom: 15 }]}>{t('choose_theme')}</Text>
               <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 15, justifyContent: 'center' }}>
                  {(Object.keys(THEMES) as Array<keyof typeof THEMES>).map((key) => (
                     <TouchableOpacity key={key} onPress={() => { setTheme(key); setShowThemes(false); }} style={{ alignItems: 'center' }}>
                        <View style={[s.colorCircle, { backgroundColor: THEMES[key].primary }, currentTheme === key && { borderWidth: 3, borderColor: isDarkMode ? '#fff' : '#333', transform: [{scale: 1.1}] }]}>
                           {currentTheme === key && <Ionicons name="checkmark" size={20} color="#fff" />}
                        </View>
                        <Text style={{ fontSize: 10, marginTop: 4, color: isDarkMode ? '#fff' : '#333' }}>{THEMES[key].name}</Text>
                     </TouchableOpacity>
                  ))}
               </View>
            </View>
         </TouchableOpacity>
      </Modal>

      {/* MODAL SETTINGS */}
      <Modal visible={showSettings} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowSettings(false)}>
        <View style={[s.modalContainer, { backgroundColor: isDarkMode ? '#111' : '#fff' }]}>
           <View style={s.modalHeader}>
              <Text style={s.modalBigTitle}>{t('settings')}</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)} style={{ padding: 8, backgroundColor: isDarkMode ? '#333' : '#F3F4F6', borderRadius: 20 }}>
                 <Ionicons name="close" size={24} color={isDarkMode ? '#fff' : '#333'} />
              </TouchableOpacity>
           </View>
           
           <View style={s.settingSection}>
              <View style={s.settingRow}>
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                     <Ionicons name="moon-outline" size={22} color={isDarkMode ? '#fff' : '#333'} />
                     <Text style={{ fontSize: 16, color: isDarkMode ? '#fff' : '#333' }}>{t('dark_mode')}</Text>
                  </View>
                  <Switch value={isDarkMode} onValueChange={toggleDarkMode} trackColor={{ true: activeTheme.primary }} />
              </View>

              <View style={[s.settingRow, { marginTop: 15 }]}>
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                     <Ionicons name="language-outline" size={22} color={isDarkMode ? '#fff' : '#333'} />
                     <Text style={{ fontSize: 16, color: isDarkMode ? '#fff' : '#333' }}>{t('language')}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                     {['fr', 'mg', 'en'].map((l) => (
                        <TouchableOpacity key={l} onPress={() => setLanguage(l as any)} style={{ padding: 5, backgroundColor: language === l ? activeTheme.primary : 'transparent', borderRadius: 5 }}>
                           <Text style={{ color: language === l ? '#fff' : '#888', fontWeight: 'bold' }}>{l.toUpperCase()}</Text>
                        </TouchableOpacity>
                     ))}
                  </View>
              </View>

              <View style={[s.settingRow, { marginTop: 15 }]}>
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                     <Ionicons name="cash-outline" size={22} color={isDarkMode ? '#fff' : '#333'} />
                     <Text style={{ fontSize: 16, color: isDarkMode ? '#fff' : '#333' }}>{t('currency')}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                     {['Ar', '€', '$'].map((c) => (
                        <TouchableOpacity key={c} onPress={() => setCurrency(c as any)} style={{ padding: 5, backgroundColor: currency === c ? activeTheme.primary : 'transparent', borderRadius: 5 }}>
                           <Text style={{ color: currency === c ? '#fff' : '#888', fontWeight: 'bold' }}>{c}</Text>
                        </TouchableOpacity>
                     ))}
                  </View>
              </View>

              <TouchableOpacity style={[s.settingRow, { marginTop: 15 }]} onPress={() => setShowHelp(true)}>
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                     <Ionicons name="help-circle-outline" size={22} color={isDarkMode ? '#fff' : '#333'} />
                     <Text style={{ fontSize: 16, color: isDarkMode ? '#fff' : '#333' }}>{t('help')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
           </View>
        </View>
      </Modal>

      {/* MODAL ACTIONS */}
      <Modal visible={showActions} transparent animationType="fade">
         <TouchableOpacity style={s.backdrop} onPress={() => setShowActions(false)}>
            <View style={s.actionSheet}>
               <Text style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: 15, fontSize: 16 }}>{selectedAchat?.nomListe}</Text>
               <TouchableOpacity style={s.actionBtn} onPress={() => handleReminder()}>
                  <Ionicons name="alarm-outline" size={22} color={activeTheme.primary} />
                  <Text style={{ color: activeTheme.primary, marginLeft: 10, fontWeight: '600' }}>{t('reminder')}</Text>
               </TouchableOpacity>
               <TouchableOpacity style={s.actionBtn} onPress={() => { handleDelete(); }}>
                  <Ionicons name="trash-outline" size={22} color="red" />
                  <Text style={{ color: 'red', marginLeft: 10, fontWeight: '600' }}>{t('delete_list')}</Text>
               </TouchableOpacity>
               <TouchableOpacity style={[s.actionBtn, { borderBottomWidth: 0 }]} onPress={() => setShowActions(false)}>
                  <Text style={{ color: '#666' }}>{t('cancel')}</Text>
               </TouchableOpacity>
            </View>
         </TouchableOpacity>
      </Modal>

      {/* AIDE */}
      <Modal visible={showHelp} transparent animationType="fade">
         <View style={s.backdrop}>
            <View style={s.alertBox}>
               <Ionicons name="bulb-outline" size={40} color="#F59E0B" style={{ alignSelf: 'center' }} />
               <Text style={[s.modalTitle, { marginVertical: 10, textAlign: 'center' }]}>{t('tips_title')}</Text>
               <Text style={{ marginBottom: 5, color: s.textSec.color }}>• {t('tip_1')}</Text>
               <Text style={{ marginBottom: 5, color: s.textSec.color }}>• {t('tip_2')}</Text>
               <Text style={{ marginBottom: 5, color: s.textSec.color }}>• {t('tip_3')}</Text>
               <Text style={{ marginBottom: 5, color: s.textSec.color }}>• {t('tip_4')}</Text>
               <Text style={{ marginBottom: 5, color: s.textSec.color }}>• {t('tip_5')}</Text>
               <TouchableOpacity onPress={() => setShowHelp(false)} style={{ backgroundColor: activeTheme.primary, padding: 10, borderRadius: 10, alignItems: 'center', marginTop: 15 }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('understood')}</Text>
               </TouchableOpacity>
            </View>
         </View>
      </Modal>

      {/* SORT */}
      <Modal visible={showSort} transparent animationType="fade">
         <TouchableOpacity style={s.backdrop} onPress={() => setShowSort(false)}>
            <View style={s.alertBox}>
               <Text style={[s.modalTitle, { marginBottom: 15 }]}>{t('sort_by')}</Text>
               {['date', 'name', 'amount'].map((tKey) => (
                  <TouchableOpacity key={tKey} onPress={() => { setSortMode(tKey as any); setShowSort(false); }} style={{ padding: 12, borderBottomWidth: 1, borderColor: '#eee', flexDirection:'row', justifyContent:'space-between' }}>
                     <Text style={{ textTransform: 'capitalize', color: s.text.color }}>{t(tKey)}</Text>
                     {sortMode === tKey && <Ionicons name="checkmark" color={activeTheme.primary} size={18} />}
                  </TouchableOpacity>
               ))}
            </View>
         </TouchableOpacity>
      </Modal>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        visible={deleteModal}
        title={t('delete_list')}
        message={`${t('delete_list_confirm')} "${selectedAchat?.nomListe}" ?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal(false)}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        type="danger"
        theme={activeTheme}
        isDarkMode={isDarkMode}
      />

      {/* DATE PICKER (Android/iOS) */}
      {showDatePicker && (
        <DateTimePicker
          value={reminderDate}
          mode={Platform.OS === 'ios' ? 'datetime' : mode}
          display="default"
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}
    </View>
  );
}

const getStyles = (dark: boolean, theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: dark ? '#0F172A' : '#F8FAFC' },
  shadow: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: dark ? 0.3 : 0.06, shadowRadius: 8, elevation: 3 },
  
  header: { paddingBottom: 80, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, position: 'relative' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  appName: { fontSize: 22, fontWeight: '800', color: '#fff' },
  appSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  iconBtn: { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, height: 50, paddingHorizontal: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  searchInput: { flex: 1, marginLeft: 10, color: '#fff', fontSize: 16 },

  // SUMMARY ROW
  summaryRow: {
    position: 'absolute', bottom: -35, left: 20, right: 20,
    flexDirection: 'row', backgroundColor: dark ? '#1E293B' : '#fff',
    borderRadius: 20, padding: 20, justifyContent: 'space-around',
    shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: dark ? 0.3 : 0.1, shadowRadius: 8, elevation: 5
  },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { color: dark ? '#94A3B8' : '#9CA3AF', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  summaryValue: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  verticalDivider: { width: 1, backgroundColor: dark ? '#334155' : '#E2E8F0', height: '80%' },
  
  content: { flex: 1, marginTop: 55, paddingHorizontal: 20 },
  
  statsRow: { flexDirection: 'row', gap: 15, marginBottom: 25 },
  statCard: { 
    flex: 1, 
    backgroundColor: dark ? '#1E293B' : '#fff', 
    borderRadius: 24, 
    padding: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 15, 
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: dark ? 0.3 : 0.1, shadowRadius: 8, elevation: 5
  },
  iconCircle: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  statLabel: { fontSize: 11, color: dark ? '#94A3B8' : '#64748B', textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.5 },
  statValue: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  
  controlBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: dark ? '#F1F5F9' : '#1E293B' },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: dark ? '#334155' : '#E2E8F0', borderRadius: 12, backgroundColor: dark ? '#1E293B' : '#fff' },
  viewToggle: { flexDirection: 'row', borderWidth: 1, borderColor: dark ? '#334155' : '#E2E8F0', borderRadius: 10, backgroundColor: dark ? '#1E293B' : '#fff', overflow: 'hidden' },
  toggleBtn: { padding: 8, width: 36, alignItems: 'center' },
  toggleActive: { backgroundColor: dark ? '#334155' : '#F1F5F9' },
  
  text: { color: dark ? '#F1F5F9' : '#334155' },
  textSec: { color: dark ? '#94A3B8' : '#64748B' },
  
  list: { gap: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  
  cardList: { 
    flexDirection: 'row', alignItems: 'center', 
    backgroundColor: dark ? '#1E293B' : '#fff', 
    padding: 22, 
    borderRadius: 24, 
    marginBottom: 5,
    borderWidth: 1,
    borderColor: theme.primary + '40',
    shadowColor: theme.primary, shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3
  },
  cardGrid: { 
    width: (SCREEN_WIDTH - 52) / 2, height: 180, 
    backgroundColor: dark ? '#1E293B' : '#fff', 
    padding: 20, 
    borderRadius: 24, 
    marginBottom: 15, 
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.primary + '40',
    shadowColor: theme.primary, shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3
  },
  
  dateBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  miniBadge: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  
  cardTitle: { fontSize: 15, fontWeight: '700', color: dark ? '#F1F5F9' : '#1E293B', marginTop: 5 },
  cardDate: { fontSize: 12, color: dark ? '#94A3B8' : '#64748B', marginTop: 3 },
  cardPrice: { fontSize: 15, fontWeight: '800', marginTop: 'auto' },
  
  navbar: { flexDirection: 'row', backgroundColor: dark ? '#1E293B' : '#fff', borderTopWidth: 1, borderColor: dark ? '#334155' : '#F1F5F9', justifyContent: 'space-around', paddingTop: 10, paddingHorizontal: 20, position: 'absolute', bottom: 0, width: '100%' },
  navItem: { alignItems: 'center' },
  navText: { fontSize: 10, fontWeight: '600', marginTop: 4 },
  fab: { width: 56, height: 56, borderRadius: 28, shadowOpacity: 0.3, elevation: 6 },
  fabGradient: { width: '100%', height: '100%', borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  
  modalContainer: { flex: 1, padding: 25 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, marginTop: 10 },
  modalBigTitle: { fontSize: 24, fontWeight: '800', color: dark ? '#fff' : '#333' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: dark ? '#fff' : '#333' },
  sectionHeader: { fontSize: 12, color: '#888', fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  settingSection: { backgroundColor: dark ? '#1E293B' : '#f5f5f5', padding: 15, borderRadius: 20 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: dark ? '#1E293B' : '#f5f5f5', borderRadius: 15 },
  colorCircle: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  alertBox: { width: '80%', backgroundColor: dark ? '#1E293B' : '#fff', padding: 20, borderRadius: 20, elevation: 10 },
  actionSheet: { position: 'absolute', bottom: 20, width: '90%', backgroundColor: dark ? '#1E293B' : '#fff', borderRadius: 20, padding: 20, elevation: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderColor: dark ? '#334155' : '#F1F5F9', justifyContent: 'center' }
});