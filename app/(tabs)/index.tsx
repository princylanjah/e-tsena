import { router } from 'expo-router';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, useCallback, useRef } from 'react';
import { getDb, checkDatabase } from '@db/init';
import { COLORS } from '@constants/colors';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const isSmallScreen = SCREEN_WIDTH < 360;
const isMediumScreen = SCREEN_WIDTH >= 360 && SCREEN_WIDTH < 768;

// ===== CONSTANTES DE STYLES =====
const shadowStyle = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 3,
};

const shadowStyleLarge = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.12,
  shadowRadius: 16,
  elevation: 5,
};

// ===== INTERFACES =====
interface Achat {
  id: number;
  nomListe: string;
  dateAchat: string;
  totalDepense: number;
  nombreArticles: number;
}

interface IconButtonProps {
  icon: string;
  onPress: () => void;
  style?: any;
}

// ===== COMPOSANTS RÉUTILISABLES =====
const IconButton: React.FC<IconButtonProps> = ({ icon, onPress, style }) => (
  <TouchableOpacity style={[styles.iconButton, style]} onPress={onPress}>
    <Ionicons name={icon as any} size={24} color={COLORS.primary} />
  </TouchableOpacity>
);

const StatCardComponent: React.FC<{
  label: string;
  value: string;
  icon?: string;
  color?: string;
}> = ({ label, value, icon, color = COLORS.primary }) => (
  <View style={[styles.statCard, { backgroundColor: COLORS.surface }]}>
    {icon && (
      <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
    )}
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
  </View>
);

const AchatCardGrid: React.FC<{ achat: Achat }> = ({ achat }) => (
  <TouchableOpacity
    style={styles.listeCard}
    onPress={() => router.push(`/achat/${achat.id}`)}
    activeOpacity={0.7}
  >
    <View style={[styles.listeIconContainer, { backgroundColor: COLORS.primary + '15' }]}>
      <Ionicons name="basket" size={24} color={COLORS.primary} />
    </View>

    <Text style={styles.listeCardTitle} numberOfLines={1}>
      {achat.nomListe}
    </Text>

    <Text style={styles.listeCardDate}>
      {format(new Date(achat.dateAchat), 'dd MMM', { locale: fr })}
    </Text>

    <View style={styles.listeCardBadge}>
      <Ionicons name="pricetag" size={11} color={COLORS.textLight} />
      <Text style={styles.listeCardBadgeText}>{achat.nombreArticles}</Text>
    </View>

    <View style={styles.listeCardAmount}>
      <Text style={styles.listeCardAmountValue}>
        {achat.totalDepense.toLocaleString()}
      </Text>
      <Text style={styles.listeCardAmountCurrency}>Ar</Text>
    </View>
  </TouchableOpacity>
);

const AchatCardList: React.FC<{ achat: Achat }> = ({ achat }) => (
  <TouchableOpacity
    style={styles.listeCardHorizontal}
    onPress={() => router.push(`/achat/${achat.id}`)}
    activeOpacity={0.7}
  >
    <View style={styles.horizontalLeft}>
      <View
        style={[styles.horizontalIconContainer, { backgroundColor: COLORS.primary + '15' }]}
      >
        <Ionicons name="basket" size={28} color={COLORS.primary} />
      </View>
      <View style={[styles.horizontalBadge, { backgroundColor: COLORS.primary }]}>
        <Text style={styles.horizontalBadgeText}>{achat.nombreArticles}</Text>
      </View>
    </View>

    <View style={styles.horizontalCenter}>
      <Text style={styles.horizontalTitle} numberOfLines={1}>
        {achat.nomListe}
      </Text>
      <Text style={styles.horizontalDate}>
        {format(new Date(achat.dateAchat), 'dd MMM yyyy', { locale: fr })}
      </Text>
      <View style={styles.miniStat}>
        <Ionicons name="cart-outline" size={13} color={COLORS.primary} />
        <Text style={styles.miniStatText}>{achat.nombreArticles} articles</Text>
      </View>
    </View>

    <View style={styles.horizontalRight}>
      <Text style={styles.horizontalAmount}>
        {achat.totalDepense.toLocaleString()}
      </Text>
      <Text style={styles.horizontalCurrency}>Ar</Text>
    </View>
  </TouchableOpacity>
);

const EmptyStateComponent: React.FC<{
  hasSearch: boolean;
  onCreatePress: () => void;
}> = ({ hasSearch, onCreatePress }) => (
  <View style={styles.emptyState}>
    <View
      style={[styles.emptyIconContainer, { backgroundColor: COLORS.primary + '15' }]}
    >
      <Ionicons name="basket-outline" size={64} color={COLORS.primary} />
    </View>
    <Text style={styles.emptyText}>
      {hasSearch ? 'Aucune liste trouvée' : 'Aucune liste créée'}
    </Text>
    {!hasSearch && (
      <TouchableOpacity
        style={[styles.emptyButton, { backgroundColor: COLORS.primary }]}
        onPress={onCreatePress}
      >
        <Ionicons name="add" size={20} color="white" style={{ marginRight: 8 }} />
        <Text style={styles.emptyButtonText}>Créer une liste</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ===== ÉCRAN PRINCIPAL =====
export default function Home() {
  const [achats, setAchats] = useState<Achat[]>([]);
  const [filteredAchats, setFilteredAchats] = useState<Achat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [totalBalance, setTotalBalance] = useState(0);
  const [thisMonthTotal, setThisMonthTotal] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // ===== CHARGER LES DONNÉES =====
  const loadData = useCallback(() => {
    try {
      const dbOk = checkDatabase();
      if (!dbOk) throw new Error('Base de données non disponible');

      const database = getDb();

      // Récupérer les achats
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
      setFilteredAchats(achatsResult as Achat[]);

      // Total général
      const totalResult = database.getAllSync(
        'SELECT COALESCE(SUM(prixTotal), 0) as total FROM LigneAchat'
      );
      setTotalBalance((totalResult[0] as any)?.total || 0);

      // Total du mois
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const monthResult = database.getAllSync(
        `SELECT COALESCE(SUM(l.prixTotal), 0) as total
         FROM LigneAchat l
         JOIN Achat a ON a.id = l.idAchat
         WHERE strftime('%Y-%m', a.dateAchat) = ?`,
        [monthKey]
      );
      setThisMonthTotal((monthResult[0] as any)?.total || 0);

      setLoading(false);
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
      setLoading(false);
    }
  }, []);

  // ===== EFFETS =====
  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading]);

  useEffect(() => {
    const filtered =
      searchQuery.trim() === ''
        ? achats
        : achats.filter((achat) =>
            achat.nomListe.toLowerCase().includes(searchQuery.toLowerCase())
          );
    setFilteredAchats(filtered);
  }, [searchQuery, achats]);

  // ===== CRÉER UN NOUVEL ACHAT =====
  const createNewAchat = useCallback(() => {
    try {
      const database = getDb();
      const today = new Date().toISOString().split('T')[0];

      database.runSync('INSERT INTO Achat (nomListe, dateAchat) VALUES (?, ?)', [
        'Nouvelle liste',
        today,
      ]);

      const result = database.getAllSync('SELECT id FROM Achat ORDER BY id DESC LIMIT 1');

      if (result.length > 0) {
        router.push(`/achat/${(result[0] as any).id}`);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de créer la liste');
    }
  }, []);

  // ===== RENDER LOADING =====
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <Ionicons name="basket" size={60} color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </Animated.View>
      </View>
    );
  }

  // ===== RENDER MAIN =====
  return (
    <SafeAreaView style={styles.container}>
      <Animated.View
        style={[
          styles.animatedContainer,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ===== HEADER ===== */}
          <View style={styles.headerSection}>
            <View style={styles.headerTop}>
              <View style={styles.headerLeft}>
                <TouchableOpacity style={[styles.iconButton, styles.menuButton]}>
                  <Ionicons name="menu" size={28} color={COLORS.text} />
                </TouchableOpacity>

                <View style={styles.brandContainer}>
                  <Text style={styles.brandName}>E-tsena</Text>
                  <Text style={styles.brandTagline}>Vos achats, simplement</Text>
                </View>
              </View>

              <View style={styles.headerRight}>
                <IconButton
                  icon={viewMode === 'grid' ? 'list' : 'grid'}
                  onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                />
                <IconButton
                  icon="settings-outline"
                  onPress={() =>
                    Alert.alert('Paramètres', 'Thème, Profil, Langue, etc.')
                  }
                />
              </View>
            </View>

            {/* ===== SEARCH BAR ===== */}
            <View style={[styles.searchContainer, shadowStyle]}>
              <Ionicons
                name="search"
                size={20}
                color={COLORS.textLight}
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher une liste..."
                placeholderTextColor={COLORS.textLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={COLORS.textLight}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ===== STATS ===== */}
          <View style={styles.statsRow}>
            <StatCardComponent
              label="Dépenses totales"
              value={`${totalBalance.toLocaleString()} Ar`}
              icon="wallet"
              color={COLORS.primary}
            />
            <StatCardComponent
              label="Ce mois"
              value={`${thisMonthTotal.toLocaleString()} Ar`}
              icon="calendar"
              color="#10B981"
            />
          </View>

          {/* ===== ACTION BUTTONS ===== */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: COLORS.primary }]}
              onPress={createNewAchat}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={20} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.actionButtonText}>Nouvelle liste</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#EC4899' }]}
              onPress={() => router.push('/rapports')}
              activeOpacity={0.85}
            >
              <Ionicons
                name="stats-chart"
                size={20}
                color="white"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.actionButtonText}>Rapports</Text>
            </TouchableOpacity>
          </View>

          {/* ===== LISTES D'ACHATS ===== */}
          <View style={styles.listesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Mes listes d'achats</Text>
              <IconButton icon="refresh" onPress={loadData} />
            </View>

            {filteredAchats.length > 0 ? (
              viewMode === 'grid' ? (
                <View style={styles.cardGrid}>
                  {filteredAchats.map((achat) => (
                    <AchatCardGrid key={achat.id} achat={achat} />
                  ))}
                </View>
              ) : (
                <View style={styles.cardList}>
                  {filteredAchats.map((achat) => (
                    <AchatCardList key={achat.id} achat={achat} />
                  ))}
                </View>
              )
            ) : (
              <EmptyStateComponent
                hasSearch={searchQuery.length > 0}
                onCreatePress={createNewAchat}
              />
            )}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* ===== BOTTOM NAVIGATION ===== */}
        <View style={[styles.bottomNav, shadowStyleLarge]}>
          <NavItem
            icon="home"
            label="Accueil"
            isActive={true}
            onPress={() => {}}
          />
          <NavItem
            icon="wallet"
            label="Rapports"
            isActive={false}
            onPress={() => router.push('/rapports')}
          />
          <NavItem
            icon="stats-chart"
            label="Stats"
            isActive={false}
            onPress={() => router.push('/statistiques')}
          />
          <NavItem
            icon="person"
            label="Profil"
            isActive={false}
            onPress={() => {}}
          />
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

// ===== COMPOSANT NAVIGATION =====
const NavItem: React.FC<{
  icon: string;
  label: string;
  isActive: boolean;
  onPress: () => void;
}> = ({ icon, label, isActive, onPress }) => (
  <TouchableOpacity
    style={[styles.navItem, isActive && styles.navItemActive]}
    onPress={onPress}
  >
    <Ionicons
      name={icon as any}
      size={24}
      color={isActive ? COLORS.primary : COLORS.textLight}
    />
    <Text
      style={[styles.navLabel, isActive && styles.navLabelActive]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

// ===== STYLES =====
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  animatedContainer: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: isSmallScreen ? 14 : 20,
    paddingTop: isSmallScreen ? 12 : 16,
    paddingBottom: 20,
  },

  // ===== HEADER =====
  headerSection: {
    marginBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadowStyle,
  },
  menuButton: {
    width: 44,
    height: 44,
  },
  brandContainer: {
    flex: 1,
  },
  brandName: {
    fontSize: isSmallScreen ? 32 : 40,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  brandTagline: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textLight,
  },

  // ===== SEARCH =====
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  searchIcon: {
    marginRight: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },

  // ===== STATS =====
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    ...shadowStyle,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // ===== ACTION BUTTONS =====
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    ...shadowStyle,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },

  // ===== SECTION =====
  listesSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: '800',
    color: COLORS.text,
  },

  // ===== GRID =====
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  listeCard: {
    width: (SCREEN_WIDTH - (isSmallScreen ? 40 : 52)) / 2,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    ...shadowStyle,
  },
  listeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  listeCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  listeCardDate: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 10,
  },
  listeCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  listeCardBadgeText: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  listeCardAmount: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  listeCardAmountValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    marginRight: 4,
  },
  listeCardAmountCurrency: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
  },

  // ===== LIST =====
  cardList: {
    gap: 12,
  },
  listeCardHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    ...shadowStyle,
  },
  horizontalLeft: {
    position: 'relative',
  },
  horizontalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  horizontalBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  horizontalBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '800',
  },
  horizontalCenter: {
    flex: 1,
  },
  horizontalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  horizontalDate: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 8,
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
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  horizontalCurrency: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
  },

  // ===== EMPTY STATE =====
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    ...shadowStyle,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },

  // ===== BOTTOM NAVIGATION =====
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 12,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  navItemActive: {
    backgroundColor: COLORS.primary + '15',
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textLight,
    marginTop: 4,
  },
  navLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});