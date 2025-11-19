import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Animated, Dimensions, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getDb } from '@db/init';
import { COLORS, SECTION_COLORS } from '@constants/colors';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ModernHeader, ModernCard, StatCard, ActionButton } from '../../src/components/ModernComponents';
import { fadeScaleIn } from '../../src/utils/animations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isSmallScreen = SCREEN_WIDTH < 360;

interface Statistique {
  totalDepenses: number;
  nombreAchats: number;
  produitLePlusAchete: string;
  meilleurJour: string;
}

interface Transaction {
  id: number;
  dateAchat: string;
  nomListe: string;
  produit: string;
  quantite: number;
  prixUnitaire: number;
  prixTotal: number;
}

interface Produit {
  id: number;
  libelle: string;
}

export default function Rapports() {
  const [stats, setStats] = useState<Statistique>({
    totalDepenses: 0,
    nombreAchats: 0,
    produitLePlusAchete: 'Aucun',
    meilleurJour: 'Aucun'
  });
  const [totalThisMonth, setTotalThisMonth] = useState(0);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [selectedProduit, setSelectedProduit] = useState<number | null>(null);
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [totalProduitAnalyse, setTotalProduitAnalyse] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showProduitPicker, setShowProduitPicker] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!loading) {
      fadeScaleIn(fadeAnim, scaleAnim, 300).start();
    }
  }, [loading]);

  const loadData = () => {
    try {
      setLoading(true);
      const db = getDb();

      // Total dépenses
      const totalResult = db.getAllSync(`
        SELECT COALESCE(SUM(la.quantite * la.prixUnitaire), 0) as totalDepenses 
        FROM LigneAchat la 
        WHERE la.quantite > 0 AND la.prixUnitaire > 0
      `);

      // Nombre d'achats
      const countResult = db.getAllSync(`
        SELECT COUNT(DISTINCT a.id) as nombreAchats 
        FROM Achat a 
        JOIN LigneAchat la ON a.id = la.idAchat 
        WHERE la.quantite > 0 AND la.prixUnitaire > 0
      `);

      // Produit le plus acheté
      const topProduct = db.getAllSync(`
        SELECT libelleProduit as libelle, SUM(quantite) as total_quantite 
        FROM LigneAchat 
        WHERE quantite > 0 AND prixUnitaire > 0 
        GROUP BY libelleProduit 
        ORDER BY total_quantite DESC 
        LIMIT 1
      `);

      // Meilleur jour
      const bestDay = db.getAllSync(`
        SELECT DATE(a.dateAchat) as jour, SUM(la.quantite * la.prixUnitaire) as total_jour 
        FROM Achat a 
        JOIN LigneAchat la ON a.id = la.idAchat 
        WHERE la.quantite > 0 AND la.prixUnitaire > 0 
        GROUP BY DATE(a.dateAchat) 
        ORDER BY total_jour DESC 
        LIMIT 1
      `);

      // Total mois en cours
      const monthResult = db.getAllSync(`
        SELECT COALESCE(SUM(la.quantite * la.prixUnitaire), 0) as totalThisMonth 
        FROM LigneAchat la 
        JOIN Achat a ON a.id = la.idAchat 
        WHERE la.quantite > 0 AND la.prixUnitaire > 0 
        AND strftime('%Y-%m', a.dateAchat) = strftime('%Y-%m', 'now')
      `);

      // Produits disponibles
      const productsResult = db.getAllSync(`
        SELECT DISTINCT libelleProduit as libelle 
        FROM LigneAchat 
        WHERE quantite > 0 AND prixUnitaire > 0 
        ORDER BY libelleProduit ASC
      `);

      setStats({
        totalDepenses: (totalResult[0] as any)?.totalDepenses || 0,
        nombreAchats: (countResult[0] as any)?.nombreAchats || 0,
        produitLePlusAchete: topProduct.length ? (topProduct[0] as any).libelle : 'Aucun',
        meilleurJour: bestDay.length ? format(new Date((bestDay[0] as any).jour), 'dd MMMM yyyy', { locale: fr }) : 'Aucun'
      });

      setTotalThisMonth((monthResult[0] as any)?.totalThisMonth || 0);
      setProduits(productsResult.map((p: any, i) => ({ id: i + 1, libelle: p.libelle })));
      setLoading(false);
    } catch (e) {
      console.error('Erreur:', e);
      Alert.alert('Erreur', 'Impossible de charger les données');
      setLoading(false);
    }
  };

  const handleAnalyze = () => {
    if (!selectedProduit || !dateDebut || !dateFin) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    try {
      setAnalyzing(true);
      const db = getDb();
      const produitLibelle = produits.find(p => p.id === selectedProduit)?.libelle;

      if (!produitLibelle) return;

      const result = db.getAllSync(`
        SELECT la.id, a.dateAchat, a.nomListe, la.libelleProduit as produit, 
               la.quantite, la.prixUnitaire, la.prixTotal 
        FROM Achat a 
        JOIN LigneAchat la ON a.id = la.idAchat 
        WHERE la.libelleProduit = ? 
        AND DATE(a.dateAchat) BETWEEN DATE(?) AND DATE(?) 
        AND la.quantite > 0 AND la.prixUnitaire > 0 
        ORDER BY a.dateAchat DESC
      `, [produitLibelle, dateDebut, dateFin]) as Transaction[];

      setTransactions(result);
      setTotalProduitAnalyse(result.reduce((sum, t) => sum + t.prixTotal, 0));
      setShowAnalysis(true);
    } catch (e) {
      console.error('Erreur:', e);
      Alert.alert('Erreur', 'Impossible d\'analyser');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="analytics" size={60} color={COLORS.coral} />
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
      <ModernHeader
        title="Rapports"
        subtitle="Vue d'ensemble financière"
        gradient={[COLORS.primary, COLORS.primaryLight]}
        rightButton={{
          icon: 'stats-chart',
          onPress: () => router.push('/statistiques')
        }}
        settingsButton={{
          icon: 'settings-outline',
          onPress: () => Alert.alert('Paramètres', 'Thème, Mode sombre/clair, etc.')
        }}
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Cards Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Total dépenses"
            value={`${stats.totalDepenses.toLocaleString()} Ar`}
            icon="wallet"
            color={COLORS.primary}
            style={styles.statCardItem}
          />
          <StatCard
            label="Achats"
            value={stats.nombreAchats}
            icon="cart"
            color={COLORS.secondary}
            style={styles.statCardItem}
          />
          <StatCard
            label="Ce mois"
            value={`${totalThisMonth.toLocaleString()} Ar`}
            icon="calendar"
            color={COLORS.accent}
            style={styles.statCardItem}
          />
          <StatCard
            label="Produit le plus acheté"
            value={stats.produitLePlusAchete}
            icon="trophy"
            color={COLORS.accentGreen}
            style={styles.statCardItem}
          />
        </View>

        {/* Quick Actions */}
        <ModernCard style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Actions rapides</Text>
          <View style={styles.actionsGrid}>
            <ActionButton
              label="Voir statistiques"
              icon="stats-chart"
              color="cyan"
              onPress={() => router.push('/statistiques')}
              small
              style={styles.actionButton}
            />
            <ActionButton
              label="Analyser produit"
              icon="search"
              color="coral"
              onPress={() => setShowAnalysis(!showAnalysis)}
              small
              style={styles.actionButton}
            />
          </View>
        </ModernCard>

        {/* Analyse Section */}
        {showAnalysis && (
          <ModernCard style={styles.analyseCard}>
            <Text style={styles.sectionTitle}>Analyse de produit</Text>
            
            {/* Product Picker */}
            <TouchableOpacity
              style={styles.inputField}
              onPress={() => setShowProduitPicker(true)}
            >
              <Text style={[styles.inputText, !selectedProduit && styles.placeholder]}>
                {selectedProduit 
                  ? produits.find(p => p.id === selectedProduit)?.libelle 
                  : 'Sélectionner un produit'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={COLORS.textLight} />
            </TouchableOpacity>

            {/* Date Range */}
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>Du</Text>
                <TextInput
                  style={styles.dateInput}
                  value={dateDebut}
                  onChangeText={setDateDebut}
                  placeholder="AAAA-MM-JJ"
                  placeholderTextColor={COLORS.placeholder}
                />
              </View>
              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>Au</Text>
                <TextInput
                  style={styles.dateInput}
                  value={dateFin}
                  onChangeText={setDateFin}
                  placeholder="AAAA-MM-JJ"
                  placeholderTextColor={COLORS.placeholder}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.analyzeButton, analyzing && styles.analyzeButtonDisabled]}
              onPress={handleAnalyze}
              disabled={analyzing}
            >
              <Ionicons name="analytics" size={20} color="white" />
              <Text style={styles.analyzeButtonText}>
                {analyzing ? 'Analyse en cours...' : 'Analyser'}
              </Text>
            </TouchableOpacity>

            {/* Résultats avec liste des produits */}
            {transactions.length > 0 && (
              <View style={styles.resultsSection}>
                <View style={styles.resultsHeader}>
                  <Text style={styles.resultsTitle}>Résultats ({transactions.length} produits)</Text>
                  <Text style={styles.resultsTotal}>
                    {totalProduitAnalyse.toLocaleString()} Ar
                  </Text>
                </View>
                {transactions.map((t) => (
                  <View key={t.id} style={styles.transactionCard}>
                    <View style={styles.transactionLeft}>
                      <Text style={styles.transactionDate}>
                        {format(new Date(t.dateAchat), 'dd MMM yyyy')}
                      </Text>
                      <Text style={styles.transactionList}>{t.nomListe}</Text>
                    </View>
                    <View style={styles.transactionRight}>
                      <Text style={styles.transactionQty}>{t.quantite} × {t.prixUnitaire} Ar</Text>
                      <Text style={styles.transactionTotal}>{t.prixTotal.toLocaleString()} Ar</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ModernCard>
        )}

        {/* Best Day Info */}
        <ModernCard style={styles.bestDayCard}>
          <View style={styles.bestDayHeader}>
            <View style={styles.bestDayIcon}>
              <Ionicons name="star" size={24} color={COLORS.iconYellow} />
            </View>
            <View style={styles.bestDayInfo}>
              <Text style={styles.bestDayLabel}>Meilleur jour d'achat</Text>
              <Text style={styles.bestDayValue}>{stats.meilleurJour}</Text>
            </View>
          </View>
        </ModernCard>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Product Picker Modal */}
      <Modal
        visible={showProduitPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProduitPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner un produit</Text>
              <TouchableOpacity onPress={() => setShowProduitPicker(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {produits.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.modalItem,
                    selectedProduit === p.id && styles.modalItemSelected
                  ]}
                  onPress={() => {
                    setSelectedProduit(p.id);
                    setShowProduitPicker(false);
                  }}
                >
                  <Text style={[
                    styles.modalItemText,
                    selectedProduit === p.id && styles.modalItemTextSelected
                  ]}>
                    {p.libelle}
                  </Text>
                  {selectedProduit === p.id && (
                    <Ionicons name="checkmark" size={20} color={COLORS.coral} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/')}
        >
          <Ionicons name="home-outline" size={24} color={COLORS.textLight} />
          <Text style={styles.navLabel}>Accueil</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.navItem, styles.navItemActive]}>
          <Ionicons name="wallet" size={24} color={COLORS.primary} />
          <Text style={[styles.navLabel, styles.navLabelActive]}>Rapports</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/statistiques')}
        >
          <Ionicons name="stats-chart-outline" size={24} color={COLORS.textLight} />
          <Text style={styles.navLabel}>Stats</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="person-outline" size={24} color={COLORS.textLight} />
          <Text style={styles.navLabel}>Profil</Text>
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
  },
  
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isSmallScreen ? 10 : 12,
    marginBottom: 20,
  },
  statCardItem: {
    width: isSmallScreen ? '48%' : '48%',
  },
  
  // Actions Card
  actionsCard: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  
  // Analyse Card
  analyseCard: {
    marginBottom: 20,
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputText: {
    fontSize: 15,
    color: COLORS.text,
  },
  placeholder: {
    color: COLORS.placeholder,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  dateField: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 6,
  },
  dateInput: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 14,
    color: COLORS.text,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  analyzeButtonDisabled: {
    opacity: 0.6,
  },
  analyzeButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  
  // Results
  resultsSection: {
    marginTop: 20,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  resultsTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.coral,
  },
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  transactionLeft: {
    flex: 1,
  },
  transactionDate: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  transactionList: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionQty: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  transactionTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  
  // Best Day Card
  bestDayCard: {
    marginBottom: 20,
  },
  bestDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  bestDayIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.iconYellow + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bestDayInfo: {
    flex: 1,
  },
  bestDayLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textLight,
    marginBottom: 4,
  },
  bestDayValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  modalItemSelected: {
    backgroundColor: COLORS.coral + '10',
  },
  modalItemText: {
    fontSize: 15,
    color: COLORS.text,
  },
  modalItemTextSelected: {
    fontWeight: '600',
    color: COLORS.coral,
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
    backgroundColor: COLORS.coral + '15',
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textLight,
    marginTop: 4,
  },
  navLabelActive: {
    color: COLORS.coral,
    fontWeight: '700',
  },
});
