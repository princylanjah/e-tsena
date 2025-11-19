import { router } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Animated, Dimensions, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, useCallback, useRef } from 'react';
import { getDb, checkDatabase } from '@db/init';
import { COLORS, SECTION_COLORS } from '@constants/colors';
import { format } from 'date-fns';
import { GradientCard, ActionButton, IconCard, ModernCard, StatCard } from '../../src/components/ModernComponents';
import { fadeScaleIn } from '../../src/utils/animations';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive breakpoints
const isSmallScreen = SCREEN_WIDTH < 360;
const isMediumScreen = SCREEN_WIDTH >= 360 && SCREEN_WIDTH < 768;
const isLargeScreen = SCREEN_WIDTH >= 768;

interface Achat {
  id: number;
  nomListe: string;
  dateAchat: string;
  totalDepense: number;
  nombreArticles: number;
}

export default function Home() {
  const [achats, setAchats] = useState<Achat[]>([]);
  const [filteredAchats, setFilteredAchats] = useState<Achat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [totalBalance, setTotalBalance] = useState(0);
  const [thisMonthTotal, setThisMonthTotal] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); // Mode d'affichage
  const [showMenu, setShowMenu] = useState(false); // Menu latéral
  
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

      const achatsData = achatsResult as Achat[];
      setAchats(achatsData);
      setFilteredAchats(achatsData);
      
      // Calculer le total général
      const totalResult = database.getAllSync(`
        SELECT COALESCE(SUM(prixTotal), 0) as total
        FROM LigneAchat
      `);
      setTotalBalance((totalResult[0] as any)?.total || 0);
      
      // Calculer le total du mois en cours
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const monthResult = database.getAllSync(`
        SELECT COALESCE(SUM(l.prixTotal), 0) as total
        FROM LigneAchat l
        JOIN Achat a ON a.id = l.idAchat
        WHERE strftime('%Y', a.dateAchat) = ? AND strftime('%m', a.dateAchat) = ?
      `, [currentYear.toString(), currentMonth.toString().padStart(2, '0')]);
      setThisMonthTotal((monthResult[0] as any)?.total || 0);
      
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

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredAchats(achats);
    } else {
      const filtered = achats.filter(achat => 
        achat.nomListe.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredAchats(filtered);
    }
  }, [searchQuery, achats]);

  const createNewAchat = () => {
    try {
      const database = getDb();
      const today = new Date().toISOString().split('T')[0];
      
      database.runSync(
        `INSERT INTO Achat (nomListe, dateAchat) VALUES (?, ?)`,
        ['Nouvelle liste', today]
      );
      
      const queryResult = database.getAllSync(
        'SELECT id FROM Achat ORDER BY id DESC LIMIT 1'
      );
      
      if (queryResult.length > 0) {
        const achatId = (queryResult[0] as any).id;
        router.push(`/achat/${achatId}`);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de créer la liste d\'achat');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="basket" size={60} color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
      ]}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header avec E-tsena agrandi et légende */}
        <View style={styles.headerSection}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              {/* Bouton menu hamburger */}
              <TouchableOpacity 
                style={styles.menuHamburger}
                onPress={() => setShowMenu(!showMenu)}
              >
                <Ionicons name="menu" size={28} color={COLORS.text} />
              </TouchableOpacity>
              
              <View style={styles.brandContainer}>
                <Text style={styles.brandName}>E-tsena</Text>
                <Text style={styles.brandTagline}>Gérez vos achats intelligemment</Text>
              </View>
            </View>
            
            {/* Icône changement de vue + paramètres */}
            <View style={styles.headerRight}>
              <TouchableOpacity 
                style={styles.viewModeButton}
                onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                <Ionicons 
                  name={viewMode === 'grid' ? 'list' : 'grid'} 
                  size={24} 
                  color={COLORS.primary} 
                />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.menuButton}
                onPress={() => Alert.alert('Paramètres', 'Thème, Mode sombre/clair, etc.')}
              >
                <Ionicons name="settings-outline" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Barre de recherche */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={COLORS.textLight} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher une liste..."
              placeholderTextColor={COLORS.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <ModernCard style={styles.statCardContainer}>
            <Text style={styles.statLabel}>Total dépenses</Text>
            <Text style={styles.statValue}>{totalBalance.toLocaleString()} Ar</Text>
          </ModernCard>
          <ModernCard style={styles.statCardContainer}>
            <Text style={styles.statLabel}>Ce mois</Text>
            <Text style={styles.statValue}>{thisMonthTotal.toLocaleString()} Ar</Text>
          </ModernCard>
        </View>

        {/* Boutons d'action */}
        <View style={styles.actionButtonsRow}>
          <ActionButton
            label="Nouvelle liste"
            icon="add"
            color="cyan"
            onPress={createNewAchat}
            style={styles.actionBtnFull}
          />
          <ActionButton
            label="Voir rapports"
            icon="stats-chart"
            color="coral"
            onPress={() => router.push('/rapports')}
            style={styles.actionBtnFull}
          />
        </View>

        {/* Mes listes d'achats avec toggle view */}
        <View style={styles.listesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mes listes d'achats</Text>
            <View style={styles.headerActions}>
              {/* Toggle view mode */}
              <View style={styles.viewToggle}>
                <TouchableOpacity 
                  style={[styles.toggleBtn, viewMode === 'grid' && styles.toggleBtnActive]}
                  onPress={() => setViewMode('grid')}
                >
                  <Ionicons 
                    name="grid" 
                    size={18} 
                    color={viewMode === 'grid' ? 'white' : COLORS.textLight} 
                  />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
                  onPress={() => setViewMode('list')}
                >
                  <Ionicons 
                    name="list" 
                    size={18} 
                    color={viewMode === 'list' ? 'white' : COLORS.textLight} 
                  />
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity onPress={loadData} style={styles.refreshBtn}>
                <Ionicons name="refresh" size={22} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {filteredAchats.length > 0 ? (
            viewMode === 'grid' ? (
              // MODE GRID - Cards verticales en 2 colonnes
              <View style={styles.cardGrid}>
                {filteredAchats.map((achat, index) => (
                  <TouchableOpacity
                    key={achat.id}
                    style={styles.listeCard}
                    onPress={() => router.push(`/achat/${achat.id}`)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.listeCardHeader}>
                      <View style={styles.listeIconContainer}>
                        <Ionicons name="basket" size={24} color={COLORS.primary} />
                      </View>
                    </View>
                    <Text style={styles.listeCardTitle} numberOfLines={1}>{achat.nomListe}</Text>
                    <Text style={styles.listeCardDate}>
                      {format(new Date(achat.dateAchat), 'dd MMM yyyy')}
                    </Text>
                    <View style={styles.listeCardFooter}>
                      <View style={styles.listeCardBadge}>
                        <Ionicons name="pricetag" size={12} color={COLORS.textLight} />
                        <Text style={styles.listeCardBadgeText}>{achat.nombreArticles} articles</Text>
                      </View>
                    </View>
                    <View style={styles.listeCardAmount}>
                      <Text style={styles.listeCardAmountValue}>{achat.totalDepense.toLocaleString()}</Text>
                      <Text style={styles.listeCardAmountCurrency}>Ar</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              // MODE LIST - Cards horizontales avec statistiques
              <View style={styles.cardList}>
                {filteredAchats.map((achat, index) => (
                  <TouchableOpacity
                    key={achat.id}
                    style={styles.listeCardHorizontal}
                    onPress={() => router.push(`/achat/${achat.id}`)}
                    activeOpacity={0.7}
                  >
                    {/* Icône et badge à gauche */}
                    <View style={styles.horizontalLeft}>
                      <View style={styles.horizontalIconContainer}>
                        <Ionicons name="basket" size={28} color={COLORS.primary} />
                      </View>
                      <View style={styles.horizontalBadge}>
                        <Text style={styles.horizontalBadgeText}>{achat.nombreArticles}</Text>
                      </View>
                    </View>
                    
                    {/* Contenu principal au centre */}
                    <View style={styles.horizontalCenter}>
                      <Text style={styles.horizontalTitle} numberOfLines={1}>
                        {achat.nomListe}
                      </Text>
                      <Text style={styles.horizontalDate}>
                        {format(new Date(achat.dateAchat), 'dd MMM yyyy')}
                      </Text>
                      
                      {/* Mini statistiques */}
                      <View style={styles.horizontalStats}>
                        <View style={styles.miniStat}>
                          <Ionicons name="cart-outline" size={14} color={COLORS.primary} />
                          <Text style={styles.miniStatText}>{achat.nombreArticles} articles</Text>
                        </View>
                      </View>
                    </View>
                    
                    {/* Montant à droite */}
                    <View style={styles.horizontalRight}>
                      <Text style={styles.horizontalAmount}>
                        {achat.totalDepense.toLocaleString()}
                      </Text>
                      <Text style={styles.horizontalCurrency}>Ar</Text>
                      <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} style={{ marginTop: 4 }} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="basket-outline" size={64} color={COLORS.textLight} />
              <Text style={styles.emptyText}>
                {searchQuery ? 'Aucune liste trouvée' : 'Aucune liste créée'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity style={styles.emptyButton} onPress={createNewAchat}>
                  <Ionicons name="add" size={20} color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.emptyButtonText}>Créer une liste</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={[styles.navItem, styles.navItemActive]}>
          <Ionicons name="home" size={24} color={COLORS.primary} />
          <Text style={[styles.navLabel, styles.navLabelActive]}>Accueil</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/rapports')}
        >
          <Ionicons name="wallet" size={24} color={COLORS.textLight} />
          <Text style={styles.navLabel}>Rapports</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/statistiques')}
        >
          <Ionicons name="stats-chart" size={24} color={COLORS.textLight} />
          <Text style={styles.navLabel}>Stats</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => {/* Settings */}}
        >
          <Ionicons name="person" size={24} color={COLORS.textLight} />
          <Text style={styles.navLabel}>Profil</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textLight,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: isSmallScreen ? 16 : 20,
    paddingTop: isSmallScreen ? 50 : 60,
  },
  
  // Header Section
  headerSection: {
    marginBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  menuHamburger: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  viewModeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  brandContainer: {
    flex: 1,
  },
  brandName: {
    fontSize: isSmallScreen ? 36 : 42,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  brandTagline: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '500',
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCardContainer: {
    flex: 1,
    padding: 16,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  
  // Action Buttons
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionBtnFull: {
    flex: 1,
  },
  
  // Listes Section
  listesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: COLORS.primary,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  
  // Card Grid (2 colonnes)
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  listeCard: {
    width: (SCREEN_WIDTH - (isSmallScreen ? 44 : 52)) / 2,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    position: 'relative',
  },
  listeCardHeader: {
    marginBottom: 12,
  },
  listeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listeCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  listeCardDate: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 12,
  },
  listeCardFooter: {
    marginBottom: 8,
  },
  listeCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listeCardBadgeText: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  listeCardAmount: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
  },
  listeCardAmountValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    marginRight: 4,
  },
  listeCardAmountCurrency: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  
  // Mode Horizontal (List)
  cardList: {
    gap: 12,
  },
  listeCardHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    gap: 12,
  },
  horizontalLeft: {
    position: 'relative',
  },
  horizontalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  horizontalBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  horizontalBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
  horizontalCenter: {
    flex: 1,
  },
  horizontalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  horizontalDate: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  horizontalStats: {
    flexDirection: 'row',
    gap: 12,
  },
  miniStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniStatText: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  horizontalRight: {
    alignItems: 'flex-end',
  },
  horizontalAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
  },
  horizontalCurrency: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 4,
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
  
  // Bottom Navigation
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
    justifyContent: 'space-around',
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  navItemActive: {
    backgroundColor: COLORS.primary + '15',
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textLight,
    marginTop: 4,
  },
  navLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
