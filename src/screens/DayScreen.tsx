import React from 'react';
import { View, Text, TextInput, Button, FlatList, TouchableOpacity, Alert, Platform, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createTransaction, getDailyTotals, getTransactionsByDate, softDeleteTransaction, updateTransaction, TxType, Transaction } from '../repositories/transactions';
import { createRecurringExpense, deleteRecurringExpense, listRecurringExpenses, RecurrenceType, getNextOccurrence } from '../repositories/recurring_expenses';
import { getOrCreateSettings, DashboardSettings } from '../repositories/dashboard_settings';
import { todayYMD, nowHM, addDays, startOfWeekSunday } from '../utils/date';
import { formatCentsBRL, parseBRLToCents, maskBRLInput } from '../utils/money';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useToast } from '../ui/ToastProvider';
import { useI18n } from '../i18n/I18nProvider';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Linking } from 'react-native';
import NativeDatePicker from '../utils/NativeDatePicker';
import * as FileSystem from 'expo-file-system';
import { useSegmentCategories } from '../hooks/useSegmentCategories';
import { syncAll, pushDirty } from '../lib/sync';
import ScreenTitle from '../components/ScreenTitle';
import FilterDropdown from '../components/FilterDropdown';
import FilterHeader, { normalizeText } from '../components/FilterHeader';
import TodayQuickActions from '../components/TodayQuickActions';
import FeatureBanner from '../components/FeatureBanner';
import SummaryCard, { SummaryGrid } from '../components/SummaryCard';

// Opções de filtro para entradas

// Opções de filtro para saídas

export default function DayScreen() {
  const qc = useQueryClient();
  const { theme, mode } = useThemeCtx();
  const toast = useToast();
  const { t, formatMoney } = useI18n();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isWideWeb = isWeb && width >= 1024;
  const { incomeOptions, expenseOptions } = useSegmentCategories();
  const lastSyncToastRef = React.useRef<number>(0);
  const [type, setType] = React.useState<TxType>('income');
  const [description, setDescription] = React.useState('');
  const [additionalDescription, setAdditionalDescription] = React.useState(''); // Descrição adicional para saídas
  const [amount, setAmount] = React.useState('');
  const [date, setDate] = React.useState(todayYMD());
  const [editVisible, setEditVisible] = React.useState(false);
  const [showPicker, setShowPicker] = React.useState(false);
  const [editing, setEditing] = React.useState<Transaction | null>(null);
  const [editType, setEditType] = React.useState<TxType>('income');
  const [editDesc, setEditDesc] = React.useState('');
  const [editCat, setEditCat] = React.useState('');
  const [editAmt, setEditAmt] = React.useState('');
  const [clientName, setClientName] = React.useState('');

  // Estados para filtros
  const [searchText, setSearchText] = React.useState('');
  const [activeFilter, setActiveFilter] = React.useState('all');

  // Opções de filtro para transações
  const TRANSACTION_FILTER_OPTIONS = [
    { key: 'all', label: 'Tudo' },
    { key: 'income', label: 'Entradas' },
    { key: 'expense', label: 'Saídas' },
  ];

  const txQuery = useQuery({
    queryKey: ['transactions-by-date', date],
    queryFn: () => getTransactionsByDate(date),
  });

  // Lógica de filtragem local
  const filteredTransactions = React.useMemo(() => {
    let filtered = [...(txQuery.data || [])];

    // Aplicar filtro por tipo
    if (activeFilter !== 'all') {
      filtered = filtered.filter(tx => tx.type === activeFilter);
    }

    // Aplicar busca textual
    if (searchText.trim()) {
      const normalizedSearch = normalizeText(searchText);
      filtered = filtered.filter(tx =>
        normalizeText(tx.description || '').includes(normalizedSearch) ||
        normalizeText(tx.category || '').includes(normalizedSearch)
      );
    }

    return filtered;
  }, [txQuery.data, activeFilter, searchText]);

  const totalsQuery = useQuery({
    queryKey: ['daily-totals', date],
    queryFn: () => getDailyTotals(date),
  });

  const recurringQuery = useQuery({
    queryKey: ['recurring-expenses'],
    queryFn: () => listRecurringExpenses(),
  });

  // Query para buscar configurações do dashboard
  const settingsQuery = useQuery({
    queryKey: ['dashboard-settings'],
    queryFn: async () => {
      try {
        const { getCurrentCompanyId } = await import('../lib/company');
        const companyId = await getCurrentCompanyId();
        if (!companyId) return null;
        return await getOrCreateSettings(companyId);
      } catch (error) {
        console.error('[DayScreen] Erro ao carregar configurações:', error);
        return null;
      }
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const cents = parseBRLToCents(amount);
      if (!description || !description.trim()) throw new Error('Descrição é obrigatória');
      if (!date) throw new Error('Data é obrigatória');
      if (cents <= 0) throw new Error('Valor deve ser maior que zero');

      const time = nowHM();
      const baseDate = date ? new Date(`${date}T${time}:00`) : new Date();

      // Para saídas, combinar descrição do dropdown com descrição adicional
      let finalDescription = description;
      if (type === 'expense' && additionalDescription.trim()) {
        finalDescription = `${description} - ${additionalDescription.trim()}`;
      }

      await createTransaction({
        type,
        description: finalDescription,
        category: description, // Categoria é sempre o valor do dropdown
        amount_cents: cents,
        date,
        time,
        datetime: baseDate.toISOString(),
        clientname: type === 'income' ? clientName : undefined,
      });
    },
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['transactions-by-date', date] });
      qc.invalidateQueries({ queryKey: ['daily-totals', date] });
      const y = date.substring(0, 4);
      const m = date.substring(5, 7);
      qc.invalidateQueries({ queryKey: ['month-totals', y, m] });
      qc.invalidateQueries({ queryKey: ['month-series', y, m] });
      qc.invalidateQueries({ queryKey: ['week-totals', startOfWeekSunday(date)] });
      qc.invalidateQueries({ queryKey: ['week-series', startOfWeekSunday(date)] });
      qc.invalidateQueries({ queryKey: ['recurring-expenses'] });
      setDescription('');
      setAdditionalDescription('');
      setAmount('');
      setClientName('');
      toast.show(t('added'), 'success');
      // Force sync after creating transaction
      try { await syncAll(); } catch { }
    },
    onError: (error: any) => toast.show(error?.message || t('error'), 'error'),
  });

  const editMut = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const cents = parseBRLToCents(editAmt);
      if (!cents || !editDesc) throw new Error('Preencha todos os campos');
      await updateTransaction(editing.id, {
        type: editType,
        description: editDesc,
        category: editCat,
        amount_cents: cents,
      });
    },
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['transactions-by-date', date] });
      qc.invalidateQueries({ queryKey: ['daily-totals', date] });
      const y = date.substring(0, 4);
      const m = date.substring(5, 7);
      qc.invalidateQueries({ queryKey: ['month-totals', y, m] });
      qc.invalidateQueries({ queryKey: ['month-series', y, m] });
      qc.invalidateQueries({ queryKey: ['week-totals', startOfWeekSunday(date)] });
      qc.invalidateQueries({ queryKey: ['week-series', startOfWeekSunday(date)] });
      setEditVisible(false);
      setEditing(null);
      toast.show(t('saved'), 'success');
      // Force sync after editing transaction
      try { await syncAll(); } catch { }
    },
    onError: () => toast.show(t('error'), 'error'),
  });

  const deleteRecurringMut = useMutation({
    mutationFn: async (id: string) => {
      await deleteRecurringExpense(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring-expenses'] });
      toast.show('Despesa recorrente excluída', 'success');
    },
    onError: () => toast.show(t('error'), 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: softDeleteTransaction,
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['transactions-by-date', date] });
      qc.invalidateQueries({ queryKey: ['daily-totals', date] });
      const y = date.substring(0, 4);
      const m = date.substring(5, 7);
      qc.invalidateQueries({ queryKey: ['month-totals', y, m] });
      qc.invalidateQueries({ queryKey: ['month-series', y, m] });
      qc.invalidateQueries({ queryKey: ['week-totals', startOfWeekSunday(date)] });
      qc.invalidateQueries({ queryKey: ['week-series', startOfWeekSunday(date)] });
      toast.show(t('deleted'), 'success');
      // Force sync after deleting transaction
      try { await syncAll(); } catch { }
    },
    onError: () => toast.show(t('error'), 'error'),
  });

  const openEdit = (tx: Transaction) => {
    setEditing(tx);
    setEditType(tx.type);
    setEditDesc(tx.description || '');
    setEditCat(tx.category || '');
    setEditAmt(formatCentsBRL(tx.amount_cents));
    setEditVisible(true);
  };

  // Quick sync function
  const quickSync = async () => {
    const now = Date.now();
    if (now - lastSyncToastRef.current < 2000) return;
    lastSyncToastRef.current = now;
    try {
      await pushDirty();
      toast.show('Sincronizado', 'success');
    } catch {
      toast.show('Falha ao sincronizar', 'error');
    }
  };

  // Cálculo de alertas
  const alert = React.useMemo(() => {
    const settings = settingsQuery.data;
    const totals = totalsQuery.data;
    const today = todayYMD();

    if (!settings || !totals || date !== today) return null;

    // Alerta de saldo diário negativo
    if (settings.alert_negative_balance && totals.balance_cents < 0) {
      return {
        message: `Atenção: seu saldo de hoje está negativo em ${formatMoney(Math.abs(totals.balance_cents))}`,
        color: '#D90429'
      };
    }

    return null;
  }, [settingsQuery.data, totalsQuery.data, date, formatMoney]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, width: '100%' }}>
      <ScrollView style={{ flex: 1, width: '100%' }} contentContainerStyle={{ paddingBottom: 80, padding: 16, gap: 12, width: '100%' }} keyboardShouldPersistTaps="handled">
        <ScreenTitle
          title="Lançamentos"
          subtitle="Gerencie entradas e saídas do dia"
        />

        {/* Bloco "Hoje" com ações rápidas - apenas quando a data é hoje */}
        {date === todayYMD() && (
          <TodayQuickActions
            onRegisterIncome={() => {
              setType('income');
              setDescription('');
              setAmount('');
            }}
            onRegisterExpense={() => {
              setType('expense');
              setDescription('');
              setAmount('');
            }}
            onCheckBalance={() => {
              // Scroll para a lista de transações
            }}
          />
        )}

        {/* Banner de Alerta */}
        {alert && (
          <View style={{ backgroundColor: '#FEF2F2', borderColor: alert.color, borderWidth: 1, borderRadius: 8, padding: 12 }}>
            <Text style={{ color: alert.color, fontWeight: '700', fontSize: 14 }}>⚠️ Alerta do Dia</Text>
            <Text style={{ color: alert.color, fontSize: 12, marginTop: 4 }}>{alert.message}</Text>
          </View>
        )}
        <View style={{ flexDirection: isWideWeb ? 'row' : 'column', gap: 16, flex: 1, width: '100%' }}>
          {/* LEFT COLUMN */}
          <View style={{ width: isWideWeb ? '48%' : '100%', gap: 12 }}>
            <View style={styles.dateRow}>
              {Platform.OS === 'web' ? (
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text }}>Data: {`${date.substring(8, 10)}/${date.substring(5, 7)}/${date.substring(0, 4)}`}</Text>
                  {/* @ts-ignore */}
                  <input
                    type="date"
                    value={date}
                    onChange={(e: any) => setDate(String(e.target?.value || date))}
                    style={{ width: '100%', maxWidth: '100%', display: 'block', height: 44, padding: 12, borderRadius: 8, border: '1px solid #ddd', background: (theme as any).card, color: theme.text, colorScheme: mode === 'dark' ? 'dark' : 'light', boxSizing: 'border-box', outline: 'none', outlineOffset: 0, boxShadow: 'none', margin: 0 } as any}
                  />
                </View>
              ) : (
                <TouchableOpacity onPress={() => setShowPicker(true)} style={[styles.input, { flex: 1, justifyContent: 'center', backgroundColor: theme.card }]}>
                  <Text style={{ color: theme.text }}>{date}</Text>
                </TouchableOpacity>
              )}
              {showPicker && Platform.OS !== 'web' && (
                <NativeDatePicker
                  value={new Date(date)}
                  mode="date"
                  onChange={(d: Date) => {
                    setShowPicker(false);
                    if (d) {
                      const y = d.getFullYear();
                      const m = String(d.getMonth() + 1).padStart(2, '0');
                      const dd = String(d.getDate()).padStart(2, '0');
                      setDate(`${y}-${m}-${dd}`);
                    }
                  }}
                />
              )}
            </View>

            <View style={styles.typeRow}>
              <TouchableOpacity
                onPress={() => {
                  setType('income');
                  setDescription(''); // Limpar filtro ao mudar tipo
                }}
                style={[styles.typeBtn, { borderColor: type === 'income' ? '#16A34A' : '#666', backgroundColor: type === 'income' ? '#16A34A' : theme.card }]}
              >
                <Text style={[styles.typeText, { color: type === 'income' ? '#fff' : theme.text }]}>{t('income')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setType('expense');
                  setDescription(''); // Limpar filtro ao mudar tipo
                }}
                style={[styles.typeBtn, { borderColor: type === 'expense' ? '#D90429' : '#666', backgroundColor: type === 'expense' ? '#D90429' : theme.card }]}
              >
                <Text style={[styles.typeText, { color: type === 'expense' ? '#fff' : theme.text }]}>{t('expense')}</Text>
              </TouchableOpacity>
            </View>

            {/* Filtro de Descrição baseado no tipo */}
            <FilterDropdown
              label={type === 'income' ? 'Tipo de Entrada:' : 'Tipo de Saída:'}
              options={type === 'income' ? incomeOptions : expenseOptions}
              selectedValue={description}
              onSelect={setDescription}
              theme={theme}
            />

            {/* Campo Descrição adicional (apenas para saídas) */}
            {type === 'expense' && (
              <TextInput
                placeholder="Descrição adicional (opcional)"
                placeholderTextColor="#999"
                value={additionalDescription}
                onChangeText={setAdditionalDescription}
                style={[styles.input, { color: theme.text, backgroundColor: theme.card }]}
              />
            )}

            <TextInput placeholder={t('value_example')} placeholderTextColor="#999" value={amount} onChangeText={(txt) => setAmount(maskBRLInput(txt))} keyboardType="numeric" style={[styles.input, { color: theme.text, backgroundColor: theme.card }]} />

            {/* Campo Cliente (apenas para entradas) */}
            {type === 'income' && (
              <TextInput
                placeholder="Nome do cliente (opcional)"
                placeholderTextColor="#999"
                value={clientName}
                onChangeText={setClientName}
                style={[styles.input, { color: theme.text, backgroundColor: theme.card }]}
              />
            )}
            <Button title={type === 'income' ? t('add_income') : t('add_expense')} color={type === 'income' ? '#16A34A' : '#D90429'} onPress={() => createMut.mutate()} />
          </View>

          {/* RIGHT COLUMN: Transactions list */}
          <View style={{ flex: isWideWeb ? 1 : undefined, minWidth: isWideWeb ? 280 : undefined, width: isWideWeb ? undefined : '100%' }}>
            <Text style={[styles.subtitle, { color: theme.text }]}>{t('today_transactions')} — {date}</Text>

            <FilterHeader
              searchValue={searchText}
              onSearchChange={setSearchText}
              filterOptions={TRANSACTION_FILTER_OPTIONS}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              searchPlaceholder="Buscar por descrição ou categoria..."
            />

            {isWideWeb ? (
              <FlatList
                style={{}}
                data={filteredTransactions}
                keyExtractor={(item) => item.id}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                scrollEnabled
                renderItem={({ item }) => (
                  <View style={styles.item}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>
                        {item.clientname
                          ? `${item.description || ''} * ${item.clientname} • ${item.time}`
                          : `${item.description || ''} • ${item.time}`
                        }
                      </Text>
                      <Text style={[styles.itemSub, { color: '#888' }]} numberOfLines={1}>{item.category || '—'}</Text>
                    </View>
                    <Text style={[styles.amount, item.type === 'income' ? styles.amountIncome : styles.amountExpense]}>
                      {formatMoney(item.amount_cents)}
                    </Text>
                    <TouchableOpacity onPress={() => openEdit(item)}>
                      <Text style={[styles.edit, { color: '#60A5FA' }]}>{t('edit')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteMut.mutate(item.id)}>
                      <Text style={styles.delete}>{t('delete')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            ) : (
              <View style={{ gap: 8 }}>
                {filteredTransactions.map((item) => (
                  <View key={item.id} style={styles.item}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>
                        {item.clientname
                          ? `${item.description || ''} * ${item.clientname} • ${item.time}`
                          : `${item.description || ''} • ${item.time}`
                        }
                      </Text>
                      <Text style={[styles.itemSub, { color: '#888' }]} numberOfLines={1}>{item.category || '—'}</Text>
                    </View>
                    <Text style={[styles.amount, item.type === 'income' ? styles.amountIncome : styles.amountExpense]}>
                      {formatMoney(item.amount_cents)}
                    </Text>
                    <TouchableOpacity onPress={() => openEdit(item)}>
                      <Text style={[styles.edit, { color: '#60A5FA' }]}>{t('edit')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteMut.mutate(item.id)}>
                      <Text style={styles.delete}>{t('delete')}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            {/* Daily Summary Cards */}
            <View style={{ marginTop: 16, marginBottom: 8 }}>
              <Text style={[styles.subtitle, { color: theme.text, marginBottom: 12 }]}>Resumo do Dia</Text>
              <SummaryGrid columns={3}>
                <SummaryCard
                  title="Entradas"
                  value={formatMoney(totalsQuery.data?.income_cents || 0)}
                  icon="📥"
                  variant="positive"
                  compact
                />
                <SummaryCard
                  title="Saídas"
                  value={formatMoney(totalsQuery.data?.expense_cents || 0)}
                  icon="📤"
                  variant="negative"
                  compact
                />
                <SummaryCard
                  title="Saldo"
                  value={formatMoney(totalsQuery.data?.balance_cents || 0)}
                  icon="💰"
                  variant={(totalsQuery.data?.balance_cents || 0) >= 0 ? 'positive' : 'negative'}
                  compact
                />
              </SummaryGrid>
            </View>
          </View>
        </View>

        {/* Despesas recorrentes */}
        <View style={{ marginTop: 24, gap: 8 }}>
          <Text style={[styles.subtitle, { color: theme.text }]}>Despesas recorrentes</Text>
          {recurringQuery.isLoading && (
            <Text style={{ color: '#888', fontSize: 12 }}>Carregando despesas recorrentes…</Text>
          )}
          {recurringQuery.isError && (
            <Text style={{ color: '#DC2626', fontSize: 12 }}>Não foi possível carregar as despesas recorrentes.</Text>
          )}
          {recurringQuery.data && recurringQuery.data.length === 0 && !recurringQuery.isLoading && (
            <Text style={{ color: '#888', fontSize: 12 }}>Nenhuma despesa recorrente cadastrada.</Text>
          )}
          {recurringQuery.data && recurringQuery.data.length > 0 && (
            <View style={{ gap: 8 }}>
              {recurringQuery.data.map(rec => {
                const next = getNextOccurrence(rec, new Date());
                const nextLabel = next
                  ? `${String(next.getDate()).padStart(2, '0')}/${String(next.getMonth() + 1).padStart(2, '0')}/${next.getFullYear()}`
                  : '—';
                const typeLabel =
                  rec.recurrence_type === 'monthly' ? 'Mensal' :
                    rec.recurrence_type === 'weekly' ? 'Semanal' :
                      rec.recurrence_type === 'biweekly' ? 'Quinzenal' :
                        rec.recurrence_type === 'annual' ? 'Anual' : 'Custom';
                return (
                  <View
                    key={rec.id}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: '#e5e7eb',
                      backgroundColor: theme.card,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontWeight: '700' }}>{rec.description}</Text>
                      <Text style={{ color: '#6b7280', fontSize: 11 }}>{rec.category || typeLabel}</Text>
                      <Text style={{ color: '#6b7280', fontSize: 11 }}>
                        Próxima: {nextLabel} • Valor: {formatMoney(rec.amount_cents)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        Alert.alert(
                          'Excluir despesa recorrente',
                          `Deseja realmente excluir a despesa recorrente "${rec.description}"?`,
                          [
                            { text: 'Cancelar', style: 'cancel' },
                            {
                              text: 'Excluir',
                              style: 'destructive',
                              onPress: () => deleteRecurringMut.mutate(rec.id),
                            },
                          ],
                        );
                      }}
                    >
                      <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '700' }}>Excluir</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>

      </ScrollView>

      {/* MODAL DE EDIÇÃO */}
      {editVisible && editing && (
        <View style={styles.modalBackdrop}>
          <View style={[styles.modal, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Editar Lançamento</Text>

            {/* Tipo */}
            <View style={[styles.typeRow, { marginBottom: 12 }]}>
              <TouchableOpacity
                onPress={() => setEditType('income')}
                style={[styles.typeBtn, { borderColor: editType === 'income' ? '#16A34A' : '#666', backgroundColor: editType === 'income' ? '#16A34A' : theme.background }]}
              >
                <Text style={[styles.typeText, { color: editType === 'income' ? '#fff' : theme.text }]}>Entrada</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setEditType('expense')}
                style={[styles.typeBtn, { borderColor: editType === 'expense' ? '#D90429' : '#666', backgroundColor: editType === 'expense' ? '#D90429' : theme.background }]}
              >
                <Text style={[styles.typeText, { color: editType === 'expense' ? '#fff' : theme.text }]}>Saída</Text>
              </TouchableOpacity>
            </View>

            {/* Descrição */}
            <TextInput
              placeholder="Descrição"
              placeholderTextColor="#999"
              value={editDesc}
              onChangeText={setEditDesc}
              style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
            />

            {/* Categoria */}
            <TextInput
              placeholder="Categoria"
              placeholderTextColor="#999"
              value={editCat}
              onChangeText={setEditCat}
              style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
            />

            {/* Valor */}
            <TextInput
              placeholder="Valor (ex: 50,00)"
              placeholderTextColor="#999"
              value={editAmt}
              onChangeText={(txt) => setEditAmt(maskBRLInput(txt))}
              keyboardType="numeric"
              style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
            />

            {/* Botões */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => {
                  setEditVisible(false);
                  setEditing(null);
                }}
                style={{ flex: 1, padding: 14, borderRadius: 8, backgroundColor: '#6b7280', alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  if (!editing) return;
                  try {
                    const cents = parseBRLToCents(editAmt);
                    if (cents <= 0) {
                      toast.show('Valor inválido', 'error');
                      return;
                    }
                    await updateTransaction(editing.id, {
                      type: editType,
                      description: editDesc,
                      category: editCat,
                      amount_cents: cents,
                    });
                    // Invalidar queries
                    qc.invalidateQueries({ queryKey: ['transactions-by-date', date] });
                    qc.invalidateQueries({ queryKey: ['daily-totals', date] });
                    const y = date.substring(0, 4);
                    const m = date.substring(5, 7);
                    qc.invalidateQueries({ queryKey: ['month-totals', y, m] });
                    qc.invalidateQueries({ queryKey: ['dashboard'] });
                    toast.show('Lançamento atualizado!', 'success');
                    setEditVisible(false);
                    setEditing(null);
                    // Sync
                    try { await syncAll(); } catch { }
                  } catch (e: any) {
                    toast.show('Erro ao atualizar: ' + e.message, 'error');
                  }
                }}
                style={{ flex: 1, padding: 14, borderRadius: 8, backgroundColor: '#16A34A', alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, width: '100%' },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 18, fontWeight: '700' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 8, width: '100%' },
  typeBtn: {
    borderWidth: 1,
    borderRadius: Platform.OS === 'web' ? 8 : 10,
    paddingVertical: Platform.OS === 'web' ? 8 : 14,
    paddingHorizontal: 16,
    flex: 1,
    alignItems: 'center',
    minHeight: Platform.OS === 'web' ? 44 : 52,
    width: '100%',
  },
  typeText: { fontWeight: '700', fontSize: Platform.OS === 'web' ? 14 : 16 },
  input: {
    borderWidth: Platform.OS === 'web' ? 1 : 2,
    borderColor: '#ddd',
    borderRadius: Platform.OS === 'web' ? 8 : 10,
    padding: Platform.OS === 'web' ? 12 : 16,
    marginBottom: 8,
    fontSize: Platform.OS === 'web' ? 14 : 16,
    minHeight: Platform.OS === 'web' ? 44 : 54,
    width: '100%',
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: Platform.OS === 'web' ? 12 : 14, borderWidth: 1, borderColor: '#eee', borderRadius: Platform.OS === 'web' ? 8 : 10, width: '100%' },
  itemTitle: { fontWeight: '700', fontSize: Platform.OS === 'web' ? 14 : 15 },
  itemSub: { fontSize: Platform.OS === 'web' ? 12 : 13 },
  amount: { fontWeight: '700', minWidth: 80, textAlign: 'right', fontSize: Platform.OS === 'web' ? 14 : 17 },
  amountIncome: { color: '#16A34A' },
  amountExpense: { color: '#D90429' },
  edit: { fontSize: 12, color: '#60A5FA', fontWeight: '600' },
  delete: { fontSize: 12, color: '#D90429', fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, width: '100%' },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: 'white', width: '90%', maxWidth: 400, borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  row: { flexDirection: 'row', gap: 8, width: '100%' },
});
