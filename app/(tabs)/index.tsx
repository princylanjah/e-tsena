import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, 
  TextInput, Modal, Switch, StatusBar, Dimensions, Animated
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';

import { getDb } from '../../src/db/init';
import { Logo } from '../../src/components/Logo';
import { useTheme, THEMES, ThemeKey } from '../context/ThemeContext'; 

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- HEADER ANIMÉ ---
const HeaderIllustration = () => {
  const floatY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -8, duration: 2500, useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0, duration: 2500, useNativeDriver: true })
      ])
    ).start();
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={{ position: 'absolute', top: -60, right: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.1)' }} />
      <View style={{ position: 'absolute', bottom: 40, left: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.05)' }} />
      <Animated.View style={{ position: 'absolute', bottom: 50, right: 20, opacity: 0.2, transform: [{ translateY: floatY }, { rotate: '-10deg' }] }}>
        <Ionicons name="cart-outline" size={130} color="#fff" />
      </Animated.View>
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
  // 🎨 THEME DYNAMIQUE
  const { currentTheme, setTheme, activeTheme } = useTheme();
  
  // ÉTATS
  const [achats, setAchats] = useState<Achat[]>([]);
  const [filteredAchats, setFilteredAchats] = useState<Achat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [sortMode, setSortMode] = useState<'date' | 'name' | 'amount'>('date');

  // MODALS
  const [showSettings, setShowSettings] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [selectedAchat, setSelectedAchat] = useState<Achat | null>(null);

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
      const res = db.runSync('INSERT INTO Achat (nomListe, dateAchat) VALUES (?, ?)', ['Nouvelle Liste', new Date().toISOString()]);
      // Tsy misy suppression eto, lasa avy hatrany any amin'ny page manaraka
      router.push(`/achat/${res.lastInsertRowId}`);
    } catch (e) { console.error(e); }
  };

  // Suppression Manuelle
  const handleDelete = () => {
    if (!selectedAchat) return;
    try {
      getDb().runSync('DELETE FROM LigneAchat WHERE idAchat = ?', [selectedAchat.id]);
      getDb().runSync('DELETE FROM Achat WHERE id = ?', [selectedAchat.id]);
      setShowActions(false);
      loadData();
    } catch (e) { console.error(e); }
  };

  // Styles dynamiques
  const s = getStyles(isDarkMode, activeTheme);

  const totalDepenses = achats.reduce((acc, item) => acc + item.totalDepense, 0);
  const totalArticles = achats.reduce((acc, item) => acc + item.nombreArticles, 0);

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* HEADER */}
      <LinearGradient colors={activeTheme.gradient as any} style={s.header}>
        <HeaderIllustration />
        <View style={s.headerTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Logo size={42} colors={['#fff', '#E0E7FF'] as any} />
            <View>
              <Text style={s.appName}>E-tsena</Text>
              <Text style={s.appSub}>Mes Courses</Text>
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', gap: 10 }}>
             <TouchableOpacity style={s.iconBtn} onPress={() => setShowThemes(true)}>
                <Ionicons name="color-palette-outline" size={22} color={activeTheme.primary} />
             </TouchableOpacity>
             <TouchableOpacity style={s.iconBtn} onPress={() => setShowSettings(true)}>
                <Ionicons name="settings-outline" size={22} color={activeTheme.primary} />
             </TouchableOpacity>
          </View>
        </View>

        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={20} color="rgba(255,255,255,0.7)" />
          <TextInput 
            style={s.searchInput} placeholder="Rechercher..." placeholderTextColor="rgba(255,255,255,0.6)"
            value={searchQuery} onChangeText={setSearchQuery}
          />
        </View>
      </LinearGradient>

      {/* CONTENU */}
      <View style={s.content}>
        
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <View style={[s.iconCircle, { backgroundColor: activeTheme.primary + '15' }]}>
              <Ionicons name="wallet-outline" size={22} color={activeTheme.primary} />
            </View>
            <View>
              <Text style={s.statLabel}>Dépenses</Text>
              <Text style={s.statValue}>{totalDepenses.toLocaleString()} Ar</Text>
            </View>
          </View>
          <View style={s.statCard}>
            <View style={[s.iconCircle, { backgroundColor: activeTheme.secondary }]}>
               <Ionicons name="basket-outline" size={22} color={activeTheme.primary} />
            </View>
            <View>
              <Text style={s.statLabel}>Articles</Text>
              <Text style={s.statValue}>{totalArticles} pcs</Text>
            </View>
          </View>
        </View>

        <View style={s.controlBar}>
          <Text style={s.sectionTitle}>Listes Récentes</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={s.outlineBtn} onPress={() => setShowSort(true)}>
               <Ionicons name="filter-outline" size={18} color={s.textSec.color} />
               <Text style={{ fontSize: 12, color: s.textSec.color }}>Trier</Text>
            </TouchableOpacity>
            <View style={s.viewToggle}>
               <TouchableOpacity onPress={() => setViewMode('list')} style={[s.toggleBtn, viewMode === 'list' && s.toggleActive]}>
                 <Ionicons name="list-outline" size={18} color={s.text.color} />
               </TouchableOpacity>
               <TouchableOpacity onPress={() => setViewMode('grid')} style={[s.toggleBtn, viewMode === 'grid' && s.toggleActive]}>
                 <Ionicons name="grid-outline" size={18} color={s.text.color} />
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
                        <View style={[s.miniBadge, { backgroundColor: activeTheme.primary + '15' }]}>
                           <Ionicons name="cart-outline" size={18} color={activeTheme.primary} />
                        </View>
                        <TouchableOpacity onPress={() => { setSelectedAchat(item); setShowActions(true); }}>
                           <Ionicons name="ellipsis-horizontal" size={20} color="#999" />
                        </TouchableOpacity>
                      </View>
                      <Text style={s.cardTitle} numberOfLines={1}>{item.nomListe}</Text>
                      <Text style={s.cardDate}>{format(new Date(item.dateAchat), 'dd MMM', { locale: fr })}</Text>
                      <Text style={[s.cardPrice, { color: activeTheme.primary }]}>{item.totalDepense.toLocaleString()} Ar</Text>
                    </>
                  ) : (
                    <>
                       <View style={[s.dateBox, { backgroundColor: activeTheme.secondary }]}>
                          <Text style={{ fontWeight: 'bold', color: activeTheme.primary }}>{format(new Date(item.dateAchat), 'dd')}</Text>
                          <Text style={{ fontSize: 10, color: activeTheme.primary }}>{format(new Date(item.dateAchat), 'MMM', { locale: fr })}</Text>
                       </View>
                       <View style={{ flex: 1, paddingHorizontal: 10 }}>
                          <Text style={s.cardTitle} numberOfLines={1}>{item.nomListe}</Text>
                          <Text style={s.cardDate}>{item.nombreArticles} articles • {item.totalDepense.toLocaleString()} Ar</Text>
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
               <Text style={{ color: "#999", marginTop: 10 }}>Aucune liste trouvée</Text>
            </View>
          )}
        </Animated.ScrollView>
      </View>

      {/* NAVBAR */}
      <View style={s.navbar}>
         <TouchableOpacity style={s.navItem} onPress={loadData}>
            <Ionicons name="home" size={24} color={activeTheme.primary} />
            <Text style={[s.navText, { color: activeTheme.primary }]}>Accueil</Text>
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
            <Text style={[s.navText, { color: "#9CA3AF" }]}>Rapports</Text>
         </TouchableOpacity>
      </View>

      {/* MODAL THEMES */}
      <Modal visible={showThemes} transparent animationType="fade">
         <TouchableOpacity style={s.backdrop} onPress={() => setShowThemes(false)}>
            <View style={s.alertBox}>
               <Text style={[s.modalTitle, { marginBottom: 15 }]}>Choisir un thème</Text>
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
      <Modal visible={showSettings} animationType="slide" presentationStyle="pageSheet">
        <View style={[s.modalContainer, { backgroundColor: isDarkMode ? '#111' : '#fff' }]}>
           <View style={s.modalHeader}>
              <Text style={s.modalBigTitle}>Paramètres</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}><Text style={{ color: activeTheme.primary }}>Fermer</Text></TouchableOpacity>
           </View>
           <TouchableOpacity style={[s.settingRow, { marginTop: 20 }]} onPress={() => setShowHelp(true)}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                 <Ionicons name="help-circle-outline" size={22} color={isDarkMode ? '#fff' : '#333'} />
                 <Text style={{ fontSize: 16, color: isDarkMode ? '#fff' : '#333' }}>Aide & Astuces</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
           </TouchableOpacity>
           <View style={s.settingRow}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                 <Ionicons name="moon-outline" size={22} color={isDarkMode ? '#fff' : '#333'} />
                 <Text style={{ fontSize: 16, color: isDarkMode ? '#fff' : '#333' }}>Mode Sombre</Text>
              </View>
              <Switch value={isDarkMode} onValueChange={setIsDarkMode} trackColor={{ true: activeTheme.primary }} />
           </View>
        </View>
      </Modal>

      {/* MODAL ACTIONS */}
      <Modal visible={showActions} transparent animationType="fade">
         <TouchableOpacity style={s.backdrop} onPress={() => setShowActions(false)}>
            <View style={s.actionSheet}>
               <Text style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: 15, fontSize: 16 }}>{selectedAchat?.nomListe}</Text>
               <TouchableOpacity style={s.actionBtn} onPress={() => { handleDelete(); }}>
                  <Ionicons name="trash-outline" size={22} color="red" />
                  <Text style={{ color: 'red', marginLeft: 10, fontWeight: '600' }}>Supprimer cette liste</Text>
               </TouchableOpacity>
               <TouchableOpacity style={[s.actionBtn, { borderBottomWidth: 0 }]} onPress={() => setShowActions(false)}>
                  <Text style={{ color: '#666' }}>Annuler</Text>
               </TouchableOpacity>
            </View>
         </TouchableOpacity>
      </Modal>

      {/* AIDE */}
      <Modal visible={showHelp} transparent animationType="fade">
         <View style={s.backdrop}>
            <View style={s.alertBox}>
               <Ionicons name="bulb-outline" size={40} color="#F59E0B" style={{ alignSelf: 'center' }} />
               <Text style={[s.modalTitle, { marginVertical: 10, textAlign: 'center' }]}>Astuces E-tsena</Text>
               <Text style={{ marginBottom: 5, color: s.textSec.color }}>• Utilisez le bouton <Text style={{fontWeight:'bold'}}>+</Text> pour ajouter une liste.</Text>
               <Text style={{ marginBottom: 5, color: s.textSec.color }}>• Une liste vide ne sera pas enregistrée.</Text>
               <TouchableOpacity onPress={() => setShowHelp(false)} style={{ backgroundColor: activeTheme.primary, padding: 10, borderRadius: 10, alignItems: 'center', marginTop: 15 }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Compris</Text>
               </TouchableOpacity>
            </View>
         </View>
      </Modal>

      {/* SORT */}
      <Modal visible={showSort} transparent animationType="fade">
         <TouchableOpacity style={s.backdrop} onPress={() => setShowSort(false)}>
            <View style={s.alertBox}>
               <Text style={[s.modalTitle, { marginBottom: 15 }]}>Trier par</Text>
               {['date', 'name', 'amount'].map((t) => (
                  <TouchableOpacity key={t} onPress={() => { setSortMode(t as any); setShowSort(false); }} style={{ padding: 12, borderBottomWidth: 1, borderColor: '#eee', flexDirection:'row', justifyContent:'space-between' }}>
                     <Text style={{ textTransform: 'capitalize', color: s.text.color }}>{t === 'amount' ? 'Montant' : t === 'name' ? 'Nom' : 'Date'}</Text>
                     {sortMode === t && <Ionicons name="checkmark" color={activeTheme.primary} size={18} />}
                  </TouchableOpacity>
               ))}
            </View>
         </TouchableOpacity>
      </Modal>
    </View>
  );
}

const getStyles = (dark: boolean, theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: dark ? '#111' : '#F9FAFB' },
  header: { paddingTop: 50, paddingBottom: 40, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  appName: { fontSize: 22, fontWeight: '800', color: '#fff' },
  appSub: { fontSize: 12, color: '#E0E7FF', fontWeight: '600' },
  iconBtn: { width: 40, height: 40, backgroundColor: '#fff', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 15, height: 48, paddingHorizontal: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  searchInput: { flex: 1, marginLeft: 10, color: '#fff', fontSize: 16 },
  content: { flex: 1, marginTop: -30, paddingHorizontal: 20 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: dark ? '#222' : '#fff', borderRadius: 20, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: "#000", shadowOpacity: 0.05, elevation: 3 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  statLabel: { fontSize: 11, color: '#999', textTransform: 'uppercase', fontWeight: '600' },
  statValue: { fontSize: 16, fontWeight: '700', color: dark ? '#fff' : '#333' },
  controlBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: dark ? '#fff' : '#333' },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#ddd', borderRadius: 15 },
  viewToggle: { flexDirection: 'row', borderWidth: 1, borderColor: '#ddd', borderRadius: 8 },
  toggleBtn: { padding: 6, borderRadius: 6 },
  toggleActive: { backgroundColor: '#e0e0e0' },
  text: { color: dark ? '#fff' : '#333' },
  textSec: { color: '#888' },
  list: { gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cardList: { flexDirection: 'row', alignItems: 'center', backgroundColor: dark ? '#222' : '#fff', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: dark ? '#333' : '#eee', marginBottom: 10 },
  cardGrid: { width: (SCREEN_WIDTH - 52) / 2, backgroundColor: dark ? '#222' : '#fff', padding: 12, borderRadius: 18, borderWidth: 1, borderColor: dark ? '#333' : '#eee', marginBottom: 12 },
  dateBox: { width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  miniBadge: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: dark ? '#fff' : '#333', marginTop: 5 },
  cardDate: { fontSize: 11, color: '#888', marginTop: 2 },
  cardPrice: { fontSize: 14, fontWeight: 'bold', marginTop: 'auto' },
  navbar: { flexDirection: 'row', height: 80, backgroundColor: dark ? '#222' : '#fff', borderTopWidth: 1, borderColor: dark ? '#333' : '#eee', justifyContent: 'space-around', paddingTop: 10, paddingHorizontal: 20, position: 'absolute', bottom: 0, width: '100%' },
  navItem: { alignItems: 'center' },
  navText: { fontSize: 10, fontWeight: '600', marginTop: 4 },
  fab: { width: 56, height: 56, borderRadius: 28, shadowOpacity: 0.3, elevation: 6 },
  fabGradient: { width: '100%', height: '100%', borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  modalContainer: { flex: 1, padding: 25 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, marginTop: 10 },
  modalBigTitle: { fontSize: 24, fontWeight: '800', color: dark ? '#fff' : '#333' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: dark ? '#fff' : '#333' },
  sectionHeader: { fontSize: 12, color: '#888', fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  settingSection: { backgroundColor: dark ? '#222' : '#f5f5f5', padding: 15, borderRadius: 20 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: dark ? '#222' : '#f5f5f5', borderRadius: 15 },
  colorCircle: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  alertBox: { width: '80%', backgroundColor: dark ? '#222' : '#fff', padding: 20, borderRadius: 20, elevation: 10 },
  actionSheet: { position: 'absolute', bottom: 20, width: '90%', backgroundColor: '#fff', borderRadius: 20, padding: 20, elevation: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderColor: '#eee', justifyContent: 'center' }
});