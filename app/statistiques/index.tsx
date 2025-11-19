import { View, Text, ScrollView, Dimensions, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { useEffect, useState, useRef } from 'react';
import { getDb } from '@db/init';
import { Ionicons } from '@expo/vector-icons';
import { SECTION_COLORS, COLORS, ANIMATIONS } from '@constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { fadeScaleIn } from '../../src/utils/animations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Constants
const CHART_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#95E1D3', '#FFA07A', '#FFD93D', '#6BCB77', '#FF8B94'];
const PERIOD_OPTIONS = [
  { key: '7days', label: '7j', days: 7 },
  { key: '30days', label: '30j', days: 30 },
  { key: '90days', label: '90j', days: 90 },
  { key: 'all', label: 'Tout', days: null }
];
const VIEW_MODES = [
  { key: 'repartition', label: 'Répartition', icon: 'pie-chart' },
  { key: 'weekly', label: 'Semaine', icon: 'calendar' },
  { key: 'monthly', label: 'Mois', icon: 'bar-chart' }
];

interface ChartData {
  name: string;
  color: string;
  population: number;
  legendFontColor: string;
  legendFontSize: number;
}

interface ComparativeData {
  period: string;
  montant: number;
  nbAchats: number;
}

type PeriodFilter = '7days' | '30days' | '90days' | 'all';
type ViewMode = 'repartition' | 'weekly' | 'monthly';

// Helper functions
const getColorForProduct = (name: string, index: number): string => {
  const colorMap: Record<string, string> = {
    'Riz': '#FF6B6B', 'Poulet': '#FF6B6B', 'Viande': '#FF6B6B',
    'Huile': '#4ECDC4', 'Lait': '#4ECDC4',
    'Pain': '#45B7D1', 'Cahier': '#45B7D1', 'Stylo': '#45B7D1',
    'Tomate': '#95E1D3', 'Oignon': '#95E1D3'
  };
  return colorMap[name] || CHART_COLORS[index % CHART_COLORS.length];
};

const getPeriodLabel = (period: PeriodFilter): string => {
  const labels: Record<PeriodFilter, string> = {
    '7days': '7 derniers jours',
    '30days': '30 derniers jours',
    '90days': '90 derniers jours',
    'all': 'Toutes les périodes'
  };
  return labels[period];
};

const getDateFilter = (period: PeriodFilter): string => {
  if (period === 'all') return '';
  const days = PERIOD_OPTIONS.find(p => p.key === period)?.days;
  return days ? `AND a.dateAchat >= datetime('now', '-${days} days')` : '';
};

export default function Stats() {
  const [data, setData] = useState<ChartData[]>([]);
  const [period, setPeriod] = useState<PeriodFilter>('30days');
  const [totalDepenses, setTotalDepenses] = useState(0);
  const [nbAchats, setNbAchats] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('repartition');
  const [weeklyData, setWeeklyData] = useState<ComparativeData[]>([]);
  const [monthlyData, setMonthlyData] = useState<ComparativeData[]>([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const loadCategoryData = () => {
    const db = getDb();
    const dateFilter = getDateFilter(period);

    const rows = db.getAllSync(`
      SELECT l.libelleProduit as name, SUM(l.prixTotal) as montant
      FROM LigneAchat l
      JOIN Achat a ON a.id = l.idAchat
      WHERE 1=1 ${dateFilter} AND l.prixTotal > 0
      GROUP BY l.libelleProduit
      ORDER BY montant DESC
      LIMIT 8
    `) as Array<{ name: string; montant: number }>;

    const formatted = rows.map((r, i) => ({
      name: r.name || `Cat ${i + 1}`,
      color: getColorForProduct(r.name, i),
      population: r.montant,
      legendFontColor: '#555',
      legendFontSize: 11
    }));

    setData(formatted.length ? formatted : [{ name: 'Aucune donnée', color: '#ddd', population: 1, legendFontColor: '#555', legendFontSize: 12 }]);

    const total = formatted.reduce((sum, item) => sum + item.population, 0);
    setTotalDepenses(total);

    const countResult = db.getAllSync(`
      SELECT COUNT(DISTINCT a.id) as nb FROM Achat a
      JOIN LigneAchat la ON a.id = la.idAchat
      WHERE 1=1 ${dateFilter} AND la.prixTotal > 0
    `);
    setNbAchats((countResult[0] as any)?.nb ?? 0);
  };

  const loadComparativeData = () => {
    const db = getDb();
    const weeks: ComparativeData[] = [];
    const months: ComparativeData[] = [];

    for (let i = 0; i < 4; i++) {
      const ws = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
      const we = endOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
      const result = db.getAllSync(
        `SELECT COALESCE(SUM(la.prixTotal), 0) as montant, COUNT(DISTINCT a.id) as nbAchats
         FROM Achat a JOIN LigneAchat la ON a.id = la.idAchat
         WHERE DATE(a.dateAchat) BETWEEN DATE(?) AND DATE(?)`,
        [format(ws, 'yyyy-MM-dd'), format(we, 'yyyy-MM-dd')]
      );
      weeks.unshift({ period: `Sem ${i === 0 ? 'act' : `-${i}`}`, montant: (result[0] as any)?.montant || 0, nbAchats: (result[0] as any)?.nbAchats || 0 });
    }

    for (let i = 0; i < 6; i++) {
      const ms = startOfMonth(subMonths(new Date(), i));
      const me = endOfMonth(subMonths(new Date(), i));
      const result = db.getAllSync(
        `SELECT COALESCE(SUM(la.prixTotal), 0) as montant, COUNT(DISTINCT a.id) as nbAchats
         FROM Achat a JOIN LigneAchat la ON a.id = la.idAchat
         WHERE DATE(a.dateAchat) BETWEEN DATE(?) AND DATE(?)`,
        [format(ms, 'yyyy-MM-dd'), format(me, 'yyyy-MM-dd')]
      );
      months.unshift({ period: format(ms, 'MMM', { locale: fr }), montant: (result[0] as any)?.montant || 0, nbAchats: (result[0] as any)?.nbAchats || 0 });
    }

    setWeeklyData(weeks);
    setMonthlyData(months);
  };

  useEffect(() => {
    loadCategoryData();
    loadComparativeData();
  }, [period]);

  useEffect(() => {
    fadeScaleIn(fadeAnim, scaleAnim, ANIMATIONS.duration.normal).start();
  }, []);

  const renderCategoryItem = (item: ChartData, index: number) => (
    <View key={item.name} style={[styles.categoryItem, index === data.length - 1 && styles.categoryItemLast]}>
      <View style={styles.categoryLeft}>
        <View style={[styles.categoryBadge, { backgroundColor: item.color }]} />
        <Text style={styles.categoryName} numberOfLines={1}>{item.name}</Text>
      </View>
      <View style={styles.categoryRight}>
        <Text style={styles.categoryAmount}>{item.population.toLocaleString()} Ar</Text>
        <Text style={styles.categoryPercent}>
          {totalDepenses > 0 ? ((item.population / totalDepenses) * 100).toFixed(1) : 0}%
        </Text>
      </View>
    </View>
  );

  const renderComparativeItem = (item: ComparativeData, index: number, total: number) => {
    const maxMontant = Math.max(...total === 4 ? weeklyData.map(w => w.montant) : monthlyData.map(m => m.montant), 1);
    const percentage = (item.montant / maxMontant) * 100;
    const isLatest = index === (total === 4 ? 0 : monthlyData.length - 1);

    return (
      <View key={index} style={styles.periodCard}>
        <View style={styles.periodHeader}>
          <View style={styles.periodIconContainer}>
            <Ionicons name={total === 4 ? 'calendar-outline' : 'calendar'} size={20} color="white" />
          </View>
          <View style={styles.periodInfo}>
            <Text style={styles.periodName}>{item.period}</Text>
            <View style={styles.periodMeta}>
              <Ionicons name="bag-outline" size={11} color={COLORS.textLight} />
              <Text style={styles.periodSubtext}>{item.nbAchats} achats</Text>
            </View>
          </View>
          <View style={styles.periodAmount}>
            <Text style={styles.periodMontant}>{item.montant.toLocaleString()} Ar</Text>
            {isLatest && <View style={styles.periodBadge}><Text style={styles.periodBadgeText}>Actuel</Text></View>}
          </View>
        </View>
        <View style={styles.periodBarContainer}>
          <View style={[styles.periodBar, { width: `${Math.min(100, percentage)}%` }]} />
        </View>
      </View>
    );
  };

  return (
    <Animated.ScrollView style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={SECTION_COLORS.achats.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <TouchableOpacity style={styles.headerBack}>
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Ionicons name="stats-chart" size={28} color="white" />
          <Text style={styles.headerTitle}>Statistiques</Text>
        </View>
      </LinearGradient>

      {/* Breadcrumb Navigation */}
      <View style={styles.breadcrumb}>
        <View style={styles.breadcrumbItem}>
          <Ionicons name="home" size={14} color={SECTION_COLORS.achats.primary} />
          <Text style={styles.breadcrumbText}>Accueil</Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color={COLORS.textLight} />
        <View style={styles.breadcrumbItem}>
          <Ionicons name="stats-chart" size={14} color={SECTION_COLORS.achats.primary} />
          <Text style={[styles.breadcrumbText, styles.breadcrumbActive]}>Statistiques</Text>
        </View>
      </View>

      {/* View Mode Selector */}
      <View style={styles.viewModeContainer}>
        {VIEW_MODES.map((mode) => (
          <TouchableOpacity
            key={mode.key}
            style={[styles.viewModeButton, viewMode === mode.key && styles.viewModeButtonActive]}
            onPress={() => setViewMode(mode.key as ViewMode)}
          >
            <Ionicons name={mode.icon} size={18} color={viewMode === mode.key ? 'white' : SECTION_COLORS.achats.primary} />
            <Text style={[styles.viewModeText, viewMode === mode.key && styles.viewModeTextActive]}>{mode.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}><Ionicons name="bag" size={24} color="white" /></View>
          <Text style={styles.summaryNumber}>{nbAchats}</Text>
          <Text style={styles.summaryLabel}>Achats</Text>
        </View>
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}><Ionicons name="cash" size={24} color="white" /></View>
          <Text style={styles.summaryNumber}>{totalDepenses.toLocaleString()}</Text>
          <Text style={styles.summaryLabel}>Total (Ar)</Text>
        </View>
      </View>

      {/* Period Filter (for Repartition) */}
      {viewMode === 'repartition' && (
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Période:</Text>
          <View style={styles.periodButtons}>
            {PERIOD_OPTIONS.map((p) => (
              <TouchableOpacity
                key={p.key}
                style={[styles.periodButton, period === p.key && styles.periodButtonActive]}
                onPress={() => setPeriod(p.key as PeriodFilter)}
              >
                <Text style={[styles.periodButtonText, period === p.key && styles.periodButtonTextActive]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Repartition View */}
      {viewMode === 'repartition' && (
        <>
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Répartition par catégorie</Text>
            <Text style={styles.chartSubtitle}>{getPeriodLabel(period)}</Text>
            
            {data[0]?.name !== 'Aucune donnée' ? (
              <View style={styles.chartWrapper}>
                <PieChart
                  data={data}
                  width={SCREEN_WIDTH - 32}
                  height={220}
                  chartConfig={{
                    backgroundColor: 'transparent',
                    backgroundGradientFrom: 'transparent',
                    backgroundGradientTo: 'transparent',
                    color: () => SECTION_COLORS.achats.primary,
                  }}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="0"
                  absolute
                />
              </View>
            ) : (
              <View style={styles.emptyChart}>
                <Ionicons name="pie-chart-outline" size={56} color={COLORS.textLight} />
                <Text style={styles.emptyText}>Aucune donnée disponible</Text>
              </View>
            )}
          </View>

          {data[0]?.name !== 'Aucune donnée' && data.length > 0 && (
            <View style={styles.detailsContainer}>
              <View style={styles.detailsHeader}>
                <Ionicons name="list" size={20} color={SECTION_COLORS.achats.primary} />
                <Text style={styles.detailsTitle}>Détails</Text>
              </View>
              {data.map(renderCategoryItem)}
            </View>
          )}
        </>
      )}

      {/* Weekly View */}
      {viewMode === 'weekly' && (
        <View style={styles.comparativeContainer}>
          <View style={styles.comparativeHeader}>
            <Ionicons name="calendar-outline" size={20} color={SECTION_COLORS.achats.primary} />
            <View>
              <Text style={styles.comparativeTitle}>Évolution hebdomadaire</Text>
              <Text style={styles.comparativeSubtitle}>4 dernières semaines</Text>
            </View>
          </View>
          {weeklyData.map((w, i) => renderComparativeItem(w, i, 4))}
        </View>
      )}

      {/* Monthly View */}
      {viewMode === 'monthly' && (
        <View style={styles.comparativeContainer}>
          <View style={styles.comparativeHeader}>
            <Ionicons name="calendar" size={20} color={SECTION_COLORS.achats.primary} />
            <View>
              <Text style={styles.comparativeTitle}>Évolution mensuelle</Text>
              <Text style={styles.comparativeSubtitle}>6 derniers mois</Text>
            </View>
          </View>
          {monthlyData.map((m, i) => renderComparativeItem(m, i, 6))}
        </View>
      )}
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingTop: 50, paddingHorizontal: 20, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, shadowColor: SECTION_COLORS.achats.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  headerBack: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  
  // Breadcrumb
  breadcrumb: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 8, backgroundColor: 'white', marginBottom: 12 },
  breadcrumbItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  breadcrumbText: { fontSize: 12, color: COLORS.textLight },
  breadcrumbActive: { color: SECTION_COLORS.achats.primary, fontWeight: '600' },
  
  // View Mode
  viewModeContainer: { flexDirection: 'row', padding: 16, gap: 8, backgroundColor: 'white', marginBottom: 8 },
  viewModeButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: SECTION_COLORS.achats.light, gap: 6 },
  viewModeButtonActive: { backgroundColor: SECTION_COLORS.achats.primary },
  viewModeText: { fontSize: 13, color: SECTION_COLORS.achats.primary, fontWeight: '600' },
  viewModeTextActive: { color: 'white' },
  
  // Filters
  filterContainer: { backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 12, marginBottom: 8 },
  filterLabel: { fontSize: 14, color: COLORS.text, marginBottom: 8, fontWeight: '600' },
  periodButtons: { flexDirection: 'row', gap: 8 },
  periodButton: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: COLORS.surface, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  periodButtonActive: { backgroundColor: SECTION_COLORS.achats.primary, borderColor: SECTION_COLORS.achats.primary },
  periodButtonText: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  periodButtonTextActive: { color: 'white' },
  
  // Summary
  summaryContainer: { flexDirection: 'row', padding: 16, gap: 12 },
  summaryCard: { flex: 1, backgroundColor: 'white', padding: 16, borderRadius: 16, alignItems: 'center', borderLeftWidth: 4, borderLeftColor: SECTION_COLORS.achats.primary, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  summaryIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: SECTION_COLORS.achats.light, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  summaryNumber: { fontSize: 18, fontWeight: 'bold', color: SECTION_COLORS.achats.primary, marginBottom: 4 },
  summaryLabel: { fontSize: 12, color: COLORS.textLight },
  
  // Chart
  chartContainer: { backgroundColor: 'white', marginHorizontal: 16, marginBottom: 16, padding: 20, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  chartTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  chartSubtitle: { fontSize: 12, color: COLORS.textLight, marginBottom: 16 },
  chartWrapper: { alignItems: 'center' },
  emptyChart: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, color: COLORS.textLight },
  
  // Category Details
  detailsContainer: { backgroundColor: 'white', marginHorizontal: 16, marginBottom: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, overflow: 'hidden' },
  detailsHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailsTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  categoryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  categoryItemLast: { borderBottomWidth: 0 },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  categoryBadge: { width: 16, height: 16, borderRadius: 8 },
  categoryName: { fontSize: 14, fontWeight: '500', color: COLORS.text, flex: 1 },
  categoryRight: { alignItems: 'flex-end' },
  categoryAmount: { fontSize: 14, fontWeight: 'bold', color: SECTION_COLORS.achats.primary },
  categoryPercent: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  
  // Comparative
  comparativeContainer: { backgroundColor: 'white', marginHorizontal: 16, marginBottom: 32, padding: 20, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  comparativeHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  comparativeTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  comparativeSubtitle: { fontSize: 12, color: COLORS.textLight },
  periodCard: { marginBottom: 12, padding: 14, backgroundColor: COLORS.surface, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: SECTION_COLORS.achats.primary },
  periodHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  periodIconContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: SECTION_COLORS.achats.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  periodInfo: { flex: 1 },
  periodName: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  periodMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  periodSubtext: { fontSize: 11, color: COLORS.textLight },
  periodAmount: { alignItems: 'flex-end' },
  periodMontant: { fontSize: 15, fontWeight: 'bold', color: SECTION_COLORS.achats.primary, marginBottom: 2 },
  periodBadge: { backgroundColor: SECTION_COLORS.achats.light, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  periodBadgeText: { fontSize: 9, fontWeight: '600', color: SECTION_COLORS.achats.primary },
  periodBarContainer: { height: 8, backgroundColor: COLORS.divider, borderRadius: 4, overflow: 'hidden' },
  periodBar: { height: '100%', backgroundColor: SECTION_COLORS.achats.primary, borderRadius: 4 }
});