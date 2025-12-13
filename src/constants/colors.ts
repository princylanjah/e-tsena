/**
 * ================================
 *   CHARTE GRAPHIQUE E-TSENA
 *   Palette harmonieuse: Violet • Bleu Canard • Rose Nude
 *   Fichier de constantes statiques
 * ================================
 */

// ==================== COULEURS PRINCIPALES ====================
export const COLORS = {
  // BRAND / PRIMARY (Violet - couleur principale)
  primary: '#7143b5',        // Violet principal BASE
  primaryDark: '#5d3694',    // Violet foncé
  primaryMedium: '#6b4ca3',  // Violet moyen
  primaryLight: '#8b5fd4',   // Violet clair
  primaryVeryLight: '#b99ae6', // Violet très clair
  primaryPale: '#e8dff5',    // Violet pâle (backgrounds)
  
  white: '#FFFFFF',          // Blanc pur
  black: '#000000',          // Noir pur

  // COULEURS SECONDAIRES - Bleu Canard (Teal)
  secondary: '#2D9596',      // Bleu canard BASE
  secondaryDark: '#1f6b6c',  // Bleu canard foncé
  secondaryMedium: '#268b8c', // Bleu canard moyen
  secondaryLight: '#52b5b6', // Bleu canard clair
  secondaryVeryLight: '#8dd3d4', // Bleu canard très clair
  secondaryPale: '#e0f5f5',  // Bleu canard pâle (backgrounds)
  
  // COULEURS TERTIAIRES - Rose Nude
  tertiary: '#D4A5A5',       // Rose nude BASE
  tertiaryDark: '#c08585',   // Rose nude foncé
  tertiaryMedium: '#ca9595', // Rose nude moyen
  tertiaryLight: '#e8c5c5',  // Rose nude clair
  tertiaryVeryLight: '#f0d5d5', // Rose nude très clair
  tertiaryPale: '#f9eded',   // Rose nude pâle (backgrounds)
  
  // COULEURS D'ACCENTUATION (complémentaires)
  accent: '#ffa726',         // Orange ambré
  accentLight: '#ffb74d',    // Orange clair
  accentDark: '#f57c00',     // Orange foncé
  
  accentGreen: '#66bb6a',    // Vert
  accentRed: '#ef5350',      // Rouge
  accentYellow: '#ffee58',   // Jaune
  accentBlue: '#42a5f5',     // Bleu

  // TEXTES
  text: '#212121',           // Texte principal très sombre
  textMedium: '#424242',     // Texte moyen
  textLight: '#757575',      // Texte secondaire gris
  textVeryLight: '#9e9e9e',  // Texte très clair
  textWhite: '#FFFFFF',      // Texte blanc sur fond coloré
  placeholder: '#BDBDBD',    // Placeholder

  // FEEDBACK / STATUS
  success: '#4caf50',        // Vert validation
  warning: '#ff9800',        // Orange warning
  danger: '#f44336',         // Rouge erreur
  info: '#2196f3',           // Bleu information

  // LAYOUT & SURFACES
  background: '#f5f5f5',     // Fond général gris clair
  card: '#FFFFFF',           // Carte blanche
  border: '#e0e0e0',         // Bordure
  
  // OMBRES
  shadow: '#000000',
};

// ==================== GRADIENTS PRÉDÉFINIS ====================
export const GRADIENTS = {
  // Gradients principaux
  violetPrimary: [COLORS.primary, COLORS.primaryLight] as const,
  tealPrimary: [COLORS.secondary, COLORS.secondaryLight] as const,
  rosePrimary: [COLORS.tertiary, COLORS.tertiaryLight] as const,
  
  // Gradients combinés
  violetToTeal: [COLORS.primary, COLORS.secondary] as const,
  violetToRose: [COLORS.primary, COLORS.tertiary] as const,
};

// ==================== EXPORT GLOBAL ====================
export default {
  COLORS,
  GRADIENTS,
};