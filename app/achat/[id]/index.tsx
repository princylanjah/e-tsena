import { useEffect, useMemo, useCallback, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  Animated,
  Dimensions
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getDb } from '@db/init';
import { COLORS, SECTION_COLORS, ANIMATIONS } from '@constants/colors';
import { fadeIn, slideInFromBottom, fadeScaleIn } from '../../../src/utils/animations';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type LigneAchat = {
  id?: number;
  libelleProduit: string;
  quantite: number;
  prixUnitaire: number;
  prixTotal: number;
  unite?: string;
  isNew?: boolean;
  isChecked?: boolean;
};

type AchatRecord = {
  id: number;
  nomListe: string;
  dateAchat: string;
  montantTotal: number;
};

type Produit = {
  id: number;
  libelle: string;
  unite: string;
};

const UNITS = ['pcs', 'kg', 'L', 'g', 'ml', 'boite', 'sac', 'paquet'];

export default function AchatDetails() {
  const params = useLocalSearchParams<{ id?: string }>();
  const achatId = Number(params.id);
  const [achat, setAchat] = useState<AchatRecord | null>(null);
  const [lignes, setLignes] = useState<LigneAchat[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // États pour l'édition
  const [editingTitre, setEditingTitre] = useState(false);
  const [titreListe, setTitreListe] = useState('');
  const [nouveauProduit, setNouveauProduit] = useState('');
  
  
  // États pour le modal de modification
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLigne, setEditingLigne] = useState<LigneAchat | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [modalData, setModalData] = useState({
    libelleProduit: '',
    quantite: '',
    prixUnitaire: '',
    unite: 'pcs'
  });

  // États pour le modal d'ajout rapide
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [quickModalIndex, setQuickModalIndex] = useState<number | null>(null);
  const [quickQuantite, setQuickQuantite] = useState('');
  const [quickPrixUnitaire, setQuickPrixUnitaire] = useState('');
  const [quickUnite, setQuickUnite] = useState('pcs');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const modalSlideAnim = useRef(new Animated.Value(300)).current;
  const modalFadeAnim = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(() => {
    if (!achatId || Number.isNaN(achatId)) {
      setError('Identifiant d\'achat invalide');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const db = getDb();
      
      // Charger l'achat
      const achatResult = db.getAllSync(
        `SELECT id, nomListe, dateAchat, montantTotal FROM Achat WHERE id = ?`,
        [achatId]
      ) as AchatRecord[];

      if (!achatResult.length) {
        setError('Achat introuvable');
        setLoading(false);
        return;
      }

      setAchat(achatResult[0]);
      setTitreListe(achatResult[0].nomListe);

      // Charger les lignes d'achat
      const lignesResult = db.getAllSync(
        `SELECT id, libelleProduit, quantite, prixUnitaire, prixTotal, unite
         FROM LigneAchat
         WHERE idAchat = ?
         ORDER BY id DESC`,
        [achatId]
      ) as LigneAchat[];

      const lignesWithCheck = lignesResult.map(l => ({
        ...l,
        isChecked: l.quantite > 0 && l.prixUnitaire > 0
      }));

      setLignes(lignesWithCheck);
      
      const produitsResult = db.getAllSync(
        `SELECT id, libelle, unite FROM Produit ORDER BY libelle ASC`
      ) as Produit[];
      
      setProduits(produitsResult);
      
      setError(null);
    } catch (e) {
      console.error('Erreur chargement achat:', e);
      setError('Impossible de charger les détails de cet achat');
    } finally {
      setLoading(false);
    }
  }, [achatId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!loading && achat) {
      fadeScaleIn(fadeAnim, scaleAnim, ANIMATIONS.duration.normal).start();
    }
  }, [loading, achat]);

  useEffect(() => {
    if (showEditModal || showQuickModal) {
      Animated.parallel([
        fadeIn(modalFadeAnim, ANIMATIONS.duration.normal),
        slideInFromBottom(modalSlideAnim, ANIMATIONS.duration.normal),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(modalFadeAnim, {
          toValue: 0,
          duration: ANIMATIONS.duration.fast,
          useNativeDriver: true,
        }),
        Animated.timing(modalSlideAnim, {
          toValue: 300,
          duration: ANIMATIONS.duration.fast,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showEditModal, showQuickModal]);

  // Fonction pour ouvrir le modal d'édition
  const handleEditLigne = useCallback((index: number) => {
    const ligne = lignes[index];
    setEditingLigne(ligne);
    setEditingIndex(index);
    setModalData({
      libelleProduit: ligne.libelleProduit,
      quantite: ligne.quantite.toString(),
      prixUnitaire: ligne.prixUnitaire.toString(),
      unite: ligne.unite || 'pcs'
    });
    setShowEditModal(true);
  }, [lignes]);

  // Fonction pour sauvegarder les modifications depuis le modal
  const handleSaveEdit = useCallback(async () => {
    if (editingIndex === null || !editingLigne) return;
    
    const quantite = parseFloat(modalData.quantite) || 0;
    const prixUnitaire = parseFloat(modalData.prixUnitaire) || 0;
    const libelleProduit = modalData.libelleProduit.trim();
    
    if (!libelleProduit) {
      Alert.alert('Erreur', 'Le nom du produit ne peut pas être vide');
      return;
    }
    
    if (quantite <= 0) {
      Alert.alert('Erreur', 'La quantité doit être supérieure à 0');
      return;
    }
    
    if (prixUnitaire < 0) {
      Alert.alert('Erreur', 'Le prix unitaire ne peut pas être négatif');
      return;
    }

    try {
      const db = getDb();
      const prixTotal = quantite * prixUnitaire;
      
      if (editingLigne.id) {
        // Mettre à jour la ligne existante
        db.runSync(
          'UPDATE LigneAchat SET libelleProduit = ?, quantite = ?, prixUnitaire = ?, prixTotal = ?, unite = ? WHERE id = ?',
          [libelleProduit, quantite, prixUnitaire, prixTotal, modalData.unite, editingLigne.id]
        );
      } else {
        // Créer une nouvelle ligne en DB
        const result = db.runSync(
          'INSERT INTO LigneAchat (idAchat, libelleProduit, quantite, prixUnitaire, prixTotal, unite) VALUES (?, ?, ?, ?, ?, ?)',
          [achatId, libelleProduit, quantite, prixUnitaire, prixTotal, modalData.unite]
        );
        
        editingLigne.id = result.lastInsertRowId as number;
      }
      
      // Mettre à jour l'état
      const newLignes = [...lignes];
      newLignes[editingIndex] = {
        ...editingLigne,
        libelleProduit,
        quantite,
        prixUnitaire,
        prixTotal,
        unite: modalData.unite,
        isChecked: true,
        isNew: false
      };
      setLignes(newLignes);
      
      // Fermer le modal
      setShowEditModal(false);
      setEditingLigne(null);
      setEditingIndex(null);
      
    } catch (error) {
      console.error('Erreur sauvegarde ligne:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder les modifications');
    }
  }, [editingIndex, editingLigne, modalData, lignes, achatId]);

  // Fonction pour le modal d'ajout rapide (checkbox)
  const handleToggleCheckbox = useCallback((index: number) => {
    const ligne = lignes[index];
    
    if (!ligne.isChecked) {
      setQuickModalIndex(index);
      setQuickQuantite(ligne.quantite > 0 ? ligne.quantite.toString() : '1');
      setQuickPrixUnitaire(ligne.prixUnitaire > 0 ? ligne.prixUnitaire.toString() : '0');
      setQuickUnite(ligne.unite || 'pcs');
      setShowQuickModal(true);
    } else {
      // Décocher
      const newLignes = [...lignes];
      newLignes[index] = {
        ...ligne,
        quantite: 0,
        prixUnitaire: 0,
        prixTotal: 0,
        isChecked: false
      };
      setLignes(newLignes);
      
      if (ligne.id) {
        try {
          const db = getDb();
          db.runSync(
            'UPDATE LigneAchat SET quantite = 0, prixUnitaire = 0, prixTotal = 0 WHERE id = ?',
            [ligne.id]
          );
        } catch (error) {
          console.error('Erreur mise à jour:', error);
        }
      }
    }
  }, [lignes]);

  // Validation du modal rapide
  const handleValidateQuickModal = useCallback(async () => {
    if (quickModalIndex === null) return;
    
    const quantite = parseFloat(quickQuantite) || 0;
    const prixUnitaire = parseFloat(quickPrixUnitaire) || 0;
    
    if (quantite <= 0) {
      Alert.alert('Erreur', 'La quantité doit être supérieure à 0');
      return;
    }
    
    if (prixUnitaire < 0) {
      Alert.alert('Erreur', 'Le prix unitaire ne peut pas être négatif');
      return;
    }
    
    try {
      const db = getDb();
      const prixTotal = quantite * prixUnitaire;
      const ligne = lignes[quickModalIndex];
      
      if (ligne.id) {
        db.runSync(
          'UPDATE LigneAchat SET quantite = ?, prixUnitaire = ?, prixTotal = ?, unite = ? WHERE id = ?',
          [quantite, prixUnitaire, prixTotal, quickUnite, ligne.id]
        );
      } else {
        const result = db.runSync(
          'INSERT INTO LigneAchat (idAchat, libelleProduit, quantite, prixUnitaire, prixTotal, unite) VALUES (?, ?, ?, ?, ?, ?)',
          [achatId, ligne.libelleProduit, quantite, prixUnitaire, prixTotal, quickUnite]
        );
        
        ligne.id = result.lastInsertRowId as number;
      }
      
      const newLignes = [...lignes];
      newLignes[quickModalIndex] = {
        ...ligne,
        quantite,
        prixUnitaire,
        prixTotal,
        unite: quickUnite,
        isChecked: true,
        isNew: false
      };
      setLignes(newLignes);
      
      setShowQuickModal(false);
      setQuickModalIndex(null);
      
    } catch (error) {
      console.error('Erreur sauvegarde ligne:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le produit');
    }
  }, [quickModalIndex, quickQuantite, quickPrixUnitaire, quickUnite, lignes, achatId]);

  // Fonction pour sauvegarder le titre
  const handleSaveTitre = useCallback(async () => {
    if (!titreListe.trim()) {
      Alert.alert('Erreur', 'Le titre ne peut pas être vide');
      setTitreListe(achat?.nomListe || '');
      setEditingTitre(false);
      return;
    }

    try {
      const db = getDb();
      db.runSync('UPDATE Achat SET nomListe = ? WHERE id = ?', [titreListe, achatId]);
      
      if (achat) {
        setAchat({ ...achat, nomListe: titreListe });
      }
      
      setEditingTitre(false);
    } catch (error) {
      console.error('Erreur mise à jour titre:', error);
      Alert.alert('Erreur', 'Impossible de modifier le titre');
      setTitreListe(achat?.nomListe || '');
    }
  }, [titreListe, achat, achatId]);

  // Fonction pour ajouter un produit
  const handleAddProduct = useCallback(() => {
    if (!nouveauProduit.trim()) return;
    
    const existingIndex = lignes.findIndex(l => 
      l.libelleProduit.toLowerCase() === nouveauProduit.trim().toLowerCase()
    );
    
    if (existingIndex >= 0) {
      Alert.alert('Information', 'Ce produit est déjà dans la liste');
      setNouveauProduit('');
      return;
    }
    
    const libelle = nouveauProduit.trim();

    try {
      const db = getDb();
      // Persister immédiatement la nouvelle ligne pour qu'elle survive au rechargement
      const result = db.runSync(
        'INSERT INTO LigneAchat (idAchat, libelleProduit, quantite, prixUnitaire, prixTotal, unite) VALUES (?, ?, ?, ?, ?, ?)',
        [achatId, libelle, 0, 0, 0, 'pcs']
      );

      const newLigne: LigneAchat = {
        id: result.lastInsertRowId as number,
        libelleProduit: libelle,
        quantite: 0,
        prixUnitaire: 0,
        prixTotal: 0,
        unite: 'pcs',
        isNew: false,
        isChecked: false
      };

      setLignes(prev => [...prev, newLigne]);
      setNouveauProduit('');
      
    } catch (err) {
      console.error('Erreur ajout produit:', err);
      Alert.alert('Erreur', 'Impossible d\u2019ajouter le produit');
    }
  }, [nouveauProduit, lignes, achatId]);

  // Fonction pour supprimer une ligne
  const handleDeleteLigne = useCallback((index: number) => {
    const ligne = lignes[index];
    
    Alert.alert(
      'Confirmation',
      `Supprimer "${ligne.libelleProduit}" de la liste ?`,
      [
        { text: 'Annuler' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              if (ligne.id) {
                const db = getDb();
                db.runSync('DELETE FROM LigneAchat WHERE id = ?', [ligne.id]);
              }
              
              setLignes(prev => prev.filter((_, i) => i !== index));
            } catch (error) {
              console.error('Erreur suppression ligne:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le produit');
            }
          }
        }
      ]
    );
  }, [lignes]);

  const totalDepense = useMemo(
    () => lignes.filter(l => l.isChecked).reduce((sum, ligne) => sum + ligne.prixTotal, 0),
    [lignes]
  );

  if (!achatId || Number.isNaN(achatId)) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="warning" size={48} color={COLORS.error} />
        <Text style={styles.errorTitle}>Achat introuvable</Text>
        <Text style={styles.errorText}>Identifiant fourni invalide.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={SECTION_COLORS.achats.primary} />
        <Text style={styles.loadingText}>Chargement des détails...</Text>
      </View>
    );
  }

  if (error || !achat) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="warning" size={48} color={COLORS.error} />
        <Text style={styles.errorTitle}>Oups...</Text>
        <Text style={styles.errorText}>{error || 'Impossible de charger cet achat'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const lignesChecked = lignes.filter(l => l.isChecked);
  const lignesUnchecked = lignes.filter(l => !l.isChecked);

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }
      ]}
    >
      <LinearGradient
        colors={SECTION_COLORS.achats.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          {editingTitre ? (
            <View style={styles.titleEditContainer}>
              <TextInput
                style={styles.titleInput}
                value={titreListe}
                onChangeText={setTitreListe}
                placeholder="Nom de la liste"
                autoFocus
                onBlur={handleSaveTitre}
                onSubmitEditing={handleSaveTitre}
              />
              <TouchableOpacity onPress={handleSaveTitre}>
                <Ionicons name="checkmark" size={20} color="white" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditingTitre(true)}>
              <Text style={styles.headerTitle}>{titreListe}</Text>
              <Text style={styles.headerSubtitle}>
                {format(new Date(achat.dateAchat), 'EEEE dd MMMM yyyy', { locale: fr })}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={() => router.push('/rapports')}
        >
          <Ionicons name="bar-chart" size={20} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Zone d'ajout de produit améliorée */}
      <View style={styles.addProductContainer}>
        <View style={styles.addProductInputContainer}>
          <Ionicons name="add-circle-outline" size={20} color={SECTION_COLORS.achats.primary} />
          <TextInput
            style={styles.productInput}
            value={nouveauProduit}
            onChangeText={setNouveauProduit}
            placeholder="Ajouter un article à la liste..."
            onSubmitEditing={handleAddProduct}
            placeholderTextColor={COLORS.textLight}
          />
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddProduct}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* CARTES DES PRODUITS COCHÉS - REMPLACE LE TABLEAU */}
        {lignesChecked.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Détail des achats</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{lignesChecked.length} articles</Text>
              </View>
            </View>

            {lignesChecked.map((ligne, index) => {
              const realIndex = lignes.findIndex(l => (
                (l.id != null && ligne.id != null) ? l.id === ligne.id : l.libelleProduit === ligne.libelleProduit
              ));
              return (
                <View key={ligne.id || realIndex} style={styles.productCard}>
                  {/* Header de la carte */}
                  <View style={styles.cardHeader}>
                    <View style={styles.productInfo}>
                      <Text style={styles.productName} numberOfLines={1}>
                        {ligne.libelleProduit}
                      </Text>
                      <View style={styles.quantityBadge}>
                        <Text style={styles.quantityText}>
                          {ligne.quantite} {ligne.unite || 'pcs'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        onPress={() => handleEditLigne(realIndex)}
                        style={styles.cardActionButton}
                      >
                        <Ionicons name="pencil" size={16} color={SECTION_COLORS.achats.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteLigne(realIndex)}
                        style={[styles.cardActionButton, styles.deleteAction]}
                      >
                        <Ionicons name="trash" size={16} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Corps de la carte */}
                  <View style={styles.cardBody}>
                    <View style={styles.priceRow}>
                      <View style={styles.priceItem}>
                        <Text style={styles.priceLabel}>Prix unitaire</Text>
                        <Text style={styles.priceValue}>{ligne.prixUnitaire.toLocaleString()} Ar</Text>
                      </View>
                      <View style={styles.totalItem}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>{ligne.prixTotal.toLocaleString()} Ar</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* Liste des articles non cochés */}
        {lignesUnchecked.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Liste des articles</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{lignesUnchecked.length} en attente</Text>
              </View>
            </View>

            {lignesUnchecked.map((ligne, index) => {
              const realIndex = lignes.findIndex(l => (
                (l.id != null && ligne.id != null) ? l.id === ligne.id : l.libelleProduit === ligne.libelleProduit
              ));
              return (
                <View key={realIndex} style={styles.produitItem}>
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => handleToggleCheckbox(realIndex)}
                  >
                    <View style={[styles.checkbox, ligne.isChecked && styles.checkboxChecked]}>
                      {ligne.isChecked && <Ionicons name="checkmark" size={16} color="white" />}
                    </View>
                  </TouchableOpacity>
                  <Text style={styles.produitName}>{ligne.libelleProduit}</Text>
                  <TouchableOpacity
                    onPress={() => handleDeleteLigne(realIndex)}
                    style={styles.deleteProductButton}
                  >
                    <Ionicons name="close" size={16} color={COLORS.textLight} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}

        {/* Carte de résumé avec design moderne */}
        {lignesChecked.length > 0 && (
          <LinearGradient
            colors={SECTION_COLORS.achats.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCard}
          >
            <View style={styles.summaryHeader}>
              <Ionicons name="receipt" size={24} color="white" />
              <Text style={styles.summaryTitle}>Résumé de l'achat</Text>
            </View>
            <View style={styles.summaryContent}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Articles cochés:</Text>
                <Text style={styles.summaryValue}>{lignesChecked.length}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotalLabel}>TOTAL GÉNÉRAL</Text>
                <Text style={styles.summaryTotalValue}>{totalDepense.toLocaleString()} Ar</Text>
              </View>
            </View>
          </LinearGradient>
        )}

        {/* Bouton consulter rapport */}
        {lignesChecked.length > 0 && (
          <TouchableOpacity
            style={styles.reportButton}
            onPress={() => router.push('/rapports')}
          >
            <LinearGradient
              colors={SECTION_COLORS.rapports.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.reportButtonGradient}
            >
              <Ionicons name="bar-chart" size={20} color="white" />
              <Text style={styles.reportButtonText}>Consulter le rapport</Text>
              <Ionicons name="arrow-forward" size={16} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* MODAL D'ÉDITION MODERNE - DESIGN AMÉLIORÉ */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="none"
        onRequestClose={() => setShowEditModal(false)}
      >
        <Animated.View 
          style={[
            styles.modalOverlay,
            { opacity: modalFadeAnim }
          ]}
        >
          <Animated.View 
            style={[
              styles.modernModalContent,
              {
                transform: [{ translateY: modalSlideAnim }],
              }
            ]}
          >
            {/* Header moderne avec gradient */}
            <LinearGradient
              colors={SECTION_COLORS.achats.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modernModalHeader}
            >
              <View style={styles.headerLeft}>
                <View style={styles.headerIcon}>
                  <Ionicons name="create" size={20} color="white" />
                </View>
                <View>
                  <Text style={styles.modernModalTitle}>Modifier l'article</Text>
                  <Text style={styles.modernModalSubtitle}>
                    {editingLigne?.libelleProduit || 'Article sélectionné'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowEditModal(false)}
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.modernModalBody} showsVerticalScrollIndicator={false}>
              {/* Section 1: Informations du produit */}
              <View style={styles.formSection}>
                <View style={styles.sectionHeaderContainer}>
                  <View style={styles.sectionIconContainer}>
                    <Ionicons name="basket" size={20} color={SECTION_COLORS.achats.primary} />
                  </View>
                  <Text style={styles.sectionHeaderText}>Informations du produit</Text>
                </View>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.modernLabel}>Nom du produit</Text>
                  <View style={styles.modernInputWrapper}>
                    <Ionicons name="pencil" size={16} color={COLORS.textLight} style={styles.inputIcon} />
                    <TextInput
                      style={styles.modernInput}
                      value={modalData.libelleProduit}
                      onChangeText={(text) => setModalData(prev => ({ ...prev, libelleProduit: text }))}
                      placeholder="Ex: Riz, Poulet, Huile..."
                      placeholderTextColor={COLORS.textLight}
                    />
                  </View>
                </View>
              </View>

              {/* Section 2: Quantité et Unité */}
              <View style={styles.formSection}>
                <View style={styles.sectionHeaderContainer}>
                  <View style={styles.sectionIconContainer}>
                    <Ionicons name="calculator" size={20} color={SECTION_COLORS.achats.primary} />
                  </View>
                  <Text style={styles.sectionHeaderText}>Quantité et Unité</Text>
                </View>

                <View style={styles.quantityRow}>
                  <View style={styles.quantityInputContainer}>
                    <Text style={styles.modernLabel}>Quantité</Text>
                    <View style={styles.modernInputWrapper}>
                      <Ionicons name="add-circle-outline" size={16} color={COLORS.textLight} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.modernInput, styles.quantityInput]}
                        value={modalData.quantite}
                        onChangeText={(text) => setModalData(prev => ({ ...prev, quantite: text }))}
                        keyboardType="numeric"
                        placeholder="1"
                        placeholderTextColor={COLORS.textLight}
                      />
                    </View>
                  </View>

                  <View style={styles.uniteInputContainer}>
                    <Text style={styles.modernLabel}>Unité</Text>
                    <TextInput
                      style={[styles.modernInput, styles.unitInputSmall]}
                      value={modalData.unite}
                      onChangeText={(u) => setModalData(prev => ({ ...prev, unite: u }))}
                      placeholder="pcs"
                      placeholderTextColor={COLORS.textLight}
                    />
                  </View>
                </View>
              </View>

              {/* Section 3: Prix */}
              <View style={styles.formSection}>
                <View style={styles.sectionHeaderContainer}>
                  <View style={styles.sectionIconContainer}>
                    <Ionicons name="cash" size={20} color={SECTION_COLORS.achats.primary} />
                  </View>
                  <Text style={styles.sectionHeaderText}>Prix unitaire</Text>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.modernLabel}>Prix unitaire (Ar)</Text>
                  <View style={styles.modernInputWrapper}>
                    <Ionicons name="pricetag" size={16} color={COLORS.textLight} style={styles.inputIcon} />
                    <TextInput
                      style={styles.modernInput}
                      value={modalData.prixUnitaire}
                      onChangeText={(text) => setModalData(prev => ({ ...prev, prixUnitaire: text }))}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={COLORS.textLight}
                    />
                    <Text style={styles.currencyLabel}>Ar</Text>
                  </View>
                </View>
              </View>

              {/* Section 4: Aperçu du calcul */}
              <View style={styles.formSection}>
                <View style={styles.sectionHeaderContainer}>
                  <View style={styles.sectionIconContainer}>
                    <Ionicons name="receipt" size={20} color={SECTION_COLORS.achats.primary} />
                  </View>
                  <Text style={styles.sectionHeaderText}>Aperçu du calcul</Text>
                </View>

                <View style={styles.calculationCard}>
                  <View style={styles.calculationRow}>
                    <Text style={styles.calculationLabel}>Quantité:</Text>
                    <Text style={styles.calculationValue}>
                      {modalData.quantite || '0'} {modalData.unite}
                    </Text>
                  </View>
                  <View style={styles.calculationRow}>
                    <Text style={styles.calculationLabel}>Prix unitaire:</Text>
                    <Text style={styles.calculationValue}>
                      {(parseFloat(modalData.prixUnitaire) || 0).toLocaleString()} Ar
                    </Text>
                  </View>
                  <View style={styles.calculationDivider} />
                  <View style={styles.calculationRow}>
                    <Text style={styles.calculationTotalLabel}>Total:</Text>
                    <Text style={styles.calculationTotalValue}>
                      {((parseFloat(modalData.quantite) || 0) * (parseFloat(modalData.prixUnitaire) || 0)).toLocaleString()} Ar
                    </Text>
                  </View>
                </View>
              </View>

              {/* Espace pour les boutons */}
              <View style={{ height: 20 }} />
            </ScrollView>
            
            {/* Actions du modal avec design moderne */}
            <View style={styles.modernModalActions}>
              <TouchableOpacity
                style={styles.modernCancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Ionicons name="close-circle-outline" size={20} color={COLORS.text} />
                <Text style={styles.modernCancelText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modernSaveButton}
                onPress={handleSaveEdit}
              >
                <LinearGradient
                  colors={SECTION_COLORS.achats.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.modernSaveButtonGradient}
                >
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                  <Text style={styles.modernSaveText}>Sauvegarder</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* MODAL RAPIDE POUR CHECKBOX */}
      <Modal
        visible={showQuickModal}
        transparent
        animationType="none"
        onRequestClose={() => setShowQuickModal(false)}
      >
        <Animated.View 
          style={[
            styles.modalOverlay,
            { opacity: modalFadeAnim }
          ]}
        >
          <Animated.View 
            style={[
              styles.quickModalContent,
              {
                transform: [{ translateY: modalSlideAnim }],
              }
            ]}
          >
            <View style={styles.quickModalHeader}>
              <Text style={styles.quickModalTitle}>
                {quickModalIndex !== null && lignes[quickModalIndex]
                  ? `Ajouter ${lignes[quickModalIndex].libelleProduit}`
                  : 'Ajouter quantité et prix'}
              </Text>
              <TouchableOpacity onPress={() => setShowQuickModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.quickModalBody}>
              <View style={styles.quickInputRow}>
                <View style={styles.quickInputGroup}>
                  <Text style={styles.quickLabel}>Prix unitaire (Ar)</Text>
                  <TextInput
                    style={styles.quickInput}
                    value={quickPrixUnitaire}
                    onChangeText={setQuickPrixUnitaire}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
                <View style={styles.quickInputGroup}>
                  <Text style={styles.quickLabel}>Quantité</Text>
                  <TextInput
                    style={styles.quickInput}
                    value={quickQuantite}
                    onChangeText={setQuickQuantite}
                    keyboardType="numeric"
                    placeholder="1"
                  />
                </View>
              </View>
              
              {/* Sélecteur d'unité rapide */}
              <View style={styles.quickUniteGroup}>
                <Text style={styles.quickLabel}>Unité:</Text>
                <TextInput
                  style={styles.quickUnitInput}
                  value={quickUnite}
                  onChangeText={setQuickUnite}
                  placeholder="pcs"
                  placeholderTextColor={COLORS.textLight}
                />
              </View>
            </View>
            
            <View style={styles.quickModalActions}>
              <TouchableOpacity
                style={styles.quickCancelButton}
                onPress={() => setShowQuickModal(false)}
              >
                <Text style={styles.quickCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickValidateButton}
                onPress={handleValidateQuickModal}
              >
                <Text style={styles.quickValidateText}>Valider</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
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
    padding: 24,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: SECTION_COLORS.achats.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  titleEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    borderBottomWidth: 1,
    borderBottomColor: 'white',
    marginRight: 8,
    paddingVertical: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    fontSize: 12,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Zone d'ajout améliorée
  addProductContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  addProductInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: SECTION_COLORS.achats.light,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: COLORS.surface,
    marginRight: 12,
  },
  productInput: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 8,
    fontSize: 16,
    color: COLORS.text,
  },
  addButton: {
    backgroundColor: SECTION_COLORS.achats.primary,
    borderRadius: 12,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: SECTION_COLORS.achats.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  
  // Section headers améliorés
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  sectionBadge: {
    backgroundColor: SECTION_COLORS.achats.light,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SECTION_COLORS.achats.primary,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: SECTION_COLORS.achats.primary,
  },

  // CARTES DE PRODUITS (REMPLACE LE TABLEAU)
  productCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: SECTION_COLORS.achats.primary,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 12,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  quantityBadge: {
    alignSelf: 'flex-start',
    backgroundColor: SECTION_COLORS.achats.light,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SECTION_COLORS.achats.primary,
  },
  quantityText: {
    fontSize: 13,
    fontWeight: '600',
    color: SECTION_COLORS.achats.primary,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cardActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SECTION_COLORS.achats.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteAction: {
    backgroundColor: '#FEE2E2',
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
  },
  priceItem: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  totalItem: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: SECTION_COLORS.achats.primary,
  },

  // Liste des produits non cochés
  produitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: SECTION_COLORS.achats.light,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: SECTION_COLORS.achats.light,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  checkboxChecked: {
    backgroundColor: SECTION_COLORS.achats.primary,
    borderColor: SECTION_COLORS.achats.primary,
  },
  produitName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  deleteProductButton: {
    padding: 8,
  },

  // Carte de résumé moderne
  summaryCard: {
    borderRadius: 20,
    marginTop: 24,
    marginBottom: 16,
    shadowColor: SECTION_COLORS.achats.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 20,
    paddingBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  summaryContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginVertical: 12,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  summaryTotalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },

  // Bouton rapport
  reportButton: {
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: SECTION_COLORS.rapports.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  reportButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  reportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // MODAL MODERNE
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernModalContent: {
    backgroundColor: 'white',
    borderRadius: 24,
    width: SCREEN_WIDTH * 0.95,
    maxHeight: SCREEN_WIDTH * 1.4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    overflow: 'hidden',
  },
  modernModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modernModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  modernModalSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernModalBody: {
    flex: 1,
    paddingHorizontal: 24,
  },

  // SECTIONS DU FORMULAIRE
  formSection: {
    marginBottom: 32,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 16,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SECTION_COLORS.achats.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.3,
  },

  // INPUTS MODERNES
  inputContainer: {
    marginBottom: 16,
  },
  modernLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  modernInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  modernInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    paddingVertical: 12,
    fontWeight: '500',
  },
  currencyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
    marginLeft: 8,
  },

  // SECTION QUANTITÉ
  quantityRow: {
    gap: 20,
  },
  quantityInputContainer: {
    marginBottom: 20,
  },
  quantityInput: {
    textAlign: 'center',
  },
  uniteInputContainer: {
    flex: 1,
  },
  uniteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  modernUniteOption: {
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 50,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  modernUniteOptionActive: {
    backgroundColor: SECTION_COLORS.achats.primary,
    borderColor: SECTION_COLORS.achats.primary,
    shadowColor: SECTION_COLORS.achats.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  modernUniteText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  modernUniteTextActive: {
    color: 'white',
    fontWeight: '700',
  },

  // CARTE DE CALCUL
  calculationCard: {
    backgroundColor: SECTION_COLORS.achats.light,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: SECTION_COLORS.achats.primary,
    shadowColor: SECTION_COLORS.achats.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  calculationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  calculationLabel: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  calculationValue: {
    fontSize: 15,
    fontWeight: '600',
    color: SECTION_COLORS.achats.primary,
  },
  calculationDivider: {
    height: 2,
    backgroundColor: SECTION_COLORS.achats.primary,
    marginVertical: 16,
    borderRadius: 1,
  },
  calculationTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  calculationTotalValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: SECTION_COLORS.achats.primary,
    letterSpacing: 0.5,
  },

  // ACTIONS MODERNES
  modernModalActions: {
    flexDirection: 'row',
    padding: 24,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  modernCancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: COLORS.border,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  modernCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  modernSaveButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: SECTION_COLORS.achats.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modernSaveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  modernSaveText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },

  // MODAL RAPIDE
  quickModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: SCREEN_WIDTH * 0.9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  quickModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  quickModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
    marginRight: 12,
  },
  quickModalBody: {
    padding: 20,
  },
  quickInputRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  quickInputGroup: {
    flex: 1,
  },
  quickLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  quickInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: COLORS.surface,
  },
  quickUniteGroup: {
    marginTop: 8,
  },
  quickUnitInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    marginTop: 6,
  },
  quickUniteSelector: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  quickUniteOption: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quickUniteOptionActive: {
    backgroundColor: SECTION_COLORS.achats.primary,
    borderColor: SECTION_COLORS.achats.primary,
  },
  quickUniteText: {
    fontSize: 12,
    color: COLORS.text,
  },
  quickUniteTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  unitInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    marginRight: 8,
  },
  unitInputSmall: {
    width: 120,
  },
  quickModalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  quickCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  quickCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  quickValidateButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: SECTION_COLORS.achats.primary,
    alignItems: 'center',
  },
  quickValidateText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },

  // États d'erreur et de chargement
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.textLight,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.error,
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: SECTION_COLORS.achats.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryText: {
    color: 'white',
    fontWeight: 'bold',
  },
});