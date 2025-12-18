import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import { useThemeCtx } from '../../theme/ThemeProvider';
import { supabase } from '../../lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { getHealthSummary, HealthStatus } from '../../repositories/health_score';
import { HealthScoreSummary } from '../../components/admin/HealthScoreCard';

export default function AdminDashboardScreen({ navigation }: any) {
  const { theme, mode } = useThemeCtx();
  const { width } = useWindowDimensions();
  const isDark = mode === 'dark';
  
  // Detectar se é web e tela larga
  const isWeb = Platform.OS === 'web';
  const isWideScreen = width >= 768;
  
  // Cores dinâmicas baseadas no tema (padronizado com theme.background)
  const colors = {
    background: theme.background,
    cardBg: theme.card,
    text: theme.text,
    textSecondary: theme.textSecondary,
    textMuted: theme.textSecondary,
    border: theme.border,
    sectionIconBg: theme.cardSecondary,
  };

  // Query para estatísticas gerais e KPIs
  // NOTA: Todas as queries excluem a empresa do sistema (FastSavorys) das métricas
  const { data: stats, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      // Total de empresas ativas (não deletadas, excluindo empresa do sistema)
      const { count: activeCompanies } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .not('name', 'ilike', '%fastsavorys%');

      // Total de empresas excluídas (excluindo empresa do sistema)
      const { count: deletedCompanies } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .not('deleted_at', 'is', null)
        .not('name', 'ilike', '%fastsavorys%');

      // Solicitações pendentes
      const { count: pendingRequests } = await supabase
        .from('company_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Solicitações aprovadas este mês
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { count: approvedThisMonth } = await supabase
        .from('company_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')
        .gte('updated_at', startOfMonth.toISOString());

      // Empresas em trial (excluindo empresa do sistema)
      const { count: trialCompanies } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'trial')
        .is('deleted_at', null)
        .not('name', 'ilike', '%fastsavorys%');

      // Empresas ativas (pagas, excluindo empresa do sistema)
      const { count: paidCompanies } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .is('deleted_at', null)
        .not('name', 'ilike', '%fastsavorys%');

      // Empresas expiradas/bloqueadas (excluindo empresa do sistema)
      const { count: expiredCompanies } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .in('status', ['expired', 'blocked'])
        .is('deleted_at', null)
        .not('name', 'ilike', '%fastsavorys%');

      // Total de solicitações aprovadas (para calcular conversão)
      const { count: totalApproved } = await supabase
        .from('company_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      // Calcular KPIs
      const totalTrialAndPaid = (trialCompanies ?? 0) + (paidCompanies ?? 0) + (expiredCompanies ?? 0);
      const conversionRate = totalTrialAndPaid > 0 
        ? ((paidCompanies ?? 0) / totalTrialAndPaid) * 100 
        : 0;
      
      // Churn Rate (empresas expiradas/bloqueadas do total)
      const churnRate = totalTrialAndPaid > 0 
        ? ((expiredCompanies ?? 0) / totalTrialAndPaid) * 100 
        : 0;

      // MRR (Monthly Recurring Revenue) - assumindo R$ 9,99/mês
      const monthlyPrice = 9.99;
      const mrr = (paidCompanies ?? 0) * monthlyPrice;

      // ARPU (Average Revenue Per User)
      const arpu = (activeCompanies ?? 0) > 0 ? mrr / (activeCompanies ?? 1) : 0;

      // LTV estimado (assumindo 12 meses de retenção média)
      const avgRetentionMonths = 12;
      const ltv = monthlyPrice * avgRetentionMonths;

      // Retenção (empresas ativas / total que já passou por trial)
      const retentionRate = (totalApproved ?? 0) > 0
        ? ((paidCompanies ?? 0) / (totalApproved ?? 1)) * 100
        : 0;

      return {
        activeCompanies: activeCompanies ?? 0,
        deletedCompanies: deletedCompanies ?? 0,
        pendingRequests: pendingRequests ?? 0,
        approvedThisMonth: approvedThisMonth ?? 0,
        trialCompanies: trialCompanies ?? 0,
        paidCompanies: paidCompanies ?? 0,
        expiredCompanies: expiredCompanies ?? 0,
        // KPIs
        conversionRate,
        churnRate,
        retentionRate,
        mrr,
        arpu,
        ltv,
      };
    },
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });

  // Query para Health Score Summary
  const { data: healthSummary } = useQuery({
    queryKey: ['admin-health-summary'],
    queryFn: getHealthSummary,
    refetchInterval: 60000, // Atualiza a cada 60 segundos
  });

  // Função auxiliar para navegação
  const navigateToTab = (tabName: string) => {
    navigation.navigate(tabName);
  };

  // Card clicável modernizado com suporte a tema
  const StatCard = ({
    title,
    value,
    subtitle,
    color,
    icon,
    onPress,
    fullWidth = false,
    valuePrefix = '',
    valueSuffix = '',
  }: {
    title: string;
    value: number | string;
    subtitle?: string;
    color: string;
    icon: string;
    onPress?: () => void;
    fullWidth?: boolean;
    valuePrefix?: string;
    valueSuffix?: string;
  }) => {
    const isClickable = !!onPress;
    const cardWidth = isWeb && isWideScreen && !fullWidth ? '48%' : '100%';
    const cardBgColor = isDark ? `${color}15` : `${color}10`;

    return (
      <TouchableOpacity
        disabled={!isClickable}
        onPress={onPress}
        activeOpacity={0.7}
        style={[
          styles.statCard,
          {
            width: cardWidth,
            backgroundColor: cardBgColor,
            borderLeftColor: color,
            borderColor: isDark ? `${color}30` : 'transparent',
            borderWidth: isDark ? 1 : 0,
            ...(isWeb && isClickable ? { cursor: 'pointer' } : {}),
          },
        ]}
      >
        <View style={styles.statCardContent}>
          <View style={styles.statCardLeft}>
            <Text style={[styles.statCardTitle, { color: colors.textSecondary }]}>{title}</Text>
            <Text style={[styles.statCardValue, { color: colors.text }]}>
              {valuePrefix}{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}{valueSuffix}
            </Text>
            {subtitle && <Text style={[styles.statCardSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>}
          </View>
          <View style={styles.statCardRight}>
            <View style={[styles.statCardIconContainer, { backgroundColor: color }]}>
              <Text style={styles.statCardIcon}>{icon}</Text>
            </View>
            {isClickable && (
              <Text style={[styles.statCardArrow, { color }]}>→</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Card de KPI compacto
  const KpiCard = ({
    title,
    value,
    target,
    color,
    icon,
    isGood,
  }: {
    title: string;
    value: string;
    target?: string;
    color: string;
    icon: string;
    isGood?: boolean;
  }) => {
    const statusColor = isGood === undefined ? color : isGood ? '#10B981' : '#EF4444';
    const cardBgColor = isDark ? `${color}15` : `${color}10`;
    
    return (
      <View style={[
        styles.kpiCard,
        {
          backgroundColor: cardBgColor,
          borderColor: isDark ? `${color}30` : 'transparent',
          borderWidth: isDark ? 1 : 0,
        }
      ]}>
        <View style={styles.kpiHeader}>
          <Text style={styles.kpiIcon}>{icon}</Text>
          <Text style={[styles.kpiTitle, { color: colors.textSecondary }]}>{title}</Text>
        </View>
        <Text style={[styles.kpiValue, { color: statusColor }]}>{value}</Text>
        {target && (
          <Text style={[styles.kpiTarget, { color: colors.textMuted }]}>Meta: {target}</Text>
        )}
      </View>
    );
  };

  // Botão de ação rápida com suporte a tema
  const QuickActionButton = ({
    title,
    icon,
    color,
    onPress,
  }: {
    title: string;
    icon: string;
    color: string;
    onPress: () => void;
  }) => {
    const bgColor = isDark ? `${color}15` : `${color}10`;
    
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={[
          styles.quickActionButton,
          {
            backgroundColor: bgColor,
            borderColor: isDark ? `${color}30` : 'transparent',
            borderWidth: isDark ? 1 : 0,
            ...(isWeb ? { cursor: 'pointer' } : {}),
          },
        ]}
      >
        <View style={[styles.quickActionIconContainer, { backgroundColor: color }]}>
          <Text style={styles.quickActionIcon}>{icon}</Text>
        </View>
        <Text style={[styles.quickActionTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.quickActionArrow, { color }]}>→</Text>
      </TouchableOpacity>
    );
  };

  // Título de seção com suporte a tema
  const SectionHeader = ({ icon, title }: { icon: string; title: string }) => (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconContainer, { backgroundColor: colors.sectionIconBg }]}>
        <Text style={styles.sectionIcon}>{icon}</Text>
      </View>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando estatísticas...</Text>
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Painel Administrativo</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Visão geral do sistema Fast Cash Flow
        </Text>
      </View>

      {/* Seção: Solicitações */}
      <View style={styles.section}>
        <SectionHeader icon="📋" title="SOLICITAÇÕES" />
        <View style={[styles.cardsGrid, isWeb && isWideScreen && styles.cardsGridWide]}>
          <StatCard
            title="Pendentes"
            value={stats?.pendingRequests ?? 0}
            subtitle="Aguardando aprovação"
            color="#F59E0B"
            icon="⏳"
            onPress={() => navigateToTab('Solicitações')}
          />
          <StatCard
            title="Aprovadas este mês"
            value={stats?.approvedThisMonth ?? 0}
            subtitle="Novas empresas"
            color="#10B981"
            icon="✅"
            onPress={() => navigateToTab('Solicitações')}
          />
        </View>
      </View>

      {/* Seção: Empresas */}
      <View style={styles.section}>
        <SectionHeader icon="🏢" title="EMPRESAS" />
        <View style={[styles.cardsGrid, isWeb && isWideScreen && styles.cardsGridWide]}>
          <StatCard
            title="Total de empresas"
            value={stats?.activeCompanies ?? 0}
            subtitle="Clique para ver todas"
            color="#3B82F6"
            icon="🏢"
            onPress={() => navigateToTab('Empresas')}
          />
          <StatCard
            title="Empresas excluídas"
            value={stats?.deletedCompanies ?? 0}
            subtitle="Soft delete (90 dias)"
            color="#EF4444"
            icon="🗑️"
            onPress={() => navigateToTab('Empresas')}
          />
        </View>
      </View>

      {/* Seção: Status de Assinaturas */}
      <View style={styles.section}>
        <SectionHeader icon="💳" title="STATUS DE ASSINATURAS" />
        <View style={[styles.cardsGrid, isWeb && isWideScreen && styles.cardsGridWide]}>
          <StatCard
            title="Em período trial"
            value={stats?.trialCompanies ?? 0}
            subtitle="Teste gratuito"
            color="#8B5CF6"
            icon="🎁"
            onPress={() => navigateToTab('Empresas')}
          />
          <StatCard
            title="Assinaturas ativas"
            value={stats?.paidCompanies ?? 0}
            subtitle="Pagando mensalmente"
            color="#10B981"
            icon="💰"
            onPress={() => navigateToTab('Empresas')}
          />
        </View>
        <View style={styles.singleCardContainer}>
          <StatCard
            title="Expiradas/Bloqueadas"
            value={stats?.expiredCompanies ?? 0}
            subtitle="Requerem renovação"
            color="#EF4444"
            icon="🔒"
            onPress={() => navigateToTab('Empresas')}
            fullWidth
          />
        </View>
      </View>

      {/* Seção: Saúde dos Clientes */}
      {healthSummary && (
        <View style={styles.section}>
          <SectionHeader icon="🏥" title="SAÚDE DOS CLIENTES" />
          <HealthScoreSummary 
            summary={healthSummary}
            onFilterClick={(status) => {
              navigation.navigate('Engajamento', { filterStatus: status });
            }}
          />
          <View style={[styles.cardsGrid, isWeb && isWideScreen && styles.cardsGridWide]}>
            <StatCard
              title="Precisam de Atenção"
              value={healthSummary.needsAttention}
              subtitle="Empresas em risco"
              color="#F59E0B"
              icon="⚠️"
              onPress={() => navigation.navigate('Engajamento')}
            />
            <StatCard
              title="Score Médio"
              value={healthSummary.avgScore}
              subtitle={healthSummary.avgScore >= 70 ? 'Saudável' : healthSummary.avgScore >= 40 ? 'Atenção' : 'Crítico'}
              color={healthSummary.avgScore >= 70 ? '#10B981' : healthSummary.avgScore >= 40 ? '#F59E0B' : '#EF4444'}
              icon="📊"
              onPress={() => navigation.navigate('Engajamento')}
            />
          </View>
        </View>
      )}

      {/* Seção: KPIs de Negócio */}
      <View style={styles.section}>
        <SectionHeader icon="📊" title="KPIs DE NEGÓCIO" />
        <View style={styles.kpisGrid}>
          <KpiCard
            title="Taxa de Conversão"
            value={`${(stats?.conversionRate ?? 0).toFixed(1)}%`}
            target="30-40%"
            color="#3B82F6"
            icon="📈"
            isGood={(stats?.conversionRate ?? 0) >= 30}
          />
          <KpiCard
            title="Taxa de Retenção"
            value={`${(stats?.retentionRate ?? 0).toFixed(1)}%`}
            target="80%+"
            color="#10B981"
            icon="🔄"
            isGood={(stats?.retentionRate ?? 0) >= 80}
          />
          <KpiCard
            title="Churn Rate"
            value={`${(stats?.churnRate ?? 0).toFixed(1)}%`}
            target="<10%"
            color="#EF4444"
            icon="📉"
            isGood={(stats?.churnRate ?? 0) < 10}
          />
          <KpiCard
            title="MRR"
            value={`R$ ${(stats?.mrr ?? 0).toFixed(2)}`}
            color="#8B5CF6"
            icon="💰"
          />
          <KpiCard
            title="ARPU"
            value={`R$ ${(stats?.arpu ?? 0).toFixed(2)}`}
            color="#F59E0B"
            icon="👤"
          />
          <KpiCard
            title="LTV Estimado"
            value={`R$ ${(stats?.ltv ?? 0).toFixed(2)}`}
            color="#14B8A6"
            icon="💎"
          />
        </View>
      </View>

      {/* Seção: Ações Rápidas */}
      <View style={styles.section}>
        <SectionHeader icon="⚡" title="AÇÕES RÁPIDAS" />
        <View style={styles.quickActionsGrid}>
          <QuickActionButton
            title="Analytics"
            icon="📈"
            color="#3B82F6"
            onPress={() => navigateToTab('Analytics')}
          />
          <QuickActionButton
            title="Configurações"
            icon="⚙️"
            color="#6366F1"
            onPress={() => navigateToTab('Configuração')}
          />
          <QuickActionButton
            title="Relatórios"
            icon="📊"
            color="#EC4899"
            onPress={() => navigateToTab('Relatórios')}
          />
          <QuickActionButton
            title="Comunicados"
            icon="📢"
            color="#8B5CF6"
            onPress={() => navigateToTab('Comunicados')}
          />
        </View>
      </View>

      {/* Dica */}
      <View style={[styles.tipContainer, { backgroundColor: isDark ? '#374151' : '#1F2937' }]}>
        <Text style={styles.tipText}>
          💡 Dica: Clique nos cards para navegar rapidamente entre as seções
        </Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
    color: '#6B7280',
    fontSize: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconContainer: {
    backgroundColor: '#E5E7EB',
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  sectionIcon: {
    fontSize: 18,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
  },
  cardsGrid: {
    gap: 12,
  },
  cardsGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  singleCardContainer: {
    marginTop: 12,
  },
  statCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 0,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statCardLeft: {
    flex: 1,
  },
  statCardTitle: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  statCardValue: {
    color: '#111827',
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 4,
  },
  statCardSubtitle: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 16,
  },
  statCardRight: {
    alignItems: 'center',
    marginLeft: 12,
  },
  statCardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  statCardIcon: {
    fontSize: 24,
  },
  statCardArrow: {
    fontSize: 20,
    fontWeight: '700',
  },
  quickActionsGrid: {
    gap: 12,
  },
  kpisGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    minWidth: '30%',
    borderRadius: 12,
    padding: 16,
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  kpiTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  kpiTarget: {
    fontSize: 10,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 0,
  },
  quickActionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quickActionIcon: {
    fontSize: 20,
  },
  quickActionTitle: {
    flex: 1,
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },
  quickActionArrow: {
    fontSize: 18,
    fontWeight: '700',
  },
  tipContainer: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  tipText: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
  },
});
