import React, { useState } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, Modal, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import formatMoney from '../utils/formatMoney';
import * as Sharing from 'expo-sharing';

// --- TYPES ---
interface ProductEntry {
  libelleProduit: string;
  totalQte: number;
  totalPrix: number;
  dateAchat?: string;
}

interface PeriodData {
  fullLabel: string;
  montant: number;
  startDate: string;
  endDate: string;
}

interface JournalModalProps {
  visible: boolean;
  onClose: () => void;
  selectedPeriod: PeriodData | null;
  journalData: ProductEntry[];
  activeTheme: { primary: string; secondary: string };
  isDarkMode: boolean;
  currency: string;
  t: (key: string) => string;
}

// Using centralized formatMoney util

// --- GÉNÉRATION COULEURS POUR CHAQUE PRODUIT ---
const generateProductColors = (count: number, primary: string) => {
  const basePalette = [
    primary,
    '#E53935', '#8E24AA', '#1E88E5', '#43A047', '#FB8C00', '#00897B',
    '#D81B60', '#5E35B1', '#039BE5', '#00ACC1', '#7CB342', '#C0CA33',
    '#3949AB', '#00838F', '#6D4C41', '#546E7A', '#F4511E', '#757575'
  ];
  
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    if (i < basePalette.length) {
      colors.push(basePalette[i]);
    } else {
      const hue = (i * 137.508) % 360;
      colors.push(`hsl(${hue}, 65%, 50%)`);
    }
  }
  return colors;
};

export default function JournalModal({
  visible,
  onClose,
  selectedPeriod,
  journalData,
  activeTheme,
  isDarkMode,
  currency,
  t
}: JournalModalProps) {
  
  // Générer les couleurs pour chaque produit
  const productColors = generateProductColors(journalData.length, activeTheme.primary);
  
  // Calculer les totaux
  const totalProducts = journalData.length;
  const totalQuantity = journalData.reduce((s, p) => s + p.totalQte, 0);
  const hasData = journalData.length > 0;

  // EXPORT PDF - PÉRIODE COMPLÈTE
  const exportPeriodPDF = async () => {
    if (!selectedPeriod || !hasData) {
      Alert.alert(t('info') || 'Info', t('no_data_to_export') || 'Tsy misy donnée azo exporté');
      return;
    }
    
    try {
      const html = `
        <html>
          <head>
            <style>
              body { font-family: Helvetica, Arial, sans-serif; padding: 30px; color: #333; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid ${activeTheme.primary}; padding-bottom: 20px; }
              .title { color: ${activeTheme.primary}; font-size: 24px; margin: 0; }
              .subtitle { color: #666; font-size: 14px; margin-top: 8px; }
              .summary { display: flex; justify-content: space-around; margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 10px; }
              .summary-item { text-align: center; }
              .summary-label { font-size: 12px; color: #666; }
              .summary-value { font-size: 20px; font-weight: bold; color: ${activeTheme.primary}; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background: ${activeTheme.primary}; color: white; padding: 12px; text-align: left; }
              td { padding: 12px; border-bottom: 1px solid #eee; }
              tr:nth-child(even) { background: #f9f9f9; }
              .color-dot { display: inline-block; width: 12px; height: 12px; border-radius: 6px; margin-right: 8px; }
              .total-row { font-weight: bold; background: ${activeTheme.primary}15 !important; }
              .footer { margin-top: 30px; text-align: center; color: #999; font-size: 11px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 class="title">📊 ${t('expense_report') || 'Rapport des Dépenses'}</h1>
              <p class="subtitle">${selectedPeriod.fullLabel}</p>
            </div>
            
            <div class="summary">
              <div class="summary-item">
                <div class="summary-label">${t('products') || 'Produits'}</div>
                <div class="summary-value">${totalProducts}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">${t('quantity') || 'Quantité'}</div>
                <div class="summary-value">${totalQuantity}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">${t('total') || 'Total'}</div>
                <div class="summary-value">${formatMoney(selectedPeriod.montant)} ${currency}</div>
              </div>
            </div>
            
            <table>
              <tr>
                <th style="width: 50%">${t('product') || 'Produit'}</th>
                <th style="text-align: center; width: 20%">${t('quantity') || 'Quantité'}</th>
                <th style="text-align: right; width: 30%">${t('amount') || 'Montant'}</th>
              </tr>
              ${journalData.map((j, i) => `
                <tr>
                  <td><span class="color-dot" style="background: ${productColors[i]}"></span>${j.libelleProduit}</td>
                  <td style="text-align: center; font-weight: 600; color: ${productColors[i]}">${j.totalQte}</td>
                  <td style="text-align: right">${formatMoney(j.totalPrix)} ${currency}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td><strong>TOTAL</strong></td>
                <td style="text-align: center"><strong>${totalQuantity}</strong></td>
                <td style="text-align: right"><strong>${formatMoney(selectedPeriod.montant)} ${currency}</strong></td>
              </tr>
            </table>
            
            <div class="footer">
              E-tsena • ${t('generated_on') || 'Généré le'} ${new Date().toLocaleDateString()}
            </div>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (e) { 
      Alert.alert(t('error'), t('pdf_export_failed') || 'Tsy nahomby ny export PDF'); 
    }
  };

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: isDarkMode ? '#0F172A' : '#fff' }}>
        {/* HEADER */}
        <View style={{ 
          backgroundColor: isDarkMode ? '#1E293B' : '#fff', 
          paddingTop: 50, 
          paddingBottom: 20, 
          paddingHorizontal: 20, 
          borderBottomWidth: 1, 
          borderBottomColor: isDarkMode ? '#334155' : '#F1F5F9' 
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <TouchableOpacity onPress={onClose} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="arrow-back" size={24} color={activeTheme.primary} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: activeTheme.primary }}>{t('back')}</Text>
            </TouchableOpacity>
            
            {/* BOUTON PDF - DISABLED RAHA TSY MISY DATA */}
            <TouchableOpacity 
              style={{ 
                backgroundColor: hasData ? activeTheme.primary : (isDarkMode ? '#334155' : '#E5E7EB'), 
                paddingVertical: 10, 
                paddingHorizontal: 16, 
                borderRadius: 12, 
                flexDirection: 'row', 
                alignItems: 'center', 
                gap: 6,
                opacity: hasData ? 1 : 0.5
              }} 
              onPress={hasData ? exportPeriodPDF : () => Alert.alert(t('info') || 'Info', t('no_data_to_export') || 'Tsy misy donnée azo exporté')}
            >
              <Ionicons name="download-outline" size={16} color={hasData ? '#fff' : (isDarkMode ? '#64748B' : '#9CA3AF')} />
              <Text style={{ color: hasData ? '#fff' : (isDarkMode ? '#64748B' : '#9CA3AF'), fontWeight: '600', fontSize: 13 }}>PDF</Text>
            </TouchableOpacity>
          </View>
          
          {/* TITRE PÉRIODE */}
          <View style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 13, color: isDarkMode ? '#64748B' : '#9CA3AF', fontWeight: '500' }}>
              {t('period_details') || 'Détails de la période'}
            </Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: isDarkMode ? '#F1F5F9' : '#1F2937', marginTop: 4 }}>
              {selectedPeriod?.fullLabel}
            </Text>
          </View>
        </View>

        {/* CARTE RÉSUMÉ - COULEURS COHÉRENTES */}
        <View style={{ 
          margin: 20, 
          backgroundColor: activeTheme.primary + '10', 
          borderRadius: 20, 
          padding: 20, 
          borderWidth: 1, 
          borderColor: activeTheme.primary + '20' 
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 12, color: isDarkMode ? '#64748B' : '#6B7280', fontWeight: '500' }}>
                {t('total_period') || 'Total période'}
              </Text>
              <Text style={{ fontSize: 32, fontWeight: '800', color: activeTheme.primary, marginTop: 4 }}>
                {formatMoney(selectedPeriod?.montant || 0)}
              </Text>
              <Text style={{ fontSize: 14, color: isDarkMode ? '#64748B' : '#6B7280', fontWeight: '500' }}>
                {currency}
              </Text>
            </View>
            
            {/* STATS COMPACTES - MÊME COULEUR POUR PRODUITS ET QUANTITÉ */}
            <View style={{ alignItems: 'flex-end' }}>
              {/* Produits */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <View style={{ backgroundColor: activeTheme.primary + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: activeTheme.primary }}>{totalProducts}</Text>
                </View>
                <Text style={{ fontSize: 12, color: activeTheme.primary, fontWeight: '600' }}>{t('products') || 'Produits'}</Text>
              </View>
              {/* Quantité - MÊME COULEUR QUE PRODUITS */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ backgroundColor: activeTheme.primary + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: activeTheme.primary }}>{totalQuantity}</Text>
                </View>
                <Text style={{ fontSize: 12, color: activeTheme.primary, fontWeight: '600' }}>{t('quantity') || 'Quantité'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* TITRE SECTION */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: isDarkMode ? '#F1F5F9' : '#1F2937' }}>
            {t('products_bought') || 'Produits achetés'}
          </Text>
          {hasData && (
            <Text style={{ fontSize: 12, color: isDarkMode ? '#64748B' : '#9CA3AF' }}>
              {totalProducts} {t('items') || 'articles'}
            </Text>
          )}
        </View>

        {/* LISTE DES PRODUITS */}
        <ScrollView 
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} 
          showsVerticalScrollIndicator={false}
        >
          {!hasData ? (
            <View style={{ alignItems: 'center', marginTop: 50, padding: 30 }}>
              <View style={{ 
                width: 80, 
                height: 80, 
                borderRadius: 40, 
                backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9', 
                justifyContent: 'center', 
                alignItems: 'center', 
                marginBottom: 16 
              }}>
                <Ionicons name="basket-outline" size={40} color={isDarkMode ? '#475569' : '#CBD5E1'} />
              </View>
              <Text style={{ color: isDarkMode ? '#94A3B8' : '#6B7280', fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 8 }}>
                {t('no_purchase') || 'Tsy misy fividianana'}
              </Text>
              <Text style={{ color: isDarkMode ? '#64748B' : '#9CA3AF', fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
                {t('no_product_bought_period') || 'Tsy nisy fividianana natao nandritra ity période ity'}
              </Text>
              
              {/* MESSAGE EXPORT DISABLED */}
              <View style={{ 
                marginTop: 24, 
                backgroundColor: isDarkMode ? '#1E293B' : '#FEF3C7', 
                padding: 16, 
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10
              }}>
                <Ionicons name="information-circle-outline" size={20} color={isDarkMode ? '#FBBF24' : '#D97706'} />
                <Text style={{ flex: 1, color: isDarkMode ? '#FBBF24' : '#92400E', fontSize: 13 }}>
                  {t('export_disabled_no_data') || 'Export PDF tsy azo atao raha tsy misy donnée'}
                </Text>
              </View>
            </View>
          ) : (
            journalData.map((item, index) => (
              <View 
                key={item.libelleProduit || index} 
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', 
                  padding: 16, 
                  borderRadius: 16, 
                  marginBottom: 10,
                  borderLeftWidth: 4,
                  borderLeftColor: productColors[index]
                }}
              >
                {/* ICÔNE AVEC COULEUR UNIQUE */}
                <View style={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 14, 
                  backgroundColor: productColors[index] + '20', 
                  justifyContent: 'center', 
                  alignItems: 'center' 
                }}>
                  <Ionicons name="cube-outline" size={24} color={productColors[index]} />
                </View>
                
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text 
                    style={{ fontSize: 15, fontWeight: '600', color: isDarkMode ? '#F1F5F9' : '#1F2937' }} 
                    numberOfLines={1}
                  >
                    {item.libelleProduit}
                  </Text>
                  {/* QUANTITÉ AVEC MÊME COULEUR QUE L'ICÔNE */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <View style={{ 
                      backgroundColor: productColors[index] + '20', 
                      paddingHorizontal: 8, 
                      paddingVertical: 2, 
                      borderRadius: 6 
                    }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: productColors[index] }}>
                        × {item.totalQte}
                      </Text>
                    </View>
                  </View>
                </View>
                
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: productColors[index] }}>
                    {formatMoney(item.totalPrix)}
                  </Text>
                  <Text style={{ fontSize: 12, color: isDarkMode ? '#64748B' : '#9CA3AF' }}>
                    {currency}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
        
        {/* SOSO-KEVITRA - TIPS SECTION (raha misy data) */}
        {hasData && (
          <View style={{ 
            backgroundColor: isDarkMode ? '#1E293B' : '#F0F9FF', 
            padding: 16, 
            marginHorizontal: 20,
            marginBottom: 20,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: isDarkMode ? '#334155' : '#E0F2FE'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Ionicons name="bulb-outline" size={18} color={isDarkMode ? '#60A5FA' : '#0284C7'} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: isDarkMode ? '#60A5FA' : '#0284C7' }}>
                {t('tip') || 'Soso-kevitra'}
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: isDarkMode ? '#94A3B8' : '#64748B', lineHeight: 20 }}>
              {t('tip_daily_export') || 'Afaka manao export PDF isan\'andro ianao raha te-hanaraka akaiky ny fandanianao.'}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}
