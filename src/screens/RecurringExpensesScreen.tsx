import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, useWindowDimensions, Platform, TextInput, Alert, Modal } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useI18n } from '../i18n/I18nProvider';
import { listRecurringExpenses, getNextOccurrence, createRecurringExpense, updateRecurringExpense, deleteRecurringExpense, RecurringExpense, RecurrenceType } from '../repositories/recurring_expenses';
import { getTransactionsByMonth, Transaction } from '../repositories/transactions';
import { todayYMD } from '../utils/date';
import { formatCentsBRL, parseBRLToCents } from '../utils/money';
import ScreenTitle from '../components/ScreenTitle';

type StatusFilter = 'all' | 'paid' | 'unpaid' | 'overdue';

interface RecurringAlertRow {
  id: string;
  description: string;
  category?: string | null;
  amount_cents: number;
  recurrence_type: string;
  next_date: string;
  days_until: number;
  isPaid: boolean;
  paid_transaction_date?: string;
}

export default function RecurringExpensesScreen() {
  const { theme } = useThemeCtx();
  const { formatMoney } = useI18n();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all');
  const [modalVisible, setModalVisible] = React.useState(false);
  const [editing, setEditing] = React.useState<RecurringExpense | null>(null);
  const [description, setDescription] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [recurrenceType, setRecurrenceType] = React.useState<RecurrenceType>('monthly');
  const [startDate, setStartDate] = React.useState(todayYMD());
  const [endDate, setEndDate] = React.useState('');

  const today = todayYMD();
  const baseDate = React.useMemo(() => new Date(), []);
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth() + 1;

  const recurringQ = useQuery({
    queryKey: ['recurring-expenses'],
    queryFn: () => listRecurringExpenses(),
  });

  const txQ = useQuery({
    queryKey: ['recurring-expenses-tx', year, month],
    queryFn: () => getTransactionsByMonth(year, month),
  });

  const alerts: RecurringAlertRow[] = React.useMemo(() => {
    const recurring = (recurringQ.data || []) as RecurringExpense[];
    const monthTransactions = (txQ.data || []) as Transaction[];
    if (!today) return [];

    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const WINDOW_BEFORE_DAYS = 5;
    const WINDOW_AFTER_DAYS = 10;
    const AMOUNT_TOLERANCE_PERCENT = 0.08;
    const MIN_TOLERANCE_CENTS = 200;

    const todayDate = new Date(`${today}T00:00:00`);
    const rows: RecurringAlertRow[] = [];

    for (const rec of recurring) {
      const nextDateObj = getNextOccurrence(rec, todayDate);
      if (!nextDateObj) continue;

      const daysUntil = Math.round(
        (nextDateObj.getTime() - todayDate.getTime()) / MS_PER_DAY,
      );

      const windowStart = new Date(nextDateObj.getTime() - WINDOW_BEFORE_DAYS * MS_PER_DAY);
      const windowEnd = new Date(nextDateObj.getTime() + WINDOW_AFTER_DAYS * MS_PER_DAY);

      const match = monthTransactions.find((tx) => {
        if (tx.type !== 'expense') return false;
        const txDate = new Date(`${tx.date}T00:00:00`);
        if (txDate < windowStart || txDate > windowEnd) return false;

        const descTx = (tx.description || '').toLowerCase().trim();
        const descRec = (rec.description || '').toLowerCase().trim();
        if (!descTx || !descRec) return false;
        const matchesDescription =
          descTx.includes(descRec) || descRec.includes(descTx);
        if (!matchesDescription) return false;

        const diff = Math.abs((tx.amount_cents || 0) - (rec.amount_cents || 0));
        const tolerance = Math.max(
          Math.round(rec.amount_cents * AMOUNT_TOLERANCE_PERCENT),
          MIN_TOLERANCE_CENTS,
        );
        return diff <= tolerance;
      });

      rows.push({
        id: rec.id,
        description: rec.description,
        category: rec.category ?? null,
        amount_cents: rec.amount_cents,
        recurrence_type: rec.recurrence_type,
        next_date: nextDateObj.toISOString().slice(0, 10),
        days_until: daysUntil,
        isPaid: !!match,
        paid_transaction_date: match ? match.date : undefined,
      });
    }

    rows.sort((a, b) => a.next_date.localeCompare(b.next_date));
    return rows;
  }, [recurringQ.data, txQ.data, today]);

  const filteredAlerts = alerts.filter((a) => {
    const isOverdue = a.days_until < 0 && !a.isPaid;
    if (statusFilter === 'paid') return a.isPaid;
    if (statusFilter === 'overdue') return isOverdue;
    if (statusFilter === 'unpaid') return !a.isPaid && !isOverdue;
    return true;
  });

  const createMut = useMutation({
    mutationFn: async () => {
      if (!description || !amount || !startDate) throw new Error('Preencha descrição, valor e data de início');
      const payload = {
        description,
        category: category || null,
        amount_cents: parseBRLToCents(amount),
        recurrence_type: recurrenceType,
        start_date: startDate,
        end_date: endDate || null,
      };
      if (editing) {
        await updateRecurringExpense(editing.id, payload);
      } else {
        await createRecurringExpense(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] });
      resetForm();
      setModalVisible(false);
      Alert.alert(editing ? 'Despesa atualizada' : 'Despesa adicionada', editing ? 'Despesa recorrente atualizada com sucesso.' : 'Despesa recorrente adicionada com sucesso.');
    },
    onError: (e: any) => {
      Alert.alert('Erro', e?.message || 'Não foi possível salvar.');
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error('Nenhum item selecionado');
      return deleteRecurringExpense(editing.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] });
      resetForm();
      setModalVisible(false);
      Alert.alert('Despesa excluída', 'Despesa recorrente excluída com sucesso.');
    },
    onError: (e: any) => {
      Alert.alert('Erro ao excluir', e?.message || 'Não foi possível excluir.');
    },
  });

  function resetForm() {
    setDescription('');
    setCategory('');
    setAmount('');
    setRecurrenceType('monthly');
    setStartDate(todayYMD());
    setEndDate('');
    setEditing(null);
  }

  function openCreate() {
    resetForm();
    setModalVisible(true);
  }

  function openEdit(item: RecurringExpense) {
    setEditing(item);
    setDescription(item.description);
    setCategory(item.category || '');
    setAmount(formatCentsBRL(item.amount_cents));
    setRecurrenceType(item.recurrence_type);
    setStartDate(item.start_date);
    setEndDate(item.end_date || '');
    setModalVisible(true);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 12 }}
      >
        <ScreenTitle 
          title="Despesas Recorrentes" 
          subtitle="Gerencie pagamentos fixos mensais" 
        />

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {(['all', 'paid', 'unpaid', 'overdue'] as StatusFilter[]).map((s) => {
            const labels: Record<StatusFilter, string> = {
              all: 'Todas',
              paid: 'Pagas',
              unpaid: 'A pagar',
              overdue: 'Atrasadas',
            };
            const active = statusFilter === s;
            return (
              <TouchableOpacity
                key={s}
                onPress={() => setStatusFilter(s)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? '#16A34A' : '#4B5563',
                  backgroundColor: active ? '#16A34A22' : 'transparent',
                }}
              >
                <Text
                  style={{
                    color: active ? '#16A34A' : theme.text,
                    fontSize: 12,
                    fontWeight: '700',
                  }}
                >
                  {labels[s]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ color: '#16A34A', fontSize: 14 }}>●</Text>
            <Text style={{ color: '#6B7280', fontSize: 11 }}>Pago</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ color: '#F97316', fontSize: 14 }}>●</Text>
            <Text style={{ color: '#6B7280', fontSize: 11 }}>Vence em até 7 dias</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ color: '#DC2626', fontSize: 14 }}>●</Text>
            <Text style={{ color: '#6B7280', fontSize: 11 }}>Atrasado</Text>
          </View>
        </View>

        {recurringQ.isLoading || txQ.isLoading ? (
          <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 8 }}>
            Carregando despesas recorrentes…
          </Text>
        ) : null}

        {recurringQ.isError || txQ.isError ? (
          <Text style={{ color: '#DC2626', fontSize: 12, marginTop: 8 }}>
            Não foi possível carregar as despesas recorrentes.
          </Text>
        ) : null}

        {filteredAlerts.length === 0 && !recurringQ.isLoading && !txQ.isLoading ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center' }}>
              Nenhuma despesa recorrente encontrada para o filtro atual.
            </Text>
            <TouchableOpacity onPress={openCreate} style={{ marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#16A34A', borderRadius: 999 }}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>+ Adicionar Despesa Recorrente</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {filteredAlerts.length > 0 && (
          <TouchableOpacity onPress={openCreate} style={{ marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#16A34A', borderRadius: 999, alignSelf: 'flex-start' }}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>+ Adicionar</Text>
          </TouchableOpacity>
        )}

        <View style={{ marginTop: 8, gap: 8 }}>
          {filteredAlerts.map((a) => {
            const next = a.next_date;
            const y = next.substring(0, 4);
            const m = next.substring(5, 7);
            const d = next.substring(8, 10);
            const nextLabel = `${d}/${m}/${y}`;

            const isOverdue = a.days_until < 0 && !a.isPaid;
            const isSoon = a.days_until >= 0 && a.days_until <= 7 && !a.isPaid;
            const statusColor = a.isPaid
              ? '#16A34A'
              : isOverdue
              ? '#DC2626'
              : isSoon
              ? '#F97316'
              : '#6B7280';
            const statusLabel = a.isPaid
              ? 'Pago'
              : isOverdue
              ? `Atrasado há ${Math.abs(a.days_until)} dia(s)`
              : a.days_until === 0
              ? 'Vence hoje'
              : `Vence em ${a.days_until} dia(s)`;

            return (
              <View
                key={a.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#374151',
                  backgroundColor: isWeb ? '#020617' : theme.card,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Text style={{ color: statusColor, fontSize: 16 }}>●</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontWeight: '700' }} numberOfLines={1}>
                      {a.description}
                    </Text>
                    <Text style={{ color: '#6B7280', fontSize: 11 }} numberOfLines={1}>
                      Próx. vencimento: {nextLabel} • Valor: {formatMoney(a.amount_cents)}
                    </Text>
                    {a.category ? (
                      <Text style={{ color: '#9CA3AF', fontSize: 10 }} numberOfLines={1}>
                        Categoria: {a.category}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <View style={{ marginLeft: 8, alignItems: 'flex-end' }}>
                  <Text style={{ color: statusColor, fontSize: 11, fontWeight: '700' }}>
                    {statusLabel}
                  </Text>
                  {a.isPaid && a.paid_transaction_date && (
                    <Text style={{ color: '#6B7280', fontSize: 10 }}>
                      Pago em {a.paid_transaction_date.split('-').reverse().join('/')}
                    </Text>
                  )}
                  <TouchableOpacity onPress={() => openEdit(recurringQ.data?.find((r: RecurringExpense) => r.id === a.id)!)} style={{ marginTop: 4 }}>
                    <Text style={{ color: '#0ea5e9', fontSize: 10, fontWeight: '700' }}>Editar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Modal de cadastro/edição */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '100%', maxWidth: 420, backgroundColor: theme.card, borderRadius: 16, padding: 20, gap: 12 }}>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>
              {editing ? 'Editar Despesa Recorrente' : 'Adicionar Despesa Recorrente'}
            </Text>
            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.text }}>Descrição</Text>
              <TextInput value={description} onChangeText={setDescription} placeholder="Ex: Assinatura Netflix" placeholderTextColor="#999" style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, color: theme.text, backgroundColor: theme.background }} />
            </View>
            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.text }}>Categoria (opcional)</Text>
              <TextInput value={category} onChangeText={setCategory} placeholder="Entretenimento" placeholderTextColor="#999" style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, color: theme.text, backgroundColor: theme.background }} />
            </View>
            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.text }}>Valor</Text>
              <TextInput value={amount} onChangeText={setAmount} placeholder="R$ 0,00" placeholderTextColor="#999" keyboardType="numeric" style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, color: theme.text, backgroundColor: theme.background }} />
            </View>
            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.text }}>Recorrência</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {(['monthly', 'weekly', 'biweekly', 'annual'] as RecurrenceType[]).map((rt) => {
                  const labels: Record<RecurrenceType, string> = { monthly: 'Mensal', weekly: 'Semanal', biweekly: 'Quinzenal', annual: 'Anual', custom: 'Personalizado' };
                  const active = recurrenceType === rt;
                  return (
                    <TouchableOpacity key={rt} onPress={() => setRecurrenceType(rt)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: active ? '#16A34A' : '#4B5563', backgroundColor: active ? '#16A34A22' : 'transparent' }}>
                      <Text style={{ color: active ? '#16A34A' : theme.text, fontSize: 12, fontWeight: '700' }}>{labels[rt]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.text }}>Data de início</Text>
              <TextInput value={startDate} onChangeText={setStartDate} placeholder="DD/MM/YYYY" placeholderTextColor="#999" style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, color: theme.text, backgroundColor: theme.background }} />
            </View>
            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.text }}>Data de fim (opcional)</Text>
              <TextInput value={endDate} onChangeText={setEndDate} placeholder="DD/MM/YYYY" placeholderTextColor="#999" style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, color: theme.text, backgroundColor: theme.background }} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#6b7280', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>
              {editing && (
                <TouchableOpacity onPress={() => deleteMut.mutate()} disabled={deleteMut.isPending} style={{ padding: 12, borderRadius: 8, backgroundColor: '#DC2626', alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Excluir</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => createMut.mutate()} disabled={createMut.isPending} style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#16A34A', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{editing ? 'Salvar' : 'Adicionar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
