import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, useWindowDimensions, Platform, Alert, TextInput, FlatList } from 'react-native';
import { Svg, Rect, Text as SvgText, Line as SvgLine } from 'react-native-svg';
import { InteractiveBar, InteractiveChart } from '../components/InteractiveBar';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useI18n } from '../i18n/I18nProvider';
import { useToast } from '../ui/ToastProvider';
import { useSettings } from '../settings/SettingsProvider';
import { getMonthlyTotals, getMonthlyDailySeries, getMonthlyWeeklySeries, getYearlyMonthlySeries, getTransactionsByMonth } from '../repositories/transactions';
import { getWeeklyTotals } from '../repositories/transactions';
import { getGoalByMonth, createGoal, updateGoal, deleteGoal } from '../repositories/financial_goals';
import { listDebtsByDate, listAllDebts } from '../repositories/debts';
import { getOrCreateSettings } from '../repositories/dashboard_settings';
import { getCurrentCompanyId } from '../lib/company';
import NativeDatePicker from '../utils/NativeDatePicker';
import { todayYMD } from '../utils/date';
import { formatCentsBRL, parseBRLToCents, maskBRLInput } from '../utils/money';
import ScreenTitle from '../components/ScreenTitle';

// Função utilitária para formatação de data local
const formatDateLocal = (dateString: string) => {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('pt-BR');
};

interface DailyData {
  day: number;
  income_cents: number;
  expense_cents: number;
}

interface WeeklyData {
  week: number;
  income_cents: number;
  expense_cents: number;
}

interface MonthlyData {
  month: number;
  income_cents: number;
  expense_cents: number;
}

interface ChartBar {
  label: string;
  income: number;
  expense: number;
}

type ChartView = 'daily' | 'weekly' | 'monthly';

const monthNamePt = (month: number) => {
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return months[month];
};

const getFutureDate = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

const getDefaultTime = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

export default function DashboardScreen() {
  const { theme } = useThemeCtx();
  const { formatMoney } = useI18n();
  const { show } = useToast();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isWideWeb = isWeb && width >= 1024;
  const isTabletOrDesktop = isWideWeb || (Platform.OS !== 'web' && width >= 768);
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const [selectedMonth, setSelectedMonth] = React.useState(new Date());
  const [chartView, setChartView] = React.useState<ChartView>('daily');
  const [chartBarInfo, setChartBarInfo] = React.useState<ChartBar | null>(null);

  // Meta financeira
  const [goalModalOpen, setGoalModalOpen] = React.useState(false);
  const [goalInputValue, setGoalInputValue] = React.useState('');

  // Tooltip para gráficos
  const [dailyTooltip, setDailyTooltip] = React.useState<{ day: number; income: number; expense: number } | null>(null);
  const [weeklyTooltip, setWeeklyTooltip] = React.useState<{ week: number; income: number; expense: number } | null>(null);
  const [monthlyTooltip, setMonthlyTooltip] = React.useState<{ month: string; income: number; expense: number } | null>(null);
  
  // Modal de dívidas vencidas
  const [showOverdueModal, setShowOverdueModal] = React.useState(false);
  const [overdueModalDismissed, setOverdueModalDismissed] = React.useState(false);
  const [savingGoal, setSavingGoal] = React.useState(false);

  const getGoalBarColor = () => {
    const goalProgress = data?.goalProgress?.percent || 0;
    const hasGoal = !!data?.goalProgress?.target_cents;
    if (!hasGoal) return '#6b7280';
    if (goalProgress >= 100) return '#10b981';
    if (goalProgress >= 75) return '#3b82f6';
    if (goalProgress >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getGoalStatusText = () => {
    const goalProgress = data?.goalProgress?.percent || 0;
    const hasGoal = !!data?.goalProgress?.target_cents;
    const isCurrentMonth = selectedMonth.getMonth() === new Date().getMonth() && 
                          selectedMonth.getFullYear() === new Date().getFullYear();
    
    if (!hasGoal) return '';
    if (goalProgress === 0) return 'Meta definida, ainda sem progresso.';
    if (goalProgress >= 1 && goalProgress <= 49) return `Você atingiu ${goalProgress}% da meta. Mantenha o foco!`;
    if (goalProgress >= 50 && goalProgress <= 99) return `Ótimo! Você já alcançou ${goalProgress}% da meta deste mês.`;
    if (goalProgress >= 100) return 'Parabéns! Meta deste mês atingida ✅.';
    return '';
  };

  const handleOpenGoalModal = () => {
    if (data?.goalProgress?.target_cents) {
      setGoalInputValue((data.goalProgress.target_cents / 100).toFixed(2));
    } else {
      setGoalInputValue('');
    }
    setGoalModalOpen(true);
  };

  const handleChartBarPress = (type: 'daily' | 'weekly' | 'monthly', index: number, label: string, income: number, expense: number) => {
    setChartBarInfo({ label, income, expense });
  };

  const handlePreviousMonth = () => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedMonth(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedMonth(newDate);
  };

  // Query principal do dashboard
  const dashboardQuery = useQuery({
    queryKey: ['dashboard', selectedMonth.getFullYear(), selectedMonth.getMonth() + 1],
    queryFn: async () => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return null;

      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth() + 1;

      const [monthlyTotals, dailySeries, goal] = await Promise.all([
        getMonthlyTotals(year, month),
        getMonthlyDailySeries(year, month),
        getGoalByMonth(companyId, `${year}-${String(month).padStart(2, '0')}-01`)
      ]);

      const goalProgress = goal ? {
        target_cents: goal.target_amount_cents,
        achieved_cents: monthlyTotals?.income_cents || 0,
        percent: Math.round(((monthlyTotals?.income_cents || 0) / goal.target_amount_cents) * 100)
      } : null;

      return {
        ...monthlyTotals,
        dailySeries,
        goalProgress,
        year,
        month
      };
    },
  });

  const data = dashboardQuery.data;

  // Query para dados semanais - usa o mês selecionado
  const weeklyDataQuery = useQuery({
    queryKey: ['weekly-data', selectedMonth.getFullYear(), selectedMonth.getMonth() + 1],
    queryFn: async () => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return null;

      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth() + 1;

      const weeklyTotals = await getMonthlyWeeklySeries(year, month);
      
      return {
        weeklySeries: weeklyTotals || []
      };
    },
    enabled: chartView === 'weekly'
  });

  // Query para dados mensais (ano inteiro)
  const monthlyDataQuery = useQuery({
    queryKey: ['monthly-data', selectedMonth.getFullYear()],
    queryFn: async () => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return null;

      const year = selectedMonth.getFullYear();
      const monthlySeries = await getYearlyMonthlySeries(year);
      
      return {
        monthlySeries: monthlySeries || []
      };
    },
    enabled: chartView === 'monthly'
  });

  // Query para configurações do dashboard
  const settingsQuery = useQuery({
    queryKey: ['dashboard-settings'],
    queryFn: async () => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return null;
      return await getOrCreateSettings(companyId);
    },
  });

  // Query para lançamentos recentes
  const recentTransactionsQuery = useQuery({
    queryKey: ['recent-transactions', selectedMonth.getFullYear(), selectedMonth.getMonth() + 1],
    queryFn: async () => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return [];
      
      const transactions = await getTransactionsByMonth(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1);
      // Ordenar por data e pegar os 3 mais recentes
      return transactions
        .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())
        .slice(0, 3);
    },
  });

  // Query para dívidas restantes
  const debtsQuery = useQuery({
    queryKey: ['debts-summary'],
    queryFn: async () => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return { paid: 0, remaining: 0, hasOverdue: false };
      
      const debts = await listAllDebts(companyId);
      let totalPaid = 0;
      let totalRemaining = 0;
      let hasOverdue = false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      for (const debt of debts) {
        // Valor já pago
        const paidAmount = debt.paid_installments * debt.installment_cents;
        totalPaid += paidAmount;
        
        // Valor restante
        const remainingInstallments = debt.installment_count - debt.paid_installments;
        totalRemaining += remainingInstallments * debt.installment_cents;
        
        // Verificar se há parcelas em atraso
        // Calcular a data de vencimento da PRÓXIMA parcela não paga
        if (remainingInstallments > 0 && debt.invoice_due_date) {
          // Pegar a data base de vencimento
          const [year, month, day] = debt.invoice_due_date.split('-').map(Number);
          
          // A próxima parcela a vencer é a parcela (paid_installments + 1)
          // Cada parcela vence 1 mês após a anterior
          const nextInstallmentIndex = debt.paid_installments; // 0-indexed
          
          // Calcular a data de vencimento da próxima parcela
          const nextDueDate = new Date(year, month - 1 + nextInstallmentIndex, day);
          nextDueDate.setHours(0, 0, 0, 0);
          
          // Se a data de vencimento da próxima parcela já passou, está em atraso
          if (nextDueDate < today) {
            hasOverdue = true;
          }
        }
      }
      
      return { paid: totalPaid, remaining: totalRemaining, hasOverdue };
    },
  });

  // Mostrar modal de dívidas vencidas quando o usuário entra
  React.useEffect(() => {
    if (debtsQuery.data?.hasOverdue && !overdueModalDismissed) {
      setShowOverdueModal(true);
    }
  }, [debtsQuery.data?.hasOverdue, overdueModalDismissed]);

  // Cálculo de alertas
  const alerts = React.useMemo(() => {
    const settings = settingsQuery.data;
    const alertList: Array<{
      type: 'negative_balance';
      message: string;
      color: string;
      icon: string;
    }> = [];
    
    if (!settings) return alertList;
    
    const isCurrentMonth = selectedMonth.getMonth() === new Date().getMonth() && 
                          selectedMonth.getFullYear() === new Date().getFullYear();
    
    // Alerta de saldo mensal negativo
    if (settings.alert_negative_balance && isCurrentMonth && (data?.balance_cents || 0) < 0) {
      alertList.push({
        type: 'negative_balance' as const,
        message: `Saldo mensal negativo em ${formatMoney(Math.abs(data?.balance_cents || 0))}`,
        color: '#D90429',
        icon: '⚠️'
      });
    }
    
    return alertList;
  }, [settingsQuery.data, data, selectedMonth, formatMoney]);

  // Variáveis calculadas
  const goalProgress = data?.goalProgress?.percent || 0;
  const hasGoal = !!data?.goalProgress?.target_cents;
  const isCurrentMonth = selectedMonth.getMonth() === new Date().getMonth() && 
                        selectedMonth.getFullYear() === new Date().getFullYear();
  const isNegativeBalance = (data?.balance_cents || 0) < 0;
  const isLowGoalProgress = hasGoal && goalProgress < 50 && isCurrentMonth;

  const maxDayForDailyChart = isCurrentMonth ? new Date().getDate() : 31;
  const maxMonthForMonthlyChart = isCurrentMonth ? todayYMD().split('-')[1] : '12';
  const monthLabel = `${monthNamePt(selectedMonth.getMonth())} ${selectedMonth.getFullYear()}`;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 96, padding: 16, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Título Padronizado */}
        <ScreenTitle 
          title="Dashboard Financeiro" 
          subtitle="Acompanhe seu fluxo de caixa em tempo real" 
        />

        {/* Painel de Alertas */}
        {alerts.length > 0 && (
          <View style={{ backgroundColor: '#FEF2F2', borderColor: '#D90429', borderWidth: 1, borderRadius: 8, padding: 12 }}>
            <Text style={{ color: '#D90429', fontWeight: '700', fontSize: 14, marginBottom: 8 }}>🚨 Alertas Financeiros</Text>
            {alerts.map((alert, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => {
                  if (alert.type === 'negative_balance') {
                    (navigation as any).navigate('Relatórios');
                  }
                }}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 8, borderRadius: 6, marginBottom: index < alerts.length - 1 ? 6 : 0 }}
              >
                <Text style={{ fontSize: 16, marginRight: 8 }}>{alert.icon}</Text>
                <Text style={{ color: alert.color, fontSize: 12, fontWeight: '600', flex: 1 }}>{alert.message}</Text>
                <Text style={{ color: '#6B7280', fontSize: 10 }}>Ver detalhes →</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Period Selector */}
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <TouchableOpacity
            onPress={handlePreviousMonth}
            style={{ paddingHorizontal: 14, paddingVertical: 10, backgroundColor: theme.card, borderRadius: 12, minWidth: 44, alignItems: 'center' }}
          >
            <Text style={{ color: theme.text, fontWeight: '700', fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16 }}>
            {monthLabel}
          </Text>
          <TouchableOpacity
            onPress={handleNextMonth}
            style={{ paddingHorizontal: 14, paddingVertical: 10, backgroundColor: theme.card, borderRadius: 12, minWidth: 44, alignItems: 'center' }}
          >
            <Text style={{ color: theme.text, fontWeight: '700', fontSize: 18 }}>→</Text>
          </TouchableOpacity>
        </View>

        {dashboardQuery.isLoading && (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: '#888' }}>Carregando dados do dashboard…</Text>
          </View>
        )}

        {/* Main Cards */}
        {data && (
          <>
            {/* Layout responsivo */}
            {isTabletOrDesktop ? (
              <View style={styles.summaryRow}>
                {/* Cards Web */}
                <View style={[styles.summaryCard, { width: '23%', backgroundColor: isNegativeBalance ? '#fee2e2' : '#dcfce7', borderColor: isNegativeBalance ? '#ef4444' : '#16a34a', borderWidth: 1 }]}>
                  <Text style={{ color: '#166534', fontWeight: '700', fontSize: 12, textAlign:'center' }}>💰 Saldo Atual</Text>
                  <Text style={{ color: isNegativeBalance ? '#991b1b' : '#166534', fontSize: 22, fontWeight: '800', marginTop: 8, textAlign:'center' }}>
                    {formatMoney(data?.balance_cents || 0)}
                  </Text>
                </View>

                <View style={[styles.summaryCard, { width: '23%', backgroundColor: '#dbeafe', borderColor: '#1d4ed8', borderWidth: 1 }]}>
                  <Text style={{ color: '#1e40af', fontWeight: '700', fontSize: 12, textAlign:'center' }}>📈 Entradas</Text>
                  <Text style={{ color: '#1e40af', fontSize: 20, fontWeight: '800', marginTop: 8, textAlign:'center' }}>
                    {formatMoney(data?.income_cents || 0)}
                  </Text>
                </View>

                <View style={[styles.summaryCard, { width: '23%', backgroundColor: '#fee2e2', borderColor: '#ef4444', borderWidth: 1 }]}>
                  <Text style={{ color: '#991b1b', fontWeight: '700', fontSize: 12, textAlign:'center' }}>📉 Saídas</Text>
                  <Text style={{ color: '#dc2626', fontSize: 20, fontWeight: '800', marginTop: 8, textAlign:'center' }}>
                    {formatMoney(data?.expense_cents || 0)}
                  </Text>
                </View>

                <View style={[styles.summaryCard, { width: '23%', backgroundColor: '#f3e8ff', borderColor: '#8b5cf6', borderWidth: 1 }]}>
                  <Text style={{ color: '#6b21a8', fontWeight: '700', fontSize: 12, textAlign:'center' }}>🔮 Saldo Projetado</Text>
                  <Text style={{ color: '#6b21a8', fontSize: 20, fontWeight: '800', marginTop: 8, textAlign:'center' }}>
                    {formatMoney((data?.balance_cents || 0))}
                  </Text>
                </View>
              </View>
            ) : (
              /* Layout Mobile */
              <View style={{ gap: 8, marginBottom: 12 }}>
                {/* Linha 1: Entradas - Saídas */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={[styles.summaryCard, { flex: 1, backgroundColor: '#dbeafe', borderColor: '#1d4ed8', borderWidth: 1 }]}>
                    <Text style={{ color: '#1e40af', fontWeight: '700', fontSize: 11, textAlign:'center' }}>📈 Entradas</Text>
                    <Text style={{ color: '#1e40af', fontSize: 16, fontWeight: '800', marginTop: 8, textAlign:'center' }}>
                      {formatMoney(data?.income_cents || 0)}
                    </Text>
                  </View>

                  <View style={[styles.summaryCard, { flex: 1, backgroundColor: '#fee2e2', borderColor: '#ef4444', borderWidth: 1 }]}>
                    <Text style={{ color: '#991b1b', fontWeight: '700', fontSize: 11, textAlign:'center' }}>📉 Saídas</Text>
                    <Text style={{ color: '#dc2626', fontSize: 16, fontWeight: '800', marginTop: 8, textAlign:'center' }}>
                      {formatMoney(data?.expense_cents || 0)}
                    </Text>
                  </View>
                </View>

                {/* Linha 2: Saldo Atual - Saldo Projetado */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={[styles.summaryCard, { flex: 1, backgroundColor: isNegativeBalance ? '#fee2e2' : '#dcfce7', borderColor: isNegativeBalance ? '#ef4444' : '#16a34a', borderWidth: 1 }]}>
                    <Text style={{ color: '#166534', fontWeight: '700', fontSize: 11, textAlign:'center' }}>💰 Saldo Atual</Text>
                    <Text style={{ color: isNegativeBalance ? '#991b1b' : '#166534', fontSize: 18, fontWeight: '800', marginTop: 8, textAlign:'center' }}>
                      {formatMoney(data?.balance_cents || 0)}
                    </Text>
                  </View>

                  <View style={[styles.summaryCard, { flex: 1, backgroundColor: '#f3e8ff', borderColor: '#8b5cf6', borderWidth: 1 }]}>
                    <Text style={{ color: '#6b21a8', fontWeight: '700', fontSize: 11, textAlign:'center' }}>🔮 Saldo Projetado</Text>
                    <Text style={{ color: '#6b21a8', fontSize: 16, fontWeight: '800', marginTop: 8, textAlign:'center' }}>
                      {formatMoney((data?.balance_cents || 0))}
                    </Text>
                  </View>
                </View>

                {/* Alertas de Progresso de Meta */}
                {isCurrentMonth && hasGoal && (
                  <View style={{ marginBottom: 8 }}>
                    {isLowGoalProgress && (
                      <View style={{ backgroundColor: '#fef3c7', borderColor: '#f59e0b', borderWidth: 1, borderRadius: 6, padding: 8 }}>
                        <Text style={{ color: '#92400e', fontSize: 11, fontWeight: '600', textAlign: 'center' }}>
                          ⚠️ Alerta: você ainda está abaixo de 50% da meta deste mês. Considere revisar suas entradas.
                        </Text>
                      </View>
                    )}
                    {goalProgress >= 100 && (
                      <View style={{ backgroundColor: '#dcfce7', borderColor: '#16a34a', borderWidth: 1, borderRadius: 6, padding: 8 }}>
                        <Text style={{ color: '#166534', fontSize: 11, fontWeight: '600', textAlign: 'center' }}>
                          🎉 Meta do mês atingida!
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Linha 3: Meta Financeira */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={[styles.summaryCard, { flex: 1, backgroundColor: '#fef2f2', borderColor: hasGoal ? (isLowGoalProgress ? '#ef4444' : '#10b981') : '#d1d5db', borderWidth: 1 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={{ color: '#111827', fontWeight: '700', fontSize: 11 }}>🎯 Meta</Text>
                      <TouchableOpacity
                        onPress={handleOpenGoalModal}
                        style={{
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 4,
                          backgroundColor: hasGoal ? (isLowGoalProgress ? '#ef4444' : '#10b981') : '#6b7280',
                        }}
                      >
                        <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>
                          {hasGoal ? 'Editar' : 'Add'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={{ color: '#111827', fontSize: 18, fontWeight: '800', textAlign: 'center' }}>
                      {formatMoney(data?.goalProgress?.target_cents || 0)}
                    </Text>
                    {hasGoal && (
                      <>
                        <Text style={{ color: getGoalBarColor(), fontSize: 14, fontWeight: '700', marginTop: 4, textAlign: 'center' }}>
                          {goalProgress}%
                        </Text>
                        <Text style={{ color: getGoalBarColor(), fontSize: 10, fontWeight: '600', marginTop: 1, textAlign:'center', fontStyle: 'italic' }}>
                          {getGoalStatusText()}
                        </Text>
                        <View style={{
                          height: 6,
                          backgroundColor: '#e5e7eb',
                          borderRadius: 3,
                          marginTop: 8,
                          overflow: 'hidden'
                        }}>
                          <View style={{
                            height: '100%',
                            backgroundColor: getGoalBarColor(),
                            borderRadius: 3,
                            width: `${Math.min(100, goalProgress)}%`
                          }} />
                        </View>
                      </>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* Alertas de Progresso de Meta - Web */}
            {isTabletOrDesktop && isCurrentMonth && hasGoal && (
              <View style={{ marginBottom: 8 }}>
                {isLowGoalProgress && (
                  <View style={{ backgroundColor: '#fef3c7', borderColor: '#f59e0b', borderWidth: 1, borderRadius: 6, padding: 8 }}>
                    <Text style={{ color: '#92400e', fontSize: 12, fontWeight: '600', textAlign: 'center' }}>
                      ⚠️ Alerta: você ainda está abaixo de 50% da meta deste mês. Considere revisar suas entradas.
                    </Text>
                  </View>
                )}
                {goalProgress >= 100 && (
                  <View style={{ backgroundColor: '#dcfce7', borderColor: '#16a34a', borderWidth: 1, borderRadius: 6, padding: 8 }}>
                    <Text style={{ color: '#166534', fontSize: 12, fontWeight: '600', textAlign: 'center' }}>
                      🎉 Meta do mês atingida!
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Layout em Duas Colunas: Gráfico + Últimas Transações */}
            <View style={{ flexDirection: isTabletOrDesktop ? 'row' : 'column', gap: 16 }}>
              {/* COLUNA 1 - Gráfico */}
              <View style={{ flex: isTabletOrDesktop ? 0.6 : 1, overflow: 'hidden', maxWidth: '100%' }}>
                {(data?.dailySeries || weeklyDataQuery.data?.weeklySeries) && (
                  <View style={[styles.card, { backgroundColor: theme.card, overflow: 'hidden', maxWidth: '100%' }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ color: theme.text, fontWeight: '700', fontSize: 15 }}>
                        {chartView === 'daily' ? 'Fluxo Diário' : chartView === 'weekly' ? 'Fluxo Semanal' : 'Fluxo Mensal'}
                      </Text>
                    </View>

                    {/* Botões de Filtro */}
                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                      {(['daily', 'weekly', 'monthly'] as const).map((view) => (
                        <TouchableOpacity
                          key={view}
                          onPress={() => setChartView(view)}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 6,
                            backgroundColor: chartView === view ? '#16A34A' : theme.card,
                            borderWidth: 1,
                            borderColor: '#16A34A',
                          }}
                        >
                          <Text style={{ 
                            color: chartView === view ? '#fff' : '#16A34A', 
                            fontSize: 11, 
                            fontWeight: '700' 
                          }}>
                            {view === 'daily' ? 'Diário' : view === 'weekly' ? 'Semanal' : 'Mensal'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Gráfico Real */}
                    <View style={{ height: 220, backgroundColor: '#f9fafb', borderRadius: 8, padding: 12 }}>
                      {/* Tooltip Diário */}
                      {chartView === 'daily' && dailyTooltip && (
                        <View style={{ 
                          position: 'absolute', 
                          top: 8, 
                          left: 12, 
                          right: 12,
                          backgroundColor: '#1f2937', 
                          padding: 8, 
                          borderRadius: 6,
                          zIndex: 10,
                          flexDirection: 'row',
                          justifyContent: 'space-between'
                        }}>
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>Dia {dailyTooltip.day}</Text>
                          <Text style={{ color: '#10b981', fontSize: 11 }}>+{formatMoney(dailyTooltip.income)}</Text>
                          <Text style={{ color: '#ef4444', fontSize: 11 }}>-{formatMoney(dailyTooltip.expense)}</Text>
                        </View>
                      )}
                      
                      {/* Tooltip Semanal */}
                      {chartView === 'weekly' && weeklyTooltip && (
                        <View style={{ 
                          position: 'absolute', 
                          top: 8, 
                          left: 12, 
                          right: 12,
                          backgroundColor: '#1f2937', 
                          padding: 8, 
                          borderRadius: 6,
                          zIndex: 10,
                          flexDirection: 'row',
                          justifyContent: 'space-between'
                        }}>
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>Semana {weeklyTooltip.week}</Text>
                          <Text style={{ color: '#10b981', fontSize: 11 }}>+{formatMoney(weeklyTooltip.income)}</Text>
                          <Text style={{ color: '#ef4444', fontSize: 11 }}>-{formatMoney(weeklyTooltip.expense)}</Text>
                        </View>
                      )}
                      
                      {/* Tooltip Mensal */}
                      {chartView === 'monthly' && monthlyTooltip && (
                        <View style={{ 
                          position: 'absolute', 
                          top: 8, 
                          left: 12, 
                          right: 12,
                          backgroundColor: '#1f2937', 
                          padding: 8, 
                          borderRadius: 6,
                          zIndex: 10,
                          flexDirection: 'row',
                          justifyContent: 'space-between'
                        }}>
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>{monthlyTooltip.month}</Text>
                          <Text style={{ color: '#10b981', fontSize: 11 }}>+{formatMoney(monthlyTooltip.income)}</Text>
                          <Text style={{ color: '#ef4444', fontSize: 11 }}>-{formatMoney(monthlyTooltip.expense)}</Text>
                        </View>
                      )}
                      
                      {chartView === 'daily' && data?.dailySeries && (
                        <View style={{ flex: 1 }}>
                          <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingTop: dailyTooltip ? 40 : 0 }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 140, gap: 4, paddingHorizontal: 4 }}>
                              {data.dailySeries.slice(0, maxDayForDailyChart).map((item, index) => {
                                const maxValue = Math.max(...data.dailySeries.map(d => Math.max(d.income_cents, d.expense_cents)));
                                const incomeHeight = maxValue > 0 ? (item.income_cents / maxValue) * 100 : 0;
                                const expenseHeight = maxValue > 0 ? (item.expense_cents / maxValue) * 100 : 0;
                                
                                return (
                                  <TouchableOpacity 
                                    key={index} 
                                    style={{ alignItems: 'center', minWidth: 24 }}
                                    onPress={() => setDailyTooltip(
                                      dailyTooltip?.day === item.day ? null : { day: item.day, income: item.income_cents, expense: item.expense_cents }
                                    )}
                                  >
                                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 1 }}>
                                      <View style={{ width: 6, height: Math.max(2, incomeHeight), backgroundColor: '#10b981', borderRadius: 2 }} />
                                      <View style={{ width: 6, height: Math.max(2, expenseHeight), backgroundColor: '#ef4444', borderRadius: 2 }} />
                                    </View>
                                    <Text style={{ fontSize: 9, color: '#6b7280', marginTop: 4 }}>{item.day}</Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </ScrollView>
                          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <View style={{ width: 12, height: 4, backgroundColor: '#10b981', borderRadius: 2 }} />
                              <Text style={{ fontSize: 10, color: '#6b7280' }}>Entradas</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <View style={{ width: 12, height: 4, backgroundColor: '#ef4444', borderRadius: 2 }} />
                              <Text style={{ fontSize: 10, color: '#6b7280' }}>Saídas</Text>
                            </View>
                          </View>
                        </View>
                      )}
                      
                      {chartView === 'weekly' && weeklyDataQuery.data?.weeklySeries && (
                        <View style={{ flex: 1 }}>
                          <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingTop: weeklyTooltip ? 40 : 0 }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 140, gap: 8, paddingHorizontal: 4 }}>
                              {weeklyDataQuery.data?.weeklySeries.map((item, index) => {
                                const maxValue = Math.max(...weeklyDataQuery.data!.weeklySeries.map(d => Math.max(d.income_cents, d.expense_cents)));
                                const incomeHeight = maxValue > 0 ? (item.income_cents / maxValue) * 100 : 0;
                                const expenseHeight = maxValue > 0 ? (item.expense_cents / maxValue) * 100 : 0;
                                
                                return (
                                  <TouchableOpacity 
                                    key={index} 
                                    style={{ alignItems: 'center', minWidth: 40 }}
                                    onPress={() => setWeeklyTooltip(
                                      weeklyTooltip?.week === item.week ? null : { week: item.week, income: item.income_cents, expense: item.expense_cents }
                                    )}
                                  >
                                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
                                      <View style={{ width: 10, height: Math.max(2, incomeHeight), backgroundColor: '#10b981', borderRadius: 2 }} />
                                      <View style={{ width: 10, height: Math.max(2, expenseHeight), backgroundColor: '#ef4444', borderRadius: 2 }} />
                                    </View>
                                    <Text style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>Sem {item.week}</Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </ScrollView>
                          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <View style={{ width: 12, height: 4, backgroundColor: '#10b981', borderRadius: 2 }} />
                              <Text style={{ fontSize: 10, color: '#6b7280' }}>Entradas</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <View style={{ width: 12, height: 4, backgroundColor: '#ef4444', borderRadius: 2 }} />
                              <Text style={{ fontSize: 10, color: '#6b7280' }}>Saídas</Text>
                            </View>
                          </View>
                        </View>
                      )}
                      
                      {chartView === 'monthly' && (
                        <View style={{ flex: 1 }}>
                          {monthlyDataQuery.isLoading ? (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                              <Text style={{ fontSize: 12, color: '#6b7280' }}>Carregando...</Text>
                            </View>
                          ) : monthlyDataQuery.data?.monthlySeries ? (
                            <>
                              <ScrollView 
                                horizontal 
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingTop: monthlyTooltip ? 40 : 0 }}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 140, gap: 6, paddingHorizontal: 4 }}>
                                  {monthlyDataQuery.data.monthlySeries.map((item, index) => {
                                    const maxValue = Math.max(...monthlyDataQuery.data!.monthlySeries.map(d => Math.max(d.income_cents, d.expense_cents)));
                                    const incomeHeight = maxValue > 0 ? (item.income_cents / maxValue) * 100 : 0;
                                    const expenseHeight = maxValue > 0 ? (item.expense_cents / maxValue) * 100 : 0;
                                    
                                    return (
                                      <TouchableOpacity 
                                        key={index} 
                                        style={{ alignItems: 'center', minWidth: 32 }}
                                        onPress={() => setMonthlyTooltip(
                                          monthlyTooltip?.month === item.monthName ? null : { month: item.monthName, income: item.income_cents, expense: item.expense_cents }
                                        )}
                                      >
                                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
                                          <View style={{ width: 8, height: Math.max(2, incomeHeight), backgroundColor: '#10b981', borderRadius: 2 }} />
                                          <View style={{ width: 8, height: Math.max(2, expenseHeight), backgroundColor: '#ef4444', borderRadius: 2 }} />
                                        </View>
                                        <Text style={{ fontSize: 9, color: '#6b7280', marginTop: 4 }}>{item.monthName}</Text>
                                      </TouchableOpacity>
                                    );
                                  })}
                                </View>
                              </ScrollView>
                              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                  <View style={{ width: 12, height: 4, backgroundColor: '#10b981', borderRadius: 2 }} />
                                  <Text style={{ fontSize: 10, color: '#6b7280' }}>Entradas</Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                  <View style={{ width: 12, height: 4, backgroundColor: '#ef4444', borderRadius: 2 }} />
                                  <Text style={{ fontSize: 10, color: '#6b7280' }}>Saídas</Text>
                                </View>
                              </View>
                            </>
                          ) : (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                              <Text style={{ fontSize: 12, color: '#6b7280' }}>Sem dados para o ano</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </View>

              {/* COLUNA 2 - Resumo e Lançamentos */}
              <View style={{ flex: isTabletOrDesktop ? 0.4 : 1, gap: 12 }}>
                {/* Cards lado a lado */}
                <View style={{ flexDirection: isTabletOrDesktop ? 'column' : 'row', gap: 12 }}>
                  {/* Resumo Rápido */}
                  <View style={[styles.card, { backgroundColor: theme.card, flex: 1, minHeight: 180 }]}>
                    <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14, marginBottom: 10 }}>
                      📋 Resumo Rápido
                    </Text>
                    
                    <View style={{ gap: 6, flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 6, backgroundColor: '#f9fafb', borderRadius: 6 }}>
                        <Text style={{ color: '#111827', fontSize: 11 }}>📅 Dias no mês</Text>
                        <Text style={{ color: '#111827', fontSize: 11, fontWeight: '700' }}>
                          {new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate()}
                        </Text>
                      </View>
                      
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 6, backgroundColor: '#f9fafb', borderRadius: 6 }}>
                        <Text style={{ color: '#111827', fontSize: 11 }}>📊 Média diária</Text>
                        <Text style={{ color: '#111827', fontSize: 11, fontWeight: '700' }}>
                          {formatMoney(Math.round((data?.income_cents || 0) / new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate()))}
                        </Text>
                      </View>
                      
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 6, backgroundColor: '#f9fafb', borderRadius: 6 }}>
                        <Text style={{ color: '#111827', fontSize: 11 }}>🎯 Meta vs Real</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ color: hasGoal ? (goalProgress >= 100 ? '#16a34a' : '#f59e0b') : '#6b7280', fontSize: 11, fontWeight: '700' }}>
                            {hasGoal ? `${goalProgress}%` : 'Sem meta'}
                          </Text>
                          <TouchableOpacity 
                            onPress={handleOpenGoalModal}
                            style={{ 
                              backgroundColor: hasGoal ? '#3b82f6' : '#16a34a', 
                              paddingHorizontal: 6, 
                              paddingVertical: 2, 
                              borderRadius: 4 
                            }}
                          >
                            <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>
                              {hasGoal ? 'Editar' : 'Add'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 6, backgroundColor: '#f9fafb', borderRadius: 6 }}>
                        <Text style={{ color: '#111827', fontSize: 11 }}>
                          {debtsQuery.data?.hasOverdue ? '🚨' : '💳'} Dívidas
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ color: '#16a34a', fontSize: 11, fontWeight: '700' }}>
                            {formatMoney(debtsQuery.data?.paid || 0)}
                          </Text>
                          <Text style={{ color: '#6b7280', fontSize: 11 }}>/</Text>
                          <Text style={{ color: (debtsQuery.data?.remaining || 0) > 0 ? '#dc2626' : '#16a34a', fontSize: 11, fontWeight: '700' }}>
                            {formatMoney(debtsQuery.data?.remaining || 0)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Lançamentos Recentes */}
                  <View style={[styles.card, { backgroundColor: theme.card, flex: 1, minHeight: 180 }]}>
                    <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14, marginBottom: 10 }}>
                      📝 Lançamentos Recentes
                    </Text>
                    
                    {recentTransactionsQuery.isLoading ? (
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ color: '#6b7280', fontSize: 11 }}>Carregando...</Text>
                      </View>
                    ) : recentTransactionsQuery.data?.length === 0 ? (
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ color: '#6b7280', fontSize: 11 }}>Nenhum lançamento</Text>
                      </View>
                    ) : (
                      <View style={{ gap: 4, flex: 1 }}>
                        {recentTransactionsQuery.data?.map((transaction) => (
                          <View key={transaction.id} style={{ 
                            flexDirection: 'row', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            padding: 6, 
                            backgroundColor: '#f9fafb', 
                            borderRadius: 6 
                          }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ 
                                color: '#111827', 
                                fontSize: 11, 
                                fontWeight: '600',
                              }} numberOfLines={1}>
                                {transaction.description || 'Sem descrição'}
                              </Text>
                              <Text style={{ color: '#6b7280', fontSize: 9 }}>
                                {formatDateLocal(transaction.date)}
                              </Text>
                            </View>
                            <Text style={{ 
                              color: transaction.type === 'income' ? '#16a34a' : '#dc2626', 
                              fontSize: 11, 
                              fontWeight: '700' 
                            }}>
                              {transaction.type === 'income' ? '+' : '-'}{formatMoney(transaction.amount_cents || 0)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Modal de Meta (simplificado) */}
      {goalModalOpen && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: theme.card, padding: 20, borderRadius: 12, width: '80%', maxWidth: 400 }}>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700', marginBottom: 16 }}>
              {hasGoal ? 'Editar Meta' : 'Definir Meta'} - {monthNamePt(selectedMonth.getMonth())}
            </Text>
            
            <TextInput
              style={{
                backgroundColor: theme.input,
                color: theme.text,
                padding: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: theme.inputBorder,
                fontSize: 16,
                marginBottom: 16
              }}
              placeholder="Valor da meta (ex: 5.000,00)"
              placeholderTextColor={theme.textSecondary}
              value={goalInputValue}
              onChangeText={setGoalInputValue}
              keyboardType="numeric"
            />
            
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#6b7280', padding: 12, borderRadius: 8 }}
                onPress={() => setGoalModalOpen(false)}
              >
                <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#16a34a', padding: 12, borderRadius: 8 }}
                onPress={() => {
                  // Implementar salvamento da meta
                  setGoalModalOpen(false);
                }}
              >
                <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Modal de Dívidas Vencidas */}
      {showOverdueModal && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <View style={{ backgroundColor: theme.card, padding: 24, borderRadius: 16, width: '85%', maxWidth: 400, alignItems: 'center' }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>🚨</Text>
            <Text style={{ color: '#dc2626', fontSize: 20, fontWeight: '800', marginBottom: 8, textAlign: 'center' }}>
              Atenção!
            </Text>
            <Text style={{ color: theme.text, fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 22 }}>
              Você possui dívidas com parcelas em atraso. Regularize sua situação para evitar juros e problemas financeiros.
            </Text>
            
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#6b7280', padding: 14, borderRadius: 8 }}
                onPress={() => {
                  setShowOverdueModal(false);
                  setOverdueModalDismissed(true);
                }}
              >
                <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>Fechar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#dc2626', padding: 14, borderRadius: 8 }}
                onPress={() => {
                  setShowOverdueModal(false);
                  setOverdueModalDismissed(true);
                  // Navegar para a tela de dívidas
                  (navigation as any).navigate('Débitos');
                }}
              >
                <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>Ver Dívidas</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
});
