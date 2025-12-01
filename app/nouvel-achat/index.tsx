import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getDb } from '@db/init';
import { COLORS, SECTION_COLORS } from '@constants/colors';
import { getSuggestions, Suggestion, SMART_SUGGESTIONS } from '../../src/constants/suggestions';
import { useSettings } from '../../src/context/SettingsContext';

export default function NouvelAchat() {
  const { t } = useSettings();
  const insets = useSafeAreaInsets();
  const [nomListe, setNomListe] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>(() => {
    // Initialiser avec 3 suggestions aléatoires pour montrer l'IA
    return [...SMART_SUGGESTIONS].sort(() => 0.5 - Math.random()).slice(0, 3);
  });

  const handleTextChange = (text: string) => {
    setNomListe(text);
    if (!text || text.length < 2) {
       // Remettre des suggestions aléatoires si le champ est vide
       setSuggestions([...SMART_SUGGESTIONS].sort(() => 0.5 - Math.random()).slice(0, 3));
    } else {
       setSuggestions(getSuggestions(text));
    }
  };

  const handleSuggestionClick = async (suggestion: Suggestion) => {
    setNomListe(suggestion.keyword);
    setLoading(true);
    try {
      const db = getDb();
      const now = new Date().toISOString();
      
      // 1. Créer la liste
      const result = db.runSync(
        'INSERT INTO Achat (nomListe, dateAchat) VALUES (?, ?)',
        [suggestion.keyword, now]
      );
      const achatId = result.lastInsertRowId;

      // 2. Ajouter les ingrédients
      suggestion.items.forEach(item => {
        db.runSync(
          'INSERT INTO LigneAchat (idAchat, libelleProduit, quantite, prixUnitaire, prixTotal, unite) VALUES (?, ?, 0, 0, 0, "pcs")',
          [achatId, item]
        );
      });

      router.replace(`/achat/${achatId}`);
    } catch (error) {
      console.error(error);
      Alert.alert(t('error'), t('error_create_suggested'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAchat = async () => {
    if (!nomListe.trim()) {
      Alert.alert(t('error'), t('error_enter_name'));
      return;
    }

    setLoading(true);
    try {
      const db = getDb();
      const now = new Date().toISOString();
      
      // Créer un nouvel achat
      const result = db.runSync(
        'INSERT INTO Achat (nomListe, dateAchat) VALUES (?, ?)',
        [nomListe.trim(), now]
      );

      const achatId = result.lastInsertRowId;
      
      // Rediriger vers la page de gestion de l'achat
      router.replace(`/achat/${achatId}`);
    } catch (error) {
      console.error('Erreur lors de la création de l\'achat:', error);
      Alert.alert(t('error'), t('error_create_list'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{t('new_list_title')}</Text>
            <Text style={styles.headerSubtitle}>{t('create_list_subtitle')}</Text>
          </View>
        </View>
      </View>

      {/* Formulaire */}
      <View style={styles.formContainer}>
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>{t('list_name_label')}</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="list" size={20} color={SECTION_COLORS.achats.primary} />
            <TextInput
              style={styles.textInput}
              placeholder={t('list_name_placeholder')}
              value={nomListe}
              onChangeText={handleTextChange}
              placeholderTextColor="#999"
              maxLength={50}
              autoFocus
            />
          </View>
          <Text style={styles.inputHelper}>
            {nomListe.length}/50 {t('characters')}
          </Text>

          {/* SUGGESTIONS AI */}
          {suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionTitle}>{t('ai_suggestions')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionScroll}>
                {suggestions.map((s, i) => (
                  <TouchableOpacity key={i} style={styles.suggestionCard} onPress={() => handleSuggestionClick(s)}>
                    <Text style={styles.suggestionKeyword}>{s.keyword}</Text>
                    <Text style={styles.suggestionCount}>{s.items.length} {t('articles')}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <View style={styles.previewSection}>
          <Text style={styles.previewTitle}>{t('list_preview')}</Text>
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <View style={styles.previewIcon}>
                <Ionicons name="basket" size={20} color={SECTION_COLORS.achats.primary} />
              </View>
              <View style={styles.previewInfo}>
                <Text style={styles.previewName}>
                  {nomListe || t('list_name_default')}
                </Text>
                <Text style={styles.previewDate}>
                  {new Date().toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={[styles.actionsContainer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 30 }]}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.createButton, (!nomListe.trim() || loading) && styles.createButtonDisabled]}
          onPress={handleCreateAchat}
          disabled={!nomListe.trim() || loading}
        >
          {loading ? (
            <Text style={styles.createButtonText}>{t('creating')}</Text>
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="white" />
              <Text style={styles.createButtonText}>{t('create_list_btn')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: SECTION_COLORS.achats.primary,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  inputSection: {
    marginBottom: 30,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    gap: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  inputHelper: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 8,
    textAlign: 'right',
  },
  suggestionsContainer: {
    marginTop: 15,
  },
  suggestionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: SECTION_COLORS.achats.primary,
    marginBottom: 8,
  },
  suggestionScroll: {
    flexDirection: 'row',
  },
  suggestionCard: {
    backgroundColor: '#F0F9FF',
    padding: 10,
    borderRadius: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  suggestionKeyword: {
    fontWeight: 'bold',
    color: '#0369A1',
  },
  suggestionCount: {
    fontSize: 10,
    color: '#0EA5E9',
  },
  previewSection: {
    marginBottom: 30,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  previewCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: SECTION_COLORS.achats.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  previewDate: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  createButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: SECTION_COLORS.achats.primary,
    gap: 8,
  },
  createButtonDisabled: {
    backgroundColor: COLORS.textDisabled,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});
