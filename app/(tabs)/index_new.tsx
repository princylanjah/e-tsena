import { router } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Animated, Dimensions, StatusBar, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, useCallback, useRef } from 'react';
import { getDb, checkDatabase } from '@db/init';
import { format } from 'date-fns';
import { GradientCard, ActionButton, IconCard, ModernCard } from '../../src/components/ModernComponents';
import { fadeScaleIn } from '../../src/utils/animations';
import { useTheme } from '../context/ThemeContext';
import { scheduleShoppingReminder } from '../../src/services/notificationService';
import { Logo } from '../../src/components/Logo';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Responsive breakpoints
const isSmallScreen = SCREEN_WIDTH < 360;

interface Achat {
  id: number;
  nomListe: string;
  dateAchat: string;
  totalDepense: number;
  nombreArticles: number;
}

export default function Home() {
  const { activeTheme, getStyles, isDarkMode } = useTheme();
  const s = getStyles(styles); // Styles dynamiques
  
  const [achats, setAchats] = useState<Achat[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalBalance, setTotalBalance] = useState(0);
  
  // Modal & Menu
  const [selectedAchat, setSelectedAchat] = useState<Achat | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const loadData = useCallback(() => {
    try {
      const dbOk = checkDatabase();
      if (!dbOk) throw new Error('Base de données non disponible');

      const database = getDb();
      
      // Charger tous les achats
      const achatsResult = database.getAllSync(`
        SELECT 
          a.id,
          a.nomListe,
          a.dateAchat,
          COALESCE(SUM(l.prixTotal), 0) as totalDepense,
          COUNT(l.id) as nombreArticles
        FROM Achat a
        LEFT JOIN LigneAchat l ON a.id = l.idAchat
        GROUP BY a.id, a.nomListe, a.dateAchat
        ORDER BY a.dateAchat DESC
        LIMIT 10
      `);

      setAchats(achatsResult as Achat[]);
      
      // Calculer le total général
      const totalResult = database.getAllSync(`SELECT COALESCE(SUM(prixTotal), 0) as total FROM LigneAchat`);
      setTotalBalance((totalResult[0] as any)?.total || 0);
      
      setLoading(false);
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!loading) {
      fadeScaleIn(fadeAnim, scaleAnim, 300).start();
    }
  }, [loading]);

  const createNewAchat = () => {
    router.push('/nouvel-achat');
  };

  const handleMenu = (achat: Achat) => {
    setSelectedAchat(achat);
    setShowMenu(true);
  };

  const handleReminder = async () => {
    if (selectedAchat) {
      const date = new Date();
      date.setHours(date.getHours() + 1); // Rappel dans 1h par défaut
      await scheduleShoppingReminder(selectedAchat.nomListe, date);
      Alert.alert("Rappel", "Rappel programmé dans 1 heure.");
      setShowMenu(false);
    }
  };

  const handleDelete = () => {
    setShowMenu(false);
    setTimeout(() => setShowDeleteModal(true), 300);
  };

  const confirmDelete = () => {
    if (selectedAchat) {
      const db = getDb();
      db.runSync('DELETE FROM LigneAchat WHERE idAchat = ?', [selectedAchat.id]);
      db.runSync('DELETE FROM Achat WHERE id = ?', [selectedAchat.id]);
      loadData();
      setShowDeleteModal(false);
      setSelectedAchat(null);
    }
  };

  if (loading) {
    return (
      <View style={[s.container, s.center]}>
        <Ionicons name="basket" size={60} color={activeTheme.primary} />
        <Text style={s.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[s.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}> 
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={s.container.backgroundColor} />
      
      <ScrollView style={s.scrollView} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header avec gradient */}
        <GradientCard
          title="Welcome Back!"
          subtitle="Gérez vos courses simplement"
          amount={`${totalBalance.toLocaleString()} Ar`}
          gradient={activeTheme.gradient as [string, string]}
          style={s.balanceCard}
          headerRight={<Logo size={48} colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']} />}
        >
          {/* Notification Badge */}
          <View style={s.notifBadge}>
             <Ionicons name="notifications" size={20} color="#fff" />
             <View style={s.redDot} />
          </View>

          <View style={s.balanceActions}>
            <ActionButton
              label="Nouvelle Liste"
              icon="add-circle"
              color="cyan"
              onPress={createNewAchat}
              style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.2)' }}
            />
            <ActionButton
              label="Rapports"
              icon="pie-chart"
              color="coral"
              onPress={() => router.push('/rapports')}
              style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.2)' }}
            />
          </View>
        </GradientCard>

        {/* Section "Raccourcis" */}
        <ModernCard style={[s.card, s.shadow]}>
          <Text style={s.sectionTitle}>Raccourcis</Text>
          <View style={s.iconGrid}>
            <IconCard icon="list" label="Listes" color="#F59E0B" onPress={() => router.push('/listes')} style={s.iconCardItem} />
            <IconCard icon="cube" label="Produits" color="#EC4899" onPress={() => router.push('/produits')} style={s.iconCardItem} />
            <IconCard icon="stats-chart" label="Stats" color="#8B5CF6" onPress={() => router.push('/statistiques')} style={s.iconCardItem} />
            <IconCard icon="settings" label="Options" color="#10B981" onPress={() => router.push('/rapports')} style={s.iconCardItem} />
          </View>
        </ModernCard>

        {/* Recent Activity */}
        <View style={s.recentActivitySection}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Activités Récentes</Text>
            <TouchableOpacity onPress={loadData}>
              <Text style={[s.viewAllText, { color: activeTheme.primary }]}>Actualiser</Text>
            </TouchableOpacity>
          </View>

          {achats.slice(0, 5).map((achat) => (
            <TouchableOpacity
              key={achat.id}
              style={[s.activityCard, s.shadow]}
              onPress={() => router.push(`/achat/${achat.id}`)}
              activeOpacity={0.7}
            >
              <View style={[s.activityIcon, { backgroundColor: activeTheme.primary + '15' }]}> 
                <Ionicons name="cart" size={20} color={activeTheme.primary} />
              </View>
              <View style={s.activityInfo}>
                <Text style={s.activityTitle}>{achat.nomListe}</Text>
                <Text style={s.activityDate}> 
                  {format(new Date(achat.dateAchat), 'dd MMM yyyy')} • {achat.nombreArticles} articles
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                 <Text style={s.activityAmount}>{achat.totalDepense.toLocaleString()} Ar</Text>
                 <TouchableOpacity onPress={() => handleMenu(achat)} style={{ padding: 5 }}>
                    <Ionicons name="ellipsis-horizontal" size={20} color={s.textSec.color} />
                 </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}

          {achats.length === 0 && (
            <View style={s.emptyState}>
              <Ionicons name="basket-outline" size={48} color={s.textSec.color} />
              <Text style={s.emptyText}>Aucune activité pour le moment</Text>
              <TouchableOpacity style={[s.emptyButton, { backgroundColor: activeTheme.primary }]} onPress={createNewAchat}>
                <Text style={s.emptyButtonText}>Commencer mes courses</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={s.bottomNav}>
        <TouchableOpacity style={[s.navItem, s.navItemActive, { backgroundColor: activeTheme.primary + '15' }]}>
          <Ionicons name="home" size={24} color={activeTheme.primary} />
          <Text style={[s.navLabel, { color: activeTheme.primary, fontWeight: '700' }]}>Accueil</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={s.navItem} onPress={() => router.push('/rapports')}> 
          <Ionicons name="wallet" size={24} color={s.textSec.color} />
          <Text style={s.navLabel}>Budget</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={s.navItem} onPress={() => router.push('/statistiques')}> 
          <Ionicons name="stats-chart" size={24} color={s.textSec.color} />
          <Text style={s.navLabel}>Stats</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={s.navItem} onPress={() => router.push('/charte')}> 
          <Ionicons name="color-palette" size={24} color={s.textSec.color} />
          <Text style={s.navLabel}>Thèmes</Text>
        </TouchableOpacity>
      </View>

      {/* MENU MODAL */}
      <Modal visible={showMenu} transparent animationType="fade">
         <TouchableOpacity style={s.menuOverlay} onPress={() => setShowMenu(false)}>
            <View style={s.menuContainer}>
               <Text style={s.menuTitle}>{selectedAchat?.nomListe}</Text>
               <TouchableOpacity style={s.menuItem} onPress={handleReminder}>
                  <Ionicons name="alarm-outline" size={22} color={activeTheme.primary} />
                  <Text style={s.menuText}>Programmer un rappel</Text>
               </TouchableOpacity>
               <TouchableOpacity style={s.menuItem} onPress={handleDelete}>
                  <Ionicons name="trash-outline" size={22} color="#EF4444" />
                  <Text style={[s.menuText, { color: '#EF4444' }]}>Supprimer la liste</Text>
               </TouchableOpacity>
            </View>
         </TouchableOpacity>
      </Modal>

      {/* DELETE MODAL */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
         <View style={s.backdrop}>
            <View style={s.deleteCard}>
               <View style={s.deleteIconBox}>
                  <Ionicons name="trash" size={32} color="#EF4444" />
               </View>
               <Text style={s.deleteTitle}>Supprimer ?</Text>
               <Text style={s.deleteDesc}>Voulez-vous vraiment supprimer "{selectedAchat?.nomListe}" ? Cette action est irréversible.</Text>
               <View style={s.deleteActions}>
                  <TouchableOpacity style={s.btnCancel} onPress={() => setShowDeleteModal(false)}>
                     <Text style={s.btnCancelText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.btnDelete} onPress={confirmDelete}>
                     <Text style={s.btnDeleteText}>Supprimer</Text>
                  </TouchableOpacity>
               </View>
            </View>
         </View>
      </Modal>

    </Animated.View>
  );
}

const styles = (c: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: c.textSec },
  scrollView: { flex: 1 },
  scrollContent: { padding: isSmallScreen ? 16 : 20, paddingTop: isSmallScreen ? 50 : 60 },
  
  // OVERLAPPING & HEADER
  balanceCard: { marginBottom: 24, paddingTop: 20, paddingBottom: 30, borderRadius: 24 },
  balanceActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  notifBadge: { position: 'absolute', top: 20, right: 20, padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  redDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', position: 'absolute', top: 8, right: 8, borderWidth: 1, borderColor: '#fff' },

  card: { marginBottom: 24, backgroundColor: c.card, borderRadius: 20, padding: 20 },
  shadow: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  
  sectionTitle: { fontSize: isSmallScreen ? 16 : 18, fontWeight: '800', color: c.text, marginBottom: 16 },
  iconGrid: { flexDirection: 'row', gap: isSmallScreen ? 8 : 12, flexWrap: 'wrap' },
  iconCardItem: { flex: isSmallScreen ? 0 : 1, minWidth: isSmallScreen ? (SCREEN_WIDTH - 64) / 2 : 100, backgroundColor: c.card, borderRadius: 16 },
  
  recentActivitySection: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  viewAllText: { fontSize: 14, fontWeight: '600' },
  
  // ACTIVITY CARD
  activityCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, padding: 16, borderRadius: 18, marginBottom: 12, minHeight: 80 },
  activityIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  activityInfo: { flex: 1 },
  activityTitle: { fontSize: 16, fontWeight: '700', color: c.text, marginBottom: 4 },
  activityDate: { fontSize: 12, color: c.textSec },
  activityAmount: { fontSize: 16, fontWeight: '800', color: c.text, marginBottom: 4 },
  
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, color: c.textSec, marginTop: 12, marginBottom: 20 },
  emptyButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyButtonText: { color: 'white', fontSize: 14, fontWeight: '600' },
  
  bottomNav: { flexDirection: 'row', backgroundColor: c.card, paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: c.border, elevation: 8, justifyContent: 'space-around' },
  navItem: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12 },
  navItemActive: {},
  navLabel: { fontSize: 11, fontWeight: '600', color: c.textSec, marginTop: 4 },
  
  // MENU
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  menuContainer: { backgroundColor: c.card, width: '80%', borderRadius: 20, padding: 20, elevation: 10 },
  menuTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, color: c.text, textAlign: 'center' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 15, borderBottomWidth: 1, borderColor: c.border },
  menuText: { fontSize: 16, color: c.text, fontWeight: '500' },

  // DELETE MODAL
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  deleteCard: { backgroundColor: c.card, width: '90%', borderRadius: 24, padding: 24, alignItems: 'center', elevation: 10 },
  deleteIconBox: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  deleteTitle: { fontSize: 20, fontWeight: 'bold', color: c.text, marginBottom: 8 },
  deleteDesc: { fontSize: 14, color: c.textSec, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  deleteActions: { flexDirection: 'row', gap: 12, width: '100%' },
  btnCancel: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: c.bg, alignItems: 'center' },
  btnDelete: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#EF4444', alignItems: 'center' },
  btnCancelText: { fontWeight: '600', color: c.textSec },
  btnDeleteText: { fontWeight: 'bold', color: '#fff' },

  // Helper pour les couleurs
  textSec: { color: c.textSec }
});
