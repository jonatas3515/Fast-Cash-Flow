import { DarkTheme as NavDarkTheme, DefaultTheme as NavDefaultTheme } from '@react-navigation/native';
export const colors = {
  red: '#D90429',
  yellow: '#FFC300',
  black: '#111111',
  white: '#FFFFFF',
  green: '#16A34A',
  gray100: '#F5F5F5',
  gray700: '#3F3F46',
};

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
