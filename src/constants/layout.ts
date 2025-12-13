import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const LAYOUT = {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  PADDING: 20,
  PADDING_SMALL: 12,
  HEADER_HEIGHT: 60,
  BOTTOM_NAV_HEIGHT: 70,

  isSmallScreen: SCREEN_WIDTH < 360,
  isMediumScreen: SCREEN_WIDTH >= 360 && SCREEN_WIDTH < 768,
  isLargeScreen: SCREEN_WIDTH >= 768,

  GRID_COLUMNS: 2,
  GRID_GAP: 12,
};

export const CARD_WIDTH = (SCREEN_WIDTH - LAYOUT.PADDING * 2 - LAYOUT.GRID_GAP) / LAYOUT.GRID_COLUMNS;