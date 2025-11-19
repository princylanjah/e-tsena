import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { COLORS, SECTION_COLORS } from '../../src/constants/colors';

const ColorRow = ({ label, hex }: { label: string; hex: string }) => (
  <View style={styles.row}>
    <View style={[styles.swatch, { backgroundColor: hex }]} />
    <View style={styles.meta}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.hex}>{hex}</Text>
    </View>
  </View>
);

export default function ChartePage() {
  const primary = [
    ['Lavender', COLORS.lavender],          // #C6C2D9
    ['Purple soft', COLORS.purpleSoft],     // #7E779A
    ['Ice Gray', COLORS.iceGray],           // #F4F4F7
    ['White', COLORS.white],                // #FFFFFF
  ];

  const secondary = [
    ['Pink pastel', COLORS.pinkPastel],     // #F7A8BA
    ['Light Peach', COLORS.peachLight],     // #F9C6B0
    ['Cream', COLORS.cream],                // #FDF6EF
  ];

  const accents = [
    ['Yellow soft', COLORS.accentYellow],   // #F5D76E
    ['Red (error)', COLORS.accentRed],      // #E25555
    ['Green (success)', COLORS.accentGreen],// #71C08E
    ['Orange', COLORS.accentOrange],        // #F7A648
  ];

  const products = [
    ['Blueberry violet', COLORS.blueberry], // #9A94C6
    ['Pistachio green', COLORS.pistachio],  // #C7D3AA
    ['Vanilla cream', COLORS.vanilla],      // #F0EADC
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Charte graphique — Couleurs</Text>

      <Text style={styles.section}>Primary</Text>
      {primary.map(([label, hex]) => (
        <ColorRow key={label as string} label={label as string} hex={hex as string} />
      ))}

      <Text style={styles.section}>Secondary</Text>
      {secondary.map(([label, hex]) => (
        <ColorRow key={label as string} label={label as string} hex={hex as string} />
      ))}

      <Text style={styles.section}>Accents</Text>
      {accents.map(([label, hex]) => (
        <ColorRow key={label as string} label={label as string} hex={hex as string} />
      ))}

      <Text style={styles.section}>Product tones</Text>
      {products.map(([label, hex]) => (
        <ColorRow key={label as string} label={label as string} hex={hex as string} />
      ))}

      <Text style={styles.section}>Section examples</Text>
      {Object.keys(SECTION_COLORS).map((key) => {
        const s = (SECTION_COLORS as any)[key];
        return (
          <View key={key} style={styles.sectionBlock}>
            <Text style={styles.sectionBlockTitle}>{key}</Text>
            <ColorRow label="Primary" hex={s.primary} />
            <ColorRow label="Light" hex={s.light} />
            <ColorRow label="Medium" hex={s.medium} />
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12, color: COLORS.text },
  section: { marginTop: 12, marginBottom: 8, fontSize: 14, fontWeight: '600', color: COLORS.textLight },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  swatch: { width: 64, height: 40, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border },
  meta: { marginLeft: 12 },
  label: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  hex: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  sectionBlock: { marginTop: 10, padding: 10, backgroundColor: COLORS.surface, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  sectionBlockTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
});
