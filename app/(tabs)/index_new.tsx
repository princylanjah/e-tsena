import { router } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Animated, Dimensions } from 'react-native';
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
  const [loading, setLoading] = useState(true);
  const [totalBalance, setTotalBalance] = useState(0);
  const [thisMonthTotal, setThisMonthTotal] = useState(0);
  
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
        {/* Header avec gradient violet */}
        <GradientCard
          title="Welcome Back!"
          subtitle="Hello, Alexandre!"
          amount={`${totalBalance.toLocaleString()} Ar`}
          gradient={[COLORS.primary, COLORS.primaryLight]}
          style={styles.balanceCard}
        >
          <View style={styles.balanceActions}>
            <ActionButton
              label="Send Money"
              icon="arrow-up"
              color="cyan"
              onPress={createNewAchat}
              style={styles.actionBtn}
            />
            <ActionButton
              label="Request Money"
              icon="arrow-down"
              color="coral"
              onPress={() => router.push('/rapports')}
              style={styles.actionBtn}
            />
          </View>
        </GradientCard>

        {/* Section "Just for you" avec icônes colorées */}
        <ModernCard style={styles.justForYouCard}>
          <Text style={styles.sectionTitle}>Just for you</Text>
          <View style={styles.iconGrid}>
            <IconCard
              icon="wallet"
              label="Micro Finance"
              color={COLORS.iconYellow}
              onPress={createNewAchat}
              style={styles.iconCardItem}
            />
            <IconCard
              icon="paper-plane"
              label="Transfer"
              color={COLORS.iconPink}
              onPress={() => router.push('/produits')}
              style={styles.iconCardItem}
            />
            <IconCard
              icon="trending-up"
              label="Invest"
              color={COLORS.iconViolet}
              onPress={() => router.push('/statistiques')}
              style={styles.iconCardItem}
            />
            <IconCard
              icon="heart"
              label="Donate"
              color={COLORS.iconCoral}
              onPress={() => router.push('/rapports')}
              style={styles.iconCardItem}
            />
          </View>
        </ModernCard>

        {/* Recent Activity */}
        <View style={styles.recentActivitySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={loadData}>
              <Text style={styles.viewAllText}>View all</Text>
            </TouchableOpacity>
          </View>

          {achats.slice(0, 5).map((achat, index) => (
            <TouchableOpacity
              key={achat.id}
              style={styles.activityCard}
              onPress={() => router.push(`/achat/${achat.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.activityIcon}>
                <Ionicons name="cart" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityTitle}>{achat.nomListe}</Text>
                <Text style={styles.activityDate}>
                  {format(new Date(achat.dateAchat), 'dd MMM yyyy')} • {achat.nombreArticles} items
                </Text>
              </View>
              <Text style={styles.activityAmount}>{achat.totalDepense.toLocaleString()} Ar</Text>
            </TouchableOpacity>
          ))}

          {achats.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="basket-outline" size={48} color={COLORS.textLight} />
              <Text style={styles.emptyText}>No activity yet</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={createNewAchat}>
                <Text style={styles.emptyButtonText}>Start Shopping</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={[styles.navItem, styles.navItemActive]}>
          <Ionicons name="home" size={24} color={COLORS.primary} />
          <Text style={[styles.navLabel, styles.navLabelActive]}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/rapports')}
        >
          <Ionicons name="wallet" size={24} color={COLORS.textLight} />
          <Text style={styles.navLabel}>Wallet</Text>
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
          <Text style={styles.navLabel}>Profile</Text>
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
  
  // Balance Card
  balanceCard: {
    marginBottom: 24,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
  },
  
  // Just For You
  justForYouCard: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  iconGrid: {
    flexDirection: 'row',
    gap: isSmallScreen ? 8 : 12,
    flexWrap: 'wrap',
  },
  iconCardItem: {
    flex: isSmallScreen ? 0 : 1,
    minWidth: isSmallScreen ? (SCREEN_WIDTH - 64) / 2 : 100,
    maxWidth: isSmallScreen ? (SCREEN_WIDTH - 64) / 2 : 150,
  },
  
  // Recent Activity
  recentActivitySection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  activityDate: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  activityAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 12,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
