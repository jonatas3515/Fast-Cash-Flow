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
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useToast } from '../ui/ToastProvider';
import { supabase } from '../lib/supabase';
import { getCurrentCompanyId } from '../lib/company';
import { formatCentsBRL } from '../utils/money';
import ScreenTitle from '../components/ScreenTitle';
import FilterHeader, { normalizeText } from '../components/FilterHeader';

interface Client {
  id: string;
  name: string;
  type: 'pf' | 'pj';
  cpf_cnpj: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  city: string | null;
  state: string | null;
  status: 'active' | 'inactive';
  total_purchases: number;
  total_spent_cents: number;
  last_purchase_date: string | null;
  created_at: string;
}

const STATUS_OPTIONS = [
  { key: 'all', label: 'Todos', color: '#6b7280' },
  { key: 'active', label: 'Ativos', color: '#10b981' },
  { key: 'inactive', label: 'Inativos', color: '#ef4444' },
];

export default function ClientsScreen({ navigation }: any) {
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

  // Query para buscar clientes
  const { data: clients = [], isLoading, error } = useQuery({
    queryKey: ['clients', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Mutation para excluir cliente (soft delete)
  const deleteMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase
        .from('clients')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.show('Cliente excluído com sucesso!', 'success');
    },
    onError: (err: any) => {
      toast.show('Erro ao excluir cliente: ' + err.message, 'error');
    },
  });

  // Mutation para alternar status
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ clientId, newStatus }: { clientId: string; newStatus: string }) => {
      const { error } = await supabase
        .from('clients')
        .update({ status: newStatus })
        .eq('id', clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.show('Status atualizado!', 'success');
    },
  });

  // Filtrar clientes
  const filteredClients = React.useMemo(() => {
    let filtered = [...clients];
    
    if (activeFilter !== 'all') {
      filtered = filtered.filter(c => c.status === activeFilter);
    }
    
    if (searchText.trim()) {
      const search = normalizeText(searchText);
      filtered = filtered.filter(c =>
        normalizeText(c.name).includes(search) ||
        normalizeText(c.cpf_cnpj || '').includes(search) ||
        normalizeText(c.phone || '').includes(search) ||
        normalizeText(c.email || '').includes(search)
      );
    }
    
    return filtered;
  }, [clients, activeFilter, searchText]);

  // Abrir WhatsApp
  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const url = `https://wa.me/55${cleanPhone}`;
    Linking.openURL(url);
  };

  // Confirmar exclusão
  const confirmDelete = (client: Client) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`Deseja excluir o cliente "${client.name}"?`)) {
        deleteMutation.mutate(client.id);
      }
    } else {
      Alert.alert(
        'Excluir Cliente',
        `Deseja excluir o cliente "${client.name}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Excluir', style: 'destructive', onPress: () => deleteMutation.mutate(client.id) },
        ]
      );
    }
  };

  const renderClient = ({ item }: { item: Client }) => {
    const isActive = item.status === 'active';
    
    return (
      <View style={[styles.clientCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.clientHeader}>
          <View style={styles.clientInfo}>
            <Text style={[styles.clientName, { color: theme.text }]}>{item.name}</Text>
            <Text style={[styles.clientType, { color: theme.textSecondary }]}>
              {item.type === 'pf' ? 'Pessoa Física' : 'Pessoa Jurídica'}
              {item.cpf_cnpj && ` • ${item.cpf_cnpj}`}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isActive ? '#10b98120' : '#ef444420' }]}>
            <Text style={[styles.statusText, { color: isActive ? '#10b981' : '#ef4444' }]}>
              {isActive ? 'Ativo' : 'Inativo'}
            </Text>
          </View>
        </View>
        
        <View style={styles.clientDetails}>
          {item.phone && (
            <TouchableOpacity 
              style={styles.detailRow}
              onPress={() => item.whatsapp ? openWhatsApp(item.whatsapp || item.phone!) : null}
            >
              <Text style={[styles.detailIcon]}>📞</Text>
              <Text style={[styles.detailText, { color: theme.textSecondary }]}>{item.phone}</Text>
              {item.whatsapp && <Text style={styles.whatsappIcon}>💬</Text>}
            </TouchableOpacity>
          )}
          {item.email && (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>✉️</Text>
              <Text style={[styles.detailText, { color: theme.textSecondary }]}>{item.email}</Text>
            </View>
          )}
          {(item.city || item.state) && (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>📍</Text>
              <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                {[item.city, item.state].filter(Boolean).join(' - ')}
              </Text>
            </View>
          )}
        </View>
        
        <View style={[styles.clientStats, { borderTopColor: theme.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.text }]}>{item.total_purchases}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Compras</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#10b981' }]}>
              {formatCentsBRL(item.total_spent_cents || 0)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Gasto</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.text }]}>
              {item.last_purchase_date 
                ? new Date(item.last_purchase_date).toLocaleDateString('pt-BR')
                : '-'}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Última Compra</Text>
          </View>
        </View>
        
        <View style={styles.clientActions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.primary + '20' }]}
            onPress={() => navigation.navigate('CadastroCliente', { clientId: item.id })}
          >
            <Text style={[styles.actionBtnText, { color: theme.primary }]}>✏️ Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: isActive ? '#f59e0b20' : '#10b98120' }]}
            onPress={() => toggleStatusMutation.mutate({ 
              clientId: item.id, 
              newStatus: isActive ? 'inactive' : 'active' 
            })}
          >
            <Text style={[styles.actionBtnText, { color: isActive ? '#f59e0b' : '#10b981' }]}>
              {isActive ? '⏸️ Desativar' : '▶️ Ativar'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#ef444420' }]}
            onPress={() => confirmDelete(item)}
          >
            <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>🗑️ Excluir</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenTitle title="Lista de Clientes" />
      
      {/* Botão Novo Cliente */}
      <TouchableOpacity
        style={[styles.newButton, { backgroundColor: theme.primary }]}
        onPress={() => navigation.navigate('CadastroCliente')}
      >
        <Text style={styles.newButtonText}>➕ Novo Cliente</Text>
      </TouchableOpacity>
      
      {/* Filtros */}
      <FilterHeader
        searchValue={searchText}
        onSearchChange={setSearchText}
        searchPlaceholder="Buscar por nome, CPF/CNPJ, telefone..."
        filterOptions={STATUS_OPTIONS}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />
      
      {/* Contador */}
      <View style={styles.counterRow}>
        <Text style={[styles.counterText, { color: theme.textSecondary }]}>
          {filteredClients.length} cliente{filteredClients.length !== 1 ? 's' : ''} encontrado{filteredClients.length !== 1 ? 's' : ''}
        </Text>
      </View>
      
      {/* Lista */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Carregando clientes...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: '#ef4444' }]}>Erro ao carregar clientes</Text>
          <Text style={[styles.errorDetail, { color: theme.textSecondary }]}>{String(error)}</Text>
        </View>
      ) : filteredClients.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {searchText || activeFilter !== 'all' 
              ? 'Nenhum cliente encontrado com os filtros aplicados'
              : 'Nenhum cliente cadastrado ainda'}
          </Text>
          {!searchText && activeFilter === 'all' && (
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: theme.primary }]}
              onPress={() => navigation.navigate('CadastroCliente')}
            >
              <Text style={styles.emptyButtonText}>Cadastrar Primeiro Cliente</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredClients}
          keyExtractor={(item) => item.id}
          renderItem={renderClient}
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
    marginBottom: 16,
  },
  newButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  clientCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 14,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  clientType: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  clientDetails: {
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailIcon: {
    fontSize: 12,
    marginRight: 8,
    width: 20,
  },
  detailText: {
    fontSize: 13,
    flex: 1,
  },
  whatsappIcon: {
    fontSize: 14,
    marginLeft: 8,
  },
  clientStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  clientActions: {
    flexDirection: 'row',
    padding: 10,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
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
