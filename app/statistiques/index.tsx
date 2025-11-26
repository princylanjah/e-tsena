import React, { useEffect, useState, useRef } from 'react';
import { 
  View, Text, ScrollView, Dimensions, TouchableOpacity, StyleSheet, 
  Animated, Modal, StatusBar, ActivityIndicator, Platform
} from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { getDb } from '../../src/db/init';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, startOfYear, endOfYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import { router } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BASE_CHART_COLORS = ['#FFD54F', '#4FC3F7', '#AED581', '#9575CD', '#FF8A65', '#F06292'];

// --- TYPES ---
interface ChartData {
  name: string;
  population: number;
  color: string;
  legendFontColor: string;
  legendFontSize: number;
}

interface ComparativeData {
  id: string;
  period: string;
  fullLabel: string;
  montant: number;
  nbAchats: number;
  startDate: string;
  endDate: string;
}

interface JournalEntry {
  id: number;
  nomListe: string;
  dateAchat: string;
  total: number;
  nbArticles: number;
}

type ViewMode = 'repartition' | 'weekly' | 'monthly';

export default function StatsScreen() {
  const { activeTheme } = useTheme();
  const s = getStyles(activeTheme);

  // --- ÉTATS ---
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ChartData[]>([]); // Données PieChart
  
  // Totaux
  const [totalGlobal, setTotalGlobal] = useState(0);
  const [totalYear, setTotalYear] = useState(0);
  const [nbAchatsGlobal, setNbAchatsGlobal] = useState(0);
  
  // Vues
  const [viewMode, setViewMode] = useState<ViewMode>('repartition');
  const [weeklyData, setWeeklyData] = useState<ComparativeData[]>([]);
  const [monthlyData, setMonthlyData] = useState<ComparativeData[]>([]);

  // MODAL DÉTAIL
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<ComparativeData | null>(null);
  const [journalData, setJournalData] = useState<JournalEntry[]>([]);
  
  // MENU
  const [showMenu, setShowMenu] = useState(false);

  // ANIMATIONS
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    loadAllData();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true })
    ]).start();
  }, []);

  const loadAllData = () => {
    const db = getDb();
    try {
      // 1. TOTAL GLOBAL (Tout temps)
      const resGlobal = db.getAllSync(`SELECT COALESCE(SUM(prixTotal), 0) as t FROM LigneAchat`);
      const tGlobal = (resGlobal[0] as any)?.t || 0;
      setTotalGlobal(tGlobal);

      // 2. TOTAL CETTE ANNÉE (Pour vérification cohérence)
      const startY = format(startOfYear(new Date()), 'yyyy-MM-dd');
      const endY = format(endOfYear(new Date()), 'yyyy-MM-dd');
      const resYear = db.getAllSync(`
        SELECT COALESCE(SUM(l.prixTotal), 0) as t 
        FROM LigneAchat l JOIN Achat a ON a.id = l.idAchat 
        WHERE DATE(a.dateAchat) BETWEEN ? AND ?
      `, [startY, endY]);
      setTotalYear((resYear[0] as any)?.t || 0);

      // 3. Compteur Achats Global
      const resCount = db.getAllSync(`SELECT COUNT(DISTINCT id) as c FROM Achat`);
      setNbAchatsGlobal((resCount[0] as any)?.c || 0);

      // 4. Répartition Catégorie (Global)
      const rows = db.getAllSync(`
        SELECT l.libelleProduit as name, SUM(l.prixTotal) as montant
        FROM LigneAchat l
        GROUP BY l.libelleProduit ORDER BY montant DESC LIMIT 6
      `) as { name: string; montant: number }[];

      const chartColors = [activeTheme.primary, activeTheme.secondary, ...BASE_CHART_COLORS];
      const chartData = rows.map((r, i) => ({
        name: r.name,
        population: r.montant,
        color: chartColors[i % chartColors.length],
        legendFontColor: '#666',
        legendFontSize: 12
      }));
      setData(chartData.length > 0 ? chartData : [{ name: 'Vide', population: 1, color: '#ddd', legendFontColor: '#aaa', legendFontSize: 12 }]);

      // 5. Chargement Comparatifs
      loadComparative(db);

    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const loadComparative = (db: any) => {
    // SEMAINE (4 dernières)
    const weeks: ComparativeData[] = [];
    for (let i = 0; i < 4; i++) {
      const ws = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
      const we = endOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
      const sStr = format(ws, 'yyyy-MM-dd');
      const eStr = format(we, 'yyyy-MM-dd');

      const res = db.getAllSync(`
         SELECT COALESCE(SUM(l.prixTotal), 0) as montant, COUNT(DISTINCT a.id) as nb
         FROM Achat a JOIN LigneAchat l ON a.id = l.idAchat
         WHERE DATE(a.dateAchat) BETWEEN ? AND ?`, [sStr, eStr]);
      
      weeks.push({
        id: `w-${i}`,
        period: `Sem. ${format(ws, 'dd/MM')}`,
        fullLabel: `Semaine du ${format(ws, 'dd MMM')} au ${format(we, 'dd MMM')}`,
        montant: (res[0] as any)?.montant || 0,
        nbAchats: (res[0] as any)?.nb || 0,
        startDate: sStr,
        endDate: eStr
      });
    }
    setWeeklyData(weeks);

    // MOIS (6 derniers pour plus de contexte)
    const months: ComparativeData[] = [];
    for (let i = 0; i < 3; i++) {
      const d = subMonths(new Date(), i);
      const ms = startOfMonth(d);
      const me = endOfMonth(d);
      const sStr = format(ms, 'yyyy-MM-dd');
      const eStr = format(me, 'yyyy-MM-dd');

      const res = db.getAllSync(`
         SELECT COALESCE(SUM(l.prixTotal), 0) as montant, COUNT(DISTINCT a.id) as nb
         FROM Achat a JOIN LigneAchat l ON a.id = l.idAchat
         WHERE DATE(a.dateAchat) BETWEEN ? AND ?`, [sStr, eStr]);
      
      months.push({
        id: `m-${i}`,
        period: format(ms, 'MMMM', { locale: fr }),
        fullLabel: format(ms, 'MMMM yyyy', { locale: fr }),
        montant: (res[0] as any)?.montant || 0,
        nbAchats: (res[0] as any)?.nb || 0,
        startDate: sStr,
        endDate: eStr
      });
    }
    setMonthlyData(months);
  };

  // OUVRIR LA MODAL DE DÉTAIL
  const openDetailModal = (item: ComparativeData) => {
    setSelectedPeriod(item);
    try {
      const db = getDb();
      const res = db.getAllSync(`
        SELECT a.id, a.nomListe, a.dateAchat, SUM(l.prixTotal) as total, COUNT(l.id) as nbArticles
        FROM Achat a JOIN LigneAchat l ON a.id = l.idAchat
        WHERE DATE(a.dateAchat) BETWEEN ? AND ?
        GROUP BY a.id ORDER BY a.dateAchat DESC
      `, [item.startDate, item.endDate]);
      
      setJournalData(res as JournalEntry[]);
      setShowDetailModal(true);
    } catch (e) { console.error(e); }
  };

  // EXPORT PDF DEPUIS LA MODAL
  const exportPDF = async () => {
    if (!selectedPeriod || journalData.length === 0) return;
    try {
      const html = `
        <html>
          <body style="font-family: Helvetica; padding: 20px;">
            <h1 style="text-align: center; color: ${activeTheme.primary};">${selectedPeriod.fullLabel}</h1>
            <h3 style="text-align: center; color: #666;">Rapport de dépenses</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <tr style="background-color: ${activeTheme.primary}; color: white;">
                <th style="padding: 10px;">Date</th><th>Liste</th><th style="text-align: right;">Montant</th>
              </tr>
              ${journalData.map(j => `
                <tr style="border-bottom: 1px solid #ddd;">
                  <td style="padding: 10px;">${format(new Date(j.dateAchat), 'dd/MM/yyyy')}</td>
                  <td style="padding: 10px;">${j.nomListe}</td>
                  <td style="padding: 10px; text-align: right;">${j.total.toLocaleString()} Ar</td>
                </tr>
              `).join('')}
            </table>
            <h2 style="text-align: right; margin-top: 20px; color: ${activeTheme.primary};">Total: ${selectedPeriod.montant.toLocaleString()} Ar</h2>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (e) { Alert.alert("Erreur", "Export PDF échoué"); }
  };

  // --- RENDER BARRE ---
  const renderProgressBar = (item: ComparativeData, max: number) => {
    const percent = max > 0 ? (item.montant / max) * 100 : 0;
    return (
      <TouchableOpacity 
         key={item.id} 
         onPress={() => openDetailModal(item)}
         style={s.progressContainer}
      >
        <View style={s.progressHeader}>
          <Text style={s.progressLabel}>{item.period}</Text>
          <Text style={s.progressValue}>{item.montant.toLocaleString()} Ar</Text>
        </View>
        <View style={s.track}>
          <LinearGradient
            colors={[activeTheme.primary, activeTheme.secondary]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[s.bar, { width: `${percent}%` }]}
          />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
           <Text style={s.progressSub}>{item.nbAchats} achat(s)</Text>
           <Text style={[s.progressSub, { color: activeTheme.primary, fontWeight: 'bold' }]}>Voir détail &gt;</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return <ActivityIndicator style={s.center} color={activeTheme.primary} />;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      
      {/* HEADER */}
      <LinearGradient colors={activeTheme.gradient as any} style={s.header}>
        <View style={s.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Statistiques</Text>
          <TouchableOpacity onPress={() => setShowMenu(true)} style={s.iconBtn}>
            <Ionicons name="menu" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View style={s.summaryRow}>
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>Total Global</Text>
            <Text style={[s.summaryValue, { color: activeTheme.primary }]}>{totalGlobal.toLocaleString()} Ar</Text>
          </View>
          <View style={s.verticalDivider} />
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>Total Année {new Date().getFullYear()}</Text>
            <Text style={[s.summaryValue, { color: activeTheme.primary }]}>{totalYear.toLocaleString()} Ar</Text>
          </View>
        </View>
      </LinearGradient>

      <Animated.ScrollView 
        style={[s.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* TABS */}
        <View style={s.tabContainer}>
          {[
            { k: 'repartition', l: 'Répartition' },
            { k: 'weekly', l: 'Semaine' },
            { k: 'monthly', l: 'Mois' }
          ].map(t => (
            <TouchableOpacity 
               key={t.k} 
               style={[s.tab, viewMode === t.k && { backgroundColor: activeTheme.primary + '20' }]}
               onPress={() => setViewMode(t.k as ViewMode)}
            >
               <Text style={[s.tabText, viewMode === t.k && { color: activeTheme.primary, fontWeight: 'bold' }]}>{t.l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* VUE : RÉPARTITION */}
        {viewMode === 'repartition' && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Top Produits (Valeur)</Text>
            <View style={s.chartWrapper}>
              <PieChart
                data={data}
                width={SCREEN_WIDTH - 60}
                height={220}
                chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
                hasLegend={false}
              />
              <View style={s.donutCenter}>
                <Ionicons name="pie-chart" size={32} color={activeTheme.primary} style={{opacity:0.8}} />
              </View>
            </View>

            <View style={s.legendContainer}>
              {data.map((item, index) => (
                <View key={index} style={s.legendItem}>
                  <View style={s.legendLeft}>
                    <View style={[s.dot, { backgroundColor: item.color }]} />
                    <Text style={s.legendName} numberOfLines={1}>{item.name}</Text>
                  </View>
                  <Text style={s.legendValue}>
                    {totalGlobal > 0 ? `${Math.round((item.population / totalGlobal) * 100)}%` : '0%'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* VUE : COMPARATIFS */}
        {(viewMode === 'weekly' || viewMode === 'monthly') && (
          <View style={s.card}>
            <Text style={s.cardTitle}>
              {viewMode === 'weekly' ? '4 Dernières Semaines' : '3 Derniers Mois'}
            </Text>
            <View style={{ marginTop: 15 }}>
              {(viewMode === 'weekly' ? weeklyData : monthlyData).map((item) => 
                renderProgressBar(item, Math.max(...(viewMode === 'weekly' ? weeklyData : monthlyData).map(i => i.montant)))
              )}
            </View>
          </View>
        )}

      </Animated.ScrollView>

      {/* --- MODAL DÉTAIL (JOURNAL) --- */}
      <Modal visible={showDetailModal} animationType="slide" presentationStyle="pageSheet">
         <View style={s.modalContainer}>
            <View style={s.modalHeader}>
               <Text style={s.modalTitle}>{selectedPeriod?.fullLabel}</Text>
               <TouchableOpacity onPress={() => setShowDetailModal(false)} style={s.modalCloseBtn}>
                  <Ionicons name="close" size={24} color="#666" />
               </TouchableOpacity>
            </View>

            <View style={s.modalSummary}>
               <View>
                  <Text style={s.modalLabel}>Total Période</Text>
                  <Text style={[s.modalTotal, { color: activeTheme.primary }]}>{selectedPeriod?.montant.toLocaleString()} Ar</Text>
               </View>
               <TouchableOpacity style={[s.btnPdf, { borderColor: activeTheme.primary }]} onPress={exportPDF}>
                  <Ionicons name="share-outline" size={20} color={activeTheme.primary} />
                  <Text style={{ color: activeTheme.primary, fontWeight: 'bold', marginLeft: 5 }}>PDF</Text>
               </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
               {journalData.length === 0 ? (
                  <Text style={s.emptyText}>Aucune dépense.</Text>
               ) : (
                  journalData.map((item) => (
                     <View key={item.id} style={s.journalRow}>
                        <View style={s.journalLeft}>
                           <View style={[s.dateBadge, { backgroundColor: activeTheme.secondary }]}>
                              <Text style={{ fontSize: 12, fontWeight: 'bold', color: activeTheme.primary }}>{format(new Date(item.dateAchat), 'dd')}</Text>
                              <Text style={{ fontSize: 9, color: activeTheme.primary }}>{format(new Date(item.dateAchat), 'MMM', { locale: fr })}</Text>
                           </View>
                           <View>
                              <Text style={s.journalName}>{item.nomListe}</Text>
                              <Text style={s.journalSub}>{item.nbArticles} articles</Text>
                           </View>
                        </View>
                        <Text style={s.journalPrice}>{item.total.toLocaleString()} Ar</Text>
                     </View>
                  ))
               )}
            </ScrollView>
         </View>
      </Modal>

      {/* --- MENU HAMBURGER --- */}
      <Modal visible={showMenu} transparent animationType="fade">
         <TouchableOpacity style={s.menuOverlay} onPress={() => setShowMenu(false)}>
            <View style={s.menuBox}>
               <Text style={[s.menuTitle, { color: activeTheme.primary }]}>Navigation</Text>
               <TouchableOpacity style={s.menuItem} onPress={() => { setShowMenu(false); router.push('/'); }}>
                  <Ionicons name="home-outline" size={22} color="#555" />
                  <Text style={s.menuText}>Accueil</Text>
               </TouchableOpacity>
               <TouchableOpacity style={s.menuItem} onPress={() => { setShowMenu(false); router.push('/rapports'); }}>
                  <Ionicons name="pie-chart-outline" size={22} color="#555" />
                  <Text style={s.menuText}>Rapports</Text>
               </TouchableOpacity>
            </View>
         </TouchableOpacity>
      </Modal>

    </View>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // HEADER
  header: { paddingTop: 50, paddingBottom: 80, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  iconBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },

  // RÉSUMÉ FLOTTANT
  summaryRow: {
    position: 'absolute', bottom: -35, left: 20, right: 20,
    flexDirection: 'row', backgroundColor: '#fff',
    borderRadius: 20, padding: 20, justifyContent: 'space-around',
    shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5
  },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { color: '#9CA3AF', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  summaryValue: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  verticalDivider: { width: 1, backgroundColor: '#E2E8F0', height: '80%' },

  content: { flex: 1, marginTop: 55, paddingHorizontal: 20 },

  // TABS
  tabContainer: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16,
    padding: 5, marginBottom: 20, elevation: 2
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  tabText: { color: '#64748B', fontWeight: '600', fontSize: 13 },

  // CARDS
  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 20,
    shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3
  },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 5 },
  cardSub: { fontSize: 12, color: '#9CA3AF' },

  // PROGRESS BAR
  progressContainer: { marginBottom: 15, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 14 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 14, fontWeight: '600', color: '#333', textTransform: 'capitalize' },
  progressValue: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  track: { height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 4 },
  progressSub: { fontSize: 11, color: '#9CA3AF' },

  // CHART
  chartWrapper: { alignItems: 'center', position: 'relative' },
  donutCenter: { position: 'absolute', top: '42%', left: '45%' },
  legendContainer: { marginTop: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  legendLeft: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  legendName: { fontSize: 14, color: '#333', fontWeight: '500', maxWidth: 200 },
  legendValue: { fontSize: 14, fontWeight: '700', color: '#64748B' },

  // MODAL STYLE
  modalContainer: { flex: 1, backgroundColor: '#fff', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingTop: 20 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#333', textTransform: 'capitalize' },
  modalCloseBtn: { padding: 5 },
  
  modalSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 20, borderBottomWidth: 1, borderColor: '#f0f0f0', marginBottom: 10 },
  modalLabel: { fontSize: 12, color: '#999', fontWeight: '600', textTransform: 'uppercase' },
  modalTotal: { fontSize: 24, fontWeight: '800' },
  btnPdf: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1 },

  // JOURNAL LIST
  journalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderColor: '#f5f5f5' },
  journalLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateBadge: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  journalName: { fontSize: 16, fontWeight: '600', color: '#333' },
  journalSub: { fontSize: 12, color: '#999' },
  journalPrice: { fontSize: 16, fontWeight: '700', color: '#333' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 20, fontStyle: 'italic' },

  // MENU
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start', padding: 20, paddingTop: 60 },
  menuBox: { backgroundColor: '#fff', padding: 20, borderRadius: 20, width: 200, alignSelf: 'flex-end', elevation: 10 },
  menuTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  menuText: { fontSize: 14, fontWeight: '500', color: '#333' }
});