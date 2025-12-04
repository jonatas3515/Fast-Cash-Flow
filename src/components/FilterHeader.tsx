import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';

// Função de normalização de texto (case-insensitive, sem acentos)
export const normalizeText = (text: string): string => {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
};

interface FilterOption {
  key: string;
  label: string;
}

interface FilterHeaderProps {
  searchValue: string;
  onSearchChange: (text: string) => void;
  filterOptions: FilterOption[];
  activeFilter: string;
  onFilterChange: (key: string) => void;
  searchPlaceholder?: string;
}

export default function FilterHeader({
  searchValue,
  onSearchChange,
  filterOptions,
  activeFilter,
  onFilterChange,
  searchPlaceholder = 'Buscar...'
}: FilterHeaderProps) {
  const { theme } = useThemeCtx();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Campo de busca */}
      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.searchInput, { 
            color: theme.text, 
            backgroundColor: theme.input,
            borderColor: theme.inputBorder 
          }]}
          value={searchValue}
          onChangeText={onSearchChange}
          placeholder={searchPlaceholder}
          placeholderTextColor={theme.textSecondary}
        />
      </View>

      {/* Chips de filtro */}
      <View style={styles.chipsContainer}>
        {filterOptions.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.chip,
              {
                backgroundColor: activeFilter === option.key ? '#dcfce7' : theme.card,
                borderColor: activeFilter === option.key ? '#16A34A' : '#9ca3af',
              }
            ]}
            onPress={() => onFilterChange(option.key)}
          >
            <Text style={[
              styles.chipText,
              {
                color: activeFilter === option.key ? '#166534' : theme.text,
                fontWeight: activeFilter === option.key ? '700' : '500'
              }
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    gap: 12,
  },
  searchContainer: {
    paddingHorizontal: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    height: 44,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
  },
});
