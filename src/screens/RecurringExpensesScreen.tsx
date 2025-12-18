import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, useWindowDimensions, Platform, TextInput, Alert, Modal } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useI18n } from '../i18n/I18nProvider';
import { listRecurringExpenses, getNextOccurrence, createRecurringExpense, updateRecurringExpense, deleteRecurringExpense, RecurringExpense, RecurrenceType } from '../repositories/recurring_expenses';
import { getTransactionsByMonth, Transaction, createTransaction, TxType } from '../repositories/transactions';
import { getCurrentCompanyId } from '../lib/company';
import { todayYMD } from '../utils/date';
import { formatCentsBRL, parseBRLToCents, maskBRLInput } from '../utils/money';
import { useToast } from '../ui/ToastProvider';
import ScreenTitle from '../components/ScreenTitle';
import { useSegmentCategories } from '../hooks/useSegmentCategories';

type StatusFilter = 'all' | 'paid' | 'unpaid' | 'overdue';

interface RecurringAlertRow {
  id: string;
  description: string;
  category?: string | null;
  amount_cents: number;
  recurrence_type: string;
  next_date: string;
  days_until: number;
  payment_tag: string;
  isPaid: boolean;
  paid_transaction_date?: string;
}

// Categorias padrão de despesas recorrentes
const STANDARD_CATEGORIES = [
  'Aluguel',
  'Combustível',
  'Conta de Água',
  'Conta de Luz',
  'DAS MEI',
  'Funcionários',
  'Fretes',
  'Internet',
  'Manutenção de Equipamentos',
  'Manutenção de Veículos',
  'Marketing',
  'Seguros',
  'Tecnologia (Licenças e Assinaturas)',
  'Telefone',
];

interface CategoryValue {
  category: string;
  value: string;
  description?: string; // Para categoria "Outros"
}

export default function RecurringExpensesScreen() {
  const { theme } = useThemeCtx();
  const { formatMoney } = useI18n();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const queryClient = useQueryClient();
  const toast = useToast();
  const { expenseOptions } = useSegmentCategories();

  const allCategoryOptions = React.useMemo(() => {
    const set = new Set<string>();
    for (const c of STANDARD_CATEGORIES) set.add(c);
    for (const c of expenseOptions) set.add(c);
    set.add('Outros');
    return Array.from(set);
  }, [expenseOptions]);

  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all');
  const [modalVisible, setModalVisible] = React.useState(false);
  const [editing, setEditing] = React.useState<RecurringExpense | null>(null);
  const [description, setDescription] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [recurrenceType, setRecurrenceType] = React.useState<RecurrenceType>('monthly');
  const [dueDay, setDueDay] = React.useState(String(new Date().getDate()));
  const [dueDate, setDueDate] = React.useState(todayYMD());
  const [isVariableAmount, setIsVariableAmount] = React.useState(false);
  const [isNoDueDate, setIsNoDueDate] = React.useState(false);

  // Estado para valores individuais por categoria
  const [categoryValues, setCategoryValues] = React.useState<{ [key: string]: string }>(() => {
    return STANDARD_CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat]: '' }), {});
  });

  React.useEffect(() => {
    setCategoryValues((prev) => {
      const next: { [key: string]: string } = { ...prev };
      for (const cat of allCategoryOptions) {
        if (!(cat in next)) next[cat] = '';
      }
      return next;
    });
  }, [allCategoryOptions]);

  // Estados para campo "Outros"
  const [otherDescription, setOtherDescription] = React.useState('');
  const [otherValue, setOtherValue] = React.useState('');

  // Estados para modal de confirmação de pagamento (integrado, sem popup)
  const [confirmPaymentVisible, setConfirmPaymentVisible] = React.useState(false);
  const [expenseToPayment, setExpenseToPayment] = React.useState<RecurringAlertRow | null>(null);

  const today = todayYMD();
  const nowDate = new Date();
  const year = nowDate.getFullYear();
  const month = nowDate.getMonth() + 1;

  const recurringQ = useQuery({
    queryKey: ['recurring-expenses'],
    queryFn: () => listRecurringExpenses(),
  });

  // Query para transações do mês (para verificar pagos)
  const txQ = useQuery({
    queryKey: ['recurring-expenses-tx', year, month],
    queryFn: () => getTransactionsByMonth(year, month),
  });

  // Query para valores das categorias do mês atual
  const categoryValuesQuery = useQuery({
    queryKey: ['recurring-category-values', year, month],
    queryFn: async () => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return [];

      // Buscar despesas recorrentes do mês atual
      const recurring = await listRecurringExpenses();
      const monthTransactions = await getTransactionsByMonth(year, month);

      // Mapear valores existentes para as categorias do catálogo (baseline + segmento)
      const values: CategoryValue[] = allCategoryOptions
        .filter((cat) => cat.toLowerCase() !== 'outros')
        .map(cat => {
        // Procurar despesa recorrente correspondente
        const recurringExpense = recurring.find(r =>
          r.description.toLowerCase().includes(cat.toLowerCase()) ||
          cat.toLowerCase().includes(r.description.toLowerCase())
        );

        // Se encontrou, pegar o valor
        if (recurringExpense) {
          return { category: cat, value: formatCentsBRL(recurringExpense.amount_cents) };
        }

        // Senão, procurar em transações do mês
        const transaction = monthTransactions.find(tx =>
          tx.type === 'expense' && (
            (tx.description || '').toLowerCase().includes(cat.toLowerCase()) ||
            cat.toLowerCase().includes((tx.description || '').toLowerCase())
          )
        );

        if (transaction) {
          return { category: cat, value: formatCentsBRL(transaction.amount_cents) };
        }

        return { category: cat, value: '' };
      });

      return values;
    },
    refetchOnWindowFocus: true,
  });

  // Carregar valores quando a query retornar
  React.useEffect(() => {
    if (categoryValuesQuery.data) {
      const valuesMap: { [key: string]: string } = {};
      categoryValuesQuery.data.forEach(cat => {
        valuesMap[cat.category] = cat.value;
      });
      setCategoryValues(valuesMap);
    }
  }, [categoryValuesQuery.data]);

  const alerts: RecurringAlertRow[] = React.useMemo(() => {
    const recurring = (recurringQ.data || []) as RecurringExpense[];
    const monthTransactions = (txQ.data || []) as Transaction[];
    if (!today) return [];

    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const WINDOW_BEFORE_DAYS = 5;
    const WINDOW_AFTER_DAYS = 10;
    const AMOUNT_TOLERANCE_PERCENT = 0.08;
    const MIN_TOLERANCE_CENTS = 200;

    const todayDate = new Date(`${today}T12:00:00`);
    const rows: RecurringAlertRow[] = [];

    for (const rec of recurring) {
      const nextDateObj = getNextOccurrence(rec, todayDate);
      if (!nextDateObj) continue;

      const daysUntil = Math.round(
        (nextDateObj.getTime() - todayDate.getTime()) / MS_PER_DAY,
      );

      const windowStart = new Date(nextDateObj.getTime() - WINDOW_BEFORE_DAYS * MS_PER_DAY);
      const windowEnd = new Date(nextDateObj.getTime() + WINDOW_AFTER_DAYS * MS_PER_DAY);

      const nextYmd = nextDateObj.toISOString().slice(0, 10);
      const paymentKey = rec.recurrence_type === 'monthly' ? nextYmd.slice(0, 7) : nextYmd;
      const paymentTag = `recurring_expense:${rec.id}:${paymentKey}`;

      const matchTagged = monthTransactions.find((tx) => {
        if (tx.type !== 'expense') return false;
        return (tx.source_device || '') === paymentTag;
      });

      const matchFuzzy = !matchTagged ? monthTransactions.find((tx) => {
        if (tx.type !== 'expense') return false;
        const txDate = new Date(`${tx.date}T00:00:00`);
        const windowStart = new Date(nextDateObj.getTime() - WINDOW_BEFORE_DAYS * MS_PER_DAY);
        const windowEnd = new Date(nextDateObj.getTime() + WINDOW_AFTER_DAYS * MS_PER_DAY);
        if (txDate < windowStart || txDate > windowEnd) return false;

        const descTx = (tx.description || '').toLowerCase().trim();
        const descRec = (rec.description || '').toLowerCase().trim();
        if (!descTx || !descRec) return false;
        const matchesDescription = descTx.includes(descRec) || descRec.includes(descTx);
        if (!matchesDescription) return false;

        const diff = Math.abs((tx.amount_cents || 0) - (rec.amount_cents || 0));
        const tolerance = Math.max(
          Math.round(rec.amount_cents * AMOUNT_TOLERANCE_PERCENT),
          MIN_TOLERANCE_CENTS,
        );
        return diff <= tolerance;
      }) : undefined;

      const match = matchTagged || matchFuzzy;

      rows.push({
        id: rec.id,
        description: rec.description,
        category: rec.category ?? null,
        amount_cents: rec.amount_cents,
        recurrence_type: rec.recurrence_type,
        next_date: nextYmd,
        days_until: daysUntil,
        payment_tag: paymentTag,
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

  // Função para salvar individualmente cada categoria
  const saveIndividualCategory = async (category: string, value: string, description?: string) => {
    try {
      if (!value.trim()) {
        toast.show('Digite um valor válido', 'error');
        return;
      }

      const cents = parseBRLToCents(value);
      if (cents <= 0) {
        toast.show('Valor deve ser maior que zero', 'error');
        return;
      }

      const companyId = await getCurrentCompanyId();
      if (!companyId) throw new Error('Empresa não encontrada');

      // Verificar se já existe uma despesa recorrente para esta categoria
      const existing = recurringQ.data?.find(r =>
        r.description.toLowerCase().includes(category.toLowerCase()) ||
        category.toLowerCase().includes(r.description.toLowerCase())
      );

      if (existing) {
        // Atualizar existente
        await updateRecurringExpense(existing.id, {
          description: description || category,
          amount_cents: cents,
          recurrence_type: 'monthly',
          start_date: todayYMD(),
          end_date: null,
        });
        toast.show(`${category} atualizada com sucesso`, 'success');
      } else {
        // Criar nova
        await createRecurringExpense({
          description: description || category,
          amount_cents: cents,
          recurrence_type: 'monthly',
          start_date: todayYMD(),
          end_date: null,
        });
        toast.show(`${category} salva com sucesso`, 'success');
      }

      // Limpar o campo após salvar
      if (category === 'Outros') {
        setOtherDescription('');
        setOtherValue('');
      } else {
        setCategoryValues(prev => ({ ...prev, [category]: '' }));
      }

      // Invalidar queries para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['recurring-category-values', year, month] });
      queryClient.invalidateQueries({ queryKey: ['daily-totals', todayYMD()] });
      queryClient.invalidateQueries({ queryKey: ['month-totals', year, month] });
      queryClient.invalidateQueries({ queryKey: ['month-data', year, month] });

    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      toast.show('Erro ao salvar categoria', 'error');
    }
  };

  const createMut = useMutation({
    mutationFn: async () => {
      if (!description) throw new Error('Preencha a descrição');
      if (!isVariableAmount && !amount) throw new Error('Preencha o valor ou marque como valor variável');
      if (!isNoDueDate && recurrenceType === 'monthly' && !dueDay) throw new Error('Preencha o dia do vencimento ou marque "Não se Aplica"');
      if (!isNoDueDate && recurrenceType !== 'monthly' && !dueDate) throw new Error('Preencha a data de vencimento ou marque "Não se Aplica"');
      // Função para converter DD/MM/AAAA para AAAA-MM-DD
      const parseToYMD = (d: string): string => {
        if (!d) return '';
        // Se já está no formato AAAA-MM-DD, retorna como está
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
        // Converte DD/MM/AAAA para AAAA-MM-DD
        const parts = d.split('/');
        if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
        return d;
      };
      const buildMonthlyStartYmd = (dayStr: string): string => {
        const n = Number(String(dayStr).replace(/\D/g, ''));
        if (!Number.isFinite(n) || n < 1 || n > 31) throw new Error('Dia do vencimento inválido');
        const dd = String(n).padStart(2, '0');
        return `2000-01-${dd}`;
      };

      // Se for "Não se Aplica", usar uma data especial que indica sem vencimento
      const start_date = isNoDueDate 
        ? '9999-12-31' // Data especial para "Não se Aplica"
        : recurrenceType === 'monthly'
          ? buildMonthlyStartYmd(dueDay)
          : parseToYMD(dueDate);

      const payload = {
        description,
        category: category || null,
        amount_cents: isVariableAmount ? 0 : parseBRLToCents(amount), // 0 indica valor variável
        recurrence_type: recurrenceType,
        start_date,
        end_date: editing?.end_date ?? null,
      };
      if (editing) {
        await updateRecurringExpense(editing.id, payload);
      } else {
        await createRecurringExpense(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['recurring-category-values'] });
      queryClient.invalidateQueries({ queryKey: ['daily-totals'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-totals'] });
      queryClient.invalidateQueries({ queryKey: ['month-data'] });
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
      queryClient.invalidateQueries({ queryKey: ['recurring-category-values'] });
      queryClient.invalidateQueries({ queryKey: ['daily-totals'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-totals'] });
      queryClient.invalidateQueries({ queryKey: ['month-data'] });
      resetForm();
      setModalVisible(false);
      Alert.alert('Despesa excluída', 'Despesa recorrente excluída com sucesso.');
    },
    onError: (e: any) => {
      Alert.alert('Erro ao excluir', e?.message || 'Não foi possível excluir.');
    },
  });

  // Mutation para marcar despesa como paga (cria transação de despesa)
  const markAsPaidMut = useMutation({
    mutationFn: async (recurringExpense: RecurringAlertRow) => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) throw new Error('Empresa não encontrada');

      const now = new Date();
      const todayStr = todayYMD();
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      console.log('💰 Criando transação de despesa recorrente paga:', recurringExpense.description);

      const txId = await createTransaction({
        company_id: companyId,
        type: 'expense' as TxType,
        amount_cents: recurringExpense.amount_cents,
        description: recurringExpense.description,
        category: recurringExpense.category || 'Despesa Recorrente',
        date: todayStr,
        time: time,
        datetime: now.toISOString(),
        source_device: recurringExpense.payment_tag,
      });

      console.log('✅ Transação criada com ID:', txId);

      // Forçar sincronização
      try {
        const { syncAll } = await import('../lib/sync');
        await syncAll();
        console.log('✅ Sync concluído após marcar como pago');
      } catch (syncError) {
        console.warn('⚠️ Sync falhou:', syncError);
      }

      return txId;
    },
    onSuccess: () => {
      const todayStr = todayYMD();

      // Invalidar TODAS as queries relevantes
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses-tx', year, month] });
      queryClient.invalidateQueries({ queryKey: ['recurring-category-values', year, month] });
      queryClient.invalidateQueries({ queryKey: ['transactions-by-date', todayStr] });
      queryClient.invalidateQueries({ queryKey: ['daily-totals', todayStr] });
      queryClient.invalidateQueries({ queryKey: ['month-totals'] });
      queryClient.invalidateQueries({ queryKey: ['month-series', year, month] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', year, month] });
      queryClient.invalidateQueries({ queryKey: ['category-breakdown', year, month] });
      queryClient.invalidateQueries({ queryKey: ['payables-summary'] });

      toast.show('✅ Despesa marcada como paga!', 'success');
    },
    onError: (e: any) => {
      console.error('❌ Erro ao marcar como pago:', e);
      Alert.alert('Erro', e?.message || 'Não foi possível marcar como pago.');
    },
  });

  function resetForm() {
    setDescription('');
    setCategory('');
    setAmount('');
    setRecurrenceType('monthly');
    setDueDay(String(new Date().getDate()));
    setDueDate(todayYMD());
    setIsVariableAmount(false);
    setIsNoDueDate(false);
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
    setDueDay(String(new Date(`${item.start_date}T12:00:00`).getDate()));
    // Verificar se é valor variável (amount_cents = 0 ou negativo)
    setIsVariableAmount(item.amount_cents <= 0);
    // Verificar se não tem data de vencimento (data especial)
    const hasNoDueDate = item.start_date === '1900-01-01' || item.start_date === '9999-12-31';
    setIsNoDueDate(hasNoDueDate);
    // Converter de AAAA-MM-DD para DD/MM/AAAA
    const formatDateToDMY = (d: string) => {
      if (!d || hasNoDueDate) return '';
      const parts = d.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return d;
    };
    setDueDate(formatDateToDMY(item.start_date));
    setModalVisible(true);
  }

  // Layout responsivo
  const isWideScreen = width >= 1024;
  const useTwoColumns = isWeb && isWideScreen;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScreenTitle
        title="Despesas Recorrentes"
        subtitle="Configure suas despesas fixas mensais"
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
        {/* Filtros de status */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {(['all', 'paid', 'unpaid', 'overdue'] as StatusFilter[]).map((s) => {
            const labels: Record<StatusFilter, string> = {
              all: 'Todas',
              paid: 'Pagas',
              unpaid: 'A pagar',
              overdue: 'Vencidas',
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

        {/* Legenda de cores */}
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
            <Text style={{ color: '#6B7280', fontSize: 11 }}>Vencido</Text>
          </View>
        </View>

        {/* Layout principal */}
        <View style={{
          flexDirection: useTwoColumns ? 'row' : 'column',
          gap: 20,
          marginTop: 20
        }}>

          {/* COLUNA ESQUERDA - Formulário Simplificado */}
          <View style={{
            flex: useTwoColumns ? 1 : undefined,
            minWidth: useTwoColumns ? 300 : undefined
          }}>
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <Text style={{
                color: theme.text,
                fontSize: 16,
                fontWeight: '700',
                marginBottom: 16
              }}>
                Nova Despesa Fixa
              </Text>

              <Text style={{
                color: theme.textSecondary,
                fontSize: 12,
                marginBottom: 16
              }}>
                Adicione uma nova despesa recorrente
              </Text>

              {/* Dropdown de Categoria - Autocomplete Input */}
              <Text style={{
                color: theme.text,
                fontSize: 14,
                fontWeight: '500',
                marginBottom: 8
              }}>
                Categoria:
              </Text>
              <View style={{ position: 'relative', zIndex: 100, marginBottom: 16 }}>
                <TextInput
                  value={category}
                  onChangeText={setCategory}
                  placeholder="Digite ou selecione uma categoria..."
                  placeholderTextColor="#999"
                  style={{
                    borderWidth: 1,
                    borderColor: '#ddd',
                    borderRadius: 8,
                    padding: 12,
                    color: theme.text,
                    backgroundColor: theme.background,
                    fontSize: 14,
                  }}
                />
                {/* Sugestões dropdown com scroll */}
                {category.length > 0 && (
                  <View style={{
                    position: 'absolute',
                    top: 48,
                    left: 0,
                    right: 0,
                    backgroundColor: theme.card,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: theme.border,
                    maxHeight: 250,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 8,
                    elevation: 5,
                  }}>
                    <ScrollView
                      nestedScrollEnabled
                      style={{ maxHeight: 250 }}
                      showsVerticalScrollIndicator={true}
                    >
                      {allCategoryOptions
                        .filter(cat => category.trim() === '' || cat.toLowerCase().includes(category.trim().toLowerCase()))
                        .map((cat) => (
                          <TouchableOpacity
                            key={cat}
                            onPress={() => setCategory(cat)}
                            style={{
                              padding: 12,
                              borderBottomWidth: 1,
                              borderBottomColor: theme.border,
                            }}
                          >
                            <Text style={{
                              color: theme.text,
                              fontSize: 14,
                            }}>
                              {cat}
                            </Text>
                          </TouchableOpacity>
                        ))}
                    </ScrollView>
                  </View>
                )}
                {/* Mostrar todas as categorias quando o campo está vazio */}
                {category.length === 0 && (
                  <TouchableOpacity
                    onPress={() => setCategory(' ')}
                    style={{
                      marginTop: 8,
                      padding: 8,
                      borderRadius: 6,
                      backgroundColor: theme.primary + '15',
                    }}
                  >
                    <Text style={{ color: theme.primary, fontSize: 12, textAlign: 'center' }}>
                      📋 Clique para ver todas as categorias
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Input de Valor */}
              <Text style={{
                color: theme.text,
                fontSize: 14,
                fontWeight: '500',
                marginBottom: 8
              }}>
                Valor:
              </Text>
              <TextInput
                value={otherValue}
                onChangeText={(text) => setOtherValue(maskBRLInput(text))}
                placeholder="R$ 0,00"
                placeholderTextColor="#999"
                keyboardType="numeric"
                style={{
                  borderWidth: 1,
                  borderColor: '#ddd',
                  borderRadius: 8,
                  padding: 12,
                  color: theme.text,
                  backgroundColor: theme.background,
                  fontSize: 14,
                  marginBottom: 16,
                }}
              />

              {/* Input de Descrição */}
              <Text style={{
                color: theme.text,
                fontSize: 14,
                fontWeight: '500',
                marginBottom: 8
              }}>
                Descrição (opcional):
              </Text>
              <TextInput
                value={otherDescription}
                onChangeText={setOtherDescription}
                placeholder="Detalhe adicional..."
                placeholderTextColor="#999"
                style={{
                  borderWidth: 1,
                  borderColor: '#ddd',
                  borderRadius: 8,
                  padding: 12,
                  color: theme.text,
                  backgroundColor: theme.background,
                  fontSize: 14,
                  marginBottom: 16,
                }}
              />

              {/* Botão Salvar */}
              <TouchableOpacity
                onPress={() => {
                  if (!category) {
                    toast.show('Selecione uma categoria', 'error');
                    return;
                  }
                  const finalDescription = otherDescription.trim()
                    ? `${category} - ${otherDescription.trim()}`
                    : category;
                  saveIndividualCategory(category, otherValue, finalDescription);
                }}
                style={{
                  paddingVertical: 14,
                  backgroundColor: '#16A34A',
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                  💾 Salvar Despesa
                </Text>
              </TouchableOpacity>

            </View>
          </View>

          {/* COLUNA DIREITA - Despesas Recorrentes Existentes */}
          <View style={{
            flex: useTwoColumns ? 1 : undefined,
            minWidth: useTwoColumns ? 300 : undefined
          }}>
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16
              }}>
                <Text style={{
                  color: theme.text,
                  fontSize: 16,
                  fontWeight: '700'
                }}>
                  Despesas Cadastradas
                </Text>
                <TouchableOpacity
                  onPress={openCreate}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: '#16A34A',
                  }}
                >
                  <Text style={{
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: '700'
                  }}>
                    + Adicionar
                  </Text>
                </TouchableOpacity>
              </View>

              {recurringQ.isLoading || txQ.isLoading ? (
                <Text style={{
                  color: '#9CA3AF',
                  fontSize: 12,
                  textAlign: 'center',
                  marginTop: 20
                }}>
                  Carregando despesas recorrentes…
                </Text>
              ) : null}

              {recurringQ.isError || txQ.isError ? (
                <Text style={{
                  color: '#DC2626',
                  fontSize: 12,
                  textAlign: 'center',
                  marginTop: 20
                }}>
                  Não foi possível carregar as despesas recorrentes.
                </Text>
              ) : null}

              {filteredAlerts.length === 0 && !recurringQ.isLoading && !txQ.isLoading ? (
                <View style={{ alignItems: 'center', marginTop: 20 }}>
                  <Text style={{
                    color: '#9CA3AF',
                    fontSize: 14,
                    textAlign: 'center'
                  }}>
                    Nenhuma despesa recorrente encontrada para o filtro atual.
                  </Text>
                </View>
              ) : null}

              {/* Lista de despesas recorrentes */}
              <View style={{ gap: 8 }}>
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
                      ? `Vencido há ${Math.abs(a.days_until)} dia(s)`
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
                        padding: 12,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: theme.border,
                        backgroundColor: theme.card,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <Text style={{ color: statusColor, fontSize: 16 }}>●</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{
                            color: theme.text,
                            fontWeight: '700'
                          }} numberOfLines={1}>
                            {a.description}
                          </Text>
                          <Text style={{
                            color: '#6B7280',
                            fontSize: 11
                          }} numberOfLines={1}>
                            Próx. vencimento: {nextLabel} • Valor: {formatMoney(a.amount_cents)}
                          </Text>
                          {a.category ? (
                            <Text style={{
                              color: '#9CA3AF',
                              fontSize: 10
                            }} numberOfLines={1}>
                              Categoria: {a.category}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      <View style={{ marginLeft: 8, alignItems: 'flex-end' }}>
                        <Text style={{
                          color: statusColor,
                          fontSize: 11,
                          fontWeight: '700'
                        }}>
                          {statusLabel}
                        </Text>
                        {a.isPaid && a.paid_transaction_date && (
                          <Text style={{
                            color: '#6B7280',
                            fontSize: 10
                          }}>
                            Pago em {a.paid_transaction_date.split('-').reverse().join('/')}
                          </Text>
                        )}
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                          {/* Botão com 3 estados: Verde=Pagar, Azul=Pago, Vermelho=Atrasado */}
                          {a.isPaid ? (
                            // Estado PAGO - Azul
                            <View
                              style={{
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                backgroundColor: '#3B82F6',
                                borderRadius: 4,
                              }}
                            >
                              <Text style={{
                                color: '#fff',
                                fontSize: 10,
                                fontWeight: '700'
                              }}>
                                ✓ Pago
                              </Text>
                            </View>
                          ) : isOverdue ? (
                            // Estado ATRASADO - Vermelho
                            <TouchableOpacity
                              onPress={() => {
                                setExpenseToPayment(a);
                                setConfirmPaymentVisible(true);
                              }}
                              disabled={markAsPaidMut.isPending}
                              style={{
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                backgroundColor: '#DC2626',
                                borderRadius: 4,
                              }}
                            >
                              <Text style={{
                                color: '#fff',
                                fontSize: 10,
                                fontWeight: '700'
                              }}>
                                {markAsPaidMut.isPending ? '...' : 'Vencido'}
                              </Text>
                            </TouchableOpacity>
                          ) : (
                            // Estado PAGAR - Verde
                            <TouchableOpacity
                              onPress={() => {
                                setExpenseToPayment(a);
                                setConfirmPaymentVisible(true);
                              }}
                              disabled={markAsPaidMut.isPending}
                              style={{
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                backgroundColor: '#16A34A',
                                borderRadius: 4,
                              }}
                            >
                              <Text style={{
                                color: '#fff',
                                fontSize: 10,
                                fontWeight: '700'
                              }}>
                                {markAsPaidMut.isPending ? '...' : '✓ Pagar'}
                              </Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            onPress={() => openEdit(recurringQ.data?.find((r: RecurringExpense) => r.id === a.id)!)}
                          >
                            <Text style={{
                              color: '#0ea5e9',
                              fontSize: 10,
                              fontWeight: '700'
                            }}>
                              Editar
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modal de cadastro/edição (mesmo de antes) */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20
        }}>
          <View style={{
            width: '100%',
            maxWidth: 420,
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 20,
            gap: 12
          }}>
            <Text style={{
              color: theme.text,
              fontSize: 18,
              fontWeight: '700'
            }}>
              {editing ? 'Editar Despesa Recorrente' : 'Adicionar Despesa Recorrente'}
            </Text>
            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.text }}>Descrição</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Ex: Assinatura Netflix"
                placeholderTextColor="#999"
                style={{
                  borderWidth: 1,
                  borderColor: '#ddd',
                  borderRadius: 8,
                  padding: 10,
                  color: theme.text,
                  backgroundColor: theme.background
                }}
              />
            </View>
            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.text }}>Categoria (opcional)</Text>
              <TextInput
                value={category}
                onChangeText={setCategory}
                placeholder="Entretenimento"
                placeholderTextColor="#999"
                style={{
                  borderWidth: 1,
                  borderColor: '#ddd',
                  borderRadius: 8,
                  padding: 10,
                  color: theme.text,
                  backgroundColor: theme.background
                }}
              />
            </View>
            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.text }}>Valor</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <TouchableOpacity
                  onPress={() => setIsVariableAmount(!isVariableAmount)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <View style={{
                    width: 20,
                    height: 20,
                    borderWidth: 2,
                    borderColor: isVariableAmount ? '#16A34A' : '#ddd',
                    borderRadius: 4,
                    backgroundColor: isVariableAmount ? '#16A34A' : 'transparent',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    {isVariableAmount && (
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
                    )}
                  </View>
                  <Text style={{ color: theme.text, fontSize: 14 }}>
                    Valor variável (ex: Gasolina)
                  </Text>
                </TouchableOpacity>
              </View>
              {!isVariableAmount && (
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="R$ 0,00"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  style={{
                    borderWidth: 1,
                    borderColor: '#ddd',
                    borderRadius: 8,
                    padding: 10,
                    color: theme.text,
                    backgroundColor: theme.background
                  }}
                />
              )}
              {isVariableAmount && (
                <View style={{
                  borderWidth: 1,
                  borderColor: '#ddd',
                  borderRadius: 8,
                  padding: 10,
                  backgroundColor: '#f3f4f6'
                }}>
                  <Text style={{ color: '#888', fontSize: 14 }}>
                    Valor será informado no momento do pagamento
                  </Text>
                </View>
              )}
            </View>
            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.text }}>Recorrência</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {(['monthly', 'weekly', 'biweekly', 'annual'] as RecurrenceType[]).map((rt) => {
                  const labels: Record<RecurrenceType, string> = {
                    monthly: 'Mensal',
                    weekly: 'Semanal',
                    biweekly: 'Quinzenal',
                    annual: 'Anual',
                    custom: 'Personalizado'
                  };
                  const active = recurrenceType === rt;
                  return (
                    <TouchableOpacity
                      key={rt}
                      onPress={() => setRecurrenceType(rt)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: active ? '#16A34A' : '#4B5563',
                        backgroundColor: active ? '#16A34A22' : 'transparent'
                      }}
                    >
                      <Text style={{
                        color: active ? '#16A34A' : theme.text,
                        fontSize: 12,
                        fontWeight: '700'
                      }}>
                        {labels[rt]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.text }}>{recurrenceType === 'monthly' ? 'Dia do vencimento (1 a 31)' : 'Data de vencimento'}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <TouchableOpacity
                  onPress={() => setIsNoDueDate(!isNoDueDate)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <View style={{
                    width: 20,
                    height: 20,
                    borderWidth: 2,
                    borderColor: isNoDueDate ? '#16A34A' : '#ddd',
                    borderRadius: 4,
                    backgroundColor: isNoDueDate ? '#16A34A' : 'transparent',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    {isNoDueDate && (
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
                    )}
                  </View>
                  <Text style={{ color: theme.text, fontSize: 14 }}>
                    Não se Aplica (ex: Botijão/Gás)
                  </Text>
                </TouchableOpacity>
              </View>
              {!isNoDueDate && recurrenceType === 'monthly' && (
                <TextInput
                  value={dueDay}
                  onChangeText={setDueDay}
                  placeholder="1 a 31"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  style={{
                    borderWidth: 1,
                    borderColor: '#ddd',
                    borderRadius: 8,
                    padding: 10,
                    color: theme.text,
                    backgroundColor: theme.background
                  }}
                />
              )}
              {!isNoDueDate && recurrenceType !== 'monthly' && (
                <TextInput
                  value={dueDate}
                  onChangeText={setDueDate}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#999"
                  style={{
                    borderWidth: 1,
                    borderColor: '#ddd',
                    borderRadius: 8,
                    padding: 10,
                    color: theme.text,
                    backgroundColor: theme.background
                  }}
                />
              )}
              {isNoDueDate && (
                <View style={{
                  borderWidth: 1,
                  borderColor: '#ddd',
                  borderRadius: 8,
                  padding: 10,
                  backgroundColor: '#f3f4f6'
                }}>
                  <Text style={{ color: '#888', fontSize: 14 }}>
                    Vencimento será informado no momento do pagamento
                  </Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: '#6b7280',
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>
              {editing && (
                <TouchableOpacity
                  onPress={() => deleteMut.mutate()}
                  disabled={deleteMut.isPending}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    backgroundColor: '#DC2626',
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Excluir</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => createMut.mutate()}
                disabled={createMut.isPending}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: '#16A34A',
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>
                  {editing ? 'Salvar' : 'Adicionar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de confirmação de pagamento (integrado, sem popup) */}
      {confirmPaymentVisible && expenseToPayment && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <View style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 24,
            marginHorizontal: 32,
            maxWidth: 400,
            width: '90%',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
          }}>
            <Text style={{
              fontSize: 20,
              fontWeight: '700',
              marginBottom: 16,
              textAlign: 'center',
              color: theme.text
            }}>
              💰 Marcar como Pago
            </Text>
            <Text style={{
              fontSize: 16,
              marginBottom: 16,
              textAlign: 'center',
              color: theme.text,
              lineHeight: 22
            }}>
              Deseja marcar <Text style={{ fontWeight: '700' }}>"{expenseToPayment.description}"</Text> como pago?
            </Text>
            <View style={{
              backgroundColor: '#fef3c7',
              padding: 12,
              borderRadius: 8,
              marginBottom: 16
            }}>
              <Text style={{ color: '#92400e', fontSize: 14, marginBottom: 4 }}>
                <Text style={{ fontWeight: '700' }}>Valor:</Text> {formatMoney(expenseToPayment.amount_cents)}
              </Text>
              <Text style={{ color: '#92400e', fontSize: 14, marginBottom: 4 }}>
                <Text style={{ fontWeight: '700' }}>Categoria:</Text> {expenseToPayment.category || 'Despesa Recorrente'}
              </Text>
              <Text style={{ color: '#92400e', fontSize: 14 }}>
                <Text style={{ fontWeight: '700' }}>Vencimento:</Text> {expenseToPayment.next_date.split('-').reverse().join('/')}
              </Text>
              <Text style={{ color: '#78350f', fontSize: 12, marginTop: 8, fontStyle: 'italic' }}>
                * Será criada uma transação de despesa com a data de hoje
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setConfirmPaymentVisible(false);
                  setExpenseToPayment(null);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  borderRadius: 8,
                  backgroundColor: '#6b7280',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 48
                }}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  console.log('🔘 Confirmando pagamento para:', expenseToPayment.description);
                  markAsPaidMut.mutate(expenseToPayment);
                  setConfirmPaymentVisible(false);
                  setExpenseToPayment(null);
                }}
                disabled={markAsPaidMut.isPending}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  borderRadius: 8,
                  backgroundColor: '#16A34A',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 48
                }}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                  {markAsPaidMut.isPending ? 'Processando...' : '✓ Confirmar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = {
  card: {
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
};
