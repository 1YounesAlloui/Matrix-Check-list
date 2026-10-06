import { Platform } from 'react-native';

export const Palette = {
  emerald: '#10B981',
  violet: '#8B5CF6',
  blue: '#3B82F6',
  amber: '#F59E0B',
  rose: '#F43F5E',
  cyan: '#06B6D4',
  orange: '#F97316',
  indigo: '#6366F1',
  purple: '#A855F7',
  pink: '#EC4899',
} as const;

export const PlanColorPresets = [
  Palette.emerald,
  Palette.violet,
  Palette.blue,
  Palette.amber,
  Palette.rose,
  Palette.cyan,
  Palette.orange,
  Palette.indigo,
  Palette.purple,
  Palette.pink,
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
    background: '#0B0D11',
    card: '#14171F',
    cardElevated: '#1D222E',
    border: '#252B3A',
    borderLight: '#1B202C',
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    textDim: '#64748B',
    primary: '#10B981',
    primaryDark: '#059669',
    accent: '#6366F1',
    danger: '#EF4444',
    warning: '#F59E0B',
    success: '#10B981',
    streak: '#FF6B00',
    perfect: '#FBBF24',
    skip: '#64748B',
    emptyHeatmap: '#1A1E29',
  },
  light: {
    background: '#F8FAFC',
    card: '#FFFFFF',
    cardElevated: '#F1F5F9',
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    text: '#0F172A',
    textMuted: '#64748B',
    textDim: '#94A3B8',
    primary: '#10B981',
    primaryDark: '#059669',
    accent: '#4F46E5',
    danger: '#DC2626',
    warning: '#D97706',
    success: '#059669',
    streak: '#EA580C',
    perfect: '#D97706',
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
