import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { spacing, radii, fontSizes, fontWeights } from '../theme';
import { normalizeText as normalizeStr } from '../utils/string';

// Re-export para manter compatibilidade com imports existentes
export const normalizeText = normalizeStr;

interface FilterOption {
  key: string;
  label: string;
  color?: string; // Cor opcional para cada opção
}

interface FilterHeaderProps {
  searchValue: string;
  onSearchChange: (text: string) => void;
  filterOptions: FilterOption[];
  activeFilter: string;
  onFilterChange: (key: string) => void;
  searchPlaceholder?: string;
  showClearButton?: boolean;
  onClear?: () => void;
}

export default function FilterHeader({
  searchValue,
  onSearchChange,
  filterOptions,
  activeFilter,
  onFilterChange,
  searchPlaceholder = 'Buscar...',
  showClearButton = true,
  onClear,
}: FilterHeaderProps) {
  const { theme } = useThemeCtx();

  const hasActiveFilters = searchValue.trim() !== '' || activeFilter !== 'all';

  const handleClear = () => {
    onSearchChange('');
    onFilterChange('all');
    onClear?.();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Campo de busca */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, {
              color: theme.text,
              backgroundColor: theme.card,
              borderColor: theme.border,
            }]}
            value={searchValue}
            onChangeText={onSearchChange}
            placeholder={searchPlaceholder}
            placeholderTextColor={theme.textSecondary}
          />
          {searchValue !== '' && (
            <TouchableOpacity
              style={styles.clearSearch}
              onPress={() => onSearchChange('')}
            >
              <Text style={{ color: theme.textSecondary }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Chips de filtro */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContent}
      >
        {filterOptions.map((option) => {
          const isActive = activeFilter === option.key;
          const chipColor = option.color || theme.primary;

          return (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive ? chipColor + '20' : theme.card,
                  borderColor: isActive ? chipColor : theme.border,
                }
              ]}
              onPress={() => onFilterChange(option.key)}
              activeOpacity={0.7}
            >
              {isActive && option.color && (
                <View style={[styles.chipDot, { backgroundColor: option.color }]} />
              )}
              <Text style={[
                styles.chipText,
                {
                  color: isActive ? chipColor : theme.text,
                  fontWeight: isActive ? fontWeights.semibold : fontWeights.medium,
                }
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Botão Limpar */}
        {showClearButton && hasActiveFilters && (
          <TouchableOpacity
            style={[styles.clearButton, { borderColor: '#D90429' }]}
            onPress={handleClear}
            activeOpacity={0.7}
          >
            <Text style={[styles.clearButtonText, { color: '#D90429' }]}>
              ✕ Limpar
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Indicador de filtros ativos */}
      {hasActiveFilters && (
        <View style={styles.activeIndicator}>
          <Text style={[styles.activeIndicatorText, { color: theme.textSecondary }]}>
            {searchValue && activeFilter !== 'all'
              ? `Buscando "${searchValue}" em ${filterOptions.find(o => o.key === activeFilter)?.label}`
              : searchValue
                ? `Buscando "${searchValue}"`
                : `Filtrando por ${filterOptions.find(o => o.key === activeFilter)?.label}`
            }
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: spacing.sm + 4,
    zIndex: 1,
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
    paddingLeft: spacing.lg + spacing.sm,
    fontSize: fontSizes.base,
    height: 44,
  },
  clearSearch: {
    position: 'absolute',
    right: spacing.sm + 4,
    padding: 4,
  },
  chipsContent: {
    gap: spacing.xs,
    paddingRight: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    borderWidth: 1,
    gap: 4,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipText: {
    fontSize: fontSizes.xs,
  },
  clearButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  clearButtonText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
  },
  activeIndicator: {
    paddingTop: spacing.xs,
  },
  activeIndicatorText: {
    fontSize: fontSizes.xs,
    fontStyle: 'italic',
  },
});
