import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SECTION_COLORS } from '@constants/colors';
import formatMoney from '../utils/formatMoney';

interface Produit {
  id: number;
  libelle: string;
}

interface ProductModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  title: string;
  produits: Produit[];
  selectedProduitId: number | null;
  onSelectProduit: (id: number) => void;
  quantite: string;
  onQuantiteChange: (text: string) => void;
  prixUnitaire: string;
  onPrixUnitaireChange: (text: string) => void;
  isEditing?: boolean;
}

const { width } = Dimensions.get('window');

export const ProductModal: React.FC<ProductModalProps> = ({
  visible,
  onClose,
  onSave,
  title,
  produits,
  selectedProduitId,
  onSelectProduit,
  quantite,
  onQuantiteChange,
  prixUnitaire,
  onPrixUnitaireChange,
  isEditing = false,
}) => {
  const selectedProduit = produits.find(p => p.id === selectedProduitId);
  const total = quantite && prixUnitaire ? 
    (Number.parseFloat(quantite) * Number.parseFloat(prixUnitaire)) : 0;

  const renderProduit = ({ item }: { item: Produit }) => (
    <TouchableOpacity
      style={[
        styles.produitItem,
        selectedProduitId === item.id && styles.produitItemSelected
      ]}
      onPress={() => onSelectProduit(item.id)}
    >
      <Text style={[
        styles.produitText,
        selectedProduitId === item.id && styles.produitTextSelected
      ]}>
        {item.libelle}
      </Text>
      {selectedProduitId === item.id && (
        <Ionicons name="checkmark-circle" size={20} color={SECTION_COLORS.home.primary} />
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>

          {/* Sélection du produit (seulement si pas en mode édition) */}
          {!isEditing && (
            <>
              <Text style={styles.sectionTitle}>Sélectionner un produit</Text>
              <View style={styles.produitsContainer}>
                <FlatList
                  data={produits}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={renderProduit}
                  style={styles.produitsList}
                  showsVerticalScrollIndicator={false}
                />
              </View>
            </>
          )}

          {/* Produit sélectionné (mode édition) */}
          {isEditing && selectedProduit && (
            <View style={styles.selectedProduitContainer}>
              <Text style={styles.sectionTitle}>Produit</Text>
              <View style={styles.selectedProduit}>
                <Ionicons name="basket-outline" size={20} color={SECTION_COLORS.home.primary} />
                <Text style={styles.selectedProduitText}>{selectedProduit.libelle}</Text>
              </View>
            </View>
          )}

          {/* Quantité et prix */}
          <View style={styles.inputsRow}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Quantité</Text>
              <TextInput
                style={styles.input}
                value={quantite}
                onChangeText={onQuantiteChange}
                placeholder="1"
                keyboardType="numeric"
                placeholderTextColor={COLORS.textLight}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Prix unitaire (Ar)</Text>
              <TextInput
                style={styles.input}
                value={prixUnitaire}
                onChangeText={onPrixUnitaireChange}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor={COLORS.textLight}
              />
            </View>
          </View>

          {/* Aperçu du total */}
          {total > 0 && (
            <View style={styles.totalPreview}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {formatMoney(total)} Ar
              </Text>
            </View>
          )}

          {/* Boutons d'action */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveButton,
                (!selectedProduitId || !quantite || !prixUnitaire) && styles.saveButtonDisabled
              ]}
              onPress={onSave}
              disabled={!selectedProduitId || !quantite || !prixUnitaire}
            >
              <Ionicons name="checkmark" size={20} color="white" />
              <Text style={styles.saveText}>
                {isEditing ? 'Modifier' : 'Ajouter'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 34,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  produitsContainer: {
    maxHeight: 200,
    marginBottom: 24,
  },
  produitsList: {
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 12,
    padding: 8,
  },
  produitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 2,
  },
  produitItemSelected: {
    backgroundColor: SECTION_COLORS.home.light,
  },
  produitText: {
    fontSize: 16,
    color: COLORS.text,
  },
  produitTextSelected: {
    fontWeight: '600',
    color: SECTION_COLORS.home.primary,
  },
  selectedProduitContainer: {
    marginBottom: 24,
  },
  selectedProduit: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SECTION_COLORS.home.light,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 12,
  },
  selectedProduitText: {
    fontSize: 16,
    fontWeight: '600',
    color: SECTION_COLORS.home.primary,
  },
  inputsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  inputContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: 'white',
  },
  totalPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: SECTION_COLORS.home.light,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: SECTION_COLORS.home.text,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: SECTION_COLORS.home.primary,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceVariant,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: SECTION_COLORS.home.primary,
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.textDisabled,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
