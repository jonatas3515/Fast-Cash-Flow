import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useToast } from '../ui/ToastProvider';
import { supabase } from '../lib/supabase';
import { getCurrentCompanyId } from '../lib/company';
import { formatCentsBRL } from '../utils/money';
import ScreenTitle from '../components/ScreenTitle';
import FilterHeader, { normalizeText } from '../components/FilterHeader';

interface Product {
  id: string;
  code: string | null;
  barcode: string | null;
  name: string;
  description: string | null;
  category: string | null;
  cost_cents: number;
  price_cents: number;
  stock_quantity: number;
  min_stock: number;
  unit: string;
  track_stock: boolean;
  image_url: string | null;
  status: 'active' | 'inactive';
  featured: boolean;
  total_sold: number;
  created_at: string;
}

const STATUS_OPTIONS = [
  { key: 'all', label: 'Todos', color: '#6b7280' },
  { key: 'active', label: 'Ativos', color: '#10b981' },
  { key: 'inactive', label: 'Inativos', color: '#ef4444' },
  { key: 'low_stock', label: 'Estoque Baixo', color: '#f59e0b' },
];

export default function ProductsScreen({ navigation }: any) {
  const { theme } = useThemeCtx();
  const toast = useToast();
  const queryClient = useQueryClient();
  
  const [companyId, setCompanyId] = React.useState<string | null>(null);
  const [searchText, setSearchText] = React.useState('');
  const [activeFilter, setActiveFilter] = React.useState('all');

  React.useEffect(() => {
    (async () => {
      const id = await getCurrentCompanyId();
      if (id) setCompanyId(id);
    })();
  }, []);

  // Query para buscar produtos
  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ['products', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Mutation para excluir produto (soft delete)
  const deleteMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('products')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.show('Produto excluído com sucesso!', 'success');
    },
    onError: (err: any) => {
      toast.show('Erro ao excluir produto: ' + err.message, 'error');
    },
  });

  // Mutation para alternar status
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ productId, newStatus }: { productId: string; newStatus: string }) => {
      const { error } = await supabase
        .from('products')
        .update({ status: newStatus })
        .eq('id', productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.show('Status atualizado!', 'success');
    },
  });

  // Filtrar produtos
  const filteredProducts = React.useMemo(() => {
    let filtered = [...products];
    
    if (activeFilter === 'active') {
      filtered = filtered.filter(p => p.status === 'active');
    } else if (activeFilter === 'inactive') {
      filtered = filtered.filter(p => p.status === 'inactive');
    } else if (activeFilter === 'low_stock') {
      filtered = filtered.filter(p => p.track_stock && p.stock_quantity <= p.min_stock);
    }
    
    if (searchText.trim()) {
      const search = normalizeText(searchText);
      filtered = filtered.filter(p =>
        normalizeText(p.name).includes(search) ||
        normalizeText(p.code || '').includes(search) ||
        normalizeText(p.barcode || '').includes(search) ||
        normalizeText(p.category || '').includes(search)
      );
    }
    
    return filtered;
  }, [products, activeFilter, searchText]);

  // Calcular margem de lucro
  const calculateMargin = (cost: number, price: number) => {
    if (cost === 0) return 0;
    return ((price - cost) / cost) * 100;
  };

  // Confirmar exclusão
  const confirmDelete = (product: Product) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`Deseja excluir o produto "${product.name}"?`)) {
        deleteMutation.mutate(product.id);
      }
    } else {
      Alert.alert(
        'Excluir Produto',
        `Deseja excluir o produto "${product.name}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Excluir', style: 'destructive', onPress: () => deleteMutation.mutate(product.id) },
        ]
      );
    }
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const isActive = item.status === 'active';
    const isLowStock = item.track_stock && item.stock_quantity <= item.min_stock;
    const margin = calculateMargin(item.cost_cents, item.price_cents);
    const profit = item.price_cents - item.cost_cents;
    
    return (
      <View style={[styles.productCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.productHeader}>
          {/* Imagem do produto */}
          <View style={[styles.productImage, { backgroundColor: theme.background }]}>
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.productImageContent} />
            ) : (
              <Text style={styles.productImagePlaceholder}>📦</Text>
            )}
          </View>
          
          <View style={styles.productInfo}>
            <View style={styles.productTitleRow}>
              <Text style={[styles.productName, { color: theme.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              {item.featured && <Text style={styles.featuredBadge}>⭐</Text>}
            </View>
            
            {item.code && (
              <Text style={[styles.productCode, { color: theme.textSecondary }]}>
                Cód: {item.code}
              </Text>
            )}
            
            {item.category && (
              <View style={[styles.categoryBadge, { backgroundColor: theme.primary + '20' }]}>
                <Text style={[styles.categoryText, { color: theme.primary }]}>{item.category}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: isActive ? '#10b98120' : '#ef444420' }]}>
              <Text style={[styles.statusText, { color: isActive ? '#10b981' : '#ef4444' }]}>
                {isActive ? 'Ativo' : 'Inativo'}
              </Text>
            </View>
            {isLowStock && (
              <View style={[styles.statusBadge, { backgroundColor: '#f59e0b20', marginTop: 4 }]}>
                <Text style={[styles.statusText, { color: '#f59e0b' }]}>⚠️ Estoque Baixo</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Preços */}
        <View style={[styles.priceRow, { borderTopColor: theme.border }]}>
          <View style={styles.priceItem}>
            <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>Custo</Text>
            <Text style={[styles.priceValue, { color: '#ef4444' }]}>
              {formatCentsBRL(item.cost_cents)}
            </Text>
          </View>
          <View style={styles.priceItem}>
            <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>Venda</Text>
            <Text style={[styles.priceValue, { color: '#10b981' }]}>
              {formatCentsBRL(item.price_cents)}
            </Text>
          </View>
          <View style={styles.priceItem}>
            <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>Lucro</Text>
            <Text style={[styles.priceValue, { color: theme.primary }]}>
              {formatCentsBRL(profit)}
            </Text>
          </View>
          <View style={styles.priceItem}>
            <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>Margem</Text>
            <Text style={[styles.priceValue, { color: margin >= 30 ? '#10b981' : margin >= 15 ? '#f59e0b' : '#ef4444' }]}>
              {margin.toFixed(1)}%
            </Text>
          </View>
        </View>
        
        {/* Estoque */}
        {item.track_stock && (
          <View style={[styles.stockRow, { borderTopColor: theme.border }]}>
            <View style={styles.stockInfo}>
              <Text style={[styles.stockLabel, { color: theme.textSecondary }]}>Estoque:</Text>
              <Text style={[styles.stockValue, { color: isLowStock ? '#f59e0b' : theme.text }]}>
                {item.stock_quantity} {item.unit}
              </Text>
              <Text style={[styles.stockMin, { color: theme.textSecondary }]}>
                (mín: {item.min_stock})
              </Text>
            </View>
            <View style={styles.stockInfo}>
              <Text style={[styles.stockLabel, { color: theme.textSecondary }]}>Vendidos:</Text>
              <Text style={[styles.stockValue, { color: theme.text }]}>{item.total_sold}</Text>
            </View>
          </View>
        )}
        
        {/* Ações */}
        <View style={styles.productActions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.primary + '20' }]}
            onPress={() => navigation.navigate('CadastroProduto', { productId: item.id })}
          >
            <Text style={[styles.actionBtnText, { color: theme.primary }]}>✏️ Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#3b82f620' }]}
            onPress={() => navigation.navigate('CadastroProduto', { productId: item.id, duplicate: true })}
          >
            <Text style={[styles.actionBtnText, { color: '#3b82f6' }]}>📋 Duplicar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: isActive ? '#f59e0b20' : '#10b98120' }]}
            onPress={() => toggleStatusMutation.mutate({ 
              productId: item.id, 
              newStatus: isActive ? 'inactive' : 'active' 
            })}
          >
            <Text style={[styles.actionBtnText, { color: isActive ? '#f59e0b' : '#10b981' }]}>
              {isActive ? '⏸️' : '▶️'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#ef444420' }]}
            onPress={() => confirmDelete(item)}
          >
            <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Estatísticas
  const stats = React.useMemo(() => {
    const active = products.filter(p => p.status === 'active').length;
    const lowStock = products.filter(p => p.track_stock && p.stock_quantity <= p.min_stock).length;
    const totalValue = products.reduce((sum, p) => sum + (p.price_cents * p.stock_quantity), 0);
    return { total: products.length, active, lowStock, totalValue };
  }, [products]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenTitle title="Lista de Produtos" />
      
      {/* Botão Novo Produto */}
      <TouchableOpacity
        style={[styles.newButton, { backgroundColor: theme.primary }]}
        onPress={() => navigation.navigate('CadastroProduto')}
      >
        <Text style={styles.newButtonText}>➕ Novo Produto</Text>
      </TouchableOpacity>
      
      {/* Estatísticas rápidas */}
      <View style={[styles.statsRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.text }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#10b981' }]}>{stats.active}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Ativos</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#f59e0b' }]}>{stats.lowStock}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Est. Baixo</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.primary }]}>{formatCentsBRL(stats.totalValue)}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Valor Est.</Text>
        </View>
      </View>
      
      {/* Filtros */}
      <FilterHeader
        searchValue={searchText}
        onSearchChange={setSearchText}
        searchPlaceholder="Buscar por nome, código, categoria..."
        filterOptions={STATUS_OPTIONS}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />
      
      {/* Contador */}
      <View style={styles.counterRow}>
        <Text style={[styles.counterText, { color: theme.textSecondary }]}>
          {filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
        </Text>
      </View>
      
      {/* Lista */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Carregando produtos...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: '#ef4444' }]}>Erro ao carregar produtos</Text>
          <Text style={[styles.errorDetail, { color: theme.textSecondary }]}>{String(error)}</Text>
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {searchText || activeFilter !== 'all' 
              ? 'Nenhum produto encontrado com os filtros aplicados'
              : 'Nenhum produto cadastrado ainda'}
          </Text>
          {!searchText && activeFilter === 'all' && (
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: theme.primary }]}
              onPress={() => navigation.navigate('CadastroProduto')}
            >
              <Text style={styles.emptyButtonText}>Cadastrar Primeiro Produto</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  newButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  counterRow: {
    paddingVertical: 8,
  },
  counterText: {
    fontSize: 13,
  },
  listContent: {
    paddingBottom: 100,
  },
  productCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  productHeader: {
    flexDirection: 'row',
    padding: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productImageContent: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  productImagePlaceholder: {
    fontSize: 28,
  },
  productInfo: {
    flex: 1,
  },
  productTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  featuredBadge: {
    fontSize: 14,
    marginLeft: 6,
  },
  productCode: {
    fontSize: 11,
    marginTop: 2,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  priceItem: {
    flex: 1,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 10,
  },
  priceValue: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  stockRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockLabel: {
    fontSize: 12,
    marginRight: 4,
  },
  stockValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  stockMin: {
    fontSize: 11,
    marginLeft: 4,
  },
  productActions: {
    flexDirection: 'row',
    padding: 8,
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 13,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
