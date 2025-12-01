import React, { useEffect, useState, useRef } from 'react';
import { 
  View, Text, ScrollView, Dimensions, TouchableOpacity, StyleSheet, 
  Animated, Modal, StatusBar, ActivityIndicator, Platform, FlatList
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PieChart } from 'react-native-chart-kit';
import { getDb } from '../../src/db/init';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, startOfYear, endOfYear } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { router } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../../src/context/SettingsContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

interface ProductEntry {
  libelleProduit: string;
  totalQte: number;
  totalPrix: number;
}

type ViewMode = 'repartition' | 'weekly' | 'monthly';

export default function StatsScreen() {
  const { activeTheme, isDarkMode } = useTheme();
  const { currency, language, t } = useSettings();
  const insets = useSafeAreaInsets();
  const s = getStyles(activeTheme, isDarkMode);

  // --- ÉTATS ---
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ChartData[]>([]); // Données PieChart
  const [allProducts, setAllProducts] = useState<{ name: string; montant: number }[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]); // Pour le filtrage
  const [showAllProductsModal, setShowAllProductsModal] = useState(false);
  
  // Totaux
  const [totalGlobal, setTotalGlobal] = useState(0);
  const [totalYear, setTotalYear] = useState(0);
  const [totalMonth, setTotalMonth] = useState(0);
  
  // Vues
  const [viewMode, setViewMode] = useState<ViewMode>('repartition');
  const [weeklyData, setWeeklyData] = useState<ComparativeData[]>([]);
  const [monthlyData, setMonthlyData] = useState<ComparativeData[]>([]);

  // MODAL DÉTAIL
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<ComparativeData | null>(null);
  const [journalData, setJournalData] = useState<ProductEntry[]>([]);
  
  // MENU
  const [showMenu, setShowMenu] = useState(false);

  // ANIMATIONS
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleChart = useRef(new Animated.Value(0)).current;
  const rotateChart = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadAllData();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true })
    ]).start();
  }, [language, activeTheme]); 

  // Animation du graphique
  useEffect(() => {
    scaleChart.setValue(0);
    rotateChart.setValue(0);
    
    Animated.parallel([
      Animated.spring(scaleChart, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.timing(rotateChart, { toValue: 1, duration: 1000, useNativeDriver: true })
    ]).start();
  }, [data]);

  const spin = rotateChart.interpolate({
    inputRange: [0, 1],
    outputRange: ['-30deg', '0deg']
  });

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

      // 3. TOTAL CE MOIS (Pour alignement avec Accueil)
      const startM = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const endM = format(endOfMonth(new Date()), 'yyyy-MM-dd');
      const resMonth = db.getAllSync(`
        SELECT COALESCE(SUM(l.prixTotal), 0) as t 
        FROM LigneAchat l JOIN Achat a ON a.id = l.idAchat 
        WHERE DATE(a.dateAchat) BETWEEN ? AND ?
      `, [startM, endM]);
      setTotalMonth((resMonth[0] as any)?.t || 0);

      // 5. Répartition Catégorie (Global) - TOUS LES PRODUITS
      const allRows = db.getAllSync(`
        SELECT l.libelleProduit as name, SUM(l.prixTotal) as montant
        FROM LigneAchat l
        GROUP BY l.libelleProduit ORDER BY montant DESC
      `) as { name: string; montant: number }[];
      
      setAllProducts(allRows);
      
      // Initialiser la sélection avec le Top 5 par défaut si vide
      if (selectedProducts.length === 0 && allRows.length > 0) {
        const topNames = allRows.slice(0, 5).map(r => r.name);
        setSelectedProducts(topNames);
        updateChartData(allRows, topNames);
      } else {
        updateChartData(allRows, selectedProducts);
      }

      // 5. Chargement Comparatifs
      loadComparative(db);

    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const updateChartData = (products: { name: string; montant: number }[], selection: string[]) => {
    const filteredRows = products.filter(p => selection.includes(p.name));
    
    // Génération de couleurs compatibles avec le thème
    const generateThemeColors = (count: number) => {
      const basePalette = [
        activeTheme.primary,
        activeTheme.secondary,
        '#FFB74D', '#4DB6AC', '#BA68C8', '#F06292', '#64B5F6', '#81C784',
        '#FF8A65', '#A1887F', '#90A4AE', '#E57373', '#7986CB', '#4DD0E1',
        '#AED581', '#DCE775', '#FFD54F', '#4FC3F7', '#9575CD', '#FF8A80'
      ];

      const colors = [];
      for (let i = 0; i < count; i++) {
        if (i < basePalette.length) {
          colors.push(basePalette[i]);
        } else {
          // Génération de couleur unique pour les surplus via HSL -> Hex
          const hue = (i * 137.508) % 360;
          colors.push(`hsl(${hue}, 70%, 50%)`); 
        }
      }
      return colors;
    };

    const chartColors = generateThemeColors(filteredRows.length);
    
    const chartData = filteredRows.map((r, i) => ({
      name: r.name,
      population: r.montant,
      color: chartColors[i % chartColors.length],
      legendFontColor: isDarkMode ? '#ccc' : '#666',
      legendFontSize: 12
    }));
    
    setData(chartData.length > 0 ? chartData : [{ name: 'Vide', population: 1, color: '#ddd', legendFontColor: '#aaa', legendFontSize: 12 }]);
  };

  const toggleProductSelection = (name: string) => {
    let newSelection = [...selectedProducts];
    if (newSelection.includes(name)) {
      newSelection = newSelection.filter(n => n !== name);
    } else {
      newSelection.push(name);
    }
    setSelectedProducts(newSelection);
    updateChartData(allProducts, newSelection);
  };

  const toggleAllProducts = () => {
    if (selectedProducts.length === allProducts.length) {
      setSelectedProducts([]);
      updateChartData(allProducts, []);
    } else {
      const allNames = allProducts.map(p => p.name);
      setSelectedProducts(allNames);
      updateChartData(allProducts, allNames);
    }
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
        fullLabel: `Semaine du ${format(ws, 'dd MMM', { locale: language === 'en' ? enUS : fr })} au ${format(we, 'dd MMM', { locale: language === 'en' ? enUS : fr })}`,
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
        period: format(ms, 'MMMM', { locale: language === 'en' ? enUS : fr }),
        fullLabel: format(ms, 'MMMM yyyy', { locale: language === 'en' ? enUS : fr }),
        montant: (res[0] as any)?.montant || 0,
        nbAchats: (res[0] as any)?.nb || 0,
        startDate: sStr,
        endDate: eStr
      });
    }
    setMonthlyData(months);
  };

  // OUVRIR LA MODAL DE DÉTAIL (PAR PRODUIT)
  const openDetailModal = (item: ComparativeData) => {
    setSelectedPeriod(item);
    try {
      const db = getDb();
      // Récupérer les produits groupés par nom pour la période sélectionnée
      const res = db.getAllSync(`
        SELECT l.libelleProduit, SUM(l.quantite) as totalQte, SUM(l.prixTotal) as totalPrix
        FROM LigneAchat l 
        JOIN Achat a ON a.id = l.idAchat 
        WHERE DATE(a.dateAchat) BETWEEN ? AND ?
        GROUP BY l.libelleProduit
        ORDER BY totalPrix DESC
      `, [item.startDate, item.endDate]);
      
      setJournalData(res as ProductEntry[]);
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
            <h3 style="text-align: center; color: #666;">Rapport de Produits</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <tr style="background-color: ${activeTheme.primary}; color: white;">
                <th style="padding: 10px; text-align: left;">Produit</th>
                <th style="padding: 10px; text-align: center;">Quantité</th>
                <th style="padding: 10px; text-align: right;">Montant Total</th>
              </tr>
              ${journalData.map(j => `
                <tr style="border-bottom: 1px solid #ddd;">
                  <td style="padding: 10px;">${j.libelleProduit}</td>
                  <td style="padding: 10px; text-align: center;">${j.totalQte}</td>
                  <td style="padding: 10px; text-align: right;">${j.totalPrix.toLocaleString()} ${currency}</td>
                </tr>
              `).join('')}
            </table>
            <h2 style="text-align: right; margin-top: 20px; color: ${activeTheme.primary};">Total: ${selectedPeriod.montant.toLocaleString()} ${currency}</h2>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (e) { Alert.alert(t('error'), t('pdf_export_failed')); }
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
          <Text style={s.progressValue}>{item.montant.toLocaleString()} {currency}</Text>
        </View>
        <View style={s.track}>
          <LinearGradient
            colors={[activeTheme.primary, activeTheme.secondary]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[s.bar, { width: `${percent}%` }]}
          />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
           <Text style={s.progressSub}>{item.nbAchats} {t('purchase_s')}</Text>
           <Text style={[s.progressSub, { color: activeTheme.primary, fontWeight: 'bold' }]}>{t('see_details')} &gt;</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return <ActivityIndicator style={s.center} color={activeTheme.primary} />;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      
      {/* HEADER */}
      <LinearGradient colors={activeTheme.gradient as any} style={[s.header, { paddingTop: insets.top + 10 }]}>
        <View style={s.headerTop}>
          <TouchableOpacity onPress={() => router.push('/rapports')} style={s.iconBtn}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{t('statistics')}</Text>
          <TouchableOpacity onPress={() => setShowMenu(true)} style={s.iconBtn}>
            <Ionicons name="menu" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View style={s.summaryRow}>
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>{t('total_spent_month')}</Text>
            <Text style={[s.summaryValue, { color: activeTheme.primary }]}>{totalMonth.toLocaleString()} {currency}</Text>
          </View>
          <View style={s.verticalDivider} />
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>{t('total_year')} {new Date().getFullYear()}</Text>
            <Text style={[s.summaryValue, { color: activeTheme.primary }]}>{totalYear.toLocaleString()} {currency}</Text>
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
            { k: 'repartition', l: t('distribution') },
            { k: 'weekly', l: t('week') },
            { k: 'monthly', l: t('month') }
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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
               <Text style={s.cardTitle}>{t('distribution')}</Text>
               <TouchableOpacity onPress={() => setShowAllProductsModal(true)}>
                  <Text style={{ color: activeTheme.primary, fontWeight: '600' }}>{t('filter')}</Text>
               </TouchableOpacity>
            </View>
            
            <Animated.View style={[s.chartWrapper, { transform: [{ scale: scaleChart }, { rotate: spin }] }]}>
              <PieChart
                data={data}
                width={SCREEN_WIDTH - 40}
                height={260}
                chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft={(SCREEN_WIDTH / 4).toString()}
                absolute
                hasLegend={false}
              />
            </Animated.View>

            <View style={s.legendContainer}>
              {data.map((item, index) => (
                <View key={item.name || index} style={s.legendItem}>
                  <View style={s.legendLeft}>
                    <View style={[s.dot, { backgroundColor: item.color }]} />
                    <View>
                        <Text style={s.legendName} numberOfLines={1}>{item.name}</Text>
                        <Text style={{ fontSize: 10, color: '#999' }}>{item.population.toLocaleString()} {currency}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.legendValue}>
                        {totalGlobal > 0 ? `${Math.round((item.population / totalGlobal) * 100)}%` : '0%'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            
            <TouchableOpacity 
              style={{ marginTop: 15, alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderColor: isDarkMode ? '#334155' : '#f0f0f0' }}
              onPress={() => setShowAllProductsModal(true)}
            >
              <Text style={{ color: activeTheme.primary, fontWeight: 'bold', fontSize: 14 }}>{t('manage_display')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* VUE : COMPARATIFS */}
        {(viewMode === 'weekly' || viewMode === 'monthly') && (
          <View style={s.card}>
            <Text style={s.cardTitle}>
              {viewMode === 'weekly' ? t('last_4_weeks') : t('last_3_months')}
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
                  <Text style={s.modalLabel}>{t('total_period')}</Text>
                  <Text style={[s.modalTotal, { color: activeTheme.primary }]}>{selectedPeriod?.montant.toLocaleString()} {currency}</Text>
               </View>
               <TouchableOpacity style={[s.btnPdf, { borderColor: activeTheme.primary }]} onPress={exportPDF}>
                  <Ionicons name="share-outline" size={20} color={activeTheme.primary} />
                  <Text style={{ color: activeTheme.primary, fontWeight: 'bold', marginLeft: 5 }}>PDF</Text>
               </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
               {journalData.length === 0 ? (
                  <Text style={s.emptyText}>{t('no_product_bought')}</Text>
               ) : (
                  journalData.map((item, index) => (
                     <View key={item.libelleProduit || index} style={s.journalRow}>
                        <View style={s.journalLeft}>
                           <View style={[s.dateBadge, { backgroundColor: activeTheme.secondary + '20' }]}>
                              <Ionicons name="cube-outline" size={20} color={activeTheme.primary} />
                           </View>
                           <View>
                              <Text style={s.journalName}>{item.libelleProduit}</Text>
                              <Text style={s.journalSub}>Qté: {item.totalQte}</Text>
                           </View>
                        </View>
                        <Text style={s.journalPrice}>{item.totalPrix.toLocaleString()} {currency}</Text>
                     </View>
                  ))
               )}
            </ScrollView>
         </View>
      </Modal>

      {/* --- MODAL TOUS LES PRODUITS (FILTRE) --- */}
      <Modal visible={showAllProductsModal} animationType="slide" presentationStyle="pageSheet">
         <View style={s.modalContainer}>
            <View style={s.modalHeader}>
               <Text style={s.modalTitle}>{t('manage_display')}</Text>
               <TouchableOpacity onPress={() => setShowAllProductsModal(false)} style={s.modalCloseBtn}>
                  <Ionicons name="close" size={24} color="#666" />
               </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
               <TouchableOpacity onPress={toggleAllProducts}>
                  <Text style={{ color: activeTheme.primary, fontWeight: 'bold' }}>
                     {selectedProducts.length === allProducts.length ? t('deselect_all') : t('select_all')}
                  </Text>
               </TouchableOpacity>
               <Text style={{ color: '#999' }}>{selectedProducts.length} {t('selected')}</Text>
            </View>

            <FlatList
               data={allProducts}
               keyExtractor={(item, index) => index.toString()}
               contentContainerStyle={{ paddingBottom: 40 }}
               renderItem={({ item, index }) => {
                  const isSelected = selectedProducts.includes(item.name);
                  return (
                     <TouchableOpacity 
                        style={s.journalRow} 
                        onPress={() => toggleProductSelection(item.name)}
                     >
                        <View style={s.journalLeft}>
                           <Ionicons 
                              name={isSelected ? "checkbox" : "square-outline"} 
                              size={24} 
                              color={isSelected ? activeTheme.primary : '#ccc'} 
                           />
                           <View style={{ marginLeft: 10 }}>
                              <Text style={[s.journalName, !isSelected && { color: '#999' }]}>{item.name}</Text>
                              <Text style={s.journalSub}>
                                 {totalGlobal > 0 ? `${((item.montant / totalGlobal) * 100).toFixed(1)}%` : '0%'} {t('of_total')}
                              </Text>
                           </View>
                        </View>
                        <Text style={[s.journalPrice, !isSelected && { color: '#999' }]}>{item.montant.toLocaleString()} {currency}</Text>
                     </TouchableOpacity>
                  );
               }}
            />
         </View>
      </Modal>

      {/* --- MENU HAMBURGER --- */}
      <Modal visible={showMenu} transparent animationType="fade">
         <TouchableOpacity style={s.menuOverlay} onPress={() => setShowMenu(false)}>
            <View style={s.menuBox}>
               <Text style={[s.menuTitle, { color: activeTheme.primary }]}>{t('navigation')}</Text>
               <TouchableOpacity style={s.menuItem} onPress={() => { setShowMenu(false); router.push('/'); }}>
                  <Ionicons name="home-outline" size={22} color="#555" />
                  <Text style={s.menuText}>{t('home')}</Text>
               </TouchableOpacity>
               <TouchableOpacity style={s.menuItem} onPress={() => { setShowMenu(false); router.push('/rapports'); }}>
                  <Ionicons name="pie-chart-outline" size={22} color="#555" />
                  <Text style={s.menuText}>{t('reports')}</Text>
               </TouchableOpacity>
            </View>
         </TouchableOpacity>
      </Modal>

    </View>
  );
}

const getStyles = (theme: any, dark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: dark ? '#0F172A' : '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // HEADER
  header: { paddingBottom: 80, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  iconBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },

  // RÉSUMÉ FLOTTANT
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

  // TABS
  tabContainer: {
    flexDirection: 'row', backgroundColor: dark ? '#1E293B' : '#fff', borderRadius: 16,
    padding: 5, marginBottom: 20, elevation: 2
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  tabText: { color: dark ? '#94A3B8' : '#64748B', fontWeight: '600', fontSize: 13 },

  // CARDS
  card: {
    backgroundColor: dark ? '#1E293B' : '#fff', borderRadius: 24, padding: 20, marginBottom: 20,
    shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: dark ? 0.2 : 0.05, shadowRadius: 8, elevation: 3
  },
  cardTitle: { fontSize: 18, fontWeight: '800', color: dark ? '#F1F5F9' : '#1F2937', marginBottom: 5 },
  cardSub: { fontSize: 12, color: dark ? '#94A3B8' : '#9CA3AF' },

  // PROGRESS BAR
  progressContainer: { marginBottom: 15, backgroundColor: dark ? '#334155' : '#F8FAFC', padding: 12, borderRadius: 14 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 14, fontWeight: '600', color: dark ? '#F1F5F9' : '#333', textTransform: 'capitalize' },
  progressValue: { fontSize: 14, fontWeight: '700', color: dark ? '#94A3B8' : '#64748B' },
  track: { height: 8, backgroundColor: dark ? '#1E293B' : '#E2E8F0', borderRadius: 4, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 4 },
  progressSub: { fontSize: 11, color: dark ? '#94A3B8' : '#9CA3AF' },

  // CHART
  chartWrapper: { alignItems: 'center', justifyContent: 'center', position: 'relative', marginVertical: 20 },
  donutCenter: { 
    position: 'absolute', 
    width: 100, height: 100, borderRadius: 50, 
    backgroundColor: dark ? '#1E293B' : '#fff', 
    shadowColor: '#000', shadowOpacity: 0.1, elevation: 2,
    // Centrage parfait
    top: 80, left: (SCREEN_WIDTH - 40) / 2 - 50 + (SCREEN_WIDTH / 4) // Ajustement approximatif pour le paddingLeft du chart
  },
  legendContainer: { marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: dark ? '#334155' : '#F1F5F9' },
  legendLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  dot: { width: 14, height: 14, borderRadius: 7, marginRight: 12 },
  legendName: { fontSize: 15, color: dark ? '#F1F5F9' : '#333', fontWeight: '600', marginBottom: 2 },
  legendValue: { fontSize: 16, fontWeight: '800', color: dark ? '#F1F5F9' : '#333' },

  // MODAL STYLE
  modalContainer: { flex: 1, backgroundColor: dark ? '#0F172A' : '#fff', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingTop: 20 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: dark ? '#F1F5F9' : '#333', textTransform: 'capitalize' },
  modalCloseBtn: { padding: 5 },
  
  modalSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 20, borderBottomWidth: 1, borderColor: dark ? '#334155' : '#f0f0f0', marginBottom: 10 },
  modalLabel: { fontSize: 12, color: '#999', fontWeight: '600', textTransform: 'uppercase' },
  modalTotal: { fontSize: 24, fontWeight: '800' },
  btnPdf: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1 },

  // JOURNAL LIST
  journalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderColor: dark ? '#334155' : '#f5f5f5' },
  journalLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateBadge: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  journalName: { fontSize: 16, fontWeight: '600', color: dark ? '#F1F5F9' : '#333' },
  journalSub: { fontSize: 12, color: '#999' },
  journalPrice: { fontSize: 16, fontWeight: '700', color: dark ? '#F1F5F9' : '#333' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 20, fontStyle: 'italic' },

  // MENU
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start', padding: 20, paddingTop: 60 },
  menuBox: { backgroundColor: dark ? '#1E293B' : '#fff', padding: 20, borderRadius: 20, width: 200, alignSelf: 'flex-end', elevation: 10 },
  menuTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderColor: dark ? '#334155' : '#f0f0f0' },
  menuText: { fontSize: 14, fontWeight: '500', color: dark ? '#F1F5F9' : '#333' }
});