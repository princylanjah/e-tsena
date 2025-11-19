/**
 * ================================
 *   CHARTE GRAPHIQUE E-TSENA
 *   Couleur de base: #7143b5 (Violet principal)
 *   Design moderne et cohérent sur toutes les pages
 * ================================
 */

// ==================== COULEURS PRINCIPALES ====================
export const COLORS = {
  // BRAND / PRIMARY (Violet #7143b5 - couleur de base)
  primary: '#7143b5',        // Violet principal BASE
  primaryDark: '#5d3694',    // Violet foncé (-20% luminosité)
  primaryLight: '#8b5fd4',   // Violet clair (+15% luminosité)
  primaryVeryLight: '#b99ae6', // Violet très clair (+40% luminosité)
  white: '#FFFFFF',          // Blanc pur

  // COULEURS SECONDAIRES (compatibles avec #7143b5)
  secondary: '#4a90e2',      // Bleu harmonieux
  secondaryDark: '#357ab8',  // Bleu foncé
  secondaryLight: '#6aa8ed', // Bleu clair
  
  // COULEURS D'ACCENTUATION (complémentaires au violet)
  accent: '#ffa726',         // Orange ambré (accentuation chaude)
  accentLight: '#ffb74d',    // Orange clair
  accentDark: '#f57c00',     // Orange foncé
  
  accentGreen: '#66bb6a',    // Vert pour succès/validation
  accentRed: '#ef5350',      // Rouge pour alertes
  accentYellow: '#ffee58',   // Jaune pour avertissements

  // ACCENT BUTTONS (harmonieux avec #7143b5)
  cyan: '#00bcd4',           // Cyan/Turquoise
  cyanLight: '#4dd0e1',      // Cyan clair
  coral: '#f06292',          // Coral/Pink
  coralLight: '#f48fb1',     // Coral clair

  // ICON COLORS (palette harmonieuse avec #7143b5)
  iconYellow: '#ffc107',     // Jaune ambré
  iconPink: '#ec407a',       // Rose vif
  iconViolet: '#9c27b0',     // Violet secondaire
  iconCoral: '#ff7043',      // Corail orangé

  // TEXTES
  text: '#212121',           // Texte principal très sombre
  textLight: '#757575',      // Texte secondaire gris
  textWhite: '#FFFFFF',      // Texte blanc sur fond coloré
  placeholder: '#BDBDBD',    // Placeholder

  // FEEDBACK / STATUS
  success: '#4caf50',        // Vert validation
  warning: '#ff9800',        // Orange warning
  danger: '#f44336',         // Rouge erreur
  info: '#2196f3',           // Bleu information

  // LAYOUT & SURFACES
  background: '#f5f5f5',     // Fond général gris clair
  surface: '#FFFFFF',        // Carte blanche
  cardShadow: 'rgba(113, 67, 181, 0.15)', // Ombre violette #7143b5
  border: '#e0e0e0',         // Bordure
  divider: '#eeeeee',        // Séparateurs
  overlay: 'rgba(0,0,0,0.5)',

  shadow: '#000000',
};

// ==================== COULEURS PAR SECTION ====================
// CHARTE UNIFIÉE : TOUTES les pages utilisent le MÊME violet #7143b5
// Design ergonomique et cohérent
export const SECTION_COLORS = {
  home: {
    primary: COLORS.primary,          // #7143b5
    light: COLORS.background,         // #f5f5f5
    medium: COLORS.primaryVeryLight,  // #b99ae6
    text: COLORS.text,
    gradient: [COLORS.primary, COLORS.primaryLight] as const,
  },
  achats: {
    primary: COLORS.primary,          // #7143b5 (MÊME couleur)
    light: '#ede7f6',                 // Violet très clair
    medium: COLORS.primaryLight,      // #8b5fd4
    text: COLORS.text,
    gradient: [COLORS.primary, COLORS.primaryLight] as const,
  },
  rapports: {
    primary: COLORS.primary,          // #7143b5 (MÊME couleur)
    light: '#ede7f6',                 // Violet très clair
    medium: COLORS.primaryLight,      // #8b5fd4
    text: COLORS.text,
    gradient: [COLORS.primary, COLORS.primaryLight] as const,
  },
  statistiques: {
    primary: COLORS.primary,          // #7143b5 (MÊME couleur)
    light: '#ede7f6',                 // Violet très clair
    medium: COLORS.primaryLight,      // #8b5fd4
    text: COLORS.text,
    gradient: [COLORS.primaryLight, COLORS.primary] as const,
  },
  produits: {
    primary: COLORS.primary,          // #7143b5 (MÊME couleur)
    light: '#ede7f6',                 // Violet très clair
    medium: COLORS.primaryLight,      // #8b5fd4
    text: COLORS.text,
    gradient: [COLORS.primary, COLORS.primaryLight] as const,
  },
};

// ==================== OPACITÉS ====================
export const OPACITY = {
  disabled: 0.38,
  inactive: 0.54,
  divider: 0.12,
  overlay: 0.5,
};

// ==================== OMBRES ====================
export const ELEVATION = {
  small: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1,
    elevation: 1,
  },
  medium: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2.5,
    elevation: 3,
  },
  large: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
};

// ==================== ANIMATIONS ====================
export const ANIMATIONS = {
  duration: {
    fast: 200,
    normal: 300,
    slow: 500,
    verySlow: 800,
  },
  easing: {
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    smooth: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  },
};

// ==================== EXPORT GLOBAL ====================
export default {
  COLORS,
  SECTION_COLORS,
  OPACITY,
  ELEVATION,
  ANIMATIONS,
};
