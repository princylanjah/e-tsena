import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, 
  Animated, Dimensions, StatusBar, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { getDb } from '../../src/db/init';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function Rapports() {
  const { activeTheme } = useTheme();
  const s = getStyles(activeTheme);

  // --- ÉTATS ---
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    month: 0,
    count: 0,
    topProduct: 'Aucun',
    avgBasket: 0
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
    loadGlobalStats();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true })
    ]).start();
  }, []);

  // 1. CHARGEMENT DES STATS GLOBALES
  const loadGlobalStats = () => {
    try {
      const db = getDb();
      const [totalRes] = db.getAllSync('SELECT SUM(prixTotal) as t FROM LigneAchat');
      const monthStr = format(new Date(), 'yyyy-MM');
      const [monthRes] = db.getAllSync(`
        SELECT SUM(l.prixTotal) as t 
        FROM LigneAchat l JOIN Achat a ON a.id = l.idAchat 
        WHERE strftime('%Y-%m', a.dateAchat) = ?`, [monthStr]);
      const [countRes] = db.getAllSync('SELECT COUNT(id) as c FROM Achat');
      const [topRes] = db.getAllSync(`
        SELECT libelleProduit, SUM(quantite) as q 
        FROM LigneAchat GROUP BY libelleProduit ORDER BY q DESC LIMIT 1
      `);

      const total = (totalRes as any)?.t || 0;
      const count = (countRes as any)?.c || 0;

      setStats({
        total: total,
        month: (monthRes as any)?.t || 0,
        count: count,
        topProduct: (topRes as any)?.libelleProduit || 'Aucun',
        avgBasket: count > 0 ? Math.round(total / count) : 0
      });
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  // 2. ANALYSE DE PÉRIODE (Filtrer + Liste)
  const handleAnalyzePeriod = () => {
    try {
      const db = getDb();
      const start = dateDebut.toISOString();
      const end = dateFin.toISOString();

      // Récupérer les achats complets
      const result = db.getAllSync(`
        SELECT a.id, a.nomListe, a.dateAchat, SUM(l.prixTotal) as totalAchat, COUNT(l.id) as nbArticles
        FROM Achat a 
        JOIN LigneAchat l ON a.id = l.idAchat 
        WHERE a.dateAchat BETWEEN ? AND ?
        GROUP BY a.id
        ORDER BY a.dateAchat DESC
      `, [start, end]);

      const total = result.reduce((acc: number, curr: any) => acc + curr.totalAchat, 0);
      
      setPeriodPurchases(result);
      setPeriodTotal(total);
      setShowPeriodResults(true);
    } catch (e) { Alert.alert("Erreur", "Impossible d'analyser la période"); }
  };

  // 3. EXPORT PDF & PARTAGE
  const handleExportPDF = async () => {
    if (periodPurchases.length === 0) {
      Alert.alert("Info", "Veuillez d'abord lancer une analyse de période pour exporter.");
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
            <h1>Rapport E-tsena</h1>
            <div class="header">
              <p>Période du <b>${format(dateDebut, 'dd/MM/yyyy')}</b> au <b>${format(dateFin, 'dd/MM/yyyy')}</b></p>
            </div>
            <table>
              <tr>
                <th>Date</th>
                <th>Liste</th>
                <th>Articles</th>
                <th>Montant</th>
              </tr>
              ${periodPurchases.map((item: any) => `
                <tr>
                  <td>${format(new Date(item.dateAchat), 'dd/MM/yyyy')}</td>
                  <td>${item.nomListe}</td>
                  <td>${item.nbArticles}</td>
                  <td>${item.totalAchat.toLocaleString()} Ar</td>
                </tr>
              `).join('')}
            </table>
            <div class="total">Total Période: ${periodTotal.toLocaleString()} Ar</div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      Alert.alert("Erreur", "Impossible de générer le PDF");
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

      {/* --- HEADER COURBÉ --- */}
      <View style={s.headerContainer}>
        <LinearGradient 
          colors={activeTheme.gradient as any} 
          style={s.headerGradient}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <View style={s.headerContent}>
            <View>
               <Text style={s.headerTitle}>Rapports</Text>
               <Text style={s.headerSub}>Synthèse financière</Text>
            </View>
            <TouchableOpacity style={s.pdfBtn} onPress={handleExportPDF}>
               <Ionicons name="share-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      <Animated.ScrollView 
        contentContainerStyle={s.scrollContent} 
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        
        {/* --- 1. GRILLE STATS (OVERLAPPING) --- */}
        <View style={s.statsGrid}>
           {/* Carte Dépenses Totales */}
           <View style={[s.statCardLarge, s.shadow]}>
              <View style={[s.iconCircle, { backgroundColor: activeTheme.primary + '15' }]}>
                 <Ionicons name="wallet" size={28} color={activeTheme.primary} />
              </View>
              <View>
                 <Text style={s.cardLabel}>Total Dépensé</Text>
                 <Text style={[s.cardValueLarge, { color: activeTheme.primary }]}>{stats.total.toLocaleString()} Ar</Text>
              </View>
           </View>

           <View style={s.rowGap}>
              {/* Carte Panier Moyen */}
              <View style={[s.statCardSmall, s.shadow]}>
                 <View style={s.cardHeaderSmall}>
                    <Text style={s.cardLabel}>Panier Moyen</Text>
                    <Ionicons name="trending-up" size={16} color={activeTheme.primary} />
                 </View>
                 <Text style={s.cardValueSmall}>{stats.avgBasket.toLocaleString()}</Text>
                 <Text style={s.cardUnit}>Ar / course</Text>
              </View>

              {/* Carte Top Produit */}
              <View style={[s.statCardSmall, s.shadow]}>
                 <View style={s.cardHeaderSmall}>
                    <Text style={s.cardLabel}>Top Produit</Text>
                    <Ionicons name="ribbon" size={16} color="#F59E0B" />
                 </View>
                 <Text style={s.cardValueSmall} numberOfLines={1}>{stats.topProduct}</Text>
                 <Text style={s.cardUnit}>Le plus acheté</Text>
              </View>
           </View>
        </View>

        {/* --- 2. ACTIONS RAPIDES --- */}
        <View style={s.actionsRow}>
           <TouchableOpacity style={[s.actionBtn, s.shadow]} onPress={() => router.push('/analyse_produit')}>
              <LinearGradient colors={['#fff', '#f9fafb']} style={s.actionGradient}>
                 <Ionicons name="search" size={22} color={activeTheme.primary} />
                 <Text style={s.actionText}>Analyse Produit</Text>
              </LinearGradient>
           </TouchableOpacity>

           <TouchableOpacity style={[s.actionBtn, s.shadow]} onPress={() => router.push('/statistiques')}>
              <LinearGradient colors={['#fff', '#f9fafb']} style={s.actionGradient}>
                 <Ionicons name="bar-chart" size={22} color={activeTheme.primary} />
                 <Text style={s.actionText}>Graphiques</Text>
              </LinearGradient>
           </TouchableOpacity>
        </View>

        {/* --- 3. ANALYSE DE PÉRIODE --- */}
        <View style={[s.periodCard, s.shadow]}>
           <View style={[s.periodHeader, { backgroundColor: activeTheme.primary }]}>
              <Ionicons name="calendar" size={20} color="#fff" />
              <Text style={s.periodTitle}>Analyse de période</Text>
           </View>
           
           <View style={s.periodBody}>
              <Text style={s.periodDesc}>Sélectionnez deux dates pour voir les achats et générer un rapport PDF.</Text>
              
              <View style={s.dateRow}>
                 <TouchableOpacity onPress={() => setShowPickerStart(true)} style={s.dateInput}>
                    <Text style={s.dateLabel}>Du</Text>
                    <Text style={s.dateValue}>{format(dateDebut, 'dd/MM/yyyy')}</Text>
                 </TouchableOpacity>
                 <Ionicons name="arrow-forward" size={20} color="#ccc" />
                 <TouchableOpacity onPress={() => setShowPickerEnd(true)} style={s.dateInput}>
                    <Text style={s.dateLabel}>Au</Text>
                    <Text style={s.dateValue}>{format(dateFin, 'dd/MM/yyyy')}</Text>
                 </TouchableOpacity>
              </View>

              <TouchableOpacity style={[s.btnAnalyze, { backgroundColor: activeTheme.primary }]} onPress={handleAnalyzePeriod}>
                 <Text style={{ color: '#fff', fontWeight: 'bold' }}>Afficher les résultats</Text>
              </TouchableOpacity>

              {/* RÉSULTATS LISTE */}
              {showPeriodResults && (
                 <View style={s.resultsContainer}>
                    <View style={s.resultSummary}>
                       <Text style={s.resultSummaryLabel}>Total Période</Text>
                       <Text style={[s.resultSummaryValue, { color: activeTheme.primary }]}>{periodTotal.toLocaleString()} Ar</Text>
                    </View>

                    {periodPurchases.length === 0 ? (
                       <Text style={s.emptyText}>Aucun achat sur cette période.</Text>
                    ) : (
                       periodPurchases.map((item: any, index: number) => (
                          <View key={index} style={s.resultItem}>
                             <View>
                                <Text style={s.itemTitle}>{item.nomListe}</Text>
                                <Text style={s.itemDate}>{format(new Date(item.dateAchat), 'dd MMMM yyyy', { locale: fr })}</Text>
                             </View>
                             <View style={{ alignItems: 'flex-end' }}>
                                <Text style={s.itemPrice}>{item.totalAchat.toLocaleString()} Ar</Text>
                                <Text style={s.itemCount}>{item.nbArticles} articles</Text>
                             </View>
                          </View>
                       ))
                    )}
                    
                    {/* Bouton Export visible seulement si résultats */}
                    {periodPurchases.length > 0 && (
                        <TouchableOpacity style={[s.btnPdf, { borderColor: activeTheme.primary }]} onPress={handleExportPDF}>
                           <Ionicons name="document-text-outline" size={20} color={activeTheme.primary} />
                           <Text style={{ color: activeTheme.primary, fontWeight: '600' }}>Exporter en PDF</Text>
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
      <View style={s.navbar}>
         <TouchableOpacity style={s.navItem} onPress={() => router.push('/')}>
            <Ionicons name="home-outline" size={24} color="#9CA3AF" />
            <Text style={[s.navText, { color: "#9CA3AF" }]}>Accueil</Text>
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
            <Text style={[s.navText, { color: activeTheme.primary }]}>Rapports</Text>
         </TouchableOpacity>
      </View>
    </View>
  );
}

// 🎨 STYLES AVEC OVERLAPPING
const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  shadow: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },

  // HEADER COURBÉ
  headerContainer: { height: 180, borderBottomLeftRadius: 35, borderBottomRightRadius: 35, overflow: 'hidden' },
  headerGradient: { flex: 1, paddingHorizontal: 24, paddingTop: 50 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  pdfBtn: { padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },

  // SCROLL & OVERLAPPING
  scrollContent: { padding: 20, marginTop: -60 }, // 👈 Effet Overlapping ici (-60px)

  // GRILLE STATS
  statsGrid: { gap: 12, marginBottom: 20 },
  statCardLarge: { backgroundColor: '#fff', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 15 },
  iconCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  cardLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase' },
  cardValueLarge: { fontSize: 24, fontWeight: '800' },
  
  rowGap: { flexDirection: 'row', gap: 12 },
  statCardSmall: { flex: 1, backgroundColor: '#fff', borderRadius: 18, padding: 16 },
  cardHeaderSmall: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  cardValueSmall: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  cardUnit: { fontSize: 11, color: '#9CA3AF' },

  // ACTIONS
  actionsRow: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  actionBtn: { flex: 1, borderRadius: 18, backgroundColor: '#fff' },
  actionGradient: { padding: 16, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' },
  actionText: { fontWeight: '600', color: '#334155' },

  // PERIOD ANALYSE
  periodCard: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', marginBottom: 20 },
  periodHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 15 },
  periodTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  periodBody: { padding: 20 },
  periodDesc: { fontSize: 13, color: '#64748B', marginBottom: 15, lineHeight: 18 },
  
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  dateInput: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 10, width: '42%', alignItems: 'center' },
  dateLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },
  dateValue: { fontSize: 13, fontWeight: '600', color: '#334155', marginTop: 2 },

  btnAnalyze: { padding: 14, borderRadius: 12, alignItems: 'center', width: '100%' },

  // RÉSULTATS LISTE
  resultsContainer: { marginTop: 20, borderTopWidth: 1, borderColor: '#F1F5F9', paddingTop: 20 },
  resultSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  resultSummaryLabel: { fontWeight: 'bold', fontSize: 16 },
  resultSummaryValue: { fontWeight: 'bold', fontSize: 18 },
  
  resultItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  itemTitle: { fontWeight: '600', color: '#333' },
  itemDate: { fontSize: 11, color: '#888' },
  itemPrice: { fontWeight: '700', color: '#333' },
  itemCount: { fontSize: 11, color: '#888' },
  emptyText: { textAlign: 'center', color: '#999', fontStyle: 'italic', padding: 10 },
  
  btnPdf: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1.5, marginTop: 20 },

  // NAVBAR
  navbar: { flexDirection: 'row', height: 80, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee', justifyContent: 'space-around', paddingTop: 10, paddingHorizontal: 20, position: 'absolute', bottom: 0, width: '100%' },
  navItem: { alignItems: 'center' },
  navText: { fontSize: 10, fontWeight: '600', marginTop: 4 },
  fab: { width: 56, height: 56, borderRadius: 28, shadowOpacity: 0.3, elevation: 6 },
  fabGradient: { width: '100%', height: '100%', borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
});