/**
 * ================================
 *   CHARTE GRAPHIQUE E-TSENA
 *   Palette harmonieuse: Violet • Bleu Canard • Rose Nude
 *   Design moderne et cohérent sur toutes les pages
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
  accent: '#ffa726',         // Orange ambré (accentuation chaude)
  accentLight: '#ffb74d',    // Orange clair
  accentDark: '#f57c00',     // Orange foncé
  
  accentGreen: '#66bb6a',    // Vert pour succès/validation
  accentRed: '#ef5350',      // Rouge pour alertes
  accentYellow: '#ffee58',   // Jaune pour avertissements
  accentBlue: '#42a5f5',     // Bleu pour information

  // ACCENT BUTTONS (harmonieux avec la palette)
  cyan: '#00bcd4',           // Cyan/Turquoise
  cyanLight: '#4dd0e1',      // Cyan clair
  coral: '#f06292',          // Coral/Pink
  coralLight: '#f48fb1',     // Coral clair
  teal: '#009688',           // Teal
  tealLight: '#4db6ac',      // Teal clair

  // ICON COLORS (palette harmonieuse)
  iconYellow: '#ffc107',     // Jaune ambré
  iconPink: '#ec407a',       // Rose vif
  iconViolet: '#9c27b0',     // Violet secondaire
  iconCoral: '#ff7043',      // Corail orangé
  iconTeal: '#26a69a',       // Teal pour icônes
  iconBlue: '#29b6f6',       // Bleu clair pour icônes

  // TEXTES
  text: '#212121',           // Texte principal très sombre
  textMedium: '#424242',     // Texte moyen
  textLight: '#757575',      // Texte secondaire gris
  textVeryLight: '#9e9e9e',  // Texte très clair
  textWhite: '#FFFFFF',      // Texte blanc sur fond coloré
  placeholder: '#BDBDBD',    // Placeholder

  // FEEDBACK / STATUS
  success: '#4caf50',        // Vert validation
  successLight: '#81c784',   // Vert clair
  successDark: '#388e3c',    // Vert foncé
  warning: '#ff9800',        // Orange warning
  warningLight: '#ffb74d',   // Orange clair
  warningDark: '#f57c00',    // Orange foncé
  danger: '#f44336',         // Rouge erreur
  dangerLight: '#e57373',    // Rouge clair
  dangerDark: '#d32f2f',     // Rouge foncé
  error: '#f44336',          // Rouge erreur (alias)
  info: '#2196f3',           // Bleu information
  infoLight: '#64b5f6',      // Bleu clair
  infoDark: '#1976d2',       // Bleu foncé

  // LAYOUT & SURFACES
  background: '#f5f5f5',     // Fond général gris clair
  backgroundDark: '#e0e0e0', // Fond gris moyen
  surface: '#FFFFFF',        // Carte blanche
  surfaceLight: '#fafafa',   // Surface gris très clair
  cardShadow: 'rgba(113, 67, 181, 0.15)', // Ombre violette #7143b5
  border: '#e0e0e0',         // Bordure
  borderLight: '#eeeeee',    // Bordure claire
  borderDark: '#bdbdbd',     // Bordure foncée
  divider: '#eeeeee',        // Séparateurs
  overlay: 'rgba(0,0,0,0.5)',// Overlay sombre
  overlayLight: 'rgba(0,0,0,0.3)', // Overlay léger

  shadow: '#000000',
};

// ==================== COULEURS PAR SECTION ====================
// Chaque section peut utiliser une couleur dominante de la palette
export const SECTION_COLORS = {
  home: {
    primary: COLORS.primary,          // Violet #7143b5
    secondary: COLORS.secondary,       // Bleu canard
    tertiary: COLORS.tertiary,         // Rose nude
    light: COLORS.primaryPale,         // Fond violet pâle
    text: COLORS.text,
    gradient: [COLORS.primary, COLORS.primaryLight] as const,
    gradientSecondary: [COLORS.secondary, COLORS.secondaryLight] as const,
  },
  achats: {
    primary: COLORS.primary,          // Violet dominant
    secondary: COLORS.secondary,       // Bleu canard accent
    tertiary: COLORS.tertiary,         // Rose nude
    light: COLORS.primaryPale,         // Fond violet pâle
    text: COLORS.text,
    gradient: [COLORS.primary, COLORS.primaryLight] as const,
    gradientAlternate: [COLORS.secondary, COLORS.secondaryLight] as const,
  },
  rapports: {
    primary: COLORS.secondary,         // Bleu canard dominant
    secondary: COLORS.primary,         // Violet accent
    tertiary: COLORS.tertiary,         // Rose nude
    light: COLORS.secondaryPale,       // Fond bleu canard pâle
    text: COLORS.text,
    gradient: [COLORS.secondary, COLORS.secondaryLight] as const,
    gradientAlternate: [COLORS.primary, COLORS.primaryLight] as const,
  },
  statistiques: {
    primary: COLORS.tertiary,          // Rose nude dominant
    secondary: COLORS.primary,         // Violet accent
    tertiary: COLORS.secondary,        // Bleu canard
    light: COLORS.tertiaryPale,        // Fond rose nude pâle
    text: COLORS.text,
    gradient: [COLORS.tertiary, COLORS.tertiaryLight] as const,
    gradientAlternate: [COLORS.primary, COLORS.secondary] as const,
  },
  produits: {
    primary: COLORS.primary,          // Violet dominant
    secondary: COLORS.tertiary,        // Rose nude accent
    tertiary: COLORS.secondary,        // Bleu canard
    light: COLORS.primaryPale,         // Fond violet pâle
    text: COLORS.text,
    gradient: [COLORS.primary, COLORS.primaryLight] as const,
    gradientAlternate: [COLORS.tertiary, COLORS.tertiaryLight] as const,
  },
  parametres: {
    primary: COLORS.secondary,         // Bleu canard dominant
    secondary: COLORS.tertiary,        // Rose nude accent
    tertiary: COLORS.primary,          // Violet
    light: COLORS.secondaryPale,       // Fond bleu canard pâle
    text: COLORS.text,
    gradient: [COLORS.secondary, COLORS.secondaryLight] as const,
    gradientAlternate: [COLORS.tertiary, COLORS.tertiaryLight] as const,
  },
};

// ==================== GRADIENTS PRÉDÉFINIS ====================
export const GRADIENTS = {
  // Gradients principaux avec les 3 couleurs de la charte
  violetPrimary: [COLORS.primary, COLORS.primaryLight] as const,
  violetSecondary: [COLORS.primaryDark, COLORS.primary] as const,
  violetSoft: [COLORS.primaryLight, COLORS.primaryVeryLight] as const,
  
  tealPrimary: [COLORS.secondary, COLORS.secondaryLight] as const,
  tealSecondary: [COLORS.secondaryDark, COLORS.secondary] as const,
  tealSoft: [COLORS.secondaryLight, COLORS.secondaryVeryLight] as const,
  
  rosePrimary: [COLORS.tertiary, COLORS.tertiaryLight] as const,
  roseSecondary: [COLORS.tertiaryDark, COLORS.tertiary] as const,
  roseSoft: [COLORS.tertiaryLight, COLORS.tertiaryVeryLight] as const,
  
  // Gradients combinés (mélange des 3 couleurs)
  violetToTeal: [COLORS.primary, COLORS.secondary] as const,
  violetToRose: [COLORS.primary, COLORS.tertiary] as const,
  tealToRose: [COLORS.secondary, COLORS.tertiary] as const,
  
  // Gradients tricolores
  rainbow: [COLORS.primary, COLORS.secondary, COLORS.tertiary] as const,
  rainbowReverse: [COLORS.tertiary, COLORS.secondary, COLORS.primary] as const,
  
  // Gradients spéciaux
  sunset: [COLORS.tertiary, COLORS.accent] as const,
  ocean: [COLORS.secondary, COLORS.info] as const,
  success: [COLORS.success, COLORS.successLight] as const,
  danger: [COLORS.danger, COLORS.dangerLight] as const,
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
  GRADIENTS,
  OPACITY,
  ELEVATION,
  ANIMATIONS,
};
