import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';

interface ScreenTitleProps {
  title: string;
  subtitle?: string;
}

export default function ScreenTitle({ title, subtitle }: ScreenTitleProps) {
  const { theme, mode } = useThemeCtx();
  
  return (
    <View style={styles.container}>
      <Text style={[
        styles.title,
        { color: mode === 'dark' ? '#16a34a' : '#D90429' }
      ]}>
        {title}
      </Text>
      
      {subtitle && (
        <Text style={styles.subtitle}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,          // Tamanho padrão
    fontWeight: '800',     // Bold
    textAlign: 'center',   // Centralizado
  },
  subtitle: {
    color: '#888',         // Cinza médio
    fontSize: 12,          // Menor que o título
    textAlign: 'center',   // Centralizado
  },
});
