import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform, ViewStyle, TextStyle } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';

interface ModernButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const ModernButton: React.FC<ModernButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  disabled = false,
  style,
  textStyle,
}) => {
  const { theme } = useThemeCtx();

  const getBackgroundColor = () => {
    if (disabled) return theme.textSecondary;
    switch (variant) {
      case 'primary':
        return theme.primary;
      case 'secondary':
        return theme.secondary;
      case 'success':
        return theme.positive;
      case 'danger':
        return theme.negative;
      case 'warning':
        return theme.warning;
      default:
        return theme.primary;
    }
  };

  const getSize = () => {
    switch (size) {
      case 'small':
        return { paddingVertical: 8, paddingHorizontal: 16, fontSize: 13, minHeight: 36 };
      case 'large':
        return { paddingVertical: 16, paddingHorizontal: 24, fontSize: 16, minHeight: 56 };
      default:
        return { paddingVertical: 12, paddingHorizontal: 20, fontSize: 14, minHeight: 48 };
    }
  };

  const sizeStyles = getSize();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          paddingVertical: sizeStyles.paddingVertical,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          minHeight: sizeStyles.minHeight,
          width: fullWidth ? '100%' : 'auto',
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
      activeOpacity={0.8}
    >
      <Text
        style={[
          styles.text,
          {
            fontSize: sizeStyles.fontSize,
            color: '#FFFFFF',
          },
          textStyle,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: Platform.OS === 'web' ? 10 : 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...Platform.select({
      web: {
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      },
    }),
  },
  text: {
    fontWeight: '700',
    textAlign: 'center',
  },
});
