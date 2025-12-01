import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, 
  Animated, Dimensions, StatusBar, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { getDb } from '../../src/db/init';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../../src/context/SettingsContext';

const { width } = Dimensions.get('window');

export default function Rapports() {
  const { activeTheme, isDarkMode } = useTheme();
  const { currency, language, t } = useSettings();
  const insets = useSafeAreaInsets();
  const s = getStyles(activeTheme, isDarkMode);

  // --- ÉTATS ---
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [stats, setStats] = useState({
    monthTotal: 0,
    monthItems: 0,
    topProduct: '-',
    topProductQty: 0
  });

  // États Analyse Période
  const [dateDebut, setDateDebut] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [dateFin, setDateFin] = useState(new Date());
  const [periodPurchases, setPeriodPurchases] = useState<any[]>([]);
  const [periodTotal, setPeriodTotal] = useState(0);
  const [showPeriodResults, setShowPeriodResults] = useState(false);
  
  const [showPickerStart, setShowPickerStart] = useState(false);
  const [showPickerEnd, setShowPickerEnd] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    loadMonthStats();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true })
    ]).start();
  }, [currentMonth]);

  // 1. CHARGEMENT DES STATS DU MOIS SÉLECTIONNÉ
  const loadMonthStats = () => {
    try {
      const db = getDb();
      const start = startOfMonth(currentMonth).toISOString();
      const end = endOfMonth(currentMonth).toISOString();

      // 1. Total Month
      const [monthRes] = db.getAllSync(`
        SELECT SUM(l.prixTotal) as t 
        FROM LigneAchat l JOIN Achat a ON a.id = l.idAchat 
        WHERE a.dateAchat BETWEEN ? AND ?`, [start, end]);
      
      // 2. Total Items (Simple stat)
      const [itemsRes] = db.getAllSync(`
        SELECT SUM(l.quantite) as q 
        FROM LigneAchat l JOIN Achat a ON a.id = l.idAchat 
        WHERE a.dateAchat BETWEEN ? AND ?`, [start, end]);

      // 3. Top Product Month
      const [topRes] = db.getAllSync(`
        SELECT l.libelleProduit, SUM(l.quantite) as q 
        FROM LigneAchat l JOIN Achat a ON a.id = l.idAchat 
        WHERE a.dateAchat BETWEEN ? AND ?
        GROUP BY l.libelleProduit ORDER BY q DESC LIMIT 1
      `, [start, end]);

      setStats({
        monthTotal: (monthRes as any)?.t || 0,
        monthItems: (itemsRes as any)?.q || 0,
        topProduct: (topRes as any)?.libelleProduit || '-',
        topProductQty: (topRes as any)?.q || 0
      });
    } catch (e) { console.error(e); }
  };

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // 2. ANALYSE DE PÉRIODE (Produits)
  const handleAnalyzePeriod = () => {
    try {
      const db = getDb();
      const start = dateDebut.toISOString();
      const end = dateFin.toISOString();

      // Récupérer les produits vendus sur la période
      const result = db.getAllSync(`
        SELECT l.libelleProduit, SUM(l.quantite) as totalQte, SUM(l.prixTotal) as totalPrix
        FROM LigneAchat l 
        JOIN Achat a ON a.id = l.idAchat 
        WHERE a.dateAchat BETWEEN ? AND ?
        GROUP BY l.libelleProduit
        ORDER BY totalPrix DESC
      `, [start, end]);

      const total = result.reduce((acc: number, curr: any) => acc + curr.totalPrix, 0);
      
      setPeriodPurchases(result);
      setPeriodTotal(total);
      setShowPeriodResults(true);
    } catch (e) { Alert.alert(t('error'), t('analyze_error')); }
  };

  // 3. EXPORT PDF & PARTAGE
  const handleExportPDF = async () => {
    if (periodPurchases.length === 0) {
      Alert.alert(t('info'), t('export_error_msg'));
      return;
    }

    try {
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 20px; }
              h1 { color: ${activeTheme.primary}; text-align: center; }
              .header { margin-bottom: 30px; text-align: center; color: #555; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background-color: ${activeTheme.primary}; color: white; padding: 10px; text-align: left; }
              td { border-bottom: 1px solid #ddd; padding: 10px; }
              .total { font-size: 20px; font-weight: bold; text-align: right; margin-top: 20px; color: ${activeTheme.primary}; }
            </style>
          </head>
          <body>
            <h1>${t('product_report')}</h1>
            <div class="header">
              <p>${t('period_from')} <b>${format(dateDebut, 'dd/MM/yyyy')}</b> ${t('to_small')} <b>${format(dateFin, 'dd/MM/yyyy')}</b></p>
            </div>
            <table>
              <tr>
                <th>${t('product')}</th>
                <th>${t('quantity')}</th>
                <th>${t('total_amount')}</th>
              </tr>
              ${periodPurchases.map((item: any) => `
                <tr>
                  <td>${item.libelleProduit}</td>
                  <td>${item.totalQte}</td>
                  <td>${item.totalPrix.toLocaleString()} ${currency}</td>
                </tr>
              `).join('')}
            </table>
            <div class="total">${t('total_period')}: ${periodTotal.toLocaleString()} ${currency}</div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      Alert.alert(t('error'), t('pdf_error'));
    }
  };

  const handleCreate = () => {
    const db = getDb();
    const res = db.runSync('INSERT INTO Achat (nomListe, dateAchat) VALUES (?, ?)', ['Nouvelle Liste', new Date().toISOString()]);
    router.push(`/achat/${res.lastInsertRowId}`);
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* --- HEADER COURBÉ AVEC OVERLAPPING --- */}
      <LinearGradient 
        colors={activeTheme.gradient as any} 
        style={[s.header, { paddingTop: insets.top + 10 }]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <View style={s.headerTopRow}>
            <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
               <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            
            {/* SÉLECTEUR DE MOIS */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                <TouchableOpacity onPress={prevMonth}>
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={[s.headerTitle, { minWidth: 120, textAlign: 'center' }]}>
                   {format(currentMonth, 'MMMM yyyy', { locale: language === 'en' ? enUS : fr })}
                </Text>
                <TouchableOpacity onPress={nextMonth}>
                    <Ionicons name="chevron-forward" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={s.iconBtn} onPress={handleExportPDF}>
               <Ionicons name="share-outline" size={24} color="#fff" />
            </TouchableOpacity>
        </View>

        {/* OVERLAPPING SUMMARY CARD */}
        <View style={s.summaryRow}>
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>{t('total_spent')}</Text>
            <Text style={[s.summaryValue, { color: activeTheme.primary }]}>{stats.monthTotal.toLocaleString()} {currency}</Text>
          </View>
          <View style={s.verticalDivider} />
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>{t('articles')}</Text>
            <Text style={[s.summaryValue, { color: activeTheme.primary }]}>{stats.monthItems} pcs</Text>
          </View>
        </View>
      </LinearGradient>

      <Animated.ScrollView 
        contentContainerStyle={s.scrollContent} 
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        
        {/* --- 1. TOP PRODUIT CARD --- */}
        <View style={[s.card, { marginTop: 20 }]}>
            <View style={s.cardHeader}>
                <Text style={s.cardTitle}>{t('top_product')}</Text>
                <Ionicons name="ribbon" size={20} color="#F59E0B" />
            </View>
            <Text style={s.cardValue}>{stats.topProduct}</Text>
            <Text style={s.cardSub}>{stats.topProductQty} {t('articles')}</Text>
        </View>

        {/* --- 2. ACTIONS RAPIDES (Style Professionnel & Épuré) --- */}
        <View style={s.actionsRow}>
           <TouchableOpacity style={[s.actionBtn]} onPress={() => router.push('/analyse_produit')}>
              <View style={s.actionContent}>
                 <View style={s.actionIconBox}>
                    <Ionicons name="search" size={22} color={activeTheme.primary} />
                 </View>
                 <View style={{ flex: 1 }}>
                    <Text style={s.actionTitle}>{t('product_analysis')}</Text>
                    <Text style={s.actionSub}>{t('details_by_item')}</Text>
                 </View>
                 <View style={s.arrowCircle}>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                 </View>
              </View>
           </TouchableOpacity>

           <TouchableOpacity style={[s.actionBtn]} onPress={() => router.push('/statistiques')}>
              <View style={s.actionContent}>
                 <View style={s.actionIconBox}>
                    <Ionicons name="bar-chart" size={22} color={activeTheme.primary} />
                 </View>
                 <View style={{ flex: 1 }}>
                    <Text style={s.actionTitle}>{t('charts')}</Text>
                    <Text style={s.actionSub}>{t('detailed_visuals')}</Text>
                 </View>
                 <View style={s.arrowCircle}>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                 </View>
              </View>
           </TouchableOpacity>
        </View>

        {/* --- 3. ANALYSE DE PÉRIODE (Style Authentique) --- */}
        <View style={s.periodCard}>
           <View style={s.periodHeaderSimple}>
              <Text style={[s.periodTitleSimple, { color: activeTheme.primary }]}>{t('period_analysis')}</Text>
              <Text style={s.periodDescSimple}>{t('select_date_range')}</Text>
           </View>
           
           <View style={s.periodBody}>
              <View style={s.dateRow}>
                 <TouchableOpacity onPress={() => setShowPickerStart(true)} style={s.dateInput}>
                    <Ionicons name="calendar-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
                    <View>
                       <Text style={s.dateLabel}>{t('from')}</Text>
                       <Text style={s.dateValue}>{format(dateDebut, 'dd/MM/yyyy')}</Text>
                    </View>
                 </TouchableOpacity>
                 <View style={s.dateDivider} />
                 <TouchableOpacity onPress={() => setShowPickerEnd(true)} style={s.dateInput}>
                    <Ionicons name="calendar-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
                    <View>
                       <Text style={s.dateLabel}>{t('to')}</Text>
                       <Text style={s.dateValue}>{format(dateFin, 'dd/MM/yyyy')}</Text>
                    </View>
                 </TouchableOpacity>
              </View>

              <TouchableOpacity style={[s.btnAnalyze, { backgroundColor: activeTheme.primary }]} onPress={handleAnalyzePeriod}>
                 <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>{t('generate_report')}</Text>
                 <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
              </TouchableOpacity>

              {/* RÉSULTATS LISTE */}
              {showPeriodResults && (
                 <View style={s.resultsContainer}>
                    <View style={s.resultSummary}>
                       <Text style={s.resultSummaryLabel}>{t('total_period')}</Text>
                       <Text style={[s.resultSummaryValue, { color: activeTheme.primary }]}>{periodTotal.toLocaleString()} {currency}</Text>
                    </View>

                    {periodPurchases.length === 0 ? (
                       <Text style={s.emptyText}>{t('no_product_period')}</Text>
                    ) : (
                       periodPurchases.map((item: any, index: number) => (
                          <View key={item.libelleProduit || index} style={s.resultItem}>
                             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <View style={s.itemIcon}>
                                   <Ionicons name="cube-outline" size={18} color="#64748B" />
                                </View>
                                <View>
                                   <Text style={s.itemTitle}>{item.libelleProduit}</Text>
                                   <Text style={s.itemDate}>Qté: {item.totalQte}</Text>
                                </View>
                             </View>
                             <View style={{ alignItems: 'flex-end' }}>
                                <Text style={s.itemPrice}>{item.totalPrix.toLocaleString()} {currency}</Text>
                             </View>
                          </View>
                       ))
                    )}
                    
                    {/* Bouton Export visible seulement si résultats */}
                    {periodPurchases.length > 0 && (
                        <TouchableOpacity style={s.btnPdf} onPress={handleExportPDF}>
                           <Ionicons name="document-text-outline" size={20} color={activeTheme.primary} />
                           <Text style={{ color: isDarkMode ? '#F1F5F9' : '#334155', fontWeight: '600' }}>{t('export_pdf')}</Text>
                        </TouchableOpacity>
                    )}
                 </View>
              )}
           </View>
        </View>

        <View style={{ height: 100 }} />
      </Animated.ScrollView>

      {/* DATE PICKERS */}
      {showPickerStart && (
        <DateTimePicker value={dateDebut} mode="date" onChange={(e, d) => { setShowPickerStart(false); if(d) setDateDebut(d); }} />
      )}
      {showPickerEnd && (
        <DateTimePicker value={dateFin} mode="date" onChange={(e, d) => { setShowPickerEnd(false); if(d) setDateFin(d); }} />
      )}

      {/* --- NAVBAR --- */}
      <View style={[s.navbar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 10, height: 60 + (insets.bottom > 0 ? insets.bottom : 10) }]}>
         <TouchableOpacity style={s.navItem} onPress={() => router.push('/')}>
            <Ionicons name="home-outline" size={24} color="#9CA3AF" />
            <Text style={[s.navText, { color: "#9CA3AF" }]}>{t('home')}</Text>
         </TouchableOpacity>

         <View style={{ top: -25 }}>
            <TouchableOpacity style={[s.fab, { shadowColor: activeTheme.primary }]} onPress={handleCreate}>
               <LinearGradient colors={activeTheme.gradient as any} style={s.fabGradient}>
                  <Ionicons name="add" size={32} color="#fff" />
               </LinearGradient>
            </TouchableOpacity>
         </View>

         <TouchableOpacity style={s.navItem}>
            <Ionicons name="pie-chart" size={24} color={activeTheme.primary} />
            <Text style={[s.navText, { color: activeTheme.primary }]}>{t('reports')}</Text>
         </TouchableOpacity>
      </View>
    </View>
  );
}

// 🎨 STYLES AVEC OVERLAPPING
const getStyles = (theme: any, dark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: dark ? '#0F172A' : '#F8FAFC' },
  
  // HEADER
  header: { paddingBottom: 80, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, position: 'relative', zIndex: 10 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  iconBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },

  // SUMMARY ROW (Overlapping)
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

  // SCROLL CONTENT
  scrollContent: { paddingHorizontal: 20, paddingTop: 50 }, // Adjusted for overlapping

  // CARDS
  card: {
    backgroundColor: dark ? '#1E293B' : '#fff', borderRadius: 20, padding: 20, marginBottom: 20,
    shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: dark ? 0.2 : 0.05, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: dark ? '#334155' : '#F1F5F9'
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: dark ? '#F1F5F9' : '#1E293B' },
  cardValue: { fontSize: 22, fontWeight: '800', color: dark ? '#F1F5F9' : '#0F172A' },
  cardSub: { fontSize: 12, color: dark ? '#94A3B8' : '#64748B', marginTop: 4 },

  // ACTIONS
  actionsRow: { flexDirection: 'column', gap: 15, marginBottom: 25 },
  actionBtn: { 
      backgroundColor: dark ? '#1E293B' : '#fff', borderRadius: 16, overflow: 'hidden', 
      borderWidth: 1, borderColor: dark ? '#334155' : '#F1F5F9',
      shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: dark ? 0.2 : 0.05, shadowRadius: 8, elevation: 2
  },
  actionContent: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 15 },
  actionIconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: dark ? '#334155' : '#F1F5F9' },
  actionTitle: { fontSize: 16, fontWeight: '700', color: dark ? '#F1F5F9' : '#1E293B' },
  actionSub: { fontSize: 13, color: dark ? '#94A3B8' : '#64748B', marginTop: 2 },
  arrowCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: dark ? '#475569' : '#E2E8F0', justifyContent: 'center', alignItems: 'center' },

  // PERIOD CARD
  periodCard: { 
      backgroundColor: dark ? '#1E293B' : '#fff', borderRadius: 20, marginBottom: 20, 
      borderWidth: 1, borderColor: dark ? '#334155' : '#E2E8F0',
      shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: dark ? 0.2 : 0.05, shadowRadius: 8, elevation: 3
  },
  periodHeaderSimple: { padding: 20, borderBottomWidth: 1, borderColor: dark ? '#334155' : '#F1F5F9' },
  periodTitleSimple: { fontSize: 18, fontWeight: '800', color: dark ? '#F1F5F9' : '#1E293B' },
  periodDescSimple: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  
  periodBody: { padding: 20 },
  
  dateRow: { 
      flexDirection: 'row', alignItems: 'center', backgroundColor: dark ? '#0F172A' : '#F8FAFC', 
      borderRadius: 12, padding: 5, marginBottom: 20, borderWidth: 1, borderColor: dark ? '#334155' : '#F1F5F9' 
  },
  dateInput: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12 },
  dateDivider: { width: 1, height: '60%', backgroundColor: dark ? '#334155' : '#E2E8F0' },
  dateLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase' },
  dateValue: { fontSize: 14, fontWeight: '700', color: dark ? '#F1F5F9' : '#334155', marginTop: 2 },

  btnAnalyze: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 12, width: '100%', shadowColor: theme.primary, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },

  // RESULTS
  resultsContainer: { marginTop: 25, borderTopWidth: 1, borderColor: dark ? '#334155' : '#F1F5F9', paddingTop: 20 },
  resultSummary: { 
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, 
      backgroundColor: dark ? '#0F172A' : '#F8FAFC', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: dark ? '#334155' : '#E2E8F0' 
  },
  resultSummaryLabel: { fontWeight: '600', fontSize: 14, color: dark ? '#94A3B8' : '#64748B', textTransform: 'uppercase' },
  resultSummaryValue: { fontWeight: '800', fontSize: 22 }, // Color handled inline
  
  resultItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: dark ? '#334155' : '#F1F5F9' },
  itemIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: dark ? '#334155' : '#F8FAFC' },
  itemTitle: { fontWeight: '600', color: dark ? '#F1F5F9' : '#1E293B', fontSize: 15 },
  itemDate: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  itemPrice: { fontWeight: '700', color: dark ? '#F1F5F9' : '#0F172A', fontSize: 15 },
  
  emptyText: { textAlign: 'center', color: dark ? '#64748B' : '#94A3B8', fontStyle: 'italic', padding: 20 },
  
  btnPdf: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 20, backgroundColor: dark ? '#1E293B' : '#fff', borderColor: dark ? '#334155' : '#E2E8F0' },

  // NAVBAR
  navbar: { flexDirection: 'row', backgroundColor: dark ? '#1E293B' : '#fff', borderTopWidth: 1, borderColor: dark ? '#334155' : '#eee', justifyContent: 'space-around', paddingTop: 10, paddingHorizontal: 20, position: 'absolute', bottom: 0, width: '100%' },
  navItem: { alignItems: 'center' },
  navText: { fontSize: 10, fontWeight: '600', marginTop: 4 },
  fab: { width: 56, height: 56, borderRadius: 28, shadowOpacity: 0.3, elevation: 6 },
  fabGradient: { width: '100%', height: '100%', borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
});