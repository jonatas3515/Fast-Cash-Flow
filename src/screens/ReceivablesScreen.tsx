import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert, TextInput, ScrollView, Modal } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listReceivables,
  createReceivable,
  markAsReceived,
  deleteReceivable,
  Receivable,
  ReceivableStatus,
  PaymentMethod
} from '../repositories/receivables';
import { createTransaction } from '../repositories/transactions';
import { formatCentsBRL, parseBRLToCents, maskBRLInput } from '../utils/money';
import { todayYMD } from '../utils/date';
import ScreenTitle from '../components/ScreenTitle';
import { useToast } from '../ui/ToastProvider';
import FeatureBanner, { FEATURE_BANNERS } from '../components/FeatureBanner';
import CollapsibleFilter from '../components/CollapsibleFilter';

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'boleto', label: 'Boleto' },
  { value: 'pix_parcelado', label: 'PIX Parcelado' },
  { value: 'cartao_parcelado', label: 'Cartão Parcelado' },
  { value: 'fiado', label: 'Fiado/Crediário' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'outro', label: 'Outro' },
];

const STATUS_FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'overdue', label: '🔴 Vencidos' },
  { key: 'pending', label: '🟡 Pendentes' },
  { key: 'partial', label: '🟠 Parciais' },
  { key: 'received', label: '✅ Recebidos' },
];

export default function ReceivablesScreen() {
  const { theme } = useThemeCtx();
  const qc = useQueryClient();
  const toast = useToast();

  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [clientName, setClientName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  // Vencimento padrão: 30 dias a partir de hoje
  const getDefaultDueDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  };
  const [dueDate, setDueDate] = useState(getDefaultDueDate());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('fiado');

  // Estado para confirmação de exclusão inline
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const receivablesQuery = useQuery({
    queryKey: ['receivables'],
    queryFn: listReceivables,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const cents = parseBRLToCents(amount);
      if (!clientName.trim()) throw new Error('Nome do cliente é obrigatório');
      if (!description.trim()) throw new Error('Descrição é obrigatória');
      if (cents <= 0) throw new Error('Valor deve ser maior que zero');

      return createReceivable({
        client_name: clientName.trim(),
        description: description.trim(),
        total_cents: cents,
        received_cents: 0,
        due_date: dueDate,
        payment_method: paymentMethod,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receivables'] });
      qc.invalidateQueries({ queryKey: ['receivables-summary'] });
      setShowForm(false);
      setClientName('');
      setDescription('');
      setAmount('');
      setDueDate(getDefaultDueDate()); // Reset para 30 dias
      toast.show('Conta a receber cadastrada!', 'success');
    },
    onError: (e: any) => {
      toast.show(e.message || 'Erro ao cadastrar', 'error');
    },
  });

  const markReceivedMutation = useMutation({
    mutationFn: async ({ id, amountCents, receivable }: { id: string; amountCents: number; receivable: Receivable }) => {
      // Marcar como recebido
      await markAsReceived(id, amountCents);

      // Criar lançamento de entrada no fluxo de caixa
      // Formato: "Descrição * Nome do Cliente"
      await createTransaction({
        type: 'income',
        description: `${receivable.description} * ${receivable.client_name}`,
        category: 'Recebimento Fiado',
        amount_cents: amountCents,
        date: todayYMD(),
        time: new Date().toTimeString().slice(0, 5),
        datetime: new Date().toISOString(),
        clientname: receivable.client_name,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receivables'] });
      qc.invalidateQueries({ queryKey: ['receivables-summary'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      toast.show('Recebimento registrado!', 'success');
    },
    onError: (e: any) => {
      toast.show(e.message || 'Erro ao registrar', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteReceivable,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receivables'] });
      qc.invalidateQueries({ queryKey: ['receivables-summary'] });
      toast.show('Conta removida!', 'success');
    },
  });

  const handleMarkReceived = (receivable: Receivable) => {
    const remaining = receivable.total_cents - receivable.received_cents;

    Alert.alert(
      '💰 Confirmar Recebimento',
      `Cliente: ${receivable.client_name}\nValor: ${formatCentsBRL(remaining)}\n\nRegistrar pagamento?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: '✓ Pago',
          onPress: () => markReceivedMutation.mutate({
            id: receivable.id,
            amountCents: remaining,
            receivable
          })
        },
      ]
    );
  };

  // Função para excluir (mostra confirmação inline, não popup)
  const handleDelete = (id: string) => {
    setDeletingId(id);
  };

  // Filtrar e agrupar por cliente
  const filteredData = React.useMemo(() => {
    let data = receivablesQuery.data || [];

    if (filter !== 'all') {
      data = data.filter(r => r.status === filter);
    }

    // Agrupar por cliente
    const grouped = new Map<string, Receivable[]>();
    for (const r of data) {
      const list = grouped.get(r.client_name) || [];
      list.push(r);
      grouped.set(r.client_name, list);
    }

    return Array.from(grouped.entries()).map(([client, items]) => ({
      client,
      items,
      total: items.reduce((sum, r) => sum + r.total_cents - r.received_cents, 0),
      overdue: items.filter(r => r.status === 'overdue').reduce((sum, r) => sum + r.total_cents - r.received_cents, 0),
    }));
  }, [receivablesQuery.data, filter]);

  const getStatusColor = (status: ReceivableStatus) => {
    switch (status) {
      case 'received': return '#10B981'; // Verde
      case 'partial': return '#F59E0B'; // Laranja
      case 'pending': return '#F59E0B'; // Amarelo
      case 'overdue': return '#EF4444'; // Vermelho
    }
  };

  const getStatusLabel = (status: ReceivableStatus) => {
    switch (status) {
      case 'received': return '✅ Recebido';
      case 'partial': return '🟠 Parcial';
      case 'pending': return '🟡 Pendente';
      case 'overdue': return '🔴 Vencido';
    }
  };

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const getDaysOverdue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate + 'T12:00:00');
    const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenTitle
          title="A Receber"
          subtitle="Gerencie suas contas a receber"
        />

        <FeatureBanner {...FEATURE_BANNERS.receivables} />

        {/* Filtros - Collapsible */}
        <CollapsibleFilter
          title="Filtros"
          subtitle="Por status de recebimento"
          icon="🔍"
          defaultExpanded={false}
          activeFiltersCount={filter !== 'all' ? 1 : 0}
        >
          <View style={styles.filters}>
            {STATUS_FILTERS.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterBtn,
                  { backgroundColor: filter === f.key ? '#10B981' : theme.card, borderWidth: 1, borderColor: filter === f.key ? '#10B981' : theme.border }
                ]}
                onPress={() => setFilter(f.key)}
              >
                <Text style={[
                  styles.filterText,
                  { color: filter === f.key ? '#fff' : theme.text }
                ]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </CollapsibleFilter>

        {/* Botão Adicionar */}
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: '#10B981' }]}
          onPress={() => setShowForm(!showForm)}
        >
          <Text style={styles.addBtnText}>
            {showForm ? '✕ Cancelar' : '+ Nova Conta a Receber'}
          </Text>
        </TouchableOpacity>

        {/* Formulário */}
        {showForm && (
          <View style={[styles.form, { backgroundColor: theme.card }]}>
            <TextInput
              placeholder="Nome do Cliente"
              placeholderTextColor="#999"
              value={clientName}
              onChangeText={setClientName}
              style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
            />
            <TextInput
              placeholder="Descrição (ex: Venda de produtos)"
              placeholderTextColor="#999"
              value={description}
              onChangeText={setDescription}
              style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
            />
            <TextInput
              placeholder="Valor (R$)"
              placeholderTextColor="#999"
              value={amount}
              onChangeText={t => setAmount(maskBRLInput(t))}
              keyboardType="numeric"
              style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
            />
            <TextInput
              placeholder="Data de Vencimento (AAAA-MM-DD)"
              placeholderTextColor="#999"
              value={dueDate}
              onChangeText={setDueDate}
              style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
            />

            <Text style={[styles.label, { color: theme.textSecondary }]}>Forma de Pagamento:</Text>
            <View style={styles.methodsRow}>
              {PAYMENT_METHODS.map(m => (
                <TouchableOpacity
                  key={m.value}
                  style={[
                    styles.methodBtn,
                    {
                      backgroundColor: paymentMethod === m.value ? '#10B981' : theme.background,
                      borderColor: paymentMethod === m.value ? '#10B981' : '#ddd',
                    }
                  ]}
                  onPress={() => setPaymentMethod(m.value)}
                >
                  <Text style={[
                    styles.methodText,
                    { color: paymentMethod === m.value ? '#fff' : theme.text }
                  ]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: '#10B981' }]}
              onPress={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              <Text style={styles.submitBtnText}>
                {createMutation.isPending ? 'Salvando...' : 'Cadastrar'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Lista agrupada por cliente */}
        {filteredData.map(group => (
          <View key={group.client} style={[styles.clientGroup, { backgroundColor: theme.card }]}>
            <View style={styles.clientHeader}>
              <View>
                <Text style={[styles.clientName, { color: theme.text }]}>
                  👤 {group.client}
                </Text>
                <Text style={[styles.clientTotal, { color: '#10B981' }]}>
                  Total: {formatCentsBRL(group.total)}
                </Text>
              </View>
              {group.overdue > 0 && (
                <View style={styles.overdueTag}>
                  <Text style={styles.overdueTagText}>
                    {formatCentsBRL(group.overdue)} vencido
                  </Text>
                </View>
              )}
            </View>

            {group.items.map(item => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={[styles.itemDesc, { color: theme.text }]}>
                    {item.description}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                      {getStatusLabel(item.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.itemDetails}>
                  <Text style={[styles.itemValue, { color: '#10B981' }]}>
                    {formatCentsBRL(item.total_cents - item.received_cents)}
                  </Text>
                  <Text style={[styles.itemDate, { color: theme.textSecondary }]}>
                    Vence: {formatDate(item.due_date)}
                    {item.status === 'overdue' && ` (${getDaysOverdue(item.due_date)} dias)`}
                  </Text>
                </View>

                {item.received_cents > 0 && item.received_cents < item.total_cents && (
                  <Text style={[styles.partialInfo, { color: theme.textSecondary }]}>
                    Já recebido: {formatCentsBRL(item.received_cents)} de {formatCentsBRL(item.total_cents)}
                  </Text>
                )}

                {item.status !== 'received' && (
                  <View style={styles.itemActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                      onPress={() => handleMarkReceived(item)}
                    >
                      <Text style={styles.actionBtnText}>💰 Pago</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#EF4444' }]}
                      onPress={() => handleDelete(item.id)}
                    >
                      <Text style={styles.actionBtnText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        ))}

        {filteredData.length === 0 && (
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Nenhuma conta a receber encontrada
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Modal de Confirmação de Exclusão (no centro da tela) */}
      <Modal
        visible={!!deletingId}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDeletingId(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: theme.card, borderRadius: 16, padding: 24, width: '100%', maxWidth: 360, alignItems: 'center' }}>
            <Text style={{ color: '#EF4444', fontSize: 48, marginBottom: 12 }}>🗑️</Text>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>
              Excluir Conta a Receber?
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 14, marginBottom: 20, textAlign: 'center' }}>
              Tem certeza que deseja excluir esta conta a receber permanentemente? Esta ação não pode ser desfeita.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity
                onPress={() => setDeletingId(null)}
                style={{ flex: 1, padding: 14, borderRadius: 8, backgroundColor: '#6b7280', alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (deletingId) {
                    deleteMutation.mutate(deletingId);
                    setDeletingId(null);
                  }
                }}
                style={{ flex: 1, padding: 14, borderRadius: 8, backgroundColor: '#EF4444', alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 100 },
  filtersScroll: { marginBottom: 12 },
  filters: { flexDirection: 'row', gap: 8 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  filterText: { fontSize: 12, fontWeight: '600' },
  addBtn: { padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  form: { padding: 16, borderRadius: 12, marginBottom: 16, gap: 10 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 14 },
  label: { fontSize: 12, marginTop: 4 },
  methodsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  methodBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  methodText: { fontSize: 12, fontWeight: '600' },
  submitBtn: { padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  clientGroup: { borderRadius: 12, padding: 14, marginBottom: 12 },
  clientHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  clientName: { fontSize: 15, fontWeight: '700' },
  clientTotal: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  overdueTag: { backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  overdueTagText: { color: '#991B1B', fontSize: 11, fontWeight: '600' },
  itemCard: { backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 8, padding: 12, marginBottom: 8 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  itemDesc: { fontSize: 13, fontWeight: '600', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: '700' },
  itemDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemValue: { fontSize: 16, fontWeight: '800' },
  itemDate: { fontSize: 11 },
  partialInfo: { fontSize: 11, marginTop: 4 },
  itemActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  empty: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 14 },
});
