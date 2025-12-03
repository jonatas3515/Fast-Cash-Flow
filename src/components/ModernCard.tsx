import React from 'react';
import { View, StyleSheet, Platform, ViewStyle } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';

interface ModernCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  elevated?: boolean;
}

export const ModernCard: React.FC<ModernCardProps> = ({ 
  children, 
  style, 
  padding = 16,
  elevated = true 
}) => {
  const { theme } = useThemeCtx();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          padding,
          ...(elevated && Platform.OS === 'web' ? {
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          } : {}),
          ...(elevated && Platform.OS !== 'web' ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          } : {}),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 16,
    width: '100%',
  },
});
