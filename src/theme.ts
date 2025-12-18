import { DarkTheme as NavDarkTheme, DefaultTheme as NavDefaultTheme } from '@react-navigation/native';

// ============================================================================
// DESIGN SYSTEM TOKENS
// ============================================================================

// Base colors
export const colors = {
  red: '#D90429',
  yellow: '#FFC300',
  black: '#111111',
  white: '#FFFFFF',
  green: '#16A34A',
  gray100: '#F5F5F5',
  gray700: '#3F3F46',
};

// Typography scale (in pixels)
export const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

// Font weights
export const fontWeights = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

// Spacing grid (multiples of 4)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border radius scale
export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 999,
};

// Shadow presets
export const shadows = {
  sm: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  xl: {
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 12,
  },
};

// Card style presets
export const cardStyles = {
  base: {
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
  },
  elevated: {
    borderRadius: radii.lg,
    padding: spacing.md,
    ...shadows.md,
  },
};

// ============================================================================
// THEME DEFINITIONS
// ============================================================================

export const lightTheme = {
  background: '#F9FAFB',
  text: colors.black,
  card: '#FFFFFF',
  cardSecondary: colors.gray100,
  input: '#F3F4F6',
  inputBorder: '#D1D5DB',
  inputBorderFocus: '#16A34A',
  inputPlaceholder: '#9CA3AF',
  primary: '#16A34A',
  secondary: '#3B82F6',
  accent: colors.yellow,
  warning: '#F59E0B',
  positive: colors.green,
  negative: '#D90429',
  drawerBackground: '#FFFFFF',
  drawerHeaderBackground: '#D90429',
  drawerHeaderText: '#FFFFFF',
  drawerHeaderTextSecondary: 'rgba(255, 255, 255, 0.9)',
  drawerActiveBackground: 'rgba(4, 120, 87, 0.1)',
  drawerActiveBorder: '#D90429',
  border: '#E5E7EB',
  textSecondary: '#6B7280',
  shadow: 'rgba(0, 0, 0, 0.1)',
  scrollbar: '#9CA3AF',
  scrollbarTrack: '#F3F4F6',
  scrollbarThumb: '#9CA3AF',
  scrollbarThumbHover: '#B70320',
};

export const darkTheme = {
  background: '#1F2937',
  text: colors.white,
  card: '#374151',
  cardSecondary: '#4B5563',
  input: '#111827',
  inputBorder: '#6B7280',
  inputBorderFocus: '#16A34A',
  inputPlaceholder: '#9CA3AF',
  primary: '#16A34A',
  secondary: '#3B82F6',
  accent: colors.yellow,
  warning: '#F59E0B',
  positive: colors.green,
  negative: '#D90429',
  drawerBackground: '#1F2937',
  drawerHeaderBackground: '#16a34a',
  drawerHeaderText: '#FFFFFF',
  drawerHeaderTextSecondary: 'rgba(255, 255, 255, 0.9)',
  drawerActiveBackground: 'rgba(4, 120, 87, 0.15)',
  drawerActiveBorder: '#16a34a',
  border: '#4B5563',
  textSecondary: '#d5dae2ff',
  shadow: 'rgba(0, 0, 0, 0.1)',
  scrollbar: '#1F2937',
  scrollbarTrack: '#374151',
  scrollbarThumb: '#1F2937',
  scrollbarThumbHover: '#15803d',
};

export type Theme = typeof lightTheme;

export function toNavigationTheme(t: Theme) {
  const base = t === (darkTheme as any) ? NavDarkTheme : NavDefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: t.primary,
      background: t.background,
      card: t.card,
      text: t.text,
      notification: t.accent,
    },
  } as typeof NavDefaultTheme;
}
