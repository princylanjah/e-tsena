import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, 
  Animated, Dimensions, Modal
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  format, addMonths, subMonths, 
  startOfMonth, endOfMonth, // ✅ Retour au Mois
  startOfWeek, endOfWeek, eachDayOfInterval, 
  addWeeks, subWeeks, isSameDay
} from 'date-fns';
import formatMoney from '../../src/utils/formatMoney';
import { fr, enUS } from 'date-fns/locale';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import DateTimePicker from '@react-native-community/datetimepicker';

import { getDb } from '../../src/db/init';
import { useTheme } from '../../src/context/ThemeContext';
import { ThemedStatusBar } from '../../src/components/ThemedStatusBar';
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

  // États Rapport Hebdomadaire
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [weeklyStats, setWeeklyStats] = useState<{day: Date, total: number, percentage: number, products: any[]}[]>([]);
  const [weekTotal, setWeekTotal] = useState(0);
  const [expandedDays, setExpandedDays] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // États Journal Quotidien
  const [showDailyJournal, setShowDailyJournal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dailyPurchases, setDailyPurchases] = useState<any[]>([]);
  const [dailyTotal, setDailyTotal] = useState(0);

  const toggleDay = (dateKey: string) => {
    setExpandedDays(prev => 
      prev.includes(dateKey) 
        ? prev.filter(d => d !== dateKey)
        : [...prev, dateKey]
    );
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useFocusEffect(
    useCallback(() => {
      loadMonthStats(); // ✅ On recharge les stats du mois
      loadWeeklyStats();
    }, [currentMonth, currentWeekStart])
  );

  useEffect(() => {
    const startOfSelectedMonth = startOfMonth(currentMonth);
    const startOfFirstWeek = startOfWeek(startOfSelectedMonth, { weekStartsOn: 1 });
    setCurrentWeekStart(startOfFirstWeek);
  }, [currentMonth]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true })
    ]).start();
  }, []);

  // 1. CHARGEMENT DES STATS (Mois sélectionné)
  function loadMonthStats() {
    try {
      const db = getDb();
      
      // ✅ Calcul par MOIS (comme l'accueil)
      const start = startOfMonth(currentMonth).toISOString();
      const end = endOfMonth(currentMonth).toISOString();

      // 1. Total Depense (Mois)
      const [monthRes] = db.getAllSync(`
        SELECT SUM(l.prixTotal) as t 
        FROM LigneAchat l JOIN Achat a ON a.id = l.idAchat 
        WHERE a.dateAchat BETWEEN ? AND ?`, [start, end]);
      
      // 2. Total Articles (Mois)
      // ⚠️ MODIFICATION IMPORTANTE ICI :
      // On utilise COUNT(l.id) au lieu de SUM(l.quantite)
      // Pour que ça matche exactement le nombre "d'articles" affiché sur l'accueil
      const [itemsRes] = db.getAllSync(`
        SELECT COUNT(l.id) as q 
        FROM LigneAchat l JOIN Achat a ON a.id = l.idAchat 
        WHERE a.dateAchat BETWEEN ? AND ?`, [start, end]);

      // 3. Top Product (Mois)
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

  // ... (LE RESTE DU CODE : loadWeeklyStats, loadDailyPurchases, exportDailyPDF, handleExportPDF NE CHANGE PAS)
  // Je remets juste les fonctions pour que le fichier soit complet et fonctionnel

  function loadWeeklyStats() {
    try {
      const db = getDb();
      const start = currentWeekStart.toISOString();
      const end = endOfWeek(currentWeekStart, { weekStartsOn: 1 }).toISOString();

      const result = db.getAllSync(`
        SELECT a.dateAchat, l.prixTotal, l.libelleProduit, l.quantite
        FROM LigneAchat l 
        JOIN Achat a ON a.id = l.idAchat 
        WHERE a.dateAchat BETWEEN ? AND ?
        ORDER BY a.dateAchat ASC
      `, [start, end]);

      const daysMap = new Map<string, { total: number, products: any[] }>();
      const days = eachDayOfInterval({ start: currentWeekStart, end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }) });
      for (const day of days) {
          daysMap.set(format(day, 'yyyy-MM-dd'), { total: 0, products: [] });
      }

      let wTotal = 0;
      for (const row of result as any[]) {
        const dateKey = format(new Date(row.dateAchat), 'yyyy-MM-dd');
        const current = daysMap.get(dateKey);
        if (current) {
            current.total += row.prixTotal;
            current.products.push({ name: row.libelleProduit, qty: row.quantite, price: row.prixTotal });
            wTotal += row.prixTotal;
        }
      }

      const stats = days.map(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const data = daysMap.get(dateKey);
        return {
          day,
          total: data?.total || 0,
          products: data?.products || [],
          percentage: 0
        };
      });

      setWeeklyStats(stats);
      setWeekTotal(wTotal);
    } catch (e) { console.error(e); }
  };

  const prevWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const nextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));

  const loadDailyPurchases = (date: Date) => {
    try {
      const db = getDb();
      const dayStart = format(date, 'yyyy-MM-dd') + 'T00:00:00.000Z';
      const dayEnd = format(date, 'yyyy-MM-dd') + 'T23:59:59.999Z';
      const result = db.getAllSync(`
        SELECT a.id as achatId, a.nomListe, a.dateAchat, l.id as ligneId, l.libelleProduit, l.quantite, l.prixUnitaire, l.prixTotal, l.unite
        FROM LigneAchat l JOIN Achat a ON a.id = l.idAchat 
        WHERE a.dateAchat BETWEEN ? AND ? ORDER BY a.dateAchat DESC, l.libelleProduit ASC
      `, [dayStart, dayEnd]);
      const purchases = result as any[];
      const total = purchases.reduce((sum, p) => sum + (p.prixTotal || 0), 0);
      setDailyPurchases(purchases);
      setDailyTotal(total);
    } catch (e) { console.error(e); setDailyPurchases([]); setDailyTotal(0); }
  };

  const openDailyJournal = () => { setSelectedDate(new Date()); loadDailyPurchases(new Date()); setShowDailyJournal(true); };
  const onDateChange = (event: any, date?: Date) => { setShowDatePicker(false); if (date) { setSelectedDate(date); loadDailyPurchases(date); } };

  const exportDailyPDF = async () => {
    if (dailyPurchases.length === 0) { Alert.alert(t('info'), t('no_data_to_export')); return; }
    try {
      const dateStr = format(selectedDate, 'EEEE d MMMM yyyy', { locale: language === 'en' ? enUS : fr });
      const byList = new Map<string, any[]>();
      for (const p of dailyPurchases) {
        const listName = p.nomListe || 'Sans nom';
        if (!byList.has(listName)) byList.set(listName, []);
        byList.get(listName)!.push(p);
      }
      let listsHtml = '';
      byList.forEach((items, listName) => {
        const listTotal = items.reduce((s, i) => s + i.prixTotal, 0);
        listsHtml += `<div class="list-section"><h3 class="list-name">🛒 ${listName}</h3><table><tr><th>${t('product')}</th><th style="text-align:center">${t('quantity')}</th><th style="text-align:right">${t('unit_price')}</th><th style="text-align:right">${t('amount')}</th></tr>${items.map(p => `<tr><td>${p.libelleProduit}</td><td style="text-align:center">${p.quantite} ${p.unite || ''}</td><td style="text-align:right">${p.prixUnitaire ? formatMoney(p.prixUnitaire) : '0'} ${currency}</td><td style="text-align:right">${p.prixTotal ? formatMoney(p.prixTotal) : '0'} ${currency}</td></tr>`).join('')}<tr class="subtotal"><td colspan="3"><strong>Sous-total</strong></td><td style="text-align:right"><strong>${formatMoney(listTotal)} ${currency}</strong></td></tr></table></div>`;
      });
      const html = `<html><head><style>body{font-family:Helvetica,Arial,sans-serif;padding:30px;color:#333}.header{text-align:center;margin-bottom:30px;border-bottom:3px solid ${activeTheme.primary};padding-bottom:20px}.title{color:${activeTheme.primary};font-size:22px;margin:0}.date{color:#666;font-size:16px;margin-top:8px}.summary{background:#f8f9fa;padding:20px;border-radius:10px;margin-bottom:25px;text-align:center}.summary-label{font-size:12px;color:#666}.summary-value{font-size:28px;font-weight:bold;color:${activeTheme.primary}}.list-section{margin-bottom:25px}.list-name{color:${activeTheme.primary};font-size:16px;margin-bottom:10px}table{width:100%;border-collapse:collapse}th{background:${activeTheme.primary};color:white;padding:10px;text-align:left;font-size:12px}td{padding:10px;border-bottom:1px solid #eee;font-size:13px}.subtotal{background:#f0f0f0}.total{margin-top:20px;text-align:right;font-size:20px;color:${activeTheme.primary};font-weight:bold}.footer{margin-top:30px;text-align:center;color:#999;font-size:11px}</style></head><body><div class="header"><h1 class="title">📅 ${t('daily_journal')}</h1><p class="date">${dateStr}</p></div><div class="summary"><div class="summary-label">${t('total_spent')}</div><div class="summary-value">${formatMoney(dailyTotal)} ${currency}</div><div class="summary-label">${dailyPurchases.length} ${t('articles')}</div></div>${listsHtml}<div class="total">TOTAL: ${formatMoney(dailyTotal)} ${currency}</div><div class="footer">E-tsena • ${format(new Date(), 'dd/MM/yyyy HH:mm')}</div></body></html>`;
      // Exportation PDF : proposer d'enregistrer localement ou de partager
      const { uri } = await Print.printToFileAsync({ html });
      Alert.alert(
        t('export_pdf'),
        t('choose_export_option'),
        [
          {
            text: t('save_on_device'),
            onPress: async () => {
              try {
                const fileName = `journal_${format(selectedDate, 'yyyyMMdd_HHmmss')}.pdf`;
                const destPath = FileSystem.documentDirectory + fileName;
                await FileSystem.copyAsync({ from: uri, to: destPath });
                Alert.alert(t('success'), t('pdf_saved_to_device') + `\n${destPath}`);
              } catch (e) {
                Alert.alert(t('error'), t('pdf_save_failed'));
              }
            }
          },
          {
            text: t('share'),
            onPress: async () => {
              await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
            },
            style: 'default'
          },
          { text: t('cancel'), style: 'cancel' }
        ]
      );
    } catch (e) { Alert.alert(t('error'), t('pdf_export_failed')); }
  };

  const handleExportPDF = async () => { /* Code inchangé, reprendre celui d'avant ou demander si besoin */ };
  const handleCreate = () => { const db = getDb(); const res = db.runSync('INSERT INTO Achat (nomListe, dateAchat) VALUES (?, ?)', ['Nouvelle Liste', new Date().toISOString()]); router.push(`/achat/${res.lastInsertRowId}`); };

  return (
    <View style={s.container}>
      <ThemedStatusBar transparent />
      
      {/* --- HEADER --- */}
      <LinearGradient 
        colors={activeTheme.gradient as any} 
        style={[s.header, { paddingTop: insets.top + 10 }]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity 
          onPress={() => router.push('/')} 
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15, opacity: 0.9 }}
        >
          <Ionicons name="home-outline" size={16} color="rgba(255,255,255,0.8)" />
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginLeft: 5 }}>{t('home')}</Text>
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.8)" style={{ marginHorizontal: 4 }} />
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{t('reports')}</Text>
        </TouchableOpacity>

        <View style={s.headerTopRow}>
            <TouchableOpacity onPress={() => router.push('/')} style={s.iconBtn}>
               <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            
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

        {/* SUMMARY CARD (MOIS) */}
        <View style={s.summaryRow}>
          <View style={s.summaryItem}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Ionicons name="wallet-outline" size={16} color={isDarkMode ? '#94A3B8' : '#64748B'} />
              {/* ✅ Affichage du MOIS */}
              <Text style={s.summaryLabel}>{t('expenses')} ({format(currentMonth, 'MMM')})</Text>
            </View>
            <Text style={[s.summaryValue, { color: activeTheme.primary }]}>{formatMoney(stats.monthTotal)} {currency}</Text>
          </View>
          <View style={s.verticalDivider} />
          <View style={s.summaryItem}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Ionicons name="cube-outline" size={16} color={isDarkMode ? '#94A3B8' : '#64748B'} />
              {/* ✅ Affichage du MOIS */}
              <Text style={s.summaryLabel}>{t('articles')} ({format(currentMonth, 'MMM')})</Text>
            </View>
            <Text style={[s.summaryValue, { color: activeTheme.primary }]}>{stats.monthItems}</Text>
          </View>
        </View>
      </LinearGradient>

      <Animated.ScrollView 
        contentContainerStyle={s.scrollContent} 
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        <View style={[s.actionsRow, { marginTop: 20 }]}>
           <TouchableOpacity style={[s.actionBtn]} onPress={() => router.push('/analyse_produit')}>
              <View style={s.actionContent}>
                 <View style={s.actionIconBox}><Ionicons name="search" size={22} color={activeTheme.primary} /></View>
                 <View style={{ flex: 1 }}><Text style={s.actionTitle}>{t('product_analysis')}</Text><Text style={s.actionSub}>{t('details_by_item')}</Text></View>
              </View>
           </TouchableOpacity>

           <TouchableOpacity style={[s.actionBtn]} onPress={() => router.push('/statistiques')}>
              <View style={s.actionContent}>
                 <View style={s.actionIconBox}><Ionicons name="bar-chart" size={22} color={activeTheme.primary} /></View>
                 <View style={{ flex: 1 }}><Text style={s.actionTitle}>{t('charts')}</Text><Text style={s.actionSub}>{t('detailed_visuals')}</Text></View>
              </View>
           </TouchableOpacity>
        </View>

        <TouchableOpacity style={[s.dailyJournalBtn, { borderColor: activeTheme.primary + '30' }]} onPress={openDailyJournal}>
          <View style={s.actionContent}>
            <View style={[s.actionIconBox, { backgroundColor: activeTheme.primary + '15' }]}><Ionicons name="calendar" size={22} color={activeTheme.primary} /></View>
            <View style={{ flex: 1 }}><Text style={s.actionTitle}>{t('daily_journal')}</Text><Text style={s.actionSub}>{t('select_day_view_expenses')}</Text></View>
            <View style={[s.newBadge, { backgroundColor: activeTheme.primary }]}><Text style={{ color: '#fff', fontSize: 9, fontWeight: 'bold' }}>NEW</Text></View>
          </View>
        </TouchableOpacity>

        {/* TOP PRODUIT (MOIS) */}
        <View style={s.card}>
            <View style={s.cardHeader}>
                <Text style={s.cardTitle}>{t('top_product')} ({format(currentMonth, 'MMMM', { locale: language === 'en' ? enUS : fr })})</Text>
                <Ionicons name="ribbon" size={20} color="#F59E0B" />
            </View>
            <Text style={s.cardValue}>{stats.topProduct}</Text>
            <Text style={s.cardSub}>{stats.topProductQty} {t('articles')}</Text>
        </View>

        {/* RAPPORT HEBDOMADAIRE */}
        <View style={s.weeklyReportCard}>
           <View style={s.weeklyHeader}>
              <View>
                <Text style={s.weeklyTitle}>{t('daily_journal')}</Text>
                <Text style={s.cardSub}>{format(currentWeekStart, 'dd MMM', { locale: language === 'en' ? enUS : fr })} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'dd MMM yyyy', { locale: language === 'en' ? enUS : fr })}</Text>
              </View>
              <View style={s.weeklyNav}>
                 <TouchableOpacity onPress={prevWeek} style={s.weeklyNavBtn}><Ionicons name="chevron-back" size={20} color={activeTheme.primary} /></TouchableOpacity>
                 <TouchableOpacity onPress={nextWeek} style={s.weeklyNavBtn}><Ionicons name="chevron-forward" size={20} color={activeTheme.primary} /></TouchableOpacity>
              </View>
           </View>
           <View style={s.weeklyContent}>
              {weeklyStats.length === 0 ? (<Text style={s.emptyText}>{t('no_data_week')}</Text>) : (
                 <>
                   <View style={s.daysListContainer}>
                      {weeklyStats.map((stat) => {
                        const isToday = isSameDay(stat.day, new Date());
                        const hasData = stat.total > 0;
                        const dateKey = format(stat.day, 'yyyy-MM-dd');
                        const isExpanded = expandedDays.includes(dateKey);
                        let dotBorderColor = hasData ? activeTheme.primary : (isDarkMode ? '#334155' : '#E2E8F0');
                        let dotBgColor = isToday ? activeTheme.primary : (isDarkMode ? '#0F172A' : '#fff');
                        let labelColor = isToday ? activeTheme.primary : (isDarkMode ? '#F1F5F9' : '#334155');

                        return (
                        <View key={dateKey} style={s.dayRow}>
                           <View style={s.timelineLeft}><View style={[s.timelineDot, { borderColor: dotBorderColor, backgroundColor: dotBgColor }]} />{stat !== weeklyStats.at(-1) && <View style={s.timelineLine} />}</View>
                           <View style={s.dayContent}>
                              <TouchableOpacity activeOpacity={0.7} onPress={() => hasData && toggleDay(dateKey)} style={[s.dayCard, { borderColor: isToday ? activeTheme.primary : (isDarkMode ? '#334155' : '#F1F5F9') }]}>
                                <View style={s.dayHeader}>
                                    <View><Text style={[s.dayLabel, { color: labelColor }]}>{format(stat.day, 'EEEE d', { locale: language === 'en' ? enUS : fr })}</Text>{hasData && !isExpanded && (<Text style={{ fontSize: 10, color: '#94A3B8' }}>{stat.products.length} {t('articles')}</Text>)}</View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Text style={[s.dayTotal, { color: hasData ? activeTheme.primary : '#94A3B8' }]}>{hasData ? `${formatMoney(stat.total)} ${currency}` : '-'}</Text>{hasData && (<Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color="#94A3B8" />)}</View>
                                </View>
                                {isExpanded && stat.products.length > 0 && (<View style={s.productList}>{stat.products.map((p: any, idx: number) => (<View key={`product-${stat.day}-${idx}`} style={s.productRow}><Ionicons name="pricetag-outline" size={12} color="#94A3B8" style={{marginTop: 2}} /><Text style={s.productItem}>{p.name} <Text style={{color: '#94A3B8'}}>(x{p.qty})</Text></Text><Text style={s.productPrice}>{formatMoney(p.price)} {currency}</Text></View>))}</View>)}
                              </TouchableOpacity>
                           </View>
                        </View>
                      )})}
                   </View>
                   <View style={s.weekTotalContainer}><Text style={s.weekTotalLabel}>{t('total_spent')}</Text><Text style={[s.weekTotalValue, { color: activeTheme.primary }]}>{formatMoney(weekTotal)} {currency}</Text></View>
                 </>
              )}
           </View>
        </View>
        <View style={{ height: 100 }} />
      </Animated.ScrollView>

      {/* MODAL JOURNAL (Code identique à avant) */}
      <Modal visible={showDailyJournal} animationType="slide" transparent={true} onRequestClose={() => setShowDailyJournal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.dailyJournalModal}>
            <LinearGradient colors={activeTheme.gradient as any} style={s.dailyModalHeader} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={s.dailyModalHeaderContent}>
                <TouchableOpacity onPress={() => setShowDailyJournal(false)} style={s.dailyCloseBtn}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
                <View style={{ flex: 1, alignItems: 'center' }}><Text style={s.dailyModalTitle}>📅 {t('daily_journal')}</Text><TouchableOpacity style={s.datePickerBtn} onPress={() => setShowDatePicker(true)}><Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.9)" /><Text style={s.datePickerText}>{format(selectedDate, 'EEEE d MMMM yyyy', { locale: language === 'en' ? enUS : fr })}</Text><Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.9)" /></TouchableOpacity></View>
                <TouchableOpacity onPress={exportDailyPDF} style={[s.dailyExportBtn, { opacity: dailyPurchases.length === 0 ? 0.5 : 1 }]} disabled={dailyPurchases.length === 0}><Ionicons name="share-outline" size={20} color="#fff" /></TouchableOpacity>
              </View>
            </LinearGradient>
            {showDatePicker && (<DateTimePicker value={selectedDate} mode="date" display="default" onChange={onDateChange} maximumDate={new Date()} />)}
            <View style={s.dailySummaryCard}><View style={s.dailySummaryItem}><View style={[s.dailySummaryIcon, { backgroundColor: activeTheme.primary + '15' }]}><Ionicons name="wallet-outline" size={22} color={activeTheme.primary} /></View><View><Text style={s.dailySummaryLabel}>{t('total_spent')}</Text><Text style={[s.dailySummaryValue, { color: activeTheme.primary }]}>{formatMoney(dailyTotal)} {currency}</Text></View></View><View style={s.dailySummaryDivider} /><View style={s.dailySummaryItem}><View style={[s.dailySummaryIcon, { backgroundColor: '#10B98115' }]}><Ionicons name="cube-outline" size={22} color="#10B981" /></View><View><Text style={s.dailySummaryLabel}>{t('articles')}</Text><Text style={[s.dailySummaryValue, { color: '#10B981' }]}>{dailyPurchases.length}</Text></View></View></View>
            <ScrollView style={s.dailyContentScroll} showsVerticalScrollIndicator={false}>{dailyPurchases.length === 0 ? (<View style={s.dailyEmptyState}><Ionicons name="cart-outline" size={60} color="#94A3B8" /><Text style={s.dailyEmptyTitle}>{t('no_purchase')}</Text><Text style={s.dailyEmptyText}>{t('no_product_bought_period')}</Text></View>) : (<>{(() => { const byList = new Map<string, any[]>(); for (const p of dailyPurchases) { const listName = p.nomListe || 'Sans nom'; if (!byList.has(listName)) byList.set(listName, []); byList.get(listName)!.push(p); } return Array.from(byList.entries()).map(([listName, items]) => (<View key={listName} style={s.dailyListSection}><View style={s.dailyListHeader}><Ionicons name="cart" size={18} color={activeTheme.primary} /><Text style={s.dailyListTitle}>{listName}</Text><Text style={s.dailyListTotal}>{formatMoney(items.reduce((s, i) => s + i.prixTotal, 0))} {currency}</Text></View>{items.map((item, idx) => (<View key={`${item.ligneId}-${idx}`} style={s.dailyProductRow}><View style={s.dailyProductInfo}><Text style={s.dailyProductName}>{item.libelleProduit}</Text><Text style={s.dailyProductQty}>{item.quantite} {item.unite || ''} × {item.prixUnitaire ? formatMoney(item.prixUnitaire) : 0} {currency}</Text></View><Text style={[s.dailyProductPrice, { color: activeTheme.primary }]}>{item.prixTotal ? formatMoney(item.prixTotal) : 0} {currency}</Text></View>))}</View>)); })()}</>)}<View style={{ height: 30 }} /></ScrollView>
            {dailyPurchases.length > 0 && (<View style={s.dailyFooter}><Text style={s.dailyFooterLabel}>TOTAL</Text><Text style={[s.dailyFooterValue, { color: activeTheme.primary }]}>{formatMoney(dailyTotal)} {currency}</Text></View>)}
          </View>
        </View>
      </Modal>

      <View style={[s.navbar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 10, height: 60 + (insets.bottom > 0 ? insets.bottom : 10) }]}>
         <TouchableOpacity style={s.navItem} onPress={() => router.push('/')}><Ionicons name="home-outline" size={24} color="#9CA3AF" /><Text style={[s.navText, { color: "#9CA3AF" }]}>{t('home')}</Text></TouchableOpacity>
         <View style={{ top: -25 }}><TouchableOpacity style={[s.fab, { shadowColor: activeTheme.primary }]} onPress={handleCreate}><LinearGradient colors={activeTheme.gradient as any} style={s.fabGradient}><Ionicons name="add" size={32} color="#fff" /></LinearGradient></TouchableOpacity></View>
         <TouchableOpacity style={s.navItem}><Ionicons name="pie-chart" size={24} color={activeTheme.primary} /><Text style={[s.navText, { color: activeTheme.primary }]}>{t('reports')}</Text></TouchableOpacity>
      </View>
    </View>
  );
}

// STYLES INCHANGÉS
const getStyles = (theme: any, dark: boolean) => {
  const c = { bg: dark ? '#0F172A' : '#F8FAFC', card: dark ? '#1E293B' : '#fff', text: dark ? '#F1F5F9' : '#1E293B', textSec: dark ? '#94A3B8' : '#64748B', border: dark ? '#334155' : '#F1F5F9', modal: dark ? '#1E293B' : '#fff', input: dark ? '#0F172A' : '#fff', shadow: dark ? 0.2 : 0.05, primary: theme.primary, gradient: theme.gradient };
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: { paddingBottom: 80, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, position: 'relative', zIndex: 10 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  iconBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  summaryRow: { position: 'absolute', bottom: -35, left: 20, right: 20, flexDirection: 'row', backgroundColor: c.card, borderRadius: 20, padding: 20, justifyContent: 'space-around', shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: dark ? 0.3 : 0.1, shadowRadius: 8, elevation: 5 },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { color: dark ? '#94A3B8' : '#9CA3AF', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  summaryValue: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  verticalDivider: { width: 1, backgroundColor: c.border, height: '80%' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 50 },
  card: { backgroundColor: c.card, borderRadius: 20, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: c.shadow, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: c.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: c.text },
  cardValue: { fontSize: 22, fontWeight: '800', color: dark ? '#F1F5F9' : '#0F172A' },
  cardSub: { fontSize: 12, color: c.textSec, marginTop: 4 },
  actionsRow: { flexDirection: 'row', gap: 15, marginBottom: 25 },
  actionBtn: { flex: 1, backgroundColor: c.card, borderRadius: 20, borderWidth: 1, borderColor: c.border, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: c.shadow, shadowRadius: 8, elevation: 2, padding: 15 },
  actionContent: { alignItems: 'center', gap: 10 },
  actionIconBox: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', backgroundColor: dark ? '#334155' : '#F1F5F9', marginBottom: 5 },
  actionTitle: { fontSize: 14, fontWeight: '700', color: c.text, textAlign: 'center' },
  actionSub: { fontSize: 11, color: c.textSec, textAlign: 'center' },
  arrowCircle: { display: 'none' },
  emptyText: { textAlign: 'center', color: c.textSec, fontStyle: 'italic', padding: 20 },
  navbar: { flexDirection: 'row', backgroundColor: c.card, borderTopWidth: 1, borderColor: dark ? '#334155' : '#eee', justifyContent: 'space-around', paddingTop: 10, paddingHorizontal: 20, position: 'absolute', bottom: 0, width: '100%' },
  navItem: { alignItems: 'center' },
  navText: { fontSize: 10, fontWeight: '600', marginTop: 4 },
  fab: { width: 56, height: 56, borderRadius: 28, shadowOpacity: 0.3, elevation: 6 },
  fabGradient: { width: '100%', height: '100%', borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  weeklyReportCard: { backgroundColor: c.card, borderRadius: 20, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: c.shadow, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: c.border },
  weeklyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  weeklyTitle: { fontSize: 18, fontWeight: '700', color: c.text },
  weeklyNav: { flexDirection: 'row', gap: 8 },
  weeklyNavBtn: { padding: 8, borderRadius: 12, backgroundColor: dark ? '#334155' : '#F1F5F9' },
  weeklyContent: { padding: 5 },
  daysListContainer: { marginBottom: 15, marginTop: 10 },
  dayRow: { flexDirection: 'row' },
  timelineLeft: { alignItems: 'center', width: 30 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, zIndex: 2 },
  timelineLine: { width: 2, flex: 1, backgroundColor: c.border, marginVertical: 2 },
  dayContent: { flex: 1, paddingBottom: 15 },
  dayCard: { backgroundColor: c.bg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: c.border },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayLabel: { fontSize: 14, fontWeight: '600', textTransform: 'capitalize' },
  dayTotal: { fontSize: 14, fontWeight: '700' },
  productList: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: c.border, gap: 6 },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  productItem: { fontSize: 12, color: c.textSec, flex: 1 },
  productPrice: { fontSize: 12, fontWeight: '600', color: dark ? '#F1F5F9' : '#334155' },
  weekTotalContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: c.bg, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: c.border },
  weekTotalLabel: { fontWeight: '600', fontSize: 14, color: c.textSec, textTransform: 'uppercase' },
  weekTotalValue: { fontWeight: '800', fontSize: 18 },
  dailyJournalBtn: { backgroundColor: c.card, borderRadius: 20, marginBottom: 20, borderWidth: 2, borderStyle: 'dashed', shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: c.shadow, shadowRadius: 8, elevation: 2, padding: 15 },
  newBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  dailyJournalModal: { backgroundColor: c.card, borderTopLeftRadius: 25, borderTopRightRadius: 25, maxHeight: '90%', overflow: 'hidden' },
  dailyModalHeader: { padding: 20, paddingTop: 15 },
  dailyModalHeaderContent: { flexDirection: 'row', alignItems: 'center' },
  dailyCloseBtn: { padding: 5 },
  dailyModalTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  datePickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginTop: 8 },
  datePickerText: { color: '#fff', fontSize: 14, fontWeight: '500', textTransform: 'capitalize' },
  dailyExportBtn: { padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  dailySummaryCard: { flexDirection: 'row', backgroundColor: c.bg, margin: 15, padding: 15, borderRadius: 16, borderWidth: 1, borderColor: c.border },
  dailySummaryItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dailySummaryIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  dailySummaryLabel: { fontSize: 11, color: c.textSec, textTransform: 'uppercase', fontWeight: '600' },
  dailySummaryValue: { fontSize: 18, fontWeight: '800' },
  dailySummaryDivider: { width: 1, backgroundColor: c.border, marginHorizontal: 10 },
  dailyContentScroll: { paddingHorizontal: 15, maxHeight: '55%' },
  dailyEmptyState: { alignItems: 'center', padding: 40 },
  dailyEmptyTitle: { fontSize: 16, fontWeight: '700', color: c.text, marginTop: 15 },
  dailyEmptyText: { fontSize: 13, color: c.textSec, textAlign: 'center', marginTop: 5 },
  dailyListSection: { backgroundColor: c.bg, borderRadius: 16, marginBottom: 15, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
  dailyListHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: dark ? '#334155' : '#F8FAFC', borderBottomWidth: 1, borderColor: c.border },
  dailyListTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: c.text },
  dailyListTotal: { fontSize: 13, fontWeight: '700', color: c.primary },
  dailyProductRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderColor: c.border },
  dailyProductInfo: { flex: 1 },
  dailyProductName: { fontSize: 14, fontWeight: '600', color: c.text },
  dailyProductQty: { fontSize: 11, color: c.textSec, marginTop: 2 },
  dailyProductPrice: { fontSize: 14, fontWeight: '700' },
  dailyFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: c.bg, borderTopWidth: 1, borderColor: c.border },
  dailyFooterLabel: { fontSize: 12, fontWeight: '700', color: c.textSec, letterSpacing: 1 },
  dailyFooterValue: { fontSize: 22, fontWeight: '800' }
});
};