import { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal, StatusBar, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import DateTimePicker from '@react-native-community/datetimepicker';

// 👇 Importations Thème
import { getDb } from '../src/db/init';
import { useTheme } from './context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const { activeTheme } = useTheme();
  const s = getStyles(activeTheme);

  const [produits, setProduits] = useState<Produit[]>([]);
  const [selectedProduit, setSelectedProduit] = useState<number | null>(null);
  const [dateDebut, setDateDebut] = useState(new Date());
  const [dateFin, setDateFin] = useState(new Date());
  
  const [showDateDebutPicker, setShowDateDebutPicker] = useState(false);
  const [showDateFinPicker, setShowDateFinPicker] = useState(false);
  const [showProduitPicker, setShowProduitPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false); // 🍔 Menu Hamburger

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalProduitAnalyse, setTotalProduitAnalyse] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProduits();
  }, []);

  const loadProduits = () => {
    try {
      const db = getDb();
      // Récupère tous les produits distincts de la table LigneAchat
      const result = db.getAllSync(`
        SELECT DISTINCT libelleProduit as libelle 
        FROM LigneAchat 
        WHERE libelleProduit IS NOT NULL AND libelleProduit != ''
        ORDER BY libelleProduit ASC
      `);
      setProduits(result.map((p: any, i) => ({ id: i + 1, libelle: p.libelle })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = () => {
    if (!selectedProduit) {
      Alert.alert('Erreur', 'Veuillez sélectionner un produit');
      return;
    }

    try {
      setAnalyzing(true);
      const db = getDb();
      const produitLibelle = produits.find(p => p.id === selectedProduit)?.libelle;

      // Format YYYY-MM-DD pour SQLite
      const startStr = dateDebut.toISOString();
      const endStr = dateFin.toISOString();

      const result = db.getAllSync(`
        SELECT la.id, a.dateAchat, a.nomListe, la.libelleProduit as produit, 
               la.quantite, la.prixUnitaire, la.prixTotal, la.unite
        FROM Achat a 
        JOIN LigneAchat la ON a.id = la.idAchat 
        WHERE la.libelleProduit = ? 
        AND a.dateAchat BETWEEN ? AND ?
        ORDER BY a.dateAchat DESC
      `, [produitLibelle, startStr, endStr]) as Transaction[];

      setTransactions(result);
      setTotalProduitAnalyse(result.reduce((sum, t) => sum + t.prixTotal, 0));
      setShowResults(true);
    } catch (e) {
      Alert.alert('Erreur', "Impossible d'analyser");
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) return <View style={s.center}><Text>Chargement...</Text></View>;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* --- HEADER --- */}
      <LinearGradient colors={activeTheme.gradient as any} style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
             <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View>
             <Text style={s.headerTitle}>Analyse Produit</Text>
             <Text style={s.headerSubtitle}>Historique des prix</Text>
          </View>
          {/* MENU HAMBURGER POUR NAVIGATION STATS */}
          <TouchableOpacity style={s.backBtn} onPress={() => setShowMenu(true)}>
             <Ionicons name="menu" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 1. SÉLECTION PRODUIT */}
        <View style={s.card}>
          <Text style={s.label}>Produit à analyser</Text>
          <TouchableOpacity style={s.selectBox} onPress={() => setShowProduitPicker(true)}>
            <Text style={[s.selectText, !selectedProduit && { color: '#9CA3AF' }]}>
              {selectedProduit 
                ? produits.find(p => p.id === selectedProduit)?.libelle 
                : 'Choisir un produit...'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={activeTheme.primary} />
          </TouchableOpacity>
        </View>

        {/* 2. SÉLECTION PÉRIODE */}
        <View style={s.card}>
          <Text style={s.label}>Période</Text>
          <View style={s.dateRow}>
             <View style={{ flex: 1 }}>
                <Text style={s.subLabel}>Du</Text>
                <TouchableOpacity style={s.dateBtn} onPress={() => setShowDateDebutPicker(true)}>
                   <Ionicons name="calendar-outline" size={18} color={activeTheme.primary} />
                   <Text style={s.dateText}>{format(dateDebut, 'dd/MM/yyyy')}</Text>
                </TouchableOpacity>
             </View>
             <View style={{ flex: 1 }}>
                <Text style={s.subLabel}>Au</Text>
                <TouchableOpacity style={s.dateBtn} onPress={() => setShowDateFinPicker(true)}>
                   <Ionicons name="calendar-outline" size={18} color={activeTheme.primary} />
                   <Text style={s.dateText}>{format(dateFin, 'dd/MM/yyyy')}</Text>
                </TouchableOpacity>
             </View>
          </View>
        </View>

        {/* BOUTON ACTION */}
        <TouchableOpacity 
           onPress={handleAnalyze}
           disabled={analyzing}
           style={[s.btnPrimary, { backgroundColor: activeTheme.primary, opacity: analyzing ? 0.7 : 1 }]}
        >
           <Ionicons name="search" size={20} color="#fff" />
           <Text style={s.btnText}>{analyzing ? 'Analyse...' : 'Lancer l\'analyse'}</Text>
        </TouchableOpacity>

        {/* RÉSULTATS */}
        {showResults && (
           <View style={s.resultsContainer}>
              <View style={s.resultHeader}>
                 <Text style={s.resultTitle}>Résultats ({transactions.length})</Text>
                 <Text style={[s.resultTotal, { color: activeTheme.primary }]}>{totalProduitAnalyse.toLocaleString()} Ar</Text>
              </View>

              {transactions.length === 0 ? (
                 <View style={s.emptyBox}>
                    <Ionicons name="document-text-outline" size={40} color="#ccc" />
                    <Text style={{ color: '#999', marginTop: 10 }}>Aucun achat trouvé.</Text>
                 </View>
              ) : (
                 transactions.map((t) => (
                    <View key={t.id} style={s.transactionItem}>
                       <View style={{ flex: 1 }}>
                          <Text style={s.transDate}>{format(new Date(t.dateAchat), 'dd MMM yyyy', { locale: fr })}</Text>
                          <Text style={s.transList}>{t.nomListe}</Text>
                       </View>
                       <View style={{ alignItems: 'flex-end' }}>
                          <Text style={s.transPrice}>{t.prixTotal.toLocaleString()} Ar</Text>
                          <Text style={s.transDetail}>{t.quantite} {t.unite} x {t.prixUnitaire}</Text>
                       </View>
                    </View>
                 ))
              )}
           </View>
        )}

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
                  <Text style={s.modalTitle}>Sélectionner un produit</Text>
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
               <Text style={s.menuTitle}>Navigation</Text>
               <TouchableOpacity style={s.menuItem} onPress={() => { setShowMenu(false); router.push('/statistiques'); }}>
                  <Ionicons name="stats-chart" size={22} color={activeTheme.primary} />
                  <Text style={s.menuText}>Voir les Statistiques Globales</Text>
               </TouchableOpacity>
               <TouchableOpacity style={s.menuItem} onPress={() => { setShowMenu(false); router.push('/rapports'); }}>
                  <Ionicons name="pie-chart" size={22} color={activeTheme.primary} />
                  <Text style={s.menuText}>Retour aux Rapports</Text>
               </TouchableOpacity>
               <TouchableOpacity style={s.menuItem} onPress={() => { setShowMenu(false); router.push('/'); }}>
                  <Ionicons name="home" size={22} color={activeTheme.primary} />
                  <Text style={s.menuText}>Retour à l'Accueil</Text>
               </TouchableOpacity>
            </View>
         </TouchableOpacity>
      </Modal>

    </View>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // HEADER
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },

  scrollContent: { padding: 20 },

  // CARDS
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 15, elevation: 2 },
  label: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 10 },
  subLabel: { fontSize: 11, color: '#6B7280', marginBottom: 5 },

  selectBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', padding: 14, borderRadius: 12, backgroundColor: '#F9FAFB' },
  selectText: { fontSize: 15, color: '#1F2937' },

  dateRow: { flexDirection: 'row', gap: 15 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#E5E7EB', padding: 12, borderRadius: 10 },
  dateText: { fontWeight: '500' },

  btnPrimary: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, padding: 16, borderRadius: 14, marginTop: 10, elevation: 4 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  // RESULTS
  resultsContainer: { marginTop: 25, backgroundColor: '#fff', borderRadius: 16, padding: 15, elevation: 2 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, borderBottomWidth: 1, borderColor: '#eee', paddingBottom: 10 },
  resultTitle: { fontWeight: 'bold', fontSize: 16 },
  resultTotal: { fontWeight: 'bold', fontSize: 18 },
  
  transactionItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  transDate: { fontSize: 14, fontWeight: '600', color: '#374151' },
  transList: { fontSize: 12, color: '#6B7280' },
  transPrice: { fontSize: 14, fontWeight: '700', color: '#111' },
  transDetail: { fontSize: 11, color: '#6B7280' },

  emptyBox: { alignItems: 'center', padding: 30 },

  // MODAL
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 20, maxHeight: '60%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderColor: '#eee', paddingBottom: 10 },
  modalTitle: { fontWeight: 'bold', fontSize: 18 },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  itemText: { fontSize: 16 },

  // MENU HAMBURGER
  menuBox: { backgroundColor: '#fff', padding: 20, borderRadius: 20, position: 'absolute', top: 100, right: 20, width: 250, elevation: 10 },
  menuTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  menuText: { fontSize: 14, fontWeight: '500', color: '#333' }
});