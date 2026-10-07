import { Platform } from 'react-native';

export const Palette = {
  emerald: '#10B981',
  forest: '#059669',
  mint: '#34D399',
  teal: '#0D9488',
  lime: '#84CC16',
  cyan: '#06B6D4',
  blue: '#3B82F6',
  indigo: '#6366F1',
  violet: '#8B5CF6',
  amber: '#F59E0B',
  rose: '#F43F5E',
  orange: '#F97316',
} as const;

export const PlanColorPresets = [
  Palette.emerald,
  Palette.forest,
  Palette.mint,
  Palette.teal,
  Palette.lime,
  Palette.cyan,
  Palette.blue,
  Palette.indigo,
  Palette.violet,
  Palette.amber,
  Palette.rose,
  Palette.orange,
];

export const PlanIcons = [
  'checkbox-marked-circle-outline',
  'dumbbell',
  'book-open-variant',
  'code-tags',
  'weather-sunny',
  'water-outline',
  'meditation',
  'coffee',
  'run',
  'food-apple-outline',
  'laptop',
  'heart-pulse',
  'brush',
  'music',
  'bed',
] as const;

export const Colors = {
  dark: {
    background: '#0B0F0D',
    card: '#131C17',
    cardElevated: '#1B2922',
    border: '#23392E',
    borderLight: '#1B2C24',
    text: '#F0FDF4',
    textMuted: '#94A3B8',
    textDim: '#64748B',
    primary: '#10B981',
    primaryDark: '#059669',
    primaryLight: '#064E3B',
    accent: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
    success: '#10B981',
    streak: '#10B981',
    perfect: '#34D399',
    skip: '#64748B',
    emptyHeatmap: '#17251E',
  },
  light: {
    background: '#F8FAF8',
    card: '#FFFFFF',
    cardElevated: '#F0FDF4',
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    text: '#0F172A',
    textMuted: '#475569',
    textDim: '#94A3B8',
    primary: '#10B981',
    primaryDark: '#059669',
    primaryLight: '#ECFDF5',
    accent: '#10B981',
    danger: '#DC2626',
    warning: '#D97706',
    success: '#059669',
    streak: '#059669',
    perfect: '#10B981',
    skip: '#94A3B8',
    emptyHeatmap: '#E2E8F0',
  },
} as const;

export type ThemeMode = 'light' | 'dark' | 'system';

export const Typography = {
  hero: {
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: -0.6,
  },
  title1: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
  },
  title2: {
    fontSize: 18,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  headline: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
  },
  captionMedium: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  tiny: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  huge: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;
