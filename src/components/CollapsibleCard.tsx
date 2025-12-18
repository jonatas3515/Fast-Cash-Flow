import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeCtx } from '../theme/ThemeProvider';

// Habilitar LayoutAnimation no Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CollapsibleCardProps {
  id: string; // ID único para persistir estado
  title: string;
  icon?: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  headerColor?: string;
  headerBgColor?: string;
}

export default function CollapsibleCard({
  id,
  title,
  icon,
  children,
  defaultExpanded = true,
  headerColor,
  headerBgColor,
}: CollapsibleCardProps) {
  const { theme } = useThemeCtx();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isLoaded, setIsLoaded] = useState(false);

  // Carregar estado salvo
  useEffect(() => {
    const loadState = async () => {
      try {
        const saved = await AsyncStorage.getItem(`card_collapsed_${id}`);
        if (saved !== null) {
          setIsExpanded(saved !== 'true'); // 'true' = collapsed, so expanded = false
        }
        setIsLoaded(true);
      } catch (e) {
        setIsLoaded(true);
      }
    };
    loadState();
  }, [id]);

  // Salvar estado quando mudar
  const toggleExpanded = async () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newState = !isExpanded;
    setIsExpanded(newState);
    try {
      await AsyncStorage.setItem(`card_collapsed_${id}`, newState ? 'false' : 'true');
    } catch (e) {
      // Ignorar erro de salvamento
    }
  };

  // Não renderizar até carregar estado
  if (!isLoaded) return null;

  const textColor = headerColor || theme.text;
  const bgColor = headerBgColor || theme.card;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Header sempre visível */}
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.titleRow}>
          {icon && <Text style={styles.icon}>{icon}</Text>}
          <Text style={[styles.title, { color: textColor }]}>{title}</Text>
        </View>
        <TouchableOpacity
          style={[styles.toggleBtn, { backgroundColor: isExpanded ? '#E5E7EB' : '#DBEAFE' }]}
          onPress={toggleExpanded}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.toggleIcon, { color: isExpanded ? '#6B7280' : '#3B82F6' }]}>
            {isExpanded ? '−' : '+'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Conteúdo colapsável */}
      {isExpanded && (
        <View style={styles.content}>
          {children}
        </View>
      )}
    </View>
  );
}

// Wrapper simples para adicionar funcionalidade de colapso a qualquer componente
export function CollapsibleWrapper({
  id,
  title,
  icon,
  children,
  defaultExpanded = true,
}: {
  id: string;
  title: string;
  icon?: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const { theme } = useThemeCtx();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadState = async () => {
      try {
        const saved = await AsyncStorage.getItem(`wrapper_collapsed_${id}`);
        if (saved !== null) {
          setIsExpanded(saved !== 'true');
        }
        setIsLoaded(true);
      } catch (e) {
        setIsLoaded(true);
      }
    };
    loadState();
  }, [id]);

  const toggleExpanded = async () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newState = !isExpanded;
    setIsExpanded(newState);
    try {
      await AsyncStorage.setItem(`wrapper_collapsed_${id}`, newState ? 'false' : 'true');
    } catch (e) {}
  };

  if (!isLoaded) return null;

  return (
    <View>
      {/* Mini header para colapsar */}
      <TouchableOpacity
        style={styles.wrapperHeader}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.wrapperTitleRow}>
          {icon && <Text style={styles.wrapperIcon}>{icon}</Text>}
          <Text style={[styles.wrapperTitle, { color: theme.textSecondary }]}>{title}</Text>
        </View>
        <View style={[styles.wrapperToggle, { backgroundColor: isExpanded ? '#E5E7EB' : '#DBEAFE' }]}>
          <Text style={[styles.wrapperToggleText, { color: isExpanded ? '#6B7280' : '#3B82F6' }]}>
            {isExpanded ? '−' : '+'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Conteúdo */}
      {isExpanded && children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  toggleBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleIcon: {
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  wrapperHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  wrapperTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wrapperIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  wrapperTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  wrapperToggle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wrapperToggleText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
