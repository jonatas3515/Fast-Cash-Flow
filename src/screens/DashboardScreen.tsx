import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, useWindowDimensions, Platform, Alert, TextInput, FlatList } from 'react-native';
import { Svg, Rect, Text as SvgText, Line as SvgLine } from 'react-native-svg';
import { InteractiveBar, InteractiveChart } from '../components/InteractiveBar';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useI18n } from '../i18n/I18nProvider';
import { useToast } from '../ui/ToastProvider';
import { useSettings } from '../settings/SettingsProvider';
import { getMonthlyTotals, getMonthlyDailySeries, getMonthlyWeeklySeries, getYearlyMonthlySeries, getYearlyQuarterlySeries, getYearlySemesterSeries, getTransactionsByMonth, createTransaction, TxType } from '../repositories/transactions';
import { getWeeklyTotals } from '../repositories/transactions';
import { getGoalByMonth, createGoal, updateGoal, deleteGoal } from '../repositories/financial_goals';
import { listDebtsByDate, listAllDebts, createDebt } from '../repositories/debts';
import { getOrCreateSettings } from '../repositories/dashboard_settings';
import { listRecurringExpenses, getNextOccurrence } from '../repositories/recurring_expenses';
import { getCurrentCompanyId } from '../lib/company';
import { supabase } from '../lib/supabase';
import NativeDatePicker from '../utils/NativeDatePicker';
import { todayYMD, nowHM } from '../utils/date';
import { formatCentsBRL, parseBRLToCents, maskBRLInput } from '../utils/money';
import ScreenTitle from '../components/ScreenTitle';
import OnboardingChecklist from '../components/OnboardingChecklist';
import { BeginnerBanner } from '../components/BeginnerTooltip';
import BusinessHealthCard from '../components/BusinessHealthCard';
import BeginnerDashboard, { QuickShortcuts } from '../components/BeginnerDashboard';
import WeeklyChecklist from '../components/WeeklyChecklist';
import SmartAlerts from '../components/SmartAlerts';
import BusinessRoutineTips from '../components/BusinessRoutineTips';
import ARAPDashboard from '../components/ARAPDashboard';
import BenchmarkInsights from '../components/BenchmarkInsights';
import { CollapsibleWrapper } from '../components/CollapsibleCard';
import TrialBanner from '../components/TrialBanner';
import { getRecommendationByGoal } from '../repositories/company_profile';
import LoginWelcomeMessage from '../components/LoginWelcomeMessage';
import { useLoginMessage } from '../hooks/useLoginMessage';
import { useSegmentCategories } from '../hooks/useSegmentCategories';
import { getDashboardWidgets, DashboardWidget, getWidgetsForMode } from '../utils/dashboardWidgets';
import DashboardModeSelector, { useDashboardMode } from '../components/DashboardModeSelector';
import HealthActionCard from '../components/HealthActionCard';
import { todayBrasilia } from '../utils/date';
import { getCategoryGroupKey } from '../utils/segment';

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

interface QuarterlyData {
  quarter: number;
  quarterName: string;
  income_cents: number;
  expense_cents: number;
}

interface SemesterData {
  semester: number;
  semesterName: string;
  income_cents: number;
  expense_cents: number;
}

interface ChartBar {
  label: string;
  income: number;
  expense: number;
}

type ChartView = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semester';

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

export default function DashboardScreen() {
  const { theme } = useThemeCtx();
  const { formatMoney } = useI18n();
  const { show } = useToast();
  const { settings } = useSettings();
  const { businessType, incomeOptions, expenseOptions } = useSegmentCategories();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isWideWeb = isWeb && width >= 1024;
  const isTabletOrDesktop = isWideWeb || (Platform.OS !== 'web' && width >= 768);
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { showMessage, hideMessage } = useLoginMessage();

  const [selectedMonth, setSelectedMonth] = React.useState(new Date());
  const [chartView, setChartView] = React.useState<ChartView>('daily');
  const [chartBarInfo, setChartBarInfo] = React.useState<ChartBar | null>(null);
  const [widgetConfig, setWidgetConfig] = React.useState<DashboardWidget[]>([]);
  const { mode, changeMode } = useDashboardMode();

  // Carregar configurações de widgets baseado no modo
  React.useEffect(() => {
    const widgets = getWidgetsForMode(mode);
    setWidgetConfig(widgets);
  }, [mode]);

  // Função para verificar se um widget está habilitado
  const isWidgetEnabled = (widgetId: string): boolean => {
    if (widgetConfig.length === 0) return true; // Se não carregou ainda, mostra tudo
    const widget = widgetConfig.find(w => w.id === widgetId);
    return widget?.enabled ?? true;
  };

  // Meta financeira
  const [goalModalOpen, setGoalModalOpen] = React.useState(false);
  const [goalInputValue, setGoalInputValue] = React.useState('');

  // Tooltip para gráficos
  const [dailyTooltip, setDailyTooltip] = React.useState<{ day: number; income: number; expense: number } | null>(null);
  const [weeklyTooltip, setWeeklyTooltip] = React.useState<{ week: number; income: number; expense: number } | null>(null);
  const [monthlyTooltip, setMonthlyTooltip] = React.useState<{ month: string; income: number; expense: number } | null>(null);
  const [quarterlyTooltip, setQuarterlyTooltip] = React.useState<{ quarter: string; income: number; expense: number } | null>(null);
  const [semesterTooltip, setSemesterTooltip] = React.useState<{ semester: string; income: number; expense: number } | null>(null);

  // Modal de dívidas vencidas
  const [showOverdueModal, setShowOverdueModal] = React.useState(false);
  const [overdueModalDismissed, setOverdueModalDismissed] = React.useState(false);

  // Modal de dívidas recorrentes vencidas (despesas recorrentes)
  const [showRecurringOverdueModal, setShowRecurringOverdueModal] = React.useState(false);
  const [recurringOverdueShownOnce, setRecurringOverdueShownOnce] = React.useState(false);
  const [savingGoal, setSavingGoal] = React.useState(false);

  // Estados para lançamento rápido
  const [showQuickActionModal, setShowQuickActionModal] = React.useState(false);
  const [quickActionType, setQuickActionType] = React.useState<'income' | 'expense' | 'debt' | null>(null);
  const [quickAmount, setQuickAmount] = React.useState('');
  const [quickDescription, setQuickDescription] = React.useState('');
  const [quickCategory, setQuickCategory] = React.useState('');
  const [quickDebtAmount, setQuickDebtAmount] = React.useState('');
  const [quickDebtDescription, setQuickDebtDescription] = React.useState('');
  const [quickDebtInstallments, setQuickDebtInstallments] = React.useState('1');
  const [quickDebtPurchaseDate, setQuickDebtPurchaseDate] = React.useState(todayYMD());
  const [quickDebtDueDay, setQuickDebtDueDay] = React.useState('10');

  // Helper para converter tipo de lançamento rápido para TxType
  const getTxType = (type: 'income' | 'expense'): TxType => type;

  // Estado para gráfico de pizza por categoria
  const [pieChartType, setPieChartType] = React.useState<'income' | 'expense'>('income');

  const getGoalBarColor = () => {
    const goalProgress = data?.goalProgress?.percent || 0;
    const hasGoal = !!data?.goalProgress?.target_cents;
    if (!hasGoal) return '#6b7280';
    if (goalProgress >= 100) return '#10b981';
    if (goalProgress >= 75) return '#3b82f6';
    if (goalProgress >= 50) return '#f59e0b';
    return '#ef4444';
  };

  // Mutations para lançamento rápido
  const quickTransactionMutation = useMutation({
    mutationFn: async (data: { type: TxType; amount_cents: number; description: string; category: string }) => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) throw new Error('Empresa não identificada');

      const datetime = new Date().toISOString();
      const today = todayYMD();
      const time = nowHM();

      console.log('[⚡ QUICK] Criando transação rápida:', { type: data.type, amount: data.amount_cents, date: today });

      const txId = await createTransaction({
        company_id: companyId,
        type: data.type,
        amount_cents: data.amount_cents,
        description: data.description,
        category: data.category,
        date: today,
        time: time,
        datetime,
      });

      console.log('[⚡ QUICK] Transação criada com ID:', txId);

      // Forçar sincronização imediata com Supabase
      try {
        const { syncAll } = await import('../lib/sync');
        console.log('[⚡ QUICK] Forçando sync com Supabase...');
        await syncAll();
        console.log('[⚡ QUICK] Sync concluído!');
      } catch (syncError) {
        console.warn('[⚡ QUICK] Sync falhou:', syncError);
      }

      return txId;
    },
    onSuccess: async () => {
      const today = todayYMD();
      const y = selectedMonth.getFullYear();
      const m = selectedMonth.getMonth() + 1;

      console.log('[⚡ QUICK] Invalidando queries...');

      // Invalidar TODAS as queries relevantes
      await queryClient.invalidateQueries({ queryKey: ['transactions-by-date', today] });
      await queryClient.invalidateQueries({ queryKey: ['transactions-by-date'] });
      await queryClient.invalidateQueries({ queryKey: ['daily-totals', today] });
      await queryClient.invalidateQueries({ queryKey: ['month-totals', String(y), String(m).padStart(2, '0')] });
      await queryClient.invalidateQueries({ queryKey: ['month-totals'] });
      await queryClient.invalidateQueries({ queryKey: ['month-series'] });
      await queryClient.invalidateQueries({ queryKey: ['week-totals'] });
      await queryClient.invalidateQueries({ queryKey: ['week-series'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard', y, m] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['recent-transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['category-breakdown'] });

      // FORÇAR REFETCH IMEDIATO
      await queryClient.refetchQueries({
        queryKey: ['dashboard', y, m],
        type: 'active'
      });
      await queryClient.refetchQueries({
        queryKey: ['recent-transactions', y, m],
        type: 'active'
      });

      console.log('[⚡ QUICK] Queries invalidadas com sucesso!');

      show('Lançamento registrado com sucesso!', 'success');
      resetQuickAction();
    },
    onError: (error: any) => {
      console.error('[⚡ QUICK] Erro:', error);
      show(`Erro ao registrar lançamento: ${error.message}`, 'error');
    },
  });

  const quickDebtMutation = useMutation({
    mutationFn: async (data: { description: string; total_cents: number; installment_count: number; purchase_date: string; due_day: number }) => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) throw new Error('Empresa não identificada');

      const installment_cents = Math.round(data.total_cents / data.installment_count);
      const start_date = data.purchase_date;

      // Calcular data final baseada no mês de início + parcelas
      const startDateObj = new Date(start_date + 'T12:00:00');
      const endDate = new Date(startDateObj);
      endDate.setMonth(endDate.getMonth() + data.installment_count);
      const end_date_str = endDate.toISOString().split('T')[0];

      // Calcular data de vencimento da primeira parcela
      const firstDueDate = new Date(startDateObj);
      firstDueDate.setMonth(firstDueDate.getMonth() + 1);
      firstDueDate.setDate(data.due_day);
      const invoice_due_date = firstDueDate.toISOString().split('T')[0];

      console.log('[⚡ QUICK DEBT] Criando dívida:', { description: data.description, total: data.total_cents, parcelas: data.installment_count });

      return await createDebt(companyId, {
        description: data.description,
        total_cents: data.total_cents,
        installment_count: data.installment_count,
        installment_cents,
        start_date,
        end_date: end_date_str,
        invoice_due_date,
        paid_installments: 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['debts-summary'] });
      show('Dívida registrada com sucesso!', 'success');
      resetQuickAction();
    },
    onError: (error: any) => {
      console.error('[⚡ QUICK DEBT] Erro:', error);
      show('Erro ao registrar dívida: ' + error.message, 'error');
    },
  });

  // Mutation para salvar meta financeira
  const goalMutation = useMutation({
    mutationFn: async (targetCents: number) => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) throw new Error('Empresa não identificada');

      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth() + 1;
      const monthStr = `${year}-${String(month).padStart(2, '0')}-01`;

      console.log('[🎯 GOAL] Salvando meta:', { companyId, month: monthStr, target: targetCents });

      // Verificar se já existe uma meta para este mês
      const existingGoal = await getGoalByMonth(companyId, monthStr);

      if (existingGoal) {
        console.log('[🎯 GOAL] Atualizando meta existente:', existingGoal.id);
        return await updateGoal(existingGoal.id, { target_amount_cents: targetCents });
      } else {
        console.log('[🎯 GOAL] Criando nova meta');
        return await createGoal({
          company_id: companyId,
          month: monthStr,
          target_amount_cents: targetCents,
        });
      }
    },
    onSuccess: () => {
      const y = selectedMonth.getFullYear();
      const m = selectedMonth.getMonth() + 1;
      queryClient.invalidateQueries({ queryKey: ['dashboard', y, m] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      show('Meta salva com sucesso!', 'success');
      setGoalModalOpen(false);
    },
    onError: (error: any) => {
      console.error('[🎯 GOAL] Erro ao salvar meta:', error);
      show('Erro ao salvar meta: ' + error.message, 'error');
    },
  });

  const handleSaveGoal = () => {
    const value = parseFloat(goalInputValue.replace(',', '.'));
    if (isNaN(value) || value <= 0) {
      show('Digite um valor válido para a meta', 'error');
      return;
    }
    const targetCents = Math.round(value * 100);
    goalMutation.mutate(targetCents);
  };

  // Funções auxiliares
  const resetQuickAction = () => {
    setShowQuickActionModal(false);
    setQuickActionType(null);
    setQuickAmount('');
    setQuickDescription('');
    setQuickCategory('');
    setQuickDebtAmount('');
    setQuickDebtDescription('');
    setQuickDebtInstallments('1');
    setQuickDebtPurchaseDate(todayYMD());
    setQuickDebtDueDay('10');
  };

  const handleQuickTransaction = () => {
    if (!quickActionType || quickActionType === 'debt' || !quickAmount) {
      show('Preencha o valor do lançamento', 'error');
      return;
    }

    const amount_cents = parseBRLToCents(quickAmount);
    if (amount_cents <= 0) {
      show('Valor deve ser maior que zero', 'error');
      return;
    }

    // IMPORTANTE: Usar a categoria selecionada, não "Outros" forçado
    const finalCategory = quickCategory || 'Outros';

    // IMPORTANTE: Usar descrição personalizada ou padrão baseada na categoria
    const finalDescription = quickDescription.trim() || finalCategory;

    quickTransactionMutation.mutate({
      type: getTxType(quickActionType),
      amount_cents,
      description: finalDescription, // Descrição correta
      category: finalCategory, // Categoria correta
    });
  };

  const handleQuickDebt = () => {
    if (!quickDebtAmount || !quickDebtDescription) {
      show('Preencha descrição e valor da dívida', 'error');
      return;
    }

    const total_cents = parseBRLToCents(quickDebtAmount);
    const installment_count = parseInt(quickDebtInstallments, 10) || 1;
    const due_day = parseInt(quickDebtDueDay, 10) || 10;

    if (total_cents <= 0) {
      show('Valor deve ser maior que zero', 'error');
      return;
    }

    if (installment_count < 1) {
      show('Número de parcelas deve ser maior que zero', 'error');
      return;
    }

    if (due_day < 1 || due_day > 31) {
      show('Dia de vencimento deve ser entre 1 e 31', 'error');
      return;
    }

    quickDebtMutation.mutate({
      description: quickDebtDescription,
      total_cents,
      installment_count,
      purchase_date: quickDebtPurchaseDate,
      due_day,
    });
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

  // Obter recomendação baseada no perfil do negócio
  const getBusinessRecommendation = () => {
    if (!settings.companyProfile?.main_goal) return null;
    return getRecommendationByGoal(settings.companyProfile.main_goal);
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
    refetchInterval: 5000, // Atualiza a cada 5 segundos
    refetchOnWindowFocus: true,
    staleTime: 0,
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
    enabled: chartView === 'weekly',
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    staleTime: 0,
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
    enabled: chartView === 'monthly',
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Query para dados trimestrais (ano inteiro)
  const quarterlyDataQuery = useQuery({
    queryKey: ['quarterly-data', selectedMonth.getFullYear()],
    queryFn: async () => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return null;

      const year = selectedMonth.getFullYear();
      const quarterlySeries = await getYearlyQuarterlySeries(year);

      return {
        quarterlySeries: quarterlySeries || []
      };
    },
    enabled: chartView === 'quarterly',
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Query para dados semestrais (ano inteiro)
  const semesterDataQuery = useQuery({
    queryKey: ['semester-data', selectedMonth.getFullYear()],
    queryFn: async () => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return null;

      const year = selectedMonth.getFullYear();
      const semesterSeries = await getYearlySemesterSeries(year);

      return {
        semesterSeries: semesterSeries || []
      };
    },
    enabled: chartView === 'semester',
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Query de Diagnóstico Rápido (Health Check)
  const healthCheckQuery = useQuery({
    queryKey: ['health-check'],
    queryFn: async () => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return null;

      const today = todayBrasilia(); // Data atual em Brasília

      // Contas vencidas
      const { count: overduePayables } = await supabase
        .from('payables')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .lt('due_date', today)
        .eq('status', 'pending');

      // Recebíveis vencidos
      const { count: overdueReceivables } = await supabase
        .from('receivables')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .lt('due_date', today)
        .eq('status', 'pending');

      // Vendas de hoje
      const { count: todaySales } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('type', 'income')
        .eq('date', today);

      return {
        overduePayables: overduePayables || 0,
        overdueReceivables: overdueReceivables || 0,
        todaySales: todaySales || 0,
      };
    },
    // Refetch a cada 1 minuto para manter atualizado
    refetchInterval: 60000,
  });

  // Query para configurações do dashboard
  const settingsQuery = useQuery({
    queryKey: ['dashboard-settings'],
    queryFn: async () => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return null;
      return await getOrCreateSettings(companyId);
    },
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    staleTime: 0,
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
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Query para dados de categoria (gráfico de pizza)
  const categoryDataQuery = useQuery({
    queryKey: ['category-breakdown', selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, businessType],
    queryFn: async () => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return null;

      const transactions = await getTransactionsByMonth(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1);

      // Agrupar por categoria NORMALIZADA e tipo
      const incomeByCategory: Record<string, number> = {};
      const expenseByCategory: Record<string, number> = {};

      transactions.forEach(tx => {
        // ✅ NORMALIZAR: trim + toLowerCase, depois capitalizar primeira letra
        let category = (tx.category || tx.description || 'Outros').trim().toLowerCase();
        category = category.charAt(0).toUpperCase() + category.slice(1);

        // ✅ AGRUPAR todas as encomendas sob "Encomenda" (independente do nome do cliente)
        // Detectar padrões como "Encomenda - Cliente (tipo)", "Entrada de encomenda de Cliente", etc.
        category = getCategoryGroupKey(businessType, category, undefined, 'Outros');

        if (tx.type === 'income') {
          incomeByCategory[category] = (incomeByCategory[category] || 0) + tx.amount_cents;
        } else {
          expenseByCategory[category] = (expenseByCategory[category] || 0) + tx.amount_cents;
        }
      });

      return { incomeByCategory, expenseByCategory };
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Query para dívidas - parcelas do PRÓXIMO mês (que serão pagas com vendas do mês atual) + vencidas
  // Ex: Dezembro mostra dívidas que vencem em Janeiro, pois as vendas de Dezembro pagam Janeiro
  const debtsQuery = useQuery({
    queryKey: ['debts-summary', selectedMonth.getFullYear(), selectedMonth.getMonth() + 1],
    queryFn: async () => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return { paid: 0, remaining: 0, monthlyDue: 0, overdue: 0, hasOverdue: false, nextMonthName: '' };

      const debts = await listAllDebts(companyId);
      let totalPaid = 0;
      let totalRemaining = 0;
      let monthlyDue = 0; // Parcelas do PRÓXIMO mês
      let overdue = 0; // Parcelas vencidas
      let hasOverdue = false;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Calcular o PRÓXIMO mês baseado no mês selecionado
      const nextMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
      const nextMonthYear = nextMonth.getFullYear();
      const nextMonthNum = nextMonth.getMonth(); // 0-indexed

      // Nome do próximo mês para exibição
      const nextMonthName = nextMonth.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');

      for (const debt of debts) {
        // Valor já pago
        const paidAmount = debt.paid_installments * debt.installment_cents;
        totalPaid += paidAmount;

        // Valor restante total
        const remainingInstallments = debt.installment_count - debt.paid_installments;
        totalRemaining += remainingInstallments * debt.installment_cents;

        // Calcular parcelas do PRÓXIMO mês e vencidas
        if (remainingInstallments > 0 && debt.invoice_due_date) {
          const [baseYear, baseMonth, baseDay] = debt.invoice_due_date.split('-').map(Number);

          // Iterar sobre cada parcela não paga
          for (let i = debt.paid_installments; i < debt.installment_count; i++) {
            // Calcular data de vencimento desta parcela
            const dueDate = new Date(baseYear, baseMonth - 1 + i, baseDay);
            dueDate.setHours(0, 0, 0, 0);

            // Verificar se está vencida (antes de hoje)
            if (dueDate < today) {
              overdue += debt.installment_cents;
              hasOverdue = true;
            }
            // Verificar se é do PRÓXIMO mês (parcelas que serão pagas com vendas do mês atual)
            else if (dueDate.getFullYear() === nextMonthYear && dueDate.getMonth() === nextMonthNum) {
              monthlyDue += debt.installment_cents;
            }
          }
        }
      }

      return {
        paid: totalPaid,
        remaining: totalRemaining,
        monthlyDue, // Parcelas a vencer no PRÓXIMO mês
        overdue, // Parcelas vencidas
        hasOverdue,
        nextMonthName // Nome do próximo mês
      };
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Query para encomendas de amanhã
  const ordersQuery = useQuery({
    queryKey: ['orders-tomorrow'],
    queryFn: async () => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return { tomorrowCount: 0, todayCount: 0, overdueCount: 0, tomorrowOrders: [], todayOrders: [], overdueOrders: [] };

      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('company_id', companyId)
        .neq('status', 'cancelled')
        .neq('status', 'completed');

      if (error || !orders) return { tomorrowCount: 0, todayCount: 0, overdueCount: 0, tomorrowOrders: [], todayOrders: [], overdueOrders: [] };

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      const currentTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

      const tomorrowOrders = orders.filter(o => o.delivery_date === tomorrowStr);
      const todayOrders = orders.filter(o => o.delivery_date === todayStr);
      const overdueOrders = orders.filter(o => {
        if (o.delivery_date < todayStr) return true;
        if (o.delivery_date === todayStr && (o.delivery_time || '23:59') < currentTime) return true;
        return false;
      });

      return {
        tomorrowCount: tomorrowOrders.length,
        todayCount: todayOrders.length,
        overdueCount: overdueOrders.length,
        tomorrowOrders,
        todayOrders,
        overdueOrders
      };
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Query para despesas recorrentes próximas
  const recurringAlertsQuery = useQuery({
    queryKey: ['recurring-alerts'],
    queryFn: async () => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return { tomorrowExpenses: [], todayExpenses: [], overdueExpenses: [] };

      try {
        const recurring = await listRecurringExpenses();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        const monthTransactions = await getTransactionsByMonth(today.getFullYear(), today.getMonth() + 1);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const tomorrowExpenses: Array<{ description: string; amount_cents: number }> = [];
        const todayExpenses: Array<{ description: string; amount_cents: number }> = [];
        const overdueExpenses: Array<{ description: string; amount_cents: number; days_overdue: number }> = [];

        for (const rec of recurring) {
          // Pular despesas com valor variável (amount_cents = 0) ou data especial "Não se Aplica"
          if (rec.amount_cents <= 0 || rec.start_date === '9999-12-31' || rec.start_date === '1900-01-01') {
            continue;
          }

          const nextDate = getNextOccurrence(rec, today);
          if (!nextDate) continue;

          const nextDateStr = nextDate.toISOString().split('T')[0];
          const paymentKey = rec.recurrence_type === 'monthly' ? nextDateStr.slice(0, 7) : nextDateStr;
          const paymentTag = `recurring_expense:${rec.id}:${paymentKey}`;
          
          // Verificação melhorada: Se já foi pago no mês (via tag determinística), não entra nos alertas
          const alreadyPaid = monthTransactions.some((tx) => {
            return tx.type === 'expense' && (
              (tx.source_device || '') === paymentTag ||
              // Verificação adicional: mesma descrição, valor aproximado e mês atual
              (tx.description === rec.description && 
               Math.abs(tx.amount_cents - rec.amount_cents) < 100 && // diferença de até R$ 1,00
               tx.date.startsWith(nextDateStr.slice(0, 7)))
            );
          });
          
          if (alreadyPaid) continue;

          const diffDays = Math.floor((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          if (nextDateStr === tomorrowStr) {
            tomorrowExpenses.push({ description: rec.description, amount_cents: rec.amount_cents });
          } else if (nextDateStr === todayStr) {
            todayExpenses.push({ description: rec.description, amount_cents: rec.amount_cents });
          } else if (diffDays < 0) {
            overdueExpenses.push({ description: rec.description, amount_cents: rec.amount_cents, days_overdue: Math.abs(diffDays) });
          }
        }

        return { tomorrowExpenses, todayExpenses, overdueExpenses };
      } catch (error) {
        console.error('[Dashboard] Erro ao buscar despesas recorrentes:', error);
        return { tomorrowExpenses: [], todayExpenses: [], overdueExpenses: [] };
      }
    },
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Mostrar modal de dívidas vencidas quando o usuário entra
  React.useEffect(() => {
    if (debtsQuery.data?.hasOverdue && !overdueModalDismissed) {
      setShowOverdueModal(true);
    }
  }, [debtsQuery.data?.hasOverdue, overdueModalDismissed]);

  // Mostrar modal de despesas recorrentes vencidas ao entrar (reaparece em cada entrada enquanto houver vencidas)
  React.useEffect(() => {
    const overdueCount = recurringAlertsQuery.data?.overdueExpenses?.length || 0;
    if (overdueCount === 0) {
      setRecurringOverdueShownOnce(false);
      setShowRecurringOverdueModal(false);
      return;
    }
    if (!recurringOverdueShownOnce) {
      setShowRecurringOverdueModal(true);
      setRecurringOverdueShownOnce(true);
    }
  }, [recurringAlertsQuery.data?.overdueExpenses, recurringOverdueShownOnce]);

  // Cálculo de alertas
  const alerts = React.useMemo(() => {
    const settings = settingsQuery.data;
    const alertList: Array<{
      type: 'negative_balance' | 'order_tomorrow' | 'order_today' | 'order_overdue' | 'expense_tomorrow' | 'expense_today' | 'expense_overdue';
      message: string;
      color: string;
      icon: string;
      navigateTo?: string;
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
        icon: '⚠️',
        navigateTo: 'Relatórios'
      });
    }

    // Alertas de encomendas
    const ordersData = ordersQuery.data;
    if (ordersData) {
      // Encomendas em atraso (prioridade máxima)
      if (ordersData.overdueCount > 0) {
        alertList.push({
          type: 'order_overdue' as const,
          message: `Você tem ${ordersData.overdueCount} encomenda${ordersData.overdueCount > 1 ? 's' : ''} em atraso!`,
          color: '#D90429',
          icon: '🚨',
          navigateTo: 'Encomendas'
        });
      }

      // Encomendas para hoje
      if (ordersData.todayCount > 0) {
        alertList.push({
          type: 'order_today' as const,
          message: `Você tem ${ordersData.todayCount} encomenda${ordersData.todayCount > 1 ? 's' : ''} para entregar hoje!`,
          color: '#F59E0B',
          icon: '📦',
          navigateTo: 'Encomendas'
        });
      }

      // Encomendas para amanhã
      if (ordersData.tomorrowCount > 0) {
        alertList.push({
          type: 'order_tomorrow' as const,
          message: `Você tem ${ordersData.tomorrowCount} encomenda${ordersData.tomorrowCount > 1 ? 's' : ''} para amanhã`,
          color: '#3B82F6',
          icon: '📋',
          navigateTo: 'Encomendas'
        });
      }
    }

    // Alertas de despesas recorrentes
    const recurringData = recurringAlertsQuery.data;
    if (recurringData) {
      // Despesas em atraso
      if (recurringData.overdueExpenses.length > 0) {
        const total = recurringData.overdueExpenses.reduce((sum, e) => sum + e.amount_cents, 0);
        alertList.push({
          type: 'expense_overdue' as const,
          message: `Você tem ${recurringData.overdueExpenses.length} despesa${recurringData.overdueExpenses.length > 1 ? 's' : ''} recorrente${recurringData.overdueExpenses.length > 1 ? 's' : ''} em atraso (${formatMoney(total)})`,
          color: '#D90429',
          icon: '💸',
          navigateTo: 'Recorrentes'
        });
      }

      // Despesas vencendo hoje
      if (recurringData.todayExpenses.length > 0) {
        const total = recurringData.todayExpenses.reduce((sum, e) => sum + e.amount_cents, 0);
        alertList.push({
          type: 'expense_today' as const,
          message: `Você tem ${recurringData.todayExpenses.length} despesa${recurringData.todayExpenses.length > 1 ? 's' : ''} vencendo hoje (${formatMoney(total)})`,
          color: '#F59E0B',
          icon: '⏰',
          navigateTo: 'Recorrentes'
        });
      }

      // Despesas vencendo amanhã
      if (recurringData.tomorrowExpenses.length > 0) {
        const total = recurringData.tomorrowExpenses.reduce((sum, e) => sum + e.amount_cents, 0);
        alertList.push({
          type: 'expense_tomorrow' as const,
          message: `Você tem ${recurringData.tomorrowExpenses.length} despesa${recurringData.tomorrowExpenses.length > 1 ? 's' : ''} vencendo amanhã (${formatMoney(total)})`,
          color: '#3B82F6',
          icon: '📅',
          navigateTo: 'Recorrentes'
        });
      }
    }

    return alertList;
  }, [settingsQuery.data, data, selectedMonth, formatMoney, ordersQuery.data, recurringAlertsQuery.data]);

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
      {/* Mensagem de boas-vindas centralizada */}
      <LoginWelcomeMessage visible={showMessage} onHide={hideMessage} />

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

        {/* Dashboard Mode Selector */}
        <View style={{ alignItems: 'flex-end', paddingHorizontal: 16, marginBottom: 16, marginTop: -8 }}>
          <DashboardModeSelector currentMode={mode} onModeChange={changeMode} />
        </View>

        {/* ========== CARDS DE ONBOARDING EM 3 COLUNAS (WEB) ========== */}
        {isWideWeb ? (
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
              <TrialBanner navigation={navigation} />
            </View>
            <View style={{ flex: 1 }}>
              <WeeklyChecklist navigation={navigation} compact />
            </View>
            <View style={{ flex: 1 }}>
              <OnboardingChecklist navigation={navigation} compact />
            </View>
          </View>
        ) : (
          /* Mobile: empilhados verticalmente */
          <>
            <TrialBanner navigation={navigation} />
            {/* Checklists de Onboarding e Rotina */}
            <View style={{ gap: 12, marginBottom: 16 }}>
              <OnboardingChecklist navigation={navigation} compact />
              <WeeklyChecklist navigation={navigation} compact />
            </View>
          </>
        )}

        {/* ========== SELETOR DE MÊS - CENTRALIZADO NO TOPO ========== */}
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
          <TouchableOpacity
            onPress={handlePreviousMonth}
            style={{ paddingHorizontal: 14, paddingVertical: 10, backgroundColor: theme.card, borderRadius: 12, minWidth: 44, alignItems: 'center' }}
          >
            <Text style={{ color: theme.text, fontWeight: '700', fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16, minWidth: 140, textAlign: 'center' }}>
            {monthLabel}
          </Text>
          <TouchableOpacity
            onPress={handleNextMonth}
            style={{ paddingHorizontal: 14, paddingVertical: 10, backgroundColor: theme.card, borderRadius: 12, minWidth: 44, alignItems: 'center' }}
          >
            <Text style={{ color: theme.text, fontWeight: '700', fontSize: 18 }}>→</Text>
          </TouchableOpacity>
        </View>

        {/* ========== CARDS FINANCEIROS NO TOPO ========== */}
        {data && (
          <CollapsibleWrapper id="cards_financeiros" title="Resumo Financeiro" icon="💰" defaultExpanded={true}>
            {/* Layout responsivo */}
            {isTabletOrDesktop ? (
              <View style={styles.summaryRow}>
                <View style={[styles.summaryCard, { width: '23%', backgroundColor: isNegativeBalance ? '#fee2e2' : '#dcfce7', borderColor: isNegativeBalance ? '#ef4444' : '#16a34a', borderWidth: 1 }]}>
                  <Text style={{ color: '#166534', fontWeight: '700', fontSize: 12, textAlign: 'center' }}>💰 Saldo em Caixa</Text>
                  <Text style={{ color: isNegativeBalance ? '#991b1b' : '#166534', fontSize: 22, fontWeight: '800', marginTop: 8, textAlign: 'center' }}>
                    {formatMoney(data?.balance_cents || 0)}
                  </Text>
                  <Text style={{ color: '#6b7280', fontSize: 9, marginTop: 4, textAlign: 'center' }}>
                    Dinheiro disponível agora
                  </Text>
                </View>

                <View style={[styles.summaryCard, { width: '23%', backgroundColor: '#dbeafe', borderColor: '#1d4ed8', borderWidth: 1 }]}>
                  <Text style={{ color: '#1e40af', fontWeight: '700', fontSize: 12, textAlign: 'center' }}>📈 Entradas</Text>
                  <Text style={{ color: '#1e40af', fontSize: 20, fontWeight: '800', marginTop: 8, textAlign: 'center' }}>
                    {formatMoney(data?.income_cents || 0)}
                  </Text>
                  {/* Mini-badge de meta */}
                  {hasGoal && isCurrentMonth && (
                    <View style={{
                      marginTop: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 12,
                      backgroundColor: goalProgress >= 100 ? '#dcfce7' : goalProgress >= 50 ? '#fef3c7' : '#fee2e2',
                      alignSelf: 'center'
                    }}>
                      <Text style={{
                        fontSize: 10,
                        fontWeight: '700',
                        color: goalProgress >= 100 ? '#16A34A' : goalProgress >= 50 ? '#d97706' : '#DC2626'
                      }}>
                        {goalProgress >= 100 ? '✓ Meta atingida!' : `${goalProgress.toFixed(0)}% da meta`}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={[styles.summaryCard, { width: '23%', backgroundColor: '#fee2e2', borderColor: '#ef4444', borderWidth: 1 }]}>
                  <Text style={{ color: '#991b1b', fontWeight: '700', fontSize: 12, textAlign: 'center' }}>📉 Saídas</Text>
                  <Text style={{ color: '#dc2626', fontSize: 20, fontWeight: '800', marginTop: 8, textAlign: 'center' }}>
                    {formatMoney(data?.expense_cents || 0)}
                  </Text>
                </View>

                <View style={[styles.summaryCard, { width: '23%', backgroundColor: '#fef3c7', borderColor: '#f59e0b', borderWidth: 1 }]}>
                  <Text style={{ color: '#92400e', fontWeight: '700', fontSize: 12, textAlign: 'center' }}>⚠️ A Pagar</Text>
                  <Text style={{ color: '#92400e', fontSize: 20, fontWeight: '800', marginTop: 8, textAlign: 'center' }}>
                    {formatMoney((debtsQuery.data?.monthlyDue || 0) + (debtsQuery.data?.overdue || 0))}
                  </Text>
                  <Text style={{ color: '#92400e', fontSize: 9, marginTop: 4, textAlign: 'center' }}>
                    {(debtsQuery.data?.overdue || 0) > 0
                      ? `${formatMoney(debtsQuery.data?.overdue || 0)} vencidas`
                      : `Vencem em ${debtsQuery.data?.nextMonthName || 'jan'}`}
                  </Text>
                </View>
              </View>
            ) : (
              /* Layout Mobile */
              <View style={{ gap: 8 }}>
                {/* Linha 1: Entradas - Saídas */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={[styles.summaryCard, { flex: 1, backgroundColor: '#dbeafe', borderColor: '#1d4ed8', borderWidth: 1 }]}>
                    <Text style={{ color: '#1e40af', fontWeight: '700', fontSize: 11, textAlign: 'center' }}>📈 Entradas</Text>
                    <Text style={{ color: '#1e40af', fontSize: 16, fontWeight: '800', marginTop: 8, textAlign: 'center' }}>
                      {formatMoney(data?.income_cents || 0)}
                    </Text>
                    {/* Mini-badge de meta */}
                    {hasGoal && isCurrentMonth && (
                      <View style={{
                        marginTop: 4,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 10,
                        backgroundColor: goalProgress >= 100 ? '#dcfce7' : goalProgress >= 50 ? '#fef3c7' : '#fee2e2',
                        alignSelf: 'center'
                      }}>
                        <Text style={{
                          fontSize: 9,
                          fontWeight: '700',
                          color: goalProgress >= 100 ? '#16A34A' : goalProgress >= 50 ? '#d97706' : '#DC2626'
                        }}>
                          {goalProgress >= 100 ? '✓ Meta atingida' : `${goalProgress.toFixed(0)}% da meta`}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={[styles.summaryCard, { flex: 1, backgroundColor: '#fee2e2', borderColor: '#ef4444', borderWidth: 1 }]}>
                    <Text style={{ color: '#991b1b', fontWeight: '700', fontSize: 11, textAlign: 'center' }}>📉 Saídas</Text>
                    <Text style={{ color: '#dc2626', fontSize: 16, fontWeight: '800', marginTop: 8, textAlign: 'center' }}>
                      {formatMoney(data?.expense_cents || 0)}
                    </Text>
                  </View>
                </View>

                {/* Linha 2: Saldo em Caixa - Dívidas a Pagar */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={[styles.summaryCard, { flex: 1, backgroundColor: isNegativeBalance ? '#fee2e2' : '#dcfce7', borderColor: isNegativeBalance ? '#ef4444' : '#16a34a', borderWidth: 1 }]}>
                    <Text style={{ color: '#166534', fontWeight: '700', fontSize: 11, textAlign: 'center' }}>💰 Saldo em Caixa</Text>
                    <Text style={{ color: isNegativeBalance ? '#991b1b' : '#166534', fontSize: 18, fontWeight: '800', marginTop: 8, textAlign: 'center' }}>
                      {formatMoney(data?.balance_cents || 0)}
                    </Text>
                    <Text style={{ color: '#6b7280', fontSize: 8, marginTop: 2, textAlign: 'center' }}>
                      Dinheiro disponível
                    </Text>
                  </View>

                  <View style={[styles.summaryCard, { flex: 1, backgroundColor: '#fef3c7', borderColor: '#f59e0b', borderWidth: 1 }]}>
                    <Text style={{ color: '#92400e', fontWeight: '700', fontSize: 11, textAlign: 'center' }}>⚠️ A Pagar</Text>
                    <Text style={{ color: '#92400e', fontSize: 16, fontWeight: '800', marginTop: 8, textAlign: 'center' }}>
                      {formatMoney((debtsQuery.data?.monthlyDue || 0) + (debtsQuery.data?.overdue || 0))}
                    </Text>
                    <Text style={{ color: '#92400e', fontSize: 8, marginTop: 2, textAlign: 'center' }}>
                      {(debtsQuery.data?.overdue || 0) > 0
                        ? `${formatMoney(debtsQuery.data?.overdue || 0)} vencidas`
                        : `Vencem em ${debtsQuery.data?.nextMonthName || 'jan'}`}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </CollapsibleWrapper>
        )}

        {/* ========== AÇÕES RECOMENDADAS (One-Click Actions) ========== */}
        {isWidgetEnabled('alertas_inteligentes') && healthCheckQuery.data && (
          <HealthActionCard
            data={{
              overdueReceivablesCount: healthCheckQuery.data.overdueReceivables,
              overduePayablesCount: healthCheckQuery.data.overduePayables,
              todaySalesCount: healthCheckQuery.data.todaySales,
              hasGoal: hasGoal,
              goalProgress: goalProgress
            }}
          />
        )}

        {/* Painel do Iniciante (Turbo Dashboard) */}
        {data && (
          <BeginnerDashboard
            navigation={navigation}
            data={{
              income_cents: data.income_cents || 0,
              expense_cents: data.expense_cents || 0,
              balance_cents: data.balance_cents || 0,
            }}
          />
        )}

        {/* Checklists apenas no mobile (já renderizados acima na web) */}
        {!isWideWeb && (
          <>
            {/* Checklist da Primeira Semana */}
            <WeeklyChecklist navigation={navigation} compact />

            {/* Checklist de Onboarding Original */}
            <OnboardingChecklist navigation={navigation} compact />
          </>
        )}

        {/* ========== SAÚDE DO NEGÓCIO + ALERTAS INTELIGENTES EM 2 COLUNAS (WEB) ========== */}
        {isWideWeb ? (
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
            {/* Coluna 1: Saúde do Negócio */}
            <View style={{ flex: 1 }}>
              {data && isWidgetEnabled('saude_negocio') && (
                <CollapsibleWrapper id="saude_negocio" title="Saúde do Negócio" icon="🏥" defaultExpanded={true}>
                  <BusinessHealthCard
                    data={{
                      income_cents: data.income_cents || 0,
                      expense_cents: data.expense_cents || 0,
                      balance_cents: data.balance_cents || 0,
                      overdueDebtsCount: debtsQuery.data?.hasOverdue ? 1 : 0,
                      nearDueDebtsCount: (debtsQuery.data?.monthlyDue || 0) > 0 ? 1 : 0,
                    }}
                    period={monthLabel}
                  />
                </CollapsibleWrapper>
              )}
            </View>
            {/* Coluna 2: Alertas Inteligentes */}
            <View style={{ flex: 1 }}>
              {isWidgetEnabled('alertas_inteligentes') && (
                <CollapsibleWrapper id="alertas_inteligentes" title="Alertas Inteligentes" icon="🚨" defaultExpanded={true}>
                  <SmartAlerts navigation={navigation} />
                </CollapsibleWrapper>
              )}
            </View>
          </View>
        ) : (
          /* Mobile: empilhados verticalmente */
          <>
            {/* Card de Saúde do Negócio (Semáforo) */}
            {data && isWidgetEnabled('saude_negocio') && (
              <CollapsibleWrapper id="saude_negocio" title="Saúde do Negócio" icon="🏥" defaultExpanded={true}>
                <BusinessHealthCard
                  data={{
                    income_cents: data.income_cents || 0,
                    expense_cents: data.expense_cents || 0,
                    balance_cents: data.balance_cents || 0,
                    overdueDebtsCount: debtsQuery.data?.hasOverdue ? 1 : 0,
                    nearDueDebtsCount: (debtsQuery.data?.monthlyDue || 0) > 0 ? 1 : 0,
                  }}
                  period={monthLabel}
                />
              </CollapsibleWrapper>
            )}

            {/* Painel de Alertas */}
            {alerts.length > 0 && (
              <View style={{ backgroundColor: '#FEF2F2', borderColor: '#D90429', borderWidth: 1, borderRadius: 8, padding: 12 }}>
                <Text style={{ color: '#D90429', fontWeight: '700', fontSize: 14, marginBottom: 8 }}>🚨 Alertas</Text>
                {alerts.map((alert, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      if (alert.navigateTo) {
                        (navigation as any).navigate(alert.navigateTo);
                      }
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 8, borderRadius: 6, marginBottom: index < alerts.length - 1 ? 6 : 0, borderLeftWidth: 3, borderLeftColor: alert.color }}
                  >
                    <Text style={{ fontSize: 16, marginRight: 8 }}>{alert.icon}</Text>
                    <Text style={{ color: alert.color, fontSize: 12, fontWeight: '600', flex: 1 }}>{alert.message}</Text>
                    <Text style={{ color: '#6B7280', fontSize: 10 }}>Ver →</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Alertas Inteligentes */}
            {isWidgetEnabled('alertas_inteligentes') && (
              <CollapsibleWrapper id="alertas_inteligentes" title="Alertas Inteligentes" icon="🚨" defaultExpanded={true}>
                <SmartAlerts navigation={navigation} />
              </CollapsibleWrapper>
            )}
          </>
        )}

        {/* Dicas de Rotina por Perfil de Negócio */}
        {isWidgetEnabled('dicas_rotina') && (
          <CollapsibleWrapper id="dicas_rotina" title="Dicas de Rotina" icon="💡" defaultExpanded={true}>
            <BusinessRoutineTips navigation={navigation} />
          </CollapsibleWrapper>
        )}

        {/* Painel A Receber / A Pagar */}
        {isWidgetEnabled('a_receber_pagar') && (
          <CollapsibleWrapper id="a_receber_pagar" title="A Receber / A Pagar" icon="💳" defaultExpanded={true}>
            <ARAPDashboard navigation={navigation} />
          </CollapsibleWrapper>
        )}

        {/* Benchmarks e Insights do Mercado */}
        {isWidgetEnabled('benchmarks') && (
          <CollapsibleWrapper id="benchmarks" title="Comparação com Mercado" icon="📊" defaultExpanded={true}>
            <BenchmarkInsights navigation={navigation} />
          </CollapsibleWrapper>
        )}

        {/* Recomendações Baseadas no Perfil */}
        {getBusinessRecommendation() && (
          <View style={{ backgroundColor: '#F0FDF4', borderColor: '#16A34A', borderWidth: 1, borderRadius: 8, padding: 12 }}>
            <Text style={{ color: '#16A34A', fontWeight: '700', fontSize: 14, marginBottom: 8 }}>📊 Recomendação para Você</Text>
            <Text style={{ color: '#15803D', fontSize: 12, lineHeight: 18 }}>
              {getBusinessRecommendation()}
            </Text>
          </View>
        )}

        {dashboardQuery.isLoading && (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: '#888' }}>Carregando dados do dashboard…</Text>
          </View>
        )}

        {/* Meta Financeira e Alertas de Progresso */}
        {data && (
          <>
            {/* Layout 2 Colunas: Alertas de Comparação | Meta Financeira */}
            <View style={{ flexDirection: Platform.OS === 'web' ? 'row' : 'column', gap: 12 }}>
              {/* Coluna Esquerda: Alertas empilhados */}
              <View style={{ flex: 1, gap: 10 }}>
                {/* Alerta: Dívidas do mês > Saldo */}
                {isWidgetEnabled('benchmarks') && ((debtsQuery.data?.monthlyDue || 0) + (debtsQuery.data?.overdue || 0)) > (data?.balance_cents || 0) && (data?.balance_cents || 0) > 0 && (
                  <View style={{ backgroundColor: '#fee2e2', borderColor: '#ef4444', borderWidth: 1, borderRadius: 8, padding: 10 }}>
                    <Text style={{ color: '#991b1b', fontSize: 11, fontWeight: '700' }}>
                      ⚠️ Suas dívidas do mês são maiores que seu saldo!
                    </Text>
                    <Text style={{ color: '#991b1b', fontSize: 10, marginTop: 2 }}>
                      Planeje os pagamentos com cuidado.
                    </Text>
                  </View>
                )}

                {/* Alertas de Progresso de Meta */}
                {isCurrentMonth && hasGoal && (
                  <>
                    {isLowGoalProgress && (
                      <View style={{ backgroundColor: '#fef3c7', borderColor: '#f59e0b', borderWidth: 1, borderRadius: 6, padding: 8, minHeight: 54, justifyContent: 'center' }}>
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
                  </>
                )}
              </View>

              {/* Coluna Direita: Meta Financeira */}
              <View style={{ flex: 1 }}>
                {isWidgetEnabled('meta_financeira') && (
                  <View style={[styles.summaryCard, { backgroundColor: settings.companyProfile?.main_goal === 'save_investments' ? '#f0fdf4' : '#fef2f2', borderColor: hasGoal ? (isLowGoalProgress ? '#ef4444' : '#10b981') : '#d1d5db', borderWidth: 1 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={{ color: '#111827', fontWeight: '700', fontSize: 11 }}>
                        🎯 Meta{settings.companyProfile?.main_goal === 'save_investments' && ' 💹'}
                      </Text>
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
                        <Text style={{ color: getGoalBarColor(), fontSize: 10, fontWeight: '600', marginTop: 1, textAlign: 'center', fontStyle: 'italic' }}>
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
                )}
              </View>
            </View>

            {/* Layout em Duas Colunas: Gráfico + Últimas Transações */}
            <View style={{ flexDirection: isTabletOrDesktop ? 'row' : 'column', gap: 16 }}>
              {/* COLUNA 1 - Gráfico */}
              <View style={{ flex: isTabletOrDesktop ? 0.6 : 1, overflow: 'hidden', maxWidth: '100%' }}>
                {isWidgetEnabled('charts') && (data?.dailySeries || weeklyDataQuery.data?.weeklySeries || monthlyDataQuery.data?.monthlySeries || quarterlyDataQuery.data?.quarterlySeries || semesterDataQuery.data?.semesterSeries) && (
                  <View style={[styles.card, { backgroundColor: theme.card, overflow: 'hidden', maxWidth: '100%' }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ color: theme.text, fontWeight: '700', fontSize: 15 }}>
                        {chartView === 'daily' ? 'Fluxo Diário' :
                          chartView === 'weekly' ? 'Fluxo Semanal' :
                            chartView === 'monthly' ? 'Fluxo Mensal' :
                              chartView === 'quarterly' ? 'Fluxo Trimestral' :
                                'Fluxo Semestral'}
                      </Text>
                    </View>

                    {/* Botões de Filtro - Simplificados */}
                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                      {/* Botões principais: Diário e Mensal */}
                      {(['daily', 'monthly'] as const).map((view) => (
                        <TouchableOpacity
                          key={view}
                          onPress={() => setChartView(view)}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 8,
                            backgroundColor: chartView === view ? '#16A34A' : theme.card,
                            borderWidth: 1,
                            borderColor: '#16A34A',
                          }}
                        >
                          <Text style={{
                            color: chartView === view ? '#fff' : '#16A34A',
                            fontSize: 12,
                            fontWeight: '700'
                          }}>
                            {view === 'daily' ? '📅 Diário' : '📊 Mensal'}
                          </Text>
                        </TouchableOpacity>
                      ))}

                      {/* Separador visual */}
                      <View style={{ width: 1, height: 20, backgroundColor: theme.border, marginHorizontal: 4 }} />

                      {/* Botões secundários: Semanal, Trimestral, Semestral */}
                      {(['weekly', 'quarterly', 'semester'] as const).map((view) => (
                        <TouchableOpacity
                          key={view}
                          onPress={() => setChartView(view)}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 6,
                            backgroundColor: chartView === view ? '#6366f1' : theme.cardSecondary,
                            borderWidth: 1,
                            borderColor: chartView === view ? '#6366f1' : theme.border,
                          }}
                        >
                          <Text style={{
                            color: chartView === view ? '#fff' : theme.textSecondary,
                            fontSize: 10,
                            fontWeight: '600'
                          }}>
                            {view === 'weekly' ? 'Semanal' :
                              view === 'quarterly' ? 'Trimestral' : 'Semestral'}
                          </Text>
                        </TouchableOpacity>
                      ))}

                      {/* Link para relatório detalhado */}
                      <TouchableOpacity
                        onPress={() => (navigation as any).navigate('Relatórios')}
                        style={{ marginLeft: 'auto' }}
                      >
                        <Text style={{ color: theme.primary, fontSize: 11, fontWeight: '600' }}>
                          Ver relatório →
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Gráfico Real */}
                    <View style={{ height: 220, backgroundColor: theme.cardSecondary, borderRadius: 8, padding: 12 }}>
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

                      {/* Tooltip Trimestral */}
                      {chartView === 'quarterly' && quarterlyTooltip && (
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
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>{quarterlyTooltip.quarter}</Text>
                          <Text style={{ color: '#10b981', fontSize: 11 }}>+{formatMoney(quarterlyTooltip.income)}</Text>
                          <Text style={{ color: '#ef4444', fontSize: 11 }}>-{formatMoney(quarterlyTooltip.expense)}</Text>
                        </View>
                      )}

                      {/* Tooltip Semestral */}
                      {chartView === 'semester' && semesterTooltip && (
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
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>{semesterTooltip.semester}</Text>
                          <Text style={{ color: '#10b981', fontSize: 11 }}>+{formatMoney(semesterTooltip.income)}</Text>
                          <Text style={{ color: '#ef4444', fontSize: 11 }}>-{formatMoney(semesterTooltip.expense)}</Text>
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

                      {chartView === 'quarterly' && (
                        <View style={{ flex: 1 }}>
                          {quarterlyDataQuery.isLoading ? (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                              <Text style={{ fontSize: 12, color: '#6b7280' }}>Carregando...</Text>
                            </View>
                          ) : quarterlyDataQuery.data?.quarterlySeries ? (
                            <>
                              <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingTop: quarterlyTooltip ? 40 : 0 }}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 140, gap: 8, paddingHorizontal: 4 }}>
                                  {quarterlyDataQuery.data.quarterlySeries.map((item, index) => {
                                    const maxValue = Math.max(...quarterlyDataQuery.data!.quarterlySeries.map(d => Math.max(d.income_cents, d.expense_cents)));
                                    const incomeHeight = maxValue > 0 ? (item.income_cents / maxValue) * 100 : 0;
                                    const expenseHeight = maxValue > 0 ? (item.expense_cents / maxValue) * 100 : 0;

                                    return (
                                      <TouchableOpacity
                                        key={index}
                                        style={{ alignItems: 'center', minWidth: 40 }}
                                        onPress={() => setQuarterlyTooltip(
                                          quarterlyTooltip?.quarter === item.quarterName ? null : { quarter: item.quarterName, income: item.income_cents, expense: item.expense_cents }
                                        )}
                                      >
                                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
                                          <View style={{ width: 12, height: Math.max(2, incomeHeight), backgroundColor: '#10b981', borderRadius: 2 }} />
                                          <View style={{ width: 12, height: Math.max(2, expenseHeight), backgroundColor: '#ef4444', borderRadius: 2 }} />
                                        </View>
                                        <Text style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>{item.quarterName}</Text>
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

                      {chartView === 'semester' && (
                        <View style={{ flex: 1 }}>
                          {semesterDataQuery.isLoading ? (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                              <Text style={{ fontSize: 12, color: '#6b7280' }}>Carregando...</Text>
                            </View>
                          ) : semesterDataQuery.data?.semesterSeries ? (
                            <>
                              <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingTop: semesterTooltip ? 40 : 0 }}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 140, gap: 12, paddingHorizontal: 4 }}>
                                  {semesterDataQuery.data.semesterSeries.map((item, index) => {
                                    const maxValue = Math.max(...semesterDataQuery.data!.semesterSeries.map(d => Math.max(d.income_cents, d.expense_cents)));
                                    const incomeHeight = maxValue > 0 ? (item.income_cents / maxValue) * 100 : 0;
                                    const expenseHeight = maxValue > 0 ? (item.expense_cents / maxValue) * 100 : 0;

                                    return (
                                      <TouchableOpacity
                                        key={index}
                                        style={{ alignItems: 'center', minWidth: 50 }}
                                        onPress={() => setSemesterTooltip(
                                          semesterTooltip?.semester === item.semesterName ? null : { semester: item.semesterName, income: item.income_cents, expense: item.expense_cents }
                                        )}
                                      >
                                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
                                          <View style={{ width: 14, height: Math.max(2, incomeHeight), backgroundColor: '#10b981', borderRadius: 2 }} />
                                          <View style={{ width: 14, height: Math.max(2, expenseHeight), backgroundColor: '#ef4444', borderRadius: 2 }} />
                                        </View>
                                        <Text style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>{item.semesterName}</Text>
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

              {/* Gráfico de Pizza por Categoria */}
              {categoryDataQuery.data && (
                <View style={[styles.card, { backgroundColor: theme.card, marginTop: 16 }]}>
                  <Text style={{ color: theme.text, fontWeight: '700', fontSize: 15, marginBottom: 12 }}>
                    📊 Distribuição por Categoria
                  </Text>

                  {/* Botões de filtro */}
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                    <TouchableOpacity
                      onPress={() => setPieChartType('income')}
                      style={{
                        flex: 1,
                        padding: 10,
                        borderRadius: 8,
                        backgroundColor: pieChartType === 'income' ? '#10B981' : theme.cardSecondary,
                        borderWidth: 1,
                        borderColor: pieChartType === 'income' ? '#10B981' : '#e5e7eb',
                      }}
                    >
                      <Text style={{
                        color: pieChartType === 'income' ? '#FFF' : theme.text,
                        textAlign: 'center',
                        fontWeight: '700',
                        fontSize: 13
                      }}>
                        Entradas
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setPieChartType('expense')}
                      style={{
                        flex: 1,
                        padding: 10,
                        borderRadius: 8,
                        backgroundColor: pieChartType === 'expense' ? '#EF4444' : theme.cardSecondary,
                        borderWidth: 1,
                        borderColor: pieChartType === 'expense' ? '#EF4444' : '#e5e7eb',
                      }}
                    >
                      <Text style={{
                        color: pieChartType === 'expense' ? '#FFF' : theme.text,
                        textAlign: 'center',
                        fontWeight: '700',
                        fontSize: 13
                      }}>
                        Saídas
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Lista de categorias com porcentagem */}
                  {(() => {
                    const data = pieChartType === 'income'
                      ? categoryDataQuery.data.incomeByCategory
                      : categoryDataQuery.data.expenseByCategory;
                    const total = Object.values(data).reduce((sum, val) => sum + val, 0);
                    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'];
                    const sortedEntries = Object.entries(data).sort((a, b) => b[1] - a[1]);

                    if (sortedEntries.length === 0) {
                      return (
                        <View style={{ padding: 20, alignItems: 'center' }}>
                          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                            Nenhum lançamento de {pieChartType === 'income' ? 'entrada' : 'saída'} neste mês
                          </Text>
                        </View>
                      );
                    }

                    return (
                      <View style={{ gap: 8 }}>
                        {sortedEntries.slice(0, 8).map(([category, amount], index) => {
                          const percentage = total > 0 ? Math.round((amount / total) * 100) : 0;
                          const barWidth = total > 0 ? (amount / total) * 100 : 0;
                          return (
                            <View key={category} style={{ gap: 4 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                  <View style={{
                                    width: 12,
                                    height: 12,
                                    backgroundColor: colors[index % colors.length],
                                    marginRight: 8,
                                    borderRadius: 3
                                  }} />
                                  <Text style={{ color: theme.text, fontSize: 12, flex: 1 }} numberOfLines={1}>
                                    {category}
                                  </Text>
                                </View>
                                <Text style={{ color: theme.text, fontWeight: '700', fontSize: 12 }}>
                                  {percentage}% - {formatMoney(amount)}
                                </Text>
                              </View>
                              {/* Barra de progresso */}
                              <View style={{
                                height: 6,
                                backgroundColor: theme.cardSecondary,
                                borderRadius: 3,
                                overflow: 'hidden'
                              }}>
                                <View style={{
                                  height: '100%',
                                  width: `${barWidth}%`,
                                  backgroundColor: colors[index % colors.length],
                                  borderRadius: 3
                                }} />
                              </View>
                            </View>
                          );
                        })}
                        {sortedEntries.length > 8 && (
                          <Text style={{ color: theme.textSecondary, fontSize: 10, textAlign: 'center', marginTop: 4 }}>
                            +{sortedEntries.length - 8} outras categorias
                          </Text>
                        )}
                        {/* Total */}
                        <View style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          paddingTop: 12,
                          marginTop: 8,
                          borderTopWidth: 1,
                          borderTopColor: '#e5e7eb'
                        }}>
                          <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }}>Total</Text>
                          <Text style={{
                            color: pieChartType === 'income' ? '#10B981' : '#EF4444',
                            fontWeight: '800',
                            fontSize: 14
                          }}>
                            {formatMoney(total)}
                          </Text>
                        </View>
                      </View>
                    );
                  })()}
                </View>
              )}

              {/* COLUNA 2 - Resumo e Lançamentos */}
              <View style={{ flex: isTabletOrDesktop ? 0.4 : 1, gap: 12 }}>
                {/* Cards lado a lado */}
                <View style={{ flexDirection: 'column', gap: 12 }}>
                  {/* Resumo Rápido */}
                  <View style={[styles.card, { backgroundColor: theme.card, flex: 1, minHeight: 180 }]}>
                    <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14, marginBottom: 10 }}>
                      📋 Resumo Rápido
                    </Text>

                    <View style={{ gap: 6, flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 6, backgroundColor: theme.cardSecondary, borderRadius: 6 }}>
                        <Text style={{ color: theme.text, fontSize: 11 }}>📅 Dias no mês</Text>
                        <Text style={{ color: theme.text, fontSize: 11, fontWeight: '700' }}>
                          {new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate()}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 6, backgroundColor: theme.cardSecondary, borderRadius: 6 }}>
                        <Text style={{ color: theme.text, fontSize: 11 }}>📊 Média diária</Text>
                        <Text style={{ color: theme.text, fontSize: 11, fontWeight: '700' }}>
                          {formatMoney(Math.round((data?.income_cents || 0) / new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate()))}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 6, backgroundColor: theme.cardSecondary, borderRadius: 6 }}>
                        <Text style={{ color: theme.text, fontSize: 11 }}>🎯 Meta vs Real</Text>
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

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 6, backgroundColor: theme.cardSecondary, borderRadius: 6 }}>
                        <Text style={{ color: theme.text, fontSize: 11 }}>
                          {debtsQuery.data?.hasOverdue ? '🚨' : '💳'} Dívidas
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ color: '#16a34a', fontSize: 11, fontWeight: '700' }}>
                            {formatMoney(debtsQuery.data?.paid || 0)}
                          </Text>
                          <Text style={{ color: theme.textSecondary, fontSize: 11 }}>/</Text>
                          <Text style={{ color: (debtsQuery.data?.remaining || 0) > 0 ? '#dc2626' : '#16a34a', fontSize: 11, fontWeight: '700' }}>
                            {formatMoney(debtsQuery.data?.remaining || 0)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Lançamentos Recentes */}
                  {isWidgetEnabled('recent_transactions') && (
                    <View style={[styles.card, { backgroundColor: theme.card, flex: 1, minHeight: 180 }]}>
                      <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14, marginBottom: 10 }}>
                        📝 Lançamentos Recentes
                      </Text>

                      {recentTransactionsQuery.isLoading ? (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                          <Text style={{ color: theme.textSecondary, fontSize: 11 }}>Carregando...</Text>
                        </View>
                      ) : recentTransactionsQuery.data?.length === 0 ? (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                          <Text style={{ color: theme.textSecondary, fontSize: 11 }}>Nenhum lançamento</Text>
                        </View>
                      ) : (
                        <View style={{ gap: 4, flex: 1 }}>
                          {recentTransactionsQuery.data?.map((transaction) => (
                            <View key={transaction.id} style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: 6,
                              backgroundColor: theme.cardSecondary,
                              borderRadius: 6
                            }}>
                              <View style={{ flex: 1 }}>
                                <Text style={{
                                  color: theme.text,
                                  fontSize: 11,
                                  fontWeight: '600',
                                }} numberOfLines={1}>
                                  {transaction.description || 'Sem descrição'}
                                </Text>
                                <Text style={{ color: theme.textSecondary, fontSize: 9 }}>
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
                  )}
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
                style={{ flex: 1, backgroundColor: goalMutation.isPending ? '#9ca3af' : '#16a34a', padding: 12, borderRadius: 8 }}
                onPress={handleSaveGoal}
                disabled={goalMutation.isPending}
              >
                <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>
                  {goalMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Modal de Dívidas Recorrentes Vencidas */}
      {showRecurringOverdueModal && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 101 }}>
          <View style={{ backgroundColor: theme.card, padding: 24, borderRadius: 16, width: '85%', maxWidth: 400, alignItems: 'center' }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
            <Text style={{ color: '#dc2626', fontSize: 20, fontWeight: '800', marginBottom: 8, textAlign: 'center' }}>
              Atenção!
            </Text>
            <Text style={{ color: theme.text, fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 22 }}>
              Você possui dívidas recorrentes em atraso. Confirme o pagamento para regularizar.
            </Text>

            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#6b7280', padding: 14, borderRadius: 8 }}
                onPress={() => {
                  setShowRecurringOverdueModal(false);
                }}
              >
                <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>Fechar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#dc2626', padding: 14, borderRadius: 8 }}
                onPress={() => {
                  setShowRecurringOverdueModal(false);
                  (navigation as any).navigate('Recorrentes');
                }}
              >
                <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>Ir para Recorrentes</Text>
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

      {/* Botão Flutuante de Ação Rápida */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          bottom: 24,
          right: 24,
          backgroundColor: '#16a34a',
          width: 56,
          height: 56,
          borderRadius: 28,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 5,
          zIndex: 1000,
        }}
        onPress={() => setShowQuickActionModal(true)}
      >
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>⚡</Text>
      </TouchableOpacity>

      {/* Modal de Seleção de Ação Rápida */}
      {showQuickActionModal && !quickActionType && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 1001 }}>
          <View style={{ backgroundColor: theme.card, padding: 24, borderRadius: 16, width: '90%', maxWidth: 400 }}>
            <Text style={{ color: theme.text, fontSize: 20, fontWeight: '800', marginBottom: 20, textAlign: 'center' }}>
              ⚡ Lançamento Rápido
            </Text>

            <View style={{ gap: 12 }}>
              <TouchableOpacity
                style={{ backgroundColor: '#16a34a', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                onPress={() => setQuickActionType('income')}
              >
                <Text style={{ color: '#fff', fontSize: 20 }}>💰</Text>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Registrar Entrada</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ backgroundColor: '#dc2626', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                onPress={() => setQuickActionType('expense')}
              >
                <Text style={{ color: '#fff', fontSize: 20 }}>💸</Text>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Registrar Saída</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ backgroundColor: '#f59e0b', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                onPress={() => setQuickActionType('debt')}
              >
                <Text style={{ color: '#fff', fontSize: 20 }}>💳</Text>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Adicionar Dívida</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={{ backgroundColor: '#6b7280', padding: 12, borderRadius: 8, marginTop: 20 }}
              onPress={() => setShowQuickActionModal(false)}
            >
              <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modal de Entrada/Saída Rápida */}
      {showQuickActionModal && (quickActionType === 'income' || quickActionType === 'expense') && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 1001 }}>
          <View style={{ backgroundColor: theme.card, padding: 24, borderRadius: 16, width: '90%', maxWidth: 400 }}>
            <Text style={{ color: theme.text, fontSize: 20, fontWeight: '800', marginBottom: 20, textAlign: 'center' }}>
              {quickActionType === 'income' ? '💰 Entrada Rápida' : '💸 Saída Rápida'}
            </Text>

            <View style={{ gap: 16 }}>
              <View>
                <Text style={{ color: theme.text, marginBottom: 8 }}>Valor *</Text>
                <TextInput
                  style={{ borderWidth: 1, borderColor: theme.inputBorder, borderRadius: 8, padding: 12, color: theme.text, backgroundColor: theme.input }}
                  value={quickAmount}
                  onChangeText={setQuickAmount}
                  placeholder="R$ 0,00"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
              </View>

              <View>
                <Text style={{ color: theme.text, marginBottom: 8 }}>Descrição</Text>
                <TextInput
                  style={{ borderWidth: 1, borderColor: theme.inputBorder, borderRadius: 8, padding: 12, color: theme.text, backgroundColor: theme.input }}
                  value={quickDescription}
                  onChangeText={setQuickDescription}
                  placeholder="Opcional"
                  placeholderTextColor="#999"
                />
              </View>

              <View>
                <Text style={{ color: theme.text, marginBottom: 8 }}>Categoria</Text>
                <ScrollView style={{ maxHeight: 120, borderWidth: 1, borderColor: theme.inputBorder, borderRadius: 8 }}>
                  {(quickActionType === 'income' ? incomeOptions : expenseOptions).map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}
                      onPress={() => setQuickCategory(option)}
                    >
                      <Text style={{ color: quickCategory === option ? '#16a34a' : theme.text, fontWeight: quickCategory === option ? '700' : '500' }}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#6b7280', padding: 12, borderRadius: 8 }}
                onPress={() => setQuickActionType(null)}
              >
                <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>Voltar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flex: 1, backgroundColor: quickActionType === 'income' ? '#16a34a' : '#dc2626', padding: 12, borderRadius: 8 }}
                onPress={handleQuickTransaction}
                disabled={quickTransactionMutation.isPending}
              >
                <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>
                  {quickTransactionMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={{ backgroundColor: '#f3f4f6', padding: 8, borderRadius: 6, marginTop: 12 }}
              onPress={() => {
                resetQuickAction();
                (navigation as any).navigate(quickActionType === 'income' ? 'Dia' : 'Dia');
              }}
            >
              <Text style={{ color: '#6b7280', textAlign: 'center', fontSize: 12 }}>Mais opções...</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modal de Dívida Simples */}
      {showQuickActionModal && quickActionType === 'debt' && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 1001 }}>
          <ScrollView
            style={{ flex: 1, width: '100%' }}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ backgroundColor: theme.card, padding: 24, borderRadius: 16, width: '100%', maxWidth: 400 }}>
              <Text style={{ color: theme.text, fontSize: 20, fontWeight: '800', marginBottom: 20, textAlign: 'center' }}>
                💳 Dívida Rápida
              </Text>

              <View style={{ gap: 14 }}>
                <View>
                  <Text style={{ color: theme.text, marginBottom: 6, fontWeight: '600' }}>Descrição *</Text>
                  <TextInput
                    style={{ borderWidth: 1, borderColor: theme.inputBorder, borderRadius: 8, padding: 12, color: theme.text, backgroundColor: theme.input }}
                    value={quickDebtDescription}
                    onChangeText={setQuickDebtDescription}
                    placeholder="Ex: Compra de celular"
                    placeholderTextColor="#999"
                  />
                </View>

                <View>
                  <Text style={{ color: theme.text, marginBottom: 6, fontWeight: '600' }}>Valor Total *</Text>
                  <TextInput
                    style={{ borderWidth: 1, borderColor: theme.inputBorder, borderRadius: 8, padding: 12, color: theme.text, backgroundColor: theme.input }}
                    value={quickDebtAmount}
                    onChangeText={setQuickDebtAmount}
                    placeholder="R$ 0,00"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />
                </View>

                <View>
                  <Text style={{ color: theme.text, marginBottom: 6, fontWeight: '600' }}>Número de Parcelas</Text>
                  <TextInput
                    style={{ borderWidth: 1, borderColor: theme.inputBorder, borderRadius: 8, padding: 12, color: theme.text, backgroundColor: theme.input }}
                    value={quickDebtInstallments}
                    onChangeText={setQuickDebtInstallments}
                    placeholder="1"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />
                </View>

                <View>
                  <Text style={{ color: theme.text, marginBottom: 6, fontWeight: '600' }}>📅 Data da Compra</Text>
                  <TextInput
                    style={{ borderWidth: 1, borderColor: theme.inputBorder, borderRadius: 8, padding: 12, color: theme.text, backgroundColor: theme.input }}
                    value={quickDebtPurchaseDate}
                    onChangeText={setQuickDebtPurchaseDate}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor="#999"
                  />
                  <Text style={{ color: '#6b7280', fontSize: 10, marginTop: 4 }}>Formato: AAAA-MM-DD (ex: 2025-12-05)</Text>
                </View>

                <View>
                  <Text style={{ color: theme.text, marginBottom: 6, fontWeight: '600' }}>📆 Dia de Vencimento</Text>
                  <TextInput
                    style={{ borderWidth: 1, borderColor: theme.inputBorder, borderRadius: 8, padding: 12, color: theme.text, backgroundColor: theme.input }}
                    value={quickDebtDueDay}
                    onChangeText={setQuickDebtDueDay}
                    placeholder="10"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />
                  <Text style={{ color: '#6b7280', fontSize: 10, marginTop: 4 }}>Dia do mês em que a fatura vence (1-31)</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: '#6b7280', padding: 12, borderRadius: 8 }}
                  onPress={() => setQuickActionType(null)}
                >
                  <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>Voltar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: '#f59e0b', padding: 12, borderRadius: 8 }}
                  onPress={handleQuickDebt}
                  disabled={quickDebtMutation.isPending}
                >
                  <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>
                    {quickDebtMutation.isPending ? 'Salvando...' : 'Salvar'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={{ backgroundColor: '#f3f4f6', padding: 8, borderRadius: 6, marginTop: 12 }}
                onPress={() => {
                  resetQuickAction();
                  (navigation as any).navigate('Débitos');
                }}
              >
                <Text style={{ color: '#6b7280', textAlign: 'center', fontSize: 12 }}>Mais opções...</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}


