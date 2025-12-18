import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
  useWindowDimensions,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useThemeCtx } from '../../theme/ThemeProvider';
import { supabase } from '../../lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { getBenchmarksByBusinessType, getAggregatedInsights, BusinessTypeBenchmark } from '../../repositories/benchmarks';

interface CompanyAnalytics {
  company_id: string;
  company_name: string;
  subscription_status: string;
  trial_end: string | null;
  last_access: string | null;
  days_since_last_access: number;
  access_count_week: number;
  access_count_month: number;
  total_transactions: number;
  transactions_this_week: number;
  health_score: number;
  health_status: 'saudavel' | 'morno' | 'risco';
  health_indicator: string;
}

export default function AdminAnalyticsScreen({ navigation }: any) {
  const { theme, mode } = useThemeCtx();
  const { width } = useWindowDimensions();
  const isDark = mode === 'dark';
  const isWeb = Platform.OS === 'web';
  const isWideScreen = width >= 768;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'saudavel' | 'morno' | 'risco'>('all');

  // Cores dinâmicas baseadas no tema
  const colors = {
    background: theme.background,
    cardBg: theme.card,
    text: theme.text,
    textSecondary: theme.textSecondary,
    textMuted: theme.textSecondary,
    border: theme.border,
    inputBg: theme.cardSecondary,
  };

  // Query para buscar analytics das empresas
  const { data: analytics, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin-company-analytics'],
    queryFn: async () => {
      // Buscar empresas com suas métricas
      const { data: companies, error } = await supabase
        .from('companies')
        .select(`
          id,
          name,
          status,
          trial_end,
          created_at
        `)
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;

      // Para cada empresa, calcular métricas básicas
      const analyticsData: CompanyAnalytics[] = await Promise.all(
        (companies || []).map(async (company) => {
          // Contar transações
          const { count: totalTransactions } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id);

          // Transações esta semana
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          const { count: transactionsWeek } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id)
            .gte('created_at', weekAgo.toISOString());

          // Calcular Health Score baseado em métricas disponíveis
          const daysSinceCreation = Math.floor(
            (Date.now() - new Date(company.created_at).getTime()) / (1000 * 60 * 60 * 24)
          );
          
          // Score baseado em atividade
          let healthScore = 50;
          
          // Fator: Transações na semana (máx 40 pontos)
          if ((transactionsWeek ?? 0) >= 10) healthScore += 40;
          else if ((transactionsWeek ?? 0) >= 5) healthScore += 30;
          else if ((transactionsWeek ?? 0) >= 1) healthScore += 15;
          
          // Fator: Total de transações (máx 30 pontos)
          if ((totalTransactions ?? 0) >= 100) healthScore += 30;
          else if ((totalTransactions ?? 0) >= 50) healthScore += 20;
          else if ((totalTransactions ?? 0) >= 10) healthScore += 10;
          
          // Fator: Status da assinatura (máx 20 pontos)
          if (company.status === 'active') healthScore += 20;
          else if (company.status === 'trial') healthScore += 10;
          
          // Limitar entre 0 e 100
          healthScore = Math.max(0, Math.min(100, healthScore));
          
          // Determinar status
          let healthStatus: 'saudavel' | 'morno' | 'risco' = 'morno';
          let healthIndicator = '🟡';
          
          if (healthScore >= 80) {
            healthStatus = 'saudavel';
            healthIndicator = '🟢';
          } else if (healthScore < 50) {
            healthStatus = 'risco';
            healthIndicator = '🔴';
          }

          return {
            company_id: company.id,
            company_name: company.name,
            subscription_status: company.status,
            trial_end: company.trial_end,
            last_access: null, // Será implementado com a tabela de logs
            days_since_last_access: 0,
            access_count_week: 0,
            access_count_month: 0,
            total_transactions: totalTransactions ?? 0,
            transactions_this_week: transactionsWeek ?? 0,
            health_score: healthScore,
            health_status: healthStatus,
            health_indicator: healthIndicator,
          };
        })
      );

      return analyticsData;
    },
    refetchInterval: 60000, // Atualiza a cada minuto
  });

  // Query para benchmarks por tipo de negócio
  const { data: benchmarks } = useQuery({
    queryKey: ['admin-benchmarks'],
    queryFn: getBenchmarksByBusinessType,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Query para insights agregados
  const { data: insights } = useQuery({
    queryKey: ['admin-insights'],
    queryFn: getAggregatedInsights,
    staleTime: 1000 * 60 * 5,
  });

  // Filtrar empresas
  const filteredAnalytics = (analytics || []).filter((item) => {
    const matchesSearch = item.company_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || item.health_status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Estatísticas gerais
  const totalCompanies = analytics?.length ?? 0;
  const healthyCompanies = analytics?.filter(a => a.health_status === 'saudavel').length ?? 0;
  const warmCompanies = analytics?.filter(a => a.health_status === 'morno').length ?? 0;
  const riskCompanies = analytics?.filter(a => a.health_status === 'risco').length ?? 0;
  const avgHealthScore = totalCompanies > 0 
    ? Math.round((analytics?.reduce((sum, a) => sum + a.health_score, 0) ?? 0) / totalCompanies)
    : 0;

  // Card de resumo
  const SummaryCard = ({ 
    title, 
    value, 
    color, 
    icon 
  }: { 
    title: string; 
    value: number | string; 
    color: string; 
    icon: string;
  }) => (
    <View style={[
      styles.summaryCard,
      { 
        backgroundColor: isDark ? `${color}20` : `${color}10`,
        borderColor: isDark ? `${color}40` : 'transparent',
        borderWidth: isDark ? 1 : 0,
      }
    ]}>
      <Text style={styles.summaryIcon}>{icon}</Text>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={[styles.summaryTitle, { color: colors.textSecondary }]}>{title}</Text>
    </View>
  );

  // Card de empresa
  const CompanyCard = ({ item }: { item: CompanyAnalytics }) => {
    const statusColors = {
      active: '#10B981',
      trial: '#3B82F6',
      expired: '#EF4444',
      blocked: '#EF4444',
    };
    const statusColor = statusColors[item.subscription_status as keyof typeof statusColors] || '#6B7280';
    
    return (
      <TouchableOpacity
        style={[
          styles.companyCard,
          { 
            backgroundColor: colors.cardBg,
            borderColor: colors.border,
          }
        ]}
        onPress={() => navigation.navigate('Empresas', { companyId: item.company_id })}
        activeOpacity={0.7}
      >
        <View style={styles.companyHeader}>
          <View style={styles.companyInfo}>
            <Text style={styles.healthIndicator}>{item.health_indicator}</Text>
            <View>
              <Text style={[styles.companyName, { color: colors.text }]}>{item.company_name}</Text>
              <View style={styles.statusBadge}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                  {item.subscription_status === 'active' ? 'Ativo' : 
                   item.subscription_status === 'trial' ? 'Trial' : 
                   item.subscription_status === 'expired' ? 'Expirado' : 'Bloqueado'}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.healthScoreContainer}>
            <Text style={[
              styles.healthScoreValue,
              { 
                color: item.health_score >= 80 ? '#10B981' : 
                       item.health_score >= 50 ? '#F59E0B' : '#EF4444'
              }
            ]}>
              {item.health_score}
            </Text>
            <Text style={[styles.healthScoreLabel, { color: colors.textMuted }]}>Score</Text>
          </View>
        </View>
        
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: colors.text }]}>{item.total_transactions}</Text>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Transações</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: colors.text }]}>{item.transactions_this_week}</Text>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Esta semana</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: colors.text }]}>
              {item.days_since_last_access === 0 ? 'Hoje' : `${item.days_since_last_access}d`}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Último acesso</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Botão de filtro
  const FilterButton = ({ 
    label, 
    value, 
    count,
    color,
  }: { 
    label: string; 
    value: typeof filterStatus; 
    count: number;
    color: string;
  }) => {
    const isActive = filterStatus === value;
    
    return (
      <TouchableOpacity
        style={[
          styles.filterButton,
          { 
            backgroundColor: isActive ? color : isDark ? '#374151' : '#F3F4F6',
            borderColor: isActive ? color : colors.border,
          }
        ]}
        onPress={() => setFilterStatus(value)}
      >
        <Text style={[
          styles.filterButtonText,
          { color: isActive ? '#FFFFFF' : colors.text }
        ]}>
          {label} ({count})
        </Text>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Carregando analytics...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.contentContainer,
        isWeb && isWideScreen && styles.contentContainerWide,
      ]}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => refetch()}
          tintColor="#3B82F6"
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          📈 Analytics de Empresas
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Métricas de uso e Health Score dos clientes
        </Text>
      </View>

      {/* Resumo */}
      <View style={styles.summaryGrid}>
        <SummaryCard title="Total" value={totalCompanies} color="#3B82F6" icon="🏢" />
        <SummaryCard title="Saudáveis" value={healthyCompanies} color="#10B981" icon="🟢" />
        <SummaryCard title="Mornos" value={warmCompanies} color="#F59E0B" icon="🟡" />
        <SummaryCard title="Em Risco" value={riskCompanies} color="#EF4444" icon="🔴" />
      </View>

      {/* Health Score Médio */}
      <View style={[styles.avgScoreCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <Text style={[styles.avgScoreLabel, { color: colors.textSecondary }]}>
          Health Score Médio
        </Text>
        <Text style={[
          styles.avgScoreValue,
          { 
            color: avgHealthScore >= 80 ? '#10B981' : 
                   avgHealthScore >= 50 ? '#F59E0B' : '#EF4444'
          }
        ]}>
          {avgHealthScore}/100
        </Text>
        <View style={styles.scoreBar}>
          <View 
            style={[
              styles.scoreBarFill,
              { 
                width: `${avgHealthScore}%`,
                backgroundColor: avgHealthScore >= 80 ? '#10B981' : 
                                 avgHealthScore >= 50 ? '#F59E0B' : '#EF4444'
              }
            ]} 
          />
        </View>
      </View>

      {/* Benchmarks por Tipo de Negócio */}
      {benchmarks && benchmarks.length > 0 && (
        <View style={[styles.benchmarksSection, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            📊 Benchmarks por Segmento
          </Text>
          {benchmarks.map((benchmark) => (
            <View key={benchmark.businessType} style={styles.benchmarkCard}>
              <View style={styles.benchmarkHeader}>
                <Text style={[styles.benchmarkType, { color: colors.text }]}>
                  {benchmark.businessType}
                </Text>
                <Text style={[styles.benchmarkCount, { color: colors.textSecondary }]}>
                  {benchmark.companyCount} empresas
                </Text>
              </View>
              <View style={styles.benchmarkMetrics}>
                <View style={styles.benchmarkMetric}>
                  <Text style={[styles.benchmarkValue, { color: '#10B981' }]}>
                    R$ {(benchmark.avgMonthlyRevenue / 100).toFixed(0)}
                  </Text>
                  <Text style={[styles.benchmarkLabel, { color: colors.textMuted }]}>Receita média</Text>
                </View>
                <View style={styles.benchmarkMetric}>
                  <Text style={[styles.benchmarkValue, { color: '#3B82F6' }]}>
                    {benchmark.avgGoalCompletionRate}%
                  </Text>
                  <Text style={[styles.benchmarkLabel, { color: colors.textMuted }]}>Metas batidas</Text>
                </View>
                <View style={styles.benchmarkMetric}>
                  <Text style={[styles.benchmarkValue, { color: '#8B5CF6' }]}>
                    {benchmark.avgTransactionsPerMonth}
                  </Text>
                  <Text style={[styles.benchmarkLabel, { color: colors.textMuted }]}>Tx/mês</Text>
                </View>
              </View>
              {benchmark.insights.length > 0 && (
                <View style={styles.benchmarkInsights}>
                  {benchmark.insights.slice(0, 2).map((insight, i) => (
                    <Text key={i} style={[styles.insightText, { color: colors.textSecondary }]}>
                      💡 {insight}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Insights Agregados */}
      {insights && insights.length > 0 && (
        <View style={[styles.insightsSection, { backgroundColor: '#DBEAFE' }]}>
          <Text style={[styles.sectionTitle, { color: '#1E40AF' }]}>
            🔍 Padrões Identificados
          </Text>
          {insights.slice(0, 5).map((insight) => (
            <View key={insight.id} style={styles.insightCard}>
              <Text style={[styles.insightTitle, { color: '#1E40AF' }]}>
                {insight.title}
              </Text>
              <Text style={[styles.insightDesc, { color: '#1E40AF' }]}>
                {insight.description}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Busca e Filtros */}
      <View style={styles.filtersSection}>
        <TextInput
          style={[
            styles.searchInput,
            { 
              backgroundColor: colors.inputBg,
              color: colors.text,
              borderColor: colors.border,
            }
          ]}
          placeholder="Buscar empresa..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filtersRow}
        >
          <FilterButton label="Todas" value="all" count={totalCompanies} color="#3B82F6" />
          <FilterButton label="Saudáveis" value="saudavel" count={healthyCompanies} color="#10B981" />
          <FilterButton label="Mornos" value="morno" count={warmCompanies} color="#F59E0B" />
          <FilterButton label="Em Risco" value="risco" count={riskCompanies} color="#EF4444" />
        </ScrollView>
      </View>

      {/* Lista de Empresas */}
      <View style={styles.companiesList}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Empresas ({filteredAnalytics.length})
        </Text>
        
        {filteredAnalytics.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
              Nenhuma empresa encontrada
            </Text>
          </View>
        ) : (
          filteredAnalytics.map((item) => (
            <CompanyCard key={item.company_id} item={item} />
          ))
        )}
      </View>

      {/* Legenda */}
      <View style={[styles.legendCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <Text style={[styles.legendTitle, { color: colors.text }]}>🩺 Health Score</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <Text style={styles.legendIcon}>🟢</Text>
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>
              80-100: Cliente saudável (usa frequentemente)
            </Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={styles.legendIcon}>🟡</Text>
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>
              50-79: Cliente morno (uso irregular)
            </Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={styles.legendIcon}>🔴</Text>
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>
              0-49: Cliente em risco (não usa há dias)
            </Text>
          </View>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  contentContainerWide: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    minWidth: '22%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  summaryIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  avgScoreCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  avgScoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  avgScoreValue: {
    fontSize: 48,
    fontWeight: '800',
    marginBottom: 12,
  },
  scoreBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  filtersSection: {
    marginBottom: 20,
  },
  searchInput: {
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    marginBottom: 12,
  },
  filtersRow: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  companiesList: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  companyCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  companyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  healthIndicator: {
    fontSize: 24,
    marginRight: 12,
  },
  companyName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
  },
  healthScoreContainer: {
    alignItems: 'center',
  },
  healthScoreValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  healthScoreLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  emptyState: {
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
  },
  legendCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  legendItems: {
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  legendText: {
    fontSize: 13,
    flex: 1,
  },
  benchmarksSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  benchmarkCard: {
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  benchmarkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  benchmarkType: {
    fontSize: 14,
    fontWeight: '700',
  },
  benchmarkCount: {
    fontSize: 11,
  },
  benchmarkMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  benchmarkMetric: {
    alignItems: 'center',
  },
  benchmarkValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  benchmarkLabel: {
    fontSize: 9,
    marginTop: 2,
  },
  benchmarkInsights: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  insightText: {
    fontSize: 11,
    marginBottom: 4,
  },
  insightsSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  insightCard: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  insightDesc: {
    fontSize: 11,
    lineHeight: 16,
  },
});
