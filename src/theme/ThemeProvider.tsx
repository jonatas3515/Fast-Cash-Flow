import React from 'react';
import { Appearance } from 'react-native';
import { darkTheme, lightTheme, Theme, toNavigationTheme } from '../theme';

export type ThemeContextType = {
  theme: Theme;
  mode: 'light' | 'dark';
  setMode: (m: 'light' | 'dark') => void;
  navTheme: ReturnType<typeof toNavigationTheme>;
};

const ThemeContext = React.createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Inicializa baseado no sistema, mas a aplicação opera apenas com 'light' ou 'dark'
  const initial: 'light' | 'dark' = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
  const [mode, setMode] = React.useState<'light' | 'dark'>(initial);
  const effective = mode === 'dark' ? darkTheme : lightTheme;
  const navTheme = React.useMemo(() => toNavigationTheme(effective), [effective]);
  const ctx: ThemeContextType = {
    theme: effective,
    mode,
    setMode,
    navTheme,
  };
  return <ThemeContext.Provider value={ctx}>{children}</ThemeContext.Provider>;
}

export function useThemeCtx() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error('ThemeContext not found');
  return ctx;
}
