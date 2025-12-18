import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

interface FilterDropdownProps {
  label: string;
  options: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
  theme: any;
}

export default function FilterDropdown({ label, options, selectedValue, onSelect, theme }: FilterDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.text, fontSize: 14, fontWeight: '600', marginBottom: 4 }]}>
        {label}
      </Text>
      
      <TouchableOpacity
        style={[styles.dropdownButton, { 
          backgroundColor: theme.input, 
          borderColor: theme.inputBorder,
          borderWidth: 1,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between'
        }]}
        onPress={() => setIsOpen(!isOpen)}
      >
        <Text style={{ color: selectedValue ? theme.text : theme.textSecondary, fontSize: 16 }}>
          {selectedValue || 'Selecione uma opção'}
        </Text>
        <Text style={{ color: theme.textSecondary, fontSize: 16 }}>
          {isOpen ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {isOpen && (
        <View style={[styles.dropdownContent, { 
          backgroundColor: theme.card,
          borderColor: theme.inputBorder,
          borderWidth: 1,
          borderRadius: 8,
          marginTop: 4,
          maxHeight: 200,
          zIndex: 1000
        }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionItem,
                  { 
                    backgroundColor: selectedValue === option ? theme.primary : 'transparent',
                    borderBottomColor: theme.inputBorder,
                    borderBottomWidth: 1
                  }
                ]}
                onPress={() => {
                  onSelect(option);
                  setIsOpen(false);
                }}
              >
                <Text style={{ 
                  color: selectedValue === option ? '#fff' : theme.text,
                  fontSize: 14,
                  padding: 12
                }}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    zIndex: 1000,
  },
  label: {
    marginBottom: 4,
  },
  dropdownButton: {
    minHeight: 44,
  },
  dropdownContent: {
    elevation: 3,
    // Use boxShadow for web compatibility
    ...(typeof window !== 'undefined' ? { boxShadow: '0 2px 4px rgba(0,0,0,0.1)' } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    }),
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
