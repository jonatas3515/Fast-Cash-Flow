import React from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, ScrollView, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import NativeDatePicker from '../utils/NativeDatePicker';
import { todayYMD } from '../utils/date';
import { formatCentsBRL, parseBRLToCents, maskBRLInput } from '../utils/money';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useToast } from '../ui/ToastProvider';
import { useI18n } from '../i18n/I18nProvider';
import { supabase } from '../lib/supabase';
import { syncAll } from '../lib/sync';
import { getCurrentCompanyId, getAdminAppCompanyId } from '../lib/company';
import { createTransaction, softDeleteTransaction, getTransactionsByDate, Transaction } from '../repositories/transactions';
import ScreenTitle from '../components/ScreenTitle';
import OrderNotification from '../components/OrderNotification';
import FilterHeader, { normalizeText } from '../components/FilterHeader';

interface Order {
  id: string;
  client_name: string;
  order_type: string;
  delivery_date: string;
  delivery_time: string;
  order_value_cents: number;
  down_payment_cents: number;
  remaining_value_cents: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface CreateOrderInput {
  client_name: string;
  order_type: string;
  delivery_date: string;
  delivery_time: string;
  order_value_cents: number;
  down_payment_cents: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
}


const ORDER_STATUS = [
  { key: 'all', label: 'Todos', color: '#6b7280' },
  { key: 'pending', label: 'A receber', color: '#f59e0b' },
  { key: 'in_progress', label: 'Em Andamento', color: '#3b82f6' },
  { key: 'completed', label: 'Recebidos', color: '#10b981' },
  { key: 'cancelled', label: 'Cancelados', color: '#ef4444' },
];

// Função para obter data futura (dias no futuro)
function getFutureDate(daysAhead: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().split('T')[0];
}

// Função para obter hora padrão (14:00)
function getDefaultTime(): string {
  return '14:00';
}

// Função para verificar encomendas do dia seguinte (excluindo canceladas)
function getTomorrowOrders(orders: Order[]): { count: number; earliestTime: string } {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  // Filtrar apenas encomendas ativas (não canceladas)
  const tomorrowOrders = orders.filter(order => 
    order.delivery_date === tomorrowStr && 
    order.status !== 'cancelled'
  );
  
  if (tomorrowOrders.length === 0) {
    return { count: 0, earliestTime: '' };
  }
  
  // Ordenar por hora para pegar a mais cedo
  const sortedOrders = tomorrowOrders.sort((a, b) => {
    const timeA = a.delivery_time || '23:59';
    const timeB = b.delivery_time || '23:59';
    return timeA.localeCompare(timeB);
  });
  
  return { 
    count: tomorrowOrders.length, 
    earliestTime: sortedOrders[0]?.delivery_time || 'N/A' 
  };
}

// Função para formatar data de YYYY-MM-DD para DD/MM/YYYY
function formatDateToDisplay(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}


// Repository functions
async function listOrders(companyId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('company_id', companyId)
    .order('delivery_date', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

async function createOrder(companyId: string, order: CreateOrderInput): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .insert({
      ...order,
      company_id: companyId,
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // Criar lançamento automático do sinal pago - usando o company_id correto
  if (order.down_payment_cents > 0) {
    try {
      const now = new Date();
      await createTransaction({
        type: 'income',
        description: `Entrada de Encomenda de ${order.client_name}`,
        amount_cents: order.down_payment_cents,
        date: todayYMD(),
        datetime: now.toISOString(),
        company_id: companyId, // Passa o company_id explicitamente
      });
    } catch (transactionError) {
      console.error('Erro ao criar lançamento do sinal:', transactionError);
      // Não falhar a criação da encomenda se o lançamento falhar
    }
  }
  
  return data;
}

async function updateOrder(companyId: string, orderId: string, order: Partial<CreateOrderInput>, originalOrder?: Order): Promise<Order> {
  // Se o status está sendo alterado para cancelado, excluir o lançamento relacionado
  if (order.status === 'cancelled' && originalOrder && originalOrder.down_payment_cents > 0) {
    try {
      const transactions = await getTransactionsByDate(originalOrder.created_at.split('T')[0]);
      const relatedTransaction = transactions.find((t: Transaction) => 
        t.description === `Entrada de Encomenda de ${originalOrder.client_name}` &&
        t.amount_cents === originalOrder.down_payment_cents &&
        t.type === 'income'
      );
      
      if (relatedTransaction) {
        await softDeleteTransaction(relatedTransaction.id);
      }
    } catch (transactionError) {
      console.error('Erro ao cancelar lançamento relacionado:', transactionError);
      // Continuar com a atualização da encomenda mesmo se falhar
    }
  }
  
  const { data, error } = await supabase
    .from('orders')
    .update(order)
    .eq('id', orderId)
    .eq('company_id', companyId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

async function deleteOrder(companyId: string, orderId: string, order: Order): Promise<void> {
  console.log('deleteOrder iniciando para:', orderId, order.client_name);
  
  try {
    // Primeiro, encontrar e excluir TODOS os lançamentos relacionados
    console.log('Procurando lançamentos relacionados para excluir...');
    
    // Buscar lançamentos em múltiplas datas (possivelmente a data de criação e entrega)
    const datesToSearch = [
      order.created_at.split('T')[0], // Data de criação
      order.delivery_date // Data de entrega
    ].filter((date, index, arr) => date && arr.indexOf(date) === index); // Remover duplicatas
    
    let deletedTransactions = 0;
    
    for (const date of datesToSearch) {
      try {
        const transactions = await getTransactionsByDate(date);
        console.log(`Verificando ${transactions.length} lançamentos na data ${date}...`);
        
        // Encontrar lançamentos relacionados por diferentes critérios
        const relatedTransactions = transactions.filter((t: Transaction) => {
          // Verificar se é uma entrada de encomenda
          if (t.type !== 'income') return false;
          
          // Verificar por descrição (vários formatos possíveis)
          const descriptionPatterns = [
            `Entrada de Encomenda de ${order.client_name}`,
            `Encomenda de ${order.client_name}`,
            `Sinal de Encomenda de ${order.client_name}`,
            order.client_name // Apenas o nome do cliente
          ];
          
          const matchesDescription = descriptionPatterns.some(pattern => 
            t.description?.includes(pattern) || pattern.includes(t.description || '')
          );
          
          // Verificar por valor (se houver sinal/entrada)
          const matchesValue = order.down_payment_cents > 0 
            ? t.amount_cents === order.down_payment_cents 
            : true; // Se não há valor de entrada, não filtrar por valor
          
          return matchesDescription && matchesValue;
        });
        
        console.log(`Encontrados ${relatedTransactions.length} lançamentos relacionados na data ${date}`);
        
        // Excluir cada lançamento encontrado
        for (const transaction of relatedTransactions) {
          try {
            console.log('Excluindo lançamento:', transaction.id, transaction.description);
            await softDeleteTransaction(transaction.id);
            deletedTransactions++;
          } catch (deleteError) {
            console.error('Erro ao excluir lançamento individual:', deleteError);
            // Continuar tentando excluir outros lançamentos
          }
        }
      } catch (dateError) {
        console.error(`Erro ao buscar lançamentos da data ${date}:`, dateError);
        // Continuar para a próxima data
      }
    }
    
    console.log(`Total de ${deletedTransactions} lançamentos excluídos com sucesso!`);
    
    // Agora excluir a encomenda
    console.log('Excluindo encomenda do Supabase...');
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId)
      .eq('company_id', companyId);
    
    if (error) {
      console.error('Erro ao excluir encomenda:', error);
      throw error;
    }
    
    console.log('Encomenda excluída com sucesso!');
    
  } catch (error) {
    console.error('Erro crítico ao excluir encomenda:', error);
    throw error;
  }
}

export default function OrdersScreen() {
  const { theme } = useThemeCtx();
  const { show } = useToast();
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isWideWeb = isWeb && width >= 1024;
  const queryClient = useQueryClient();

  const [companyId, setCompanyId] = React.useState<string>('');
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string | null>(null);
  const [adminCompanyId, setAdminCompanyId] = React.useState<string | null>(null);
  const [editingOrder, setEditingOrder] = React.useState<Order | null>(null);
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [showTimePicker, setShowTimePicker] = React.useState(false);
  const [showNotification, setShowNotification] = React.useState(false);
  const [formData, setFormData] = React.useState<CreateOrderInput>({
    client_name: '',
    order_type: '',
    delivery_date: getFutureDate(7), // 7 dias no futuro por padrão
    delivery_time: getDefaultTime(), // 14:00 por padrão
    order_value_cents: 0,
    down_payment_cents: 0,
    status: 'pending',
    notes: '',
  });

  // Estados para os valores formatados
  const [orderValueText, setOrderValueText] = React.useState('');
  const [downPaymentText, setDownPaymentText] = React.useState('');

  // Estados para filtros
  const [searchText, setSearchText] = React.useState('');
  const [activeFilter, setActiveFilter] = React.useState('all');

  React.useEffect(() => {
    (async () => {
      try {
        // Verificar se é admin
        let role: string | null = null;
        if (Platform.OS === 'web') role = (window.sessionStorage.getItem('auth_role') || '').toLowerCase();
        else try { role = (await require('expo-secure-store').getItemAsync('auth_role')) || ''; } catch {}
        
        const admin = role === 'admin';
        setIsAdmin(admin);
        
        if (admin) {
          // Admin: buscar empresas e configurar seleção
          const adminId = await getAdminAppCompanyId();
          setAdminCompanyId(adminId);
          
          // Se admin selecionou uma empresa específica, usar ela
          if (selectedCompanyId) {
            setCompanyId(selectedCompanyId);
          } else {
            // Por padrão, admin vê suas próprias encomendas (admin app)
            if (adminId) {
              setCompanyId(adminId);
            }
          }
        } else {
          // Usuário normal: SEMPRE usar sua própria empresa
          const userCompanyId = await getCurrentCompanyId();
          if (userCompanyId) setCompanyId(userCompanyId);
        }
      } catch (error) {
        console.error('Error getting company ID:', error);
      }
    })();
  }, [selectedCompanyId]);

  // Query para buscar empresas (apenas admin)
  const companiesQuery = useQuery({
    queryKey: ['all-companies'],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id,name')
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', companyId],
    queryFn: () => listOrders(companyId),
    enabled: !!companyId,
  });

  // Lógica de filtragem local
  const filteredOrders = React.useMemo(() => {
    let filtered = [...orders];
    
    // Aplicar filtro por status
    if (activeFilter !== 'all') {
      filtered = filtered.filter(order => order.status === activeFilter);
    }
    
    // Aplicar busca textual
    if (searchText.trim()) {
      const normalizedSearch = normalizeText(searchText);
      filtered = filtered.filter(order => 
        normalizeText(order.client_name).includes(normalizedSearch) ||
        normalizeText(order.order_type).includes(normalizedSearch) ||
        normalizeText(order.notes || '').includes(normalizedSearch)
      );
    }
    
    return filtered;
  }, [orders, activeFilter, searchText]);

  // Verificar encomendas do dia seguinte e mostrar notificação
  React.useEffect(() => {
    if (orders.length > 0) {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Mostrar notificação apenas após as 12h
      if (currentHour >= 12) {
        const { count, earliestTime } = getTomorrowOrders(orders);
        if (count > 0) {
          setShowNotification(true);
        }
      }
    }
  }, [orders]);

  const createOrderMutation = useMutation({
    mutationFn: (order: CreateOrderInput) => createOrder(companyId, order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', companyId] });
      show('Encomenda criada com sucesso!');
      resetForm();
    },
    onError: (error: any) => {
      show('Erro ao criar encomenda: ' + error.message, 'error');
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ orderId, order, originalOrder }: { orderId: string; order: Partial<CreateOrderInput>; originalOrder?: Order }) =>
      updateOrder(companyId, orderId, order, originalOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', companyId] });
      show('Encomenda atualizada com sucesso!');
      resetForm();
    },
    onError: (error: any) => {
      show('Erro ao atualizar encomenda: ' + error.message, 'error');
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: ({ orderId, order }: { orderId: string; order: Order }) => {
      console.log('deleteOrderMutation executando para:', orderId, order.client_name);
      return deleteOrder(companyId, orderId, order);
    },
    onSuccess: async () => {
      // Invalidar queries de encomendas
      queryClient.invalidateQueries({ queryKey: ['orders', companyId] });
      
      // Invalidar queries de transações para múltiplas datas
      const today = new Date().toISOString().split('T')[0];
      queryClient.invalidateQueries({ queryKey: ['transactions-by-date', today] });
      queryClient.invalidateQueries({ queryKey: ['daily-totals', today] });
      
      // Invalidar queries do mês atual
      const currentYear = new Date().getFullYear().toString();
      const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
      queryClient.invalidateQueries({ queryKey: ['month-totals', currentYear, currentMonth] });
      queryClient.invalidateQueries({ queryKey: ['month-series', currentYear, currentMonth] });
      
      // Invalidar queries da semana atual
      const startOfWeek = new Date();
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day;
      startOfWeek.setDate(diff);
      const weekStart = startOfWeek.toISOString().split('T')[0];
      queryClient.invalidateQueries({ queryKey: ['week-totals', weekStart] });
      queryClient.invalidateQueries({ queryKey: ['week-series', weekStart] });
      
      show('Encomenda e lançamentos relacionados excluídos com sucesso!', 'success');
      
      // Forçar sincronização
      try { 
        await syncAll(); 
        console.log('Sincronização após exclusão concluída');
      } catch (syncError) {
        console.error('Erro na sincronização após exclusão:', syncError);
      }
    },
    onError: (error: any) => {
      console.error('Erro ao excluir encomenda:', error);
      show('Erro ao excluir encomenda: ' + error.message, 'error');
    },
  });

  const resetForm = () => {
    setFormData({
      client_name: '',
      order_type: '',
      delivery_date: getFutureDate(7), // 7 dias no futuro por padrão
      delivery_time: getDefaultTime(), // 14:00 por padrão
      order_value_cents: 0,
      down_payment_cents: 0,
      status: 'pending',
      notes: '',
    });
    setOrderValueText('');
    setDownPaymentText('');
    setEditingOrder(null);
  };

  const handleSubmit = () => {
    if (!formData.client_name.trim()) {
      show('Por favor, informe o nome do cliente', 'error');
      return;
    }
    if (!formData.order_type.trim()) {
      show('Por favor, informe o tipo da encomenda', 'error');
      return;
    }
    if (!formData.delivery_date) {
      show('Por favor, informe a data de entrega', 'error');
      return;
    }
    // Validar se a data de entrega é futura
    const deliveryDate = new Date(formData.delivery_date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (deliveryDate <= today) {
      show('A data de entrega deve ser uma data futura', 'error');
      return;
    }
    if (formData.order_value_cents <= 0) {
      show('Por favor, informe o valor da encomenda', 'error');
      return;
    }
    if (formData.down_payment_cents < 0 || formData.down_payment_cents > formData.order_value_cents) {
      show('O valor do sinal deve estar entre 0 e o valor total', 'error');
      return;
    }

    if (editingOrder) {
      updateOrderMutation.mutate({ orderId: editingOrder.id, order: formData, originalOrder: editingOrder });
    } else {
      createOrderMutation.mutate(formData);
    }
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      client_name: order.client_name,
      order_type: order.order_type,
      delivery_date: order.delivery_date,
      delivery_time: order.delivery_time || getDefaultTime(),
      order_value_cents: order.order_value_cents,
      down_payment_cents: order.down_payment_cents,
      status: order.status,
      notes: order.notes || '',
    });
    setOrderValueText(order.order_value_cents > 0 ? maskBRLInput(order.order_value_cents.toString()) : '');
    setDownPaymentText(order.down_payment_cents > 0 ? maskBRLInput(order.down_payment_cents.toString()) : '');
  };

  const [confirmDeleteVisible, setConfirmDeleteVisible] = React.useState(false);
  const [orderToDelete, setOrderToDelete] = React.useState<Order | null>(null);

  const handleDelete = (order: Order) => {
    console.log('handleDelete chamado para:', order.client_name);
    setOrderToDelete(order);
    setConfirmDeleteVisible(true);
  };

  const confirmDelete = () => {
    if (orderToDelete) {
      console.log('Exclusão confirmada, executando mutation...');
      deleteOrderMutation.mutate({ orderId: orderToDelete.id, order: orderToDelete });
      setConfirmDeleteVisible(false);
      setOrderToDelete(null);
    }
  };

  const cancelDelete = () => {
    setConfirmDeleteVisible(false);
    setOrderToDelete(null);
  };

  const renderOrderItem = ({ item }: { item: Order }) => {
    const statusInfo = ORDER_STATUS.find(s => s.key === item.status) || ORDER_STATUS[0];
    const remainingValue = item.order_value_cents - item.down_payment_cents;
    
    return (
      <View style={[styles.orderCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.orderHeader}>
          <Text style={[styles.clientName, { color: theme.text }]}>
            {item.client_name}
          </Text>
          <Text style={[styles.orderType, { color: theme.textSecondary }]}>
            {item.order_type}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
            <Text style={styles.statusText}>{statusInfo.label}</Text>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Data de Entrega:</Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>
              {formatDateToDisplay(item.delivery_date)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Hora da Entrega:</Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>
              {item.delivery_time || 'N/A'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Valor Total:</Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>
              {formatCentsBRL(item.order_value_cents)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Sinal/Entrada:</Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>
              {formatCentsBRL(item.down_payment_cents)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Restante:</Text>
            <Text style={[styles.detailValue, { color: theme.text, fontWeight: '700' }]}>
              {formatCentsBRL(remainingValue)}
            </Text>
          </View>
        </View>

        {item.notes && (
          <Text style={[styles.notes, { color: theme.textSecondary }]}>
            {item.notes}
          </Text>
        )}

        <View style={styles.orderActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            onPress={() => handleEdit(item)}
          >
            <Text style={styles.actionButtonText}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => {
              console.log('Botão excluir clicado para:', item.client_name);
              handleDelete(item);
            }}
          >
            <Text style={styles.actionButtonText}>Excluir</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (!companyId) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Notificação de Encomendas */}
        {showNotification && (
          <OrderNotification
            orderCount={getTomorrowOrders(orders).count}
            nextOrderTime={getTomorrowOrders(orders).earliestTime}
            onClose={() => setShowNotification(false)}
            theme={theme}
          />
        )}
        
        <Text style={[styles.loadingText, { color: theme.text }]}>Carregando...</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={{ paddingBottom: 80, padding: 16, gap: 12, width: '100%' }} keyboardShouldPersistTaps="handled">
      {/* Notificação de Encomendas */}
      {showNotification && (
        <OrderNotification
          orderCount={getTomorrowOrders(orders).count}
          nextOrderTime={getTomorrowOrders(orders).earliestTime}
          onClose={() => setShowNotification(false)}
          theme={theme}
        />
      )}
      
      <ScreenTitle title="Encomendas" subtitle="Gerencie encomendas e entradas" />
      
      {/* Seletor de Empresa (apenas admin) */}
      {isAdmin && isWeb && (
        <View style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 4 }}>
          <Text style={{ color: theme.text, marginBottom: 6, fontWeight: '700' }}>Empresa</Text>
          {/* @ts-ignore */}
          <select
            value={companyId}
            onChange={(e: any) => {
              const newCompanyId = e.target.value;
              setCompanyId(newCompanyId);
              setSelectedCompanyId(newCompanyId);
            }}
            style={{
              width: '100%',
              padding: 8,
              borderWidth: 1,
              borderColor: theme.inputBorder,
              borderRadius: 4,
              backgroundColor: theme.input,
              color: theme.text
            }}
          >
            {companiesQuery.data?.map((company: any) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </View>
      )}
      
      <View style={{ flexDirection: isWideWeb ? 'row' : 'column', gap: 16, flex: 1, width: '100%' }}>
        {/* COLUNA ESQUERDA - FORMULÁRIO */}
        <View style={{ width: isWideWeb ? '48%' : '100%', gap: 12 }}>
          <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.inputBorder }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {editingOrder ? 'Editar Encomenda' : 'Nova Encomenda'}
            </Text>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Nome do Cliente *</Text>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.input, borderColor: theme.inputBorder }]}
                value={formData.client_name}
                onChangeText={(text) => setFormData({ ...formData, client_name: text })}
                placeholder="Ex: Maria Silva"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Tipo de Encomenda *</Text>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.input, borderColor: theme.inputBorder }]}
                value={formData.order_type}
                onChangeText={(text) => setFormData({ ...formData, order_type: text })}
                placeholder="Ex: Produto, Serviço, etc."
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Data de Entrega *</Text>
              {Platform.OS === 'web' ? (
                <View>
                  <input
                    type="date"
                    value={formData.delivery_date}
                    onChange={(e: any) => setFormData({ ...formData, delivery_date: String(e.target?.value || formData.delivery_date) })}
                    min={getFutureDate(1)}
                    style={{ 
                      width: '100%', 
                      height: 44, 
                      padding: 12, 
                      borderRadius: 8, 
                      border: `1px solid ${theme.inputBorder}`, 
                      backgroundColor: theme.input, 
                      color: theme.text, 
                      fontSize: 16,
                      boxSizing: 'border-box',
                      outline: 'none'
                    } as any}
                  />
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.datePickerButton, { backgroundColor: theme.input, borderColor: theme.inputBorder }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={[styles.datePickerText, { color: formData.delivery_date ? theme.text : theme.textSecondary }]}>
                    {formData.delivery_date ? formatDateToDisplay(formData.delivery_date) : 'Selecionar data'}
                  </Text>
                  <Text style={[styles.datePickerIcon, { color: theme.textSecondary }]}>📅</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Hora da Entrega *</Text>
              {Platform.OS === 'web' ? (
                <View>
                  <input
                    type="time"
                    value={formData.delivery_time}
                    onChange={(e: any) => setFormData({ ...formData, delivery_time: String(e.target?.value || formData.delivery_time) })}
                    style={{ 
                      width: '100%', 
                      height: 44, 
                      padding: 12, 
                      borderRadius: 8, 
                      border: `1px solid ${theme.inputBorder}`, 
                      backgroundColor: theme.input, 
                      color: theme.text, 
                      fontSize: 16,
                      boxSizing: 'border-box',
                      outline: 'none'
                    } as any}
                  />
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.datePickerButton, { backgroundColor: theme.input, borderColor: theme.inputBorder }]}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text style={[styles.datePickerText, { color: formData.delivery_time ? theme.text : theme.textSecondary }]}>
                    {formData.delivery_time || 'Selecionar hora'}
                  </Text>
                  <Text style={[styles.datePickerIcon, { color: theme.textSecondary }]}>🕐</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Valor da Encomenda *</Text>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.input, borderColor: theme.inputBorder }]}
                value={orderValueText}
                onChangeText={(text) => {
                  const formatted = maskBRLInput(text);
                  setOrderValueText(formatted);
                  setFormData({ ...formData, order_value_cents: parseBRLToCents(formatted) });
                }}
                placeholder="R$ 0,00"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Sinal Pago/Entrada *</Text>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.input, borderColor: theme.inputBorder }]}
                value={downPaymentText}
                onChangeText={(text) => {
                  const formatted = maskBRLInput(text);
                  setDownPaymentText(formatted);
                  setFormData({ ...formData, down_payment_cents: parseBRLToCents(formatted) });
                }}
                placeholder="R$ 0,00"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
              />
              <Text style={[styles.hint, { color: theme.textSecondary }]}>
                * Será criado automaticamente um lançamento em "Lançamentos"
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Status</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusContainer}>
                {ORDER_STATUS.map((status) => (
                  <TouchableOpacity
                    key={status.key}
                    style={[
                      styles.statusOption,
                      { backgroundColor: formData.status === status.key ? status.color : theme.input },
                    ]}
                    onPress={() => setFormData({ ...formData, status: status.key as any })}
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        { color: formData.status === status.key ? '#fff' : theme.text },
                      ]}
                    >
                      {status.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Observações</Text>
              <TextInput
                style={[styles.textArea, { color: theme.text, backgroundColor: theme.input, borderColor: theme.inputBorder }]}
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                placeholder="Observações adicionais..."
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton, { backgroundColor: theme.inputBorder }]}
                onPress={resetForm}
              >
                <Text style={[styles.buttonText, { color: theme.text }]}>{editingOrder ? 'Cancelar' : 'Limpar'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton, { backgroundColor: theme.primary }]}
                onPress={handleSubmit}
                disabled={createOrderMutation.isPending || updateOrderMutation.isPending}
              >
                <Text style={styles.buttonText}>
                  {editingOrder ? 'Atualizar' : 'Salvar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* COLUNA DIREITA - LISTA DE ENCOMENDAS */}
        <View style={{ width: isWideWeb ? '48%' : '100%', gap: 12 }}>
          <FilterHeader
            searchValue={searchText}
            onSearchChange={setSearchText}
            filterOptions={ORDER_STATUS}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            searchPlaceholder="Buscar por cliente, tipo ou observações..."
          />
          
          {isLoading ? (
            <Text style={[styles.loadingText, { color: theme.text }]}>Carregando...</Text>
          ) : filteredOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                {searchText || activeFilter !== 'all' ? 'Nenhuma encomenda encontrada para os filtros aplicados' : 'Nenhuma encomenda encontrada'}
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                {searchText || activeFilter !== 'all' ? 'Tente ajustar os filtros ou buscar com outros termos' : 'Adicione sua primeira encomenda usando o formulário ao lado'}
              </Text>
            </View>
          ) : (
            <View style={styles.ordersList}>
              {filteredOrders.map((order) => (
                <View key={order.id}>
                  {renderOrderItem({ item: order })}
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
      
      {/* Native Date Picker - apenas para mobile */}
      {showDatePicker && Platform.OS !== 'web' && (
        <NativeDatePicker
          value={formData.delivery_date}
          mode="date"
          minimumDate={new Date()}
          onConfirm={(date: string) => {
            setFormData({ ...formData, delivery_date: date });
            setShowDatePicker(false);
          }}
          onCancel={() => setShowDatePicker(false)}
        />
      )}
      
      {/* Native Time Picker - apenas para mobile */}
      {showTimePicker && Platform.OS !== 'web' && (
        <NativeDatePicker
          value={formData.delivery_time}
          mode="time"
          onConfirm={(time: string) => {
            setFormData({ ...formData, delivery_time: time });
            setShowTimePicker(false);
          }}
          onCancel={() => setShowTimePicker(false)}
        />
      )}
      
      {/* Modal de confirmação de exclusão */}
      {confirmDeleteVisible && orderToDelete && (
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmModal}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>🗑️ Excluir Encomenda</Text>
            <Text style={[styles.modalMessage, { color: theme.text }]}>
              Deseja realmente excluir a encomenda de <Text style={{ fontWeight: '700' }}>{orderToDelete.client_name}</Text>?
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity 
                onPress={cancelDelete} 
                style={[styles.modalButton, styles.cancelButton]}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={confirmDelete} 
                style={[styles.modalButton, styles.confirmButton]}
              >
                <Text style={styles.confirmButtonText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  hint: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
  ordersList: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  orderCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  orderItem: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  orderType: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 4,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  orderDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  notes: {
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  orderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  formCard: {
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    height: 80,
    textAlignVertical: 'top',
  },
  statusContainer: {
    flexDirection: 'row',
  },
  statusOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  statusOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#6b7280',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  datePickerText: {
    fontSize: 16,
  },
  datePickerIcon: {
    fontSize: 16,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  confirmModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 32,
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  modalCancelButton: {
    backgroundColor: '#6b7280',
    borderWidth: 1,
    borderColor: '#6b7280',
  },
  confirmButton: {
    backgroundColor: '#dc2626',
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
