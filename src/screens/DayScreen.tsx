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
import { useSettings } from '../settings/SettingsProvider';
import { syncAll, pushDirty } from '../lib/sync';
import ScreenTitle from '../components/ScreenTitle';
import FilterDropdown from '../components/FilterDropdown';
import FilterHeader, { normalizeText } from '../components/FilterHeader';

// Opções de filtro para entradas
const INCOME_OPTIONS = [
  'Bolo',
  'Delivery',
  'Doces',
  'Encomenda',
  'Kit Festa',
  'Pizzas',
  'Refrigerante',
  'Retirada',
  'Salgados',
];

// Opções de filtro para saídas
const EXPENSE_OPTIONS = [
  'Aluguel',
  'Conta de Água',
  'Conta de Energia',
  'Empréstimo',
  'Gasolina',
  'Pessoal',
  'Reposição',
  'Telefone',
];

export default function DayScreen() {
  const qc = useQueryClient();
  const { theme, mode } = useThemeCtx();
  const toast = useToast();
  const { t, formatMoney } = useI18n();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isWideWeb = isWeb && width >= 1024;
  const { settings } = useSettings();
  const lastSyncToastRef = React.useRef<number>(0);
  const [type, setType] = React.useState<TxType>('income');
  const [description, setDescription] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [date, setDate] = React.useState(todayYMD());
  const [editVisible, setEditVisible] = React.useState(false);
  const [showPicker, setShowPicker] = React.useState(false);
  const [editing, setEditing] = React.useState<Transaction | null>(null);
  const [editType, setEditType] = React.useState<TxType>('income');
  const [editDesc, setEditDesc] = React.useState('');
  const [editCat, setEditCat] = React.useState('');
  const [editAmt, setEditAmt] = React.useState('');
  const [isRecurring, setIsRecurring] = React.useState(false);
  const [recurrenceType, setRecurrenceType] = React.useState<RecurrenceType>('monthly');

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
      await createTransaction({
        type,
        description,
        amount_cents: cents,
        date,
        time,
        datetime: baseDate.toISOString(),
      });

      if (type === 'expense' && isRecurring) {
        await createRecurringExpense({
          description,
          amount_cents: cents,
          recurrence_type: recurrenceType,
          start_date: date,
          end_date: null,
        });
      }
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
      setAmount('');
      setIsRecurring(false);
      toast.show(t('added'), 'success');
      // Force sync after creating transaction
      try { await syncAll(); } catch {}
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
      try { await syncAll(); } catch {}
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
      try { await syncAll(); } catch {}
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
                  <Text style={{ color: theme.text }}>Data: {`${date.substring(8,10)}/${date.substring(5,7)}/${date.substring(0,4)}`}</Text>
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
                      const m = String(d.getMonth()+1).padStart(2,'0');
                      const dd = String(d.getDate()).padStart(2,'0');
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
              options={type === 'income' ? INCOME_OPTIONS : EXPENSE_OPTIONS}
              selectedValue={description}
              onSelect={setDescription}
              theme={theme}
            />
            <TextInput placeholder={t('value_example')} placeholderTextColor="#999" value={amount} onChangeText={(txt) => setAmount(maskBRLInput(txt))} keyboardType="numeric" style={[styles.input, { color: theme.text, backgroundColor: theme.card }]} />

            {type === 'expense' && (
              <View style={{ marginTop: 4, gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setIsRecurring(v => !v)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      borderWidth: 1,
                      borderColor: isRecurring ? '#16A34A' : '#9ca3af',
                      backgroundColor: isRecurring ? '#16A34A' : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isRecurring && <Text style={{ color: '#fff', fontSize: 14 }}>✓</Text>}
                  </View>
                  <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>Marcar como despesa recorrente</Text>
                </TouchableOpacity>

                {isRecurring && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {([
                      { key: 'monthly', label: 'Mensal' },
                      { key: 'weekly', label: 'Semanal' },
                      { key: 'biweekly', label: 'Quinzenal' },
                      { key: 'annual', label: 'Anual' },
                    ] as { key: RecurrenceType; label: string }[]).map(opt => {
                      const active = recurrenceType === opt.key;
                      return (
                        <TouchableOpacity
                          key={opt.key}
                          onPress={() => setRecurrenceType(opt.key)}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 999,
                            borderWidth: 1,
                            borderColor: active ? '#16A34A' : '#9ca3af',
                            backgroundColor: active ? '#dcfce7' : theme.card,
                          }}
                        >
                          <Text style={{ color: active ? '#166534' : theme.text, fontSize: 11, fontWeight: '700' }}>{opt.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
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
                style={{ }}
                data={filteredTransactions}
                keyExtractor={(item) => item.id}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                scrollEnabled
                renderItem={({ item }) => (
                  <View style={styles.item}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>{item.description || ''} • {item.time}</Text>
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
                      <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>{item.description || ''} • {item.time}</Text>
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
            <View style={styles.footer}>
              <Text style={{ color: theme.text }}>{t('income')}: {formatMoney(totalsQuery.data?.income_cents || 0)}</Text>
              <Text style={{ color: theme.text }}>{t('expense')}: {formatMoney(totalsQuery.data?.expense_cents || 0)}</Text>
              <Text style={{ color: (totalsQuery.data?.balance_cents || 0) >= 0 ? '#16A34A' : '#D90429' }}>{t('balance')}: {formatMoney(totalsQuery.data?.balance_cents || 0)}</Text>
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
