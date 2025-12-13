import { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal, Dimensions, ActivityIndicator
} from 'react-native';
import { ThemedStatusBar } from '../src/components/ThemedStatusBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';
import formatMoney from '../src/utils/formatMoney';
import { fr, enUS } from 'date-fns/locale';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// 👇 Importations Thème
import { getDb } from '../src/db/init';
import { useTheme } from '../src/context/ThemeContext';
import { useSettings } from '../src/context/SettingsContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Using centralized formatMoney util

interface Produit {
  id: number;
  libelle: string;
}

interface Transaction {
  id: number;
  dateAchat: string;
  nomListe: string;
  produit: string;
  quantite: number;
  prixUnitaire: number;
  prixTotal: number;
  unite: string;
}

export default function AnalyseProduit() {
  // 🎨 THÈME DYNAMIQUE
  const { activeTheme, isDarkMode } = useTheme();
  const { t, language, currency } = useSettings();
  const insets = useSafeAreaInsets();
  const s = getStyles(activeTheme, isDarkMode);

  const [produits, setProduits] = useState<Produit[]>([]);
  const [selectedProduit, setSelectedProduit] = useState<number | null>(null);
  const [dateDebut, setDateDebut] = useState(startOfMonth(new Date()));
  const [dateFin, setDateFin] = useState(new Date());
  
  const [showDateDebutPicker, setShowDateDebutPicker] = useState(false);
  const [showDateFinPicker, setShowDateFinPicker] = useState(false);
  const [showProduitPicker, setShowProduitPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false); // 🍔 Menu Hamburger

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalProduitAnalyse, setTotalProduitAnalyse] = useState(0);
  const [totalQuantite, setTotalQuantite] = useState(0);
  const [unitePrincipale, setUnitePrincipale] = useState('');
  
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'current_month' | 'last_month' | 'year' | 'custom'>('current_month');
  const [viewMode, setViewMode] = useState<'transactions' | 'summary'>('transactions');
  const [periodSummary, setPeriodSummary] = useState<any[]>([]);

  useEffect(() => {
    loadProduits();
  }, [language]); // Reload when language changes for 'All Products' translation

  // Auto-analyze when product or dates change
  useEffect(() => {
    if (selectedProduit) {
      handleAnalyze();
    }
  }, [selectedProduit, dateDebut, dateFin]);

  const loadProduits = () => {
    try {
      const db = getDb();
      const result = db.getAllSync(`
        SELECT DISTINCT libelleProduit as libelle 
        FROM LigneAchat 
        WHERE libelleProduit IS NOT NULL AND libelleProduit != ''
        ORDER BY libelleProduit ASC
      `);
      // Add "All Products" option at the top
      const allOption = { id: -1, libelle: t('all_products') };
      setProduits([allOption, ...result.map((p: any, i) => ({ id: i + 1, libelle: p.libelle }))]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = () => {
    if (!selectedProduit) return;

    try {
      const db = getDb();
      const startStr = dateDebut.toISOString();
      const endStr = dateFin.toISOString();

      if (selectedProduit === -1) {
        // --- MODE RÉSUMÉ PÉRIODE (TOUS LES PRODUITS) ---
        setViewMode('summary');
        
        const result = db.getAllSync(`
          SELECT l.libelleProduit, SUM(l.quantite) as totalQte, SUM(l.prixTotal) as totalPrix
          FROM LigneAchat l 
          JOIN Achat a ON a.id = l.idAchat 
          WHERE a.dateAchat BETWEEN ? AND ?
          GROUP BY l.libelleProduit
          ORDER BY totalPrix DESC
        `, [startStr, endStr] as any[]);

        setPeriodSummary(result);
        setTotalProduitAnalyse(result.reduce((sum: number, item: any) => sum + item.totalPrix, 0));
        setTotalQuantite(result.reduce((sum: number, item: any) => sum + item.totalQte, 0));
        setUnitePrincipale('pcs'); // Generic unit
        
      } else {
        // --- MODE TRANSACTION (PRODUIT UNIQUE) ---
        setViewMode('transactions');
        const produitLibelle = produits.find(p => p.id === selectedProduit)?.libelle || '';

        if (!produitLibelle) return;

        const result = db.getAllSync(`
          SELECT la.id, a.dateAchat, a.nomListe, la.libelleProduit as produit, 
                 la.quantite, la.prixUnitaire, la.prixTotal, la.unite
          FROM Achat a 
          JOIN LigneAchat la ON a.id = la.idAchat 
          WHERE la.libelleProduit = ? 
          AND a.dateAchat BETWEEN ? AND ?
          ORDER BY a.dateAchat DESC
        `, [produitLibelle, startStr, endStr] as any[]);

        const trans = result as Transaction[];
        setTransactions(trans);
        setTotalProduitAnalyse(trans.reduce((sum, t) => sum + t.prixTotal, 0));
        setTotalQuantite(trans.reduce((sum, t) => sum + t.quantite, 0));
        if (trans.length > 0) setUnitePrincipale(trans[0].unite);
      }
      
      setShowResults(true);
    } catch (e) {
      console.log(e);
    }
  };

  const applyFilter = (type: 'current_month' | 'last_month' | 'year') => {
    const now = new Date();
    setActiveFilter(type);
    if (type === 'current_month') {
      setDateDebut(startOfMonth(now));
      setDateFin(now);
    } else if (type === 'last_month') {
      const lastMonth = subMonths(now, 1);
      setDateDebut(startOfMonth(lastMonth));
      setDateFin(endOfMonth(lastMonth));
    } else if (type === 'year') {
      setDateDebut(startOfYear(now));
      setDateFin(endOfYear(now));
    }
  };

  const renderSummaryView = () => {
    if (periodSummary.length === 0) {
      return (
        <View style={s.emptyBox}>
          <Ionicons name="cube-outline" size={40} color="#ccc" />
          <Text style={{ color: '#999', marginTop: 10 }}>{t('no_product_period')}</Text>
        </View>
      );
    }
    return periodSummary.map((item: any, idx: number) => (
      <View key={`summary-${item.libelleProduit}-${idx}`} style={s.transactionItem}>
         <View style={s.transLeft}>
            <View style={[s.dateBadge, { backgroundColor: isDarkMode ? '#334155' : '#F3F4F6' }]}>
              <Ionicons name="cube" size={18} color={activeTheme.primary} />
            </View>
            <View>
              <Text style={s.transPrice}>{item.libelleProduit}</Text>
              <Text style={s.transDetail}>{item.totalQte} {t('articles')}</Text>
            </View>
         </View>
         <Text style={[s.transPrice, { color: activeTheme.primary }]}>{formatMoney(item.totalPrix)} {currency}</Text>
      </View>
    ));
  };

  const renderTransactionsView = () => {
    if (transactions.length === 0) {
       return (
          <View style={s.emptyBox}>
             <Ionicons name="document-text-outline" size={40} color="#ccc" />
             <Text style={{ color: '#999', marginTop: 10 }}>{t('no_purchase_found')}</Text>
          </View>
       );
    }
    return transactions.map((t) => (
      <View key={t.id} style={s.transactionItem}>
         <View style={s.transLeft}>
            <View style={[s.dateBadge, { backgroundColor: isDarkMode ? '#334155' : '#F3F4F6' }]}>
              <Text style={s.dateDay}>{format(new Date(t.dateAchat), 'dd')}</Text>
              <Text style={s.dateMonth}>{format(new Date(t.dateAchat), 'MMM', { locale: language === 'en' ? enUS : fr })}</Text>
            </View>
            <View>
              <Text style={s.transPrice}>{formatMoney(t.prixTotal)} {currency}</Text>
              <Text style={s.transDetail}>{t.quantite} {t.unite} à {formatMoney(t.prixUnitaire)} {currency}</Text>
            </View>
         </View>
      </View>
    ));
  };

  const exportToPdf = async () => {
    const dateLocale = language === 'en' ? enUS : fr;
    const isSummary = viewMode === 'summary';
    const title = isSummary ? t('period_analysis') : (produits.find(p => p.id === selectedProduit)?.libelle || 'Produit');
    
    if (isSummary && periodSummary.length === 0) return;
    if (!isSummary && transactions.length === 0) return;

    const rows = isSummary 
      ? periodSummary.map((item: any) => `
          <tr>
            <td>${item.libelleProduit}</td>
            <td>${item.totalQte}</td>
            <td>-</td>
            <td>${formatMoney(item.totalPrix)} Ar</td>
          </tr>
        `).join('')
      : transactions.map(t => `
          <tr>
            <td>${format(new Date(t.dateAchat), 'dd MMM yyyy', { locale: dateLocale })}</td>
            <td>${t.quantite} ${t.unite}</td>
            <td>${formatMoney(t.prixUnitaire)} Ar</td>
            <td>${formatMoney(t.prixTotal)} Ar</td>
          </tr>
        `).join('');

    const headers = isSummary
      ? `<th>${t('product')}</th><th>${t('quantity')}</th><th>-</th><th>${t('total_amount')}</th>`
      : `<th>${t('date')}</th><th>${t('quantity')}</th><th>${t('unit_price')}</th><th>${t('total_amount')}</th>`;

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
            h1 { color: ${activeTheme.primary}; text-align: center; margin-bottom: 10px; }
            .subtitle { text-align: center; color: #666; margin-bottom: 30px; }
            .summary { display: flex; justify-content: space-around; margin-bottom: 30px; background: #f8f9fa; padding: 15px; border-radius: 8px; }
            .summary-item { text-align: center; }
            .summary-value { font-size: 18px; font-weight: bold; color: ${activeTheme.primary}; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: ${activeTheme.primary}; color: white; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #999; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div class="subtitle">
            ${t('period')} : ${format(dateDebut, 'dd/MM/yyyy')} - ${format(dateFin, 'dd/MM/yyyy')}
          </div>

          <div class="summary">
            <div class="summary-item">
              <div>${t('total_spent')}</div>
              <div class="summary-value">${formatMoney(totalProduitAnalyse)} Ar</div>
            </div>
            <div class="summary-item">
              <div>${t('quantity')} Total</div>
              <div class="summary-value">${totalQuantite} ${unitePrincipale}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                ${headers}
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <div class="footer">
            Généré par E-tsena le ${format(new Date(), 'dd/MM/yyyy HH:mm')}
          </div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      Alert.alert('Erreur', "Impossible de générer le PDF");
      console.error(error);
    }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={activeTheme.primary} /></View>;

  const getFilterStyle = (type: string) => {
    const isActive = activeFilter === type;
    return {
      container: [s.filterChip, isActive && { backgroundColor: activeTheme.primary }],
      text: [s.filterText, isActive && { color: '#fff' }]
    };
  };

  return (
    <View style={s.container}>
      <ThemedStatusBar transparent />
      {/* --- HEADER --- */}
      <LinearGradient colors={activeTheme.gradient as any} style={[s.header, { paddingTop: insets.top + 10 }]}>
        {/* FIL D'ARIANE */}
        <TouchableOpacity 
          onPress={() => router.push('/')} 
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, opacity: 0.9 }}
        >
          <Ionicons name="home-outline" size={16} color="rgba(255,255,255,0.8)" />
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginLeft: 5 }}>{t('home')}</Text>
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.8)" style={{ marginHorizontal: 4 }} />
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{t('reports')}</Text>
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.8)" style={{ marginHorizontal: 4 }} />
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{t('product_analysis')}</Text>
        </TouchableOpacity>

        <View style={s.headerRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.push('/rapports')}>
             <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View>
             <Text style={s.headerTitle}>{t('product_analysis')}</Text>
             <Text style={s.headerSubtitle}>{t('price_history')}</Text>
          </View>
          <TouchableOpacity style={s.backBtn} onPress={() => setShowMenu(true)}>
             <Ionicons name="menu" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 1. SÉLECTION PRODUIT */}
        <View style={s.card}>
          <Text style={s.label}>{t('product_to_analyze')}</Text>
          <TouchableOpacity style={s.selectBox} onPress={() => setShowProduitPicker(true)}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
              <View style={[s.iconBox, { backgroundColor: activeTheme.primary + '20' }]}>
                <Ionicons name="cube-outline" size={20} color={activeTheme.primary} />
              </View>
              <Text style={[s.selectText, !selectedProduit && { color: '#9CA3AF' }]}>
                {selectedProduit 
                  ? produits.find(p => p.id === selectedProduit)?.libelle 
                  : t('choose_product')}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color={activeTheme.primary} />
          </TouchableOpacity>
        </View>

        {/* 2. ANALYSE COMPLÈTE (Période + Résultats) */}
        <View style={s.card}>
          <Text style={s.label}>{t('period')}</Text>
          
          {/* Filtres Rapides */}
          <View style={s.filterRow}>
            {['current_month', 'last_month', 'year'].map((filterType) => {
               const style = getFilterStyle(filterType);
               const label = filterType === 'current_month' ? 'Ce mois' : filterType === 'last_month' ? 'Mois dernier' : 'Cette année';
               return (
                <TouchableOpacity 
                  key={filterType}
                  style={style.container}
                  onPress={() => applyFilter(filterType as any)}
                >
                  <Text style={style.text}>{label}</Text>
                </TouchableOpacity>
               );
            })}
          </View>

          <View style={s.dateRow}>
             <View style={{ flex: 1 }}>
                <Text style={s.subLabel}>{t('from')}</Text>
                <TouchableOpacity style={s.dateBtn} onPress={() => { setShowDateDebutPicker(true); setActiveFilter('custom'); }}>
                   <Ionicons name="calendar-outline" size={18} color={activeTheme.primary} />
                   <Text style={s.dateText}>{format(dateDebut, 'dd/MM/yyyy')}</Text>
                </TouchableOpacity>
             </View>
             <View style={{ flex: 1 }}>
                <Text style={s.subLabel}>{t('to')}</Text>
                <TouchableOpacity style={s.dateBtn} onPress={() => { setShowDateFinPicker(true); setActiveFilter('custom'); }}>
                   <Ionicons name="calendar-outline" size={18} color={activeTheme.primary} />
                   <Text style={s.dateText}>{format(dateFin, 'dd/MM/yyyy')}</Text>
                </TouchableOpacity>
             </View>
          </View>

          {/* RÉSULTATS INTÉGRÉS */}
          {showResults && (
             <View style={{ marginTop: 20 }}>
                <View style={s.divider} />
                
                <View style={s.resultHeader}>
                   <Text style={s.resultTitle}>{t('results')}</Text>
                   <TouchableOpacity style={s.pdfBtn} onPress={exportToPdf}>
                      <Ionicons name="document-text" size={18} color="#fff" />
                      <Text style={s.pdfBtnText}>PDF</Text>
                   </TouchableOpacity>
                </View>

                {/* Cartes Résumé Améliorées */}
                <LinearGradient 
                  colors={isDarkMode ? [activeTheme.primary + '30', activeTheme.primary + '10'] : [activeTheme.primary + '15', activeTheme.primary + '05']}
                  start={{x: 0, y: 0}} end={{x: 1, y: 1}}
                  style={s.statsBox}
                >
                    <View style={s.statItem}>
                        <View style={[s.statIconBox, { backgroundColor: isDarkMode ? '#1E293B' : '#fff' }]}>
                            <Ionicons name="wallet" size={24} color={activeTheme.primary} />
                        </View>
                        <View>
                            <Text style={s.statLabel}>{t('expenses')}</Text>
                            <Text style={[s.statValue, { color: activeTheme.primary }]}>{formatMoney(totalProduitAnalyse)} {currency}</Text>
                        </View>
                    </View>
                    
                    <View style={s.statDivider} />

                    <View style={s.statItem}>
                        <View style={[s.statIconBox, { backgroundColor: isDarkMode ? '#1E293B' : '#fff' }]}>
                            <Ionicons name="layers" size={24} color="#10B981" />
                        </View>
                        <View>
                            <Text style={s.statLabel}>{t('quantity')}</Text>
                            <Text style={[s.statValue, { color: '#10B981' }]}>{totalQuantite} {unitePrincipale === 'pcs' ? t('articles') : unitePrincipale}</Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* CONTENU : LISTE TRANSACTIONS OU RÉSUMÉ PRODUITS */}
                {viewMode === 'summary' ? renderSummaryView() : renderTransactionsView()}
             </View>
          )}
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>

      {/* DATE PICKERS */}
      {showDateDebutPicker && (
        <DateTimePicker value={dateDebut} mode="date" onChange={(e, d) => { setShowDateDebutPicker(false); if(d) setDateDebut(d); }} />
      )}
      {showDateFinPicker && (
        <DateTimePicker value={dateFin} mode="date" onChange={(e, d) => { setShowDateFinPicker(false); if(d) setDateFin(d); }} />
      )}

      {/* MODAL PRODUIT */}
      <Modal visible={showProduitPicker} transparent animationType="slide">
         <View style={s.modalOverlay}>
            <View style={s.modalContent}>
               <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>{t('select_product')}</Text>
                  <TouchableOpacity onPress={() => setShowProduitPicker(false)}>
                     <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
               </View>
               <ScrollView style={{ maxHeight: 300 }}>
                  {produits.map((p) => (
                     <TouchableOpacity 
                        key={p.id} 
                        style={[s.modalItem, selectedProduit === p.id && { backgroundColor: activeTheme.primary + '15' }]}
                        onPress={() => { setSelectedProduit(p.id); setShowProduitPicker(false); }}
                     >
                        <Text style={[s.itemText, selectedProduit === p.id && { color: activeTheme.primary, fontWeight: 'bold' }]}>{p.libelle}</Text>
                        {selectedProduit === p.id && <Ionicons name="checkmark" size={20} color={activeTheme.primary} />}
                     </TouchableOpacity>
                  ))}
               </ScrollView>
            </View>
         </View>
      </Modal>

      {/* MODAL MENU (Hamburger) */}
      <Modal visible={showMenu} transparent animationType="fade">
         <TouchableOpacity style={s.modalOverlay} onPress={() => setShowMenu(false)}>
            <View style={s.menuBox}>
               <Text style={s.menuTitle}>{t('navigation')}</Text>
               <TouchableOpacity style={s.menuItem} onPress={() => { setShowMenu(false); router.push('/statistiques'); }}>
                  <Ionicons name="stats-chart" size={22} color={activeTheme.primary} />
                  <Text style={s.menuText}>{t('see_global_stats')}</Text>
               </TouchableOpacity>
               <TouchableOpacity style={s.menuItem} onPress={() => { setShowMenu(false); router.push('/rapports'); }}>
                  <Ionicons name="pie-chart" size={22} color={activeTheme.primary} />
                  <Text style={s.menuText}>{t('back_to_reports')}</Text>
               </TouchableOpacity>
               <TouchableOpacity style={s.menuItem} onPress={() => { setShowMenu(false); router.push('/'); }}>
                  <Ionicons name="home" size={22} color={activeTheme.primary} />
                  <Text style={s.menuText}>{t('back_to_home')}</Text>
               </TouchableOpacity>
            </View>
         </TouchableOpacity>
      </Modal>

    </View>
  );
}

const getStyles = (theme: any, dark: boolean) => {
  const c = {
    bg: dark ? '#0F172A' : '#F8FAFC',
    card: dark ? '#1E293B' : '#fff',
    text: dark ? '#F1F5F9' : '#1E293B',
    textSec: dark ? '#94A3B8' : '#64748B',
    border: dark ? '#334155' : '#F1F5F9',
    modal: dark ? '#1E293B' : '#fff',
    input: dark ? '#0F172A' : '#fff',
    shadow: dark ? 0.2 : 0.05,
    primary: theme.primary,
    gradient: theme.gradient
  };

  return StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.bg },

  // HEADER
  header: { paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },

  scrollContent: { padding: 20 },

  // CARDS
  card: { backgroundColor: c.card, borderRadius: 16, padding: 20, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOpacity: c.shadow, shadowRadius: 4 },
  label: { fontSize: 14, fontWeight: '700', color: dark ? '#E2E8F0' : '#374151', marginBottom: 10 },
  subLabel: { fontSize: 11, color: c.textSec, marginBottom: 5 },

  selectBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: c.border, padding: 14, borderRadius: 12, backgroundColor: c.input },
  selectText: { fontSize: 15, color: c.text, fontWeight: '500' },
  iconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },

  // FILTERS
  filterRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  filterChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: dark ? '#334155' : '#E5E7EB' },
  filterText: { fontSize: 12, fontWeight: '600', color: dark ? '#94A3B8' : '#4B5563' },

  dateRow: { flexDirection: 'row', gap: 15 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: c.border, padding: 12, borderRadius: 10, backgroundColor: c.card },
  dateText: { fontWeight: '500', color: c.text },

  // RESULTS
  divider: { height: 1, backgroundColor: c.border, marginVertical: 20 },
  
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  resultTitle: { fontWeight: 'bold', fontSize: 18, color: c.text },
  resultSubtitle: { fontSize: 12, color: c.textSec },
  
  pdfBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EF4444', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  pdfBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 11 },

  statsBox: { flexDirection: 'row', borderRadius: 16, padding: 20, marginBottom: 25, borderWidth: 1, borderColor: dark ? '#334155' : 'rgba(0,0,0,0.05)' },
  statItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 15 },
  statIconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  statLabel: { fontSize: 11, color: c.textSec, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statDivider: { width: 1, backgroundColor: dark ? '#334155' : 'rgba(0,0,0,0.1)', marginHorizontal: 15 },

  transactionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: c.border },
  transLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateBadge: { width: 45, height: 45, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  dateDay: { fontSize: 16, fontWeight: 'bold', color: c.text },
  dateMonth: { fontSize: 10, color: c.textSec, textTransform: 'uppercase' },
  
  transPrice: { fontSize: 15, fontWeight: '700', color: c.text },
  transDetail: { fontSize: 12, color: c.textSec },

  emptyBox: { alignItems: 'center', padding: 30 },

  // MODAL
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: c.modal, borderRadius: 20, padding: 20, maxHeight: '60%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderColor: c.border, paddingBottom: 10 },
  modalTitle: { fontWeight: 'bold', fontSize: 18, color: c.text },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderColor: c.border },
  itemText: { fontSize: 16, color: c.text },

  // MENU HAMBURGER
  menuBox: { backgroundColor: c.card, padding: 20, borderRadius: 20, position: 'absolute', top: 100, right: 20, width: 250, elevation: 10 },
  menuTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: c.text },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderColor: c.border },
  menuText: { fontSize: 14, fontWeight: '500', color: c.text }
});
};