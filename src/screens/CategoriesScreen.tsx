import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  FlatList,
} from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentCompanyId } from '../lib/company';

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'both';
  icon: string;
  color: string;
  is_default: boolean;
}

const AVAILABLE_ICONS = [
  'cash-outline', 'card-outline', 'cart-outline', 'home-outline',
  'car-outline', 'restaurant-outline', 'medical-outline', 'school-outline',
  'shirt-outline', 'phone-portrait-outline', 'wifi-outline', 'water-outline',
  'flash-outline', 'construct-outline', 'briefcase-outline', 'people-outline',
  'gift-outline', 'airplane-outline', 'bus-outline', 'fitness-outline',
  'pizza-outline', 'cafe-outline', 'barbell-outline', 'game-controller-outline',
];

const AVAILABLE_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#06b6d4',
  '#84cc16', '#a855f7', '#f43f5e', '#eab308', '#22c55e',
];

export default function CategoriesScreen() {
  const { theme, mode } = useThemeCtx();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [companyId, setCompanyId] = useState<string>('');

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<'income' | 'expense' | 'both'>('expense');
  const [selectedIcon, setSelectedIcon] = useState('pricetag-outline');
  const [selectedColor, setSelectedColor] = useState('#6366f1');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      // Usar getCurrentCompanyId que funciona para owners e funcionários
      const currentCompanyId = await getCurrentCompanyId();

      if (!currentCompanyId) {
        console.error('Erro: company_id não encontrado');
        Alert.alert('Erro', 'Não foi possível identificar a empresa. Faça login novamente.');
        return;
      }

      setCompanyId(currentCompanyId);

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('company_id', currentCompanyId)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setType('expense');
    setSelectedIcon('pricetag-outline');
    setSelectedColor('#6366f1');
    setModalVisible(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setType(category.type);
    setSelectedIcon(category.icon);
    setSelectedColor(category.color);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Atenção', 'Por favor, digite o nome da categoria.');
      return;
    }

    try {
      if (editingCategory) {
        // Atualizar categoria existente
        const { error } = await supabase
          .from('categories')
          .update({
            name: name.trim(),
            type,
            icon: selectedIcon,
            color: selectedColor,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCategory.id);

        if (error) throw error;
        Alert.alert('Sucesso', 'Categoria atualizada com sucesso!');
      } else {
        // Criar nova categoria - garantir que temos um company_id válido
        let currentCompanyId = companyId;

        // Se companyId estiver vazio, buscar novamente
        if (!currentCompanyId) {
          currentCompanyId = await getCurrentCompanyId() || '';
        }

        // Validar UUID antes de enviar
        if (!currentCompanyId || currentCompanyId.length < 36) {
          console.error('Company ID inválido:', currentCompanyId);
          Alert.alert('Erro', 'Não foi possível identificar a empresa. Faça login novamente.');
          return;
        }

        console.log('Criando categoria com company_id:', currentCompanyId);

        const { error } = await supabase
          .from('categories')
          .insert({
            company_id: currentCompanyId,
            name: name.trim(),
            type,
            icon: selectedIcon,
            color: selectedColor,
            is_default: false,
          });

        if (error) throw error;
        Alert.alert('Sucesso', 'Categoria criada com sucesso!');
      }

      setModalVisible(false);
      loadCategories();
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      Alert.alert('Erro', 'Não foi possível salvar a categoria.');
    }
  };

  const handleDelete = (category: Category) => {
    if (category.is_default) {
      Alert.alert('Atenção', 'Categorias padrão não podem ser deletadas.');
      return;
    }

    Alert.alert(
      'Confirmar Exclusão',
      `Deseja realmente excluir a categoria "${category.name}"? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('categories')
                .delete()
                .eq('id', category.id);

              if (error) throw error;
              Alert.alert('Sucesso', 'Categoria excluída com sucesso!');
              loadCategories();
            } catch (error) {
              console.error('Erro ao deletar categoria:', error);
              Alert.alert('Erro', 'Não foi possível excluir a categoria.');
            }
          },
        },
      ]
    );
  };

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[styles.categoryCard, { backgroundColor: theme.card }]}
      onPress={() => openEditModal(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
        <Ionicons name={item.icon as any} size={28} color={item.color} />
      </View>
      <View style={styles.categoryInfo}>
        <Text style={[styles.categoryName, { color: theme.text }]}>{item.name}</Text>
        <Text style={[styles.categoryType, { color: theme.textSecondary }]}>
          {item.type === 'income' ? 'Receita' : item.type === 'expense' ? 'Despesa' : 'Ambos'}
          {item.is_default && ' • Padrão'}
        </Text>
      </View>
      {!item.is_default && (
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            handleDelete(item);
          }}
          style={styles.deleteButton}
        >
          <Ionicons name="trash-outline" size={20} color={theme.negative} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.text }}>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { alignItems: 'center' }]}>
        <Text style={[styles.title, { color: mode === 'dark' ? theme.primary : theme.negative, textAlign: 'center' }]}>Minhas Categorias</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary, textAlign: 'center' }]}>
          Organize suas receitas e despesas do seu jeito
        </Text>
      </View>

      <FlatList
        data={categories}
        renderItem={renderCategoryItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="file-tray-outline" size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Nenhuma categoria criada ainda
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={openCreateModal}
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* Modal de Criar/Editar */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.label, { color: theme.text }]}>Nome da Categoria</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                placeholder="Ex: Alimentação, Salários, Fornecedores..."
                placeholderTextColor={theme.textSecondary}
                value={name}
                onChangeText={setName}
              />

              <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>Tipo</Text>
              <View style={styles.typeButtons}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    { backgroundColor: type === 'expense' ? theme.primary : theme.background, borderColor: theme.border },
                  ]}
                  onPress={() => setType('expense')}
                >
                  <Text style={[styles.typeButtonText, { color: type === 'expense' ? '#FFF' : theme.text }]}>
                    Despesa
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    { backgroundColor: type === 'income' ? theme.primary : theme.background, borderColor: theme.border },
                  ]}
                  onPress={() => setType('income')}
                >
                  <Text style={[styles.typeButtonText, { color: type === 'income' ? '#FFF' : theme.text }]}>
                    Receita
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    { backgroundColor: type === 'both' ? theme.primary : theme.background, borderColor: theme.border },
                  ]}
                  onPress={() => setType('both')}
                >
                  <Text style={[styles.typeButtonText, { color: type === 'both' ? '#FFF' : theme.text }]}>
                    Ambos
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, { color: theme.text, marginTop: 20 }]}>Ícone</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
                <View style={styles.iconGrid}>
                  {AVAILABLE_ICONS.map((icon) => (
                    <TouchableOpacity
                      key={icon}
                      style={[
                        styles.iconOption,
                        {
                          backgroundColor: selectedIcon === icon ? theme.primary : theme.background,
                          borderColor: theme.border,
                        },
                      ]}
                      onPress={() => setSelectedIcon(icon)}
                    >
                      <Ionicons
                        name={icon as any}
                        size={24}
                        color={selectedIcon === icon ? '#FFF' : theme.text}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={[styles.label, { color: theme.text, marginTop: 20 }]}>Cor</Text>
              <View style={styles.colorGrid}>
                {AVAILABLE_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      {
                        backgroundColor: color,
                        borderWidth: selectedColor === color ? 3 : 1,
                        borderColor: selectedColor === color ? theme.text : 'transparent',
                      },
                    ]}
                    onPress={() => setSelectedColor(color)}
                  />
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: theme.border }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.primary }]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    // @ts-ignore - boxShadow for web compatibility
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryType: {
    fontSize: 13,
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    // @ts-ignore - boxShadow for web compatibility
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.25)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  iconScroll: {
    marginBottom: 16,
  },
  iconGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
