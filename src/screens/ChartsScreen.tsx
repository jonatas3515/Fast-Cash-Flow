import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useThemeCtx } from '../theme/ThemeProvider';
import { supabase } from '../lib/supabase';
import { getCurrentCompanyId } from '../lib/company';
import { formatCentsBRL } from '../utils/money';
import ScreenTitle from '../components/ScreenTitle';
import { useResolvedBusinessType } from '../hooks/useSegmentCategories';
import { getCategoryGroupKey } from '../utils/segment';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Períodos disponíveis
const PERIODS = [
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: '90d', label: '3 meses' },
  { key: '180d', label: '6 meses' },
  { key: '365d', label: '1 ano' },
];

// Tipos de gráficos
const CHART_TYPES = [
  { key: 'overview', label: '📊 Visão Geral', icon: '📊' },
  { key: 'income', label: '💰 Receitas', icon: '💰' },
  { key: 'expense', label: '💸 Despesas', icon: '💸' },
  { key: 'balance', label: '📈 Saldo', icon: '📈' },
  { key: 'categories', label: '🏷️ Categorias', icon: '🏷️' },
];

interface ChartData {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  incomeByCategory: { category: string; amount: number }[];
  expenseByCategory: { category: string; amount: number }[];
  dailyData: { date: string; income: number; expense: number }[];
  monthlyData: { month: string; income: number; expense: number }[];
}

export default function ChartsScreen() {
  const { theme } = useThemeCtx();
  const [companyId, setCompanyId] = React.useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = React.useState('30d');
  const [selectedChart, setSelectedChart] = React.useState('overview');
  const businessType = useResolvedBusinessType();

  React.useEffect(() => {
    (async () => {
      const id = await getCurrentCompanyId();
      if (id) {
        setCompanyId(id);
        // Marcar relatório como gerado para o onboarding
        if (Platform.OS === 'web') {
          try {
            window.localStorage.setItem(`report_generated_${id}`, 'true');
          } catch (e) {
            console.log('Não foi possível salvar flag de relatório');
          }
        }
      }
    })();
  }, []);

  // Calcular datas baseado no período
  const dateRange = React.useMemo(() => {
    const end = new Date();
    const start = new Date();
    const days = parseInt(selectedPeriod.replace('d', ''));
    start.setDate(start.getDate() - days);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  }, [selectedPeriod]);

  // Query para buscar dados
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['charts-data', companyId, dateRange, businessType],
    enabled: !!companyId,
    queryFn: async (): Promise<ChartData> => {
      // Buscar transações do período
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('company_id', companyId)
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)
        .is('deleted_at', null);

      if (error) throw error;

      const txs = transactions || [];

      // Calcular totais
      const totalIncome = txs
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + (t.amount_cents || 0), 0);

      const totalExpense = txs
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + (t.amount_cents || 0), 0);

      // Agrupar por categoria
      const incomeByCategory = Object.entries(
        txs
          .filter(t => t.type === 'income')
          .reduce((acc, t) => {
            const cat = getCategoryGroupKey(businessType, t.category, t.description, 'Sem categoria');
            acc[cat] = (acc[cat] || 0) + (t.amount_cents || 0);
            return acc;
          }, {} as Record<string, number>)
      )
        .map(([category, amount]) => ({ category, amount: amount as number }))
        .sort((a, b) => (b.amount as number) - (a.amount as number));

      const expenseByCategory = Object.entries(
        txs
          .filter(t => t.type === 'expense')
          .reduce((acc, t) => {
            const cat = getCategoryGroupKey(businessType, t.category, t.description, 'Sem categoria');
            acc[cat] = (acc[cat] || 0) + (t.amount_cents || 0);
            return acc;
          }, {} as Record<string, number>)
      )
        .map(([category, amount]) => ({ category, amount: amount as number }))
        .sort((a, b) => (b.amount as number) - (a.amount as number));

      // Agrupar por dia
      const dailyMap: Record<string, { income: number; expense: number }> = {};
      txs.forEach(t => {
        const date = t.date;
        if (!dailyMap[date]) dailyMap[date] = { income: 0, expense: 0 };
        if (t.type === 'income') dailyMap[date].income += t.amount_cents || 0;
        else dailyMap[date].expense += t.amount_cents || 0;
      });

      const dailyData = Object.entries(dailyMap)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Agrupar por mês
      const monthlyMap: Record<string, { income: number; expense: number }> = {};
      txs.forEach(t => {
        const month = t.date.substring(0, 7); // YYYY-MM
        if (!monthlyMap[month]) monthlyMap[month] = { income: 0, expense: 0 };
        if (t.type === 'income') monthlyMap[month].income += t.amount_cents || 0;
        else monthlyMap[month].expense += t.amount_cents || 0;
      });

      const monthlyData = Object.entries(monthlyMap)
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => a.month.localeCompare(b.month));

      return {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        incomeByCategory,
        expenseByCategory,
        dailyData,
        monthlyData,
      };
    },
  });

  // Componente de barra horizontal
  const HorizontalBar = ({ value, maxValue, color }: { value: number; maxValue: number; color: string }) => {
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
    return (
      <View style={[styles.barContainer, { backgroundColor: theme.border }]}>
        <View style={[styles.bar, { width: `${Math.min(percentage, 100)}%`, backgroundColor: color }]} />
      </View>
    );
  };

  // Componente de mini gráfico de barras
  const MiniBarChart = ({ data, type }: { data: { date: string; income: number; expense: number }[]; type: 'income' | 'expense' | 'balance' }) => {
    const maxValue = Math.max(...data.map(d => Math.max(d.income, d.expense, Math.abs(d.income - d.expense))));
    const lastDays = data.slice(-14); // Últimos 14 dias

    return (
      <View style={styles.miniChart}>
        <View style={styles.miniChartBars}>
          {lastDays.map((d, i) => {
            const value = type === 'income' ? d.income : type === 'expense' ? d.expense : d.income - d.expense;
            const height = maxValue > 0 ? (Math.abs(value) / maxValue) * 60 : 0;
            const color = type === 'income' ? '#10b981' : type === 'expense' ? '#ef4444' : value >= 0 ? '#10b981' : '#ef4444';
            return (
              <View key={i} style={styles.miniBarWrapper}>
                <View style={[styles.miniBar, { height, backgroundColor: color }]} />
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScreenTitle title="Análise de Gráficos" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Carregando dados...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenTitle title="Análise de Gráficos" />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Filtro de Período */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>📅 Período</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.periodButtons}>
              {PERIODS.map((period) => (
                <TouchableOpacity
                  key={period.key}
                  style={[
                    styles.periodBtn,
                    { borderColor: selectedPeriod === period.key ? theme.primary : theme.border },
                    selectedPeriod === period.key && { backgroundColor: theme.primary + '20' }
                  ]}
                  onPress={() => setSelectedPeriod(period.key)}
                >
                  <Text style={[styles.periodBtnText, { color: selectedPeriod === period.key ? theme.primary : theme.text }]}>
                    {period.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Tipo de Gráfico */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>📈 Visualização</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chartTypeButtons}>
              {CHART_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.chartTypeBtn,
                    { backgroundColor: selectedChart === type.key ? theme.primary : theme.card, borderColor: theme.border }
                  ]}
                  onPress={() => setSelectedChart(type.key)}
                >
                  <Text style={[styles.chartTypeBtnText, { color: selectedChart === type.key ? '#fff' : theme.text }]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* KPIs Principais */}
        <View style={styles.kpiContainer}>
          <View style={[styles.kpiCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={styles.kpiIcon}>💰</Text>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Receitas</Text>
            <Text style={[styles.kpiValue, { color: '#10b981' }]}>
              {formatCentsBRL(chartData?.totalIncome || 0)}
            </Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={styles.kpiIcon}>💸</Text>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Despesas</Text>
            <Text style={[styles.kpiValue, { color: '#ef4444' }]}>
              {formatCentsBRL(chartData?.totalExpense || 0)}
            </Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={styles.kpiIcon}>📊</Text>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Saldo</Text>
            <Text style={[styles.kpiValue, { color: (chartData?.balance || 0) >= 0 ? '#10b981' : '#ef4444' }]}>
              {formatCentsBRL(chartData?.balance || 0)}
            </Text>
          </View>
        </View>

        {/* Gráfico de Evolução */}
        {chartData && chartData.dailyData.length > 0 && (
          <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.chartTitle, { color: theme.text }]}>📈 Evolução Diária</Text>
            <MiniBarChart data={chartData.dailyData} type={selectedChart === 'income' ? 'income' : selectedChart === 'expense' ? 'expense' : 'balance'} />
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                <Text style={[styles.legendText, { color: theme.textSecondary }]}>Receitas</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                <Text style={[styles.legendText, { color: theme.textSecondary }]}>Despesas</Text>
              </View>
            </View>
          </View>
        )}

        {/* Receitas por Categoria */}
        {(selectedChart === 'overview' || selectedChart === 'income' || selectedChart === 'categories') && chartData && chartData.incomeByCategory.length > 0 && (
          <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.chartTitle, { color: theme.text }]}>💰 Receitas por Categoria</Text>
            {chartData.incomeByCategory.slice(0, 8).map((item, index) => (
              <View key={index} style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <Text style={[styles.categoryName, { color: theme.text }]} numberOfLines={1}>
                    {item.category}
                  </Text>
                  <Text style={[styles.categoryValue, { color: '#10b981' }]}>
                    {formatCentsBRL(item.amount)}
                  </Text>
                </View>
                <HorizontalBar 
                  value={item.amount} 
                  maxValue={chartData.incomeByCategory[0]?.amount || 1} 
                  color="#10b981" 
                />
              </View>
            ))}
          </View>
        )}

        {/* Despesas por Categoria */}
        {(selectedChart === 'overview' || selectedChart === 'expense' || selectedChart === 'categories') && chartData && chartData.expenseByCategory.length > 0 && (
          <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.chartTitle, { color: theme.text }]}>💸 Despesas por Categoria</Text>
            {chartData.expenseByCategory.slice(0, 8).map((item, index) => (
              <View key={index} style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <Text style={[styles.categoryName, { color: theme.text }]} numberOfLines={1}>
                    {item.category}
                  </Text>
                  <Text style={[styles.categoryValue, { color: '#ef4444' }]}>
                    {formatCentsBRL(item.amount)}
                  </Text>
                </View>
                <HorizontalBar 
                  value={item.amount} 
                  maxValue={chartData.expenseByCategory[0]?.amount || 1} 
                  color="#ef4444" 
                />
              </View>
            ))}
          </View>
        )}

        {/* Resumo Mensal */}
        {chartData && chartData.monthlyData.length > 0 && (
          <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.chartTitle, { color: theme.text }]}>📅 Resumo Mensal</Text>
            {chartData.monthlyData.map((item, index) => {
              const balance = item.income - item.expense;
              const monthName = new Date(item.month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
              return (
                <View key={index} style={[styles.monthRow, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.monthName, { color: theme.text }]}>{monthName}</Text>
                  <View style={styles.monthValues}>
                    <Text style={[styles.monthIncome, { color: '#10b981' }]}>+{formatCentsBRL(item.income)}</Text>
                    <Text style={[styles.monthExpense, { color: '#ef4444' }]}>-{formatCentsBRL(item.expense)}</Text>
                    <Text style={[styles.monthBalance, { color: balance >= 0 ? '#10b981' : '#ef4444' }]}>
                      = {formatCentsBRL(balance)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Indicadores */}
        <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.chartTitle, { color: theme.text }]}>📊 Indicadores</Text>
          
          <View style={styles.indicatorRow}>
            <Text style={[styles.indicatorLabel, { color: theme.textSecondary }]}>Média diária de receitas:</Text>
            <Text style={[styles.indicatorValue, { color: '#10b981' }]}>
              {formatCentsBRL(Math.round((chartData?.totalIncome || 0) / Math.max(chartData?.dailyData.length || 1, 1)))}
            </Text>
          </View>
          
          <View style={styles.indicatorRow}>
            <Text style={[styles.indicatorLabel, { color: theme.textSecondary }]}>Média diária de despesas:</Text>
            <Text style={[styles.indicatorValue, { color: '#ef4444' }]}>
              {formatCentsBRL(Math.round((chartData?.totalExpense || 0) / Math.max(chartData?.dailyData.length || 1, 1)))}
            </Text>
          </View>
          
          <View style={styles.indicatorRow}>
            <Text style={[styles.indicatorLabel, { color: theme.textSecondary }]}>Taxa de economia:</Text>
            <Text style={[styles.indicatorValue, { color: theme.primary }]}>
              {chartData?.totalIncome ? ((chartData.balance / chartData.totalIncome) * 100).toFixed(1) : 0}%
            </Text>
          </View>
          
          <View style={styles.indicatorRow}>
            <Text style={[styles.indicatorLabel, { color: theme.textSecondary }]}>Categorias de receita:</Text>
            <Text style={[styles.indicatorValue, { color: theme.text }]}>
              {chartData?.incomeByCategory.length || 0}
            </Text>
          </View>
          
          <View style={styles.indicatorRow}>
            <Text style={[styles.indicatorLabel, { color: theme.textSecondary }]}>Categorias de despesa:</Text>
            <Text style={[styles.indicatorValue, { color: theme.text }]}>
              {chartData?.expenseByCategory.length || 0}
            </Text>
          </View>
        </View>

        {/* Sem dados */}
        {chartData && chartData.dailyData.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Nenhum dado encontrado para o período selecionado
            </Text>
          </View>
        )}

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1, padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  periodButtons: { flexDirection: 'row', gap: 8 },
  periodBtn: { borderWidth: 2, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 },
  periodBtnText: { fontSize: 13, fontWeight: '600' },
  chartTypeButtons: { flexDirection: 'row', gap: 8 },
  chartTypeBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  chartTypeBtnText: { fontSize: 13, fontWeight: '600' },
  kpiContainer: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  kpiCard: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  kpiIcon: { fontSize: 24, marginBottom: 4 },
  kpiLabel: { fontSize: 11, marginBottom: 4 },
  kpiValue: { fontSize: 14, fontWeight: '700' },
  chartCard: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 16 },
  chartTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  categoryRow: { marginBottom: 12 },
  categoryInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  categoryName: { fontSize: 13, flex: 1, marginRight: 8 },
  categoryValue: { fontSize: 13, fontWeight: '600' },
  barContainer: { height: 8, borderRadius: 4, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 4 },
  miniChart: { marginVertical: 12 },
  miniChartBars: { flexDirection: 'row', alignItems: 'flex-end', height: 70, gap: 2 },
  miniBarWrapper: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  miniBar: { width: '80%', borderRadius: 2, minHeight: 2 },
  chartLegend: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12 },
  monthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  monthName: { fontSize: 13, fontWeight: '500', textTransform: 'capitalize' },
  monthValues: { flexDirection: 'row', gap: 8 },
  monthIncome: { fontSize: 12, fontWeight: '500' },
  monthExpense: { fontSize: 12, fontWeight: '500' },
  monthBalance: { fontSize: 12, fontWeight: '700', minWidth: 80, textAlign: 'right' },
  indicatorRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  indicatorLabel: { fontSize: 13 },
  indicatorValue: { fontSize: 14, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, textAlign: 'center' },
});
