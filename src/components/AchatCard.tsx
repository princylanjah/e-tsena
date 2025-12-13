import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { format } from 'date-fns';
import formatMoney from '../utils/formatMoney';
import { COLORS, SECTION_COLORS } from '@constants/colors';

interface Achat {
  id: number;
  nomListe: string;
  dateAchat: string;
  totalDepense: number;
  nombreArticles: number;
}

interface AchatCardProps {
  achat: Achat;
  onPress?: () => void;
}

export const AchatCard: React.FC<AchatCardProps> = ({ achat, onPress }) => {
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/achat/${achat.id}`);
    }
  };

  // Calculer la progression basée sur le montant
  const progressPercentage = Math.min((achat.totalDepense / 100000) * 100, 100);

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress}>
      <View style={styles.cardHeader}>
        {/* Badge de date */}
        <View style={styles.dateContainer}>
          <View style={styles.dateBadge}>
            <Text style={styles.dateDay}>
              {format(new Date(achat.dateAchat), 'dd')}
            </Text>
            <Text style={styles.dateMonth}>
              {format(new Date(achat.dateAchat), 'MMM')}
            </Text>
          </View>
        </View>
        
        {/* Informations principales */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {achat.nomListe}
          </Text>
          <Text style={styles.cardDate}>
            {format(new Date(achat.dateAchat), 'dd MMMM yyyy à HH:mm')}
          </Text>
          <View style={styles.cardMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="basket-outline" size={14} color={SECTION_COLORS.home.primary} />
              <Text style={styles.metaText}>
                {achat.nombreArticles} article{achat.nombreArticles > 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Prix et flèche */}
        <View style={styles.cardRight}>
          <Text style={styles.cardTotal}>
            {formatMoney(achat.totalDepense)} {""}{' '}{'Ar'}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
        </View>
      </View>
      
      {/* Barre de progression */}
      <View style={styles.cardFooter}>
        <View style={styles.progressBar}>
          <View 
            style={[styles.progressFill, { width: `${progressPercentage}%` }]} 
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  dateContainer: {
    marginRight: 12,
  },
  dateBadge: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: SECTION_COLORS.home.light,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: SECTION_COLORS.home.primary,
  },
  dateDay: {
    fontSize: 16,
    fontWeight: 'bold',
    color: SECTION_COLORS.home.primary,
    lineHeight: 18,
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: '600',
    color: SECTION_COLORS.home.text,
    textTransform: 'uppercase',
    lineHeight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 6,
  },
  cardMeta: {
    flexDirection: 'row',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: SECTION_COLORS.home.primary,
    fontWeight: '600',
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  cardTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: SECTION_COLORS.home.primary,
  },
  cardFooter: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: SECTION_COLORS.home.primary,
    borderRadius: 2,
  },
});
