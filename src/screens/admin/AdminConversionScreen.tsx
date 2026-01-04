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
  Switch,
} from 'react-native';
import { useThemeCtx } from '../../theme/ThemeProvider';
import { supabase } from '../../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface ConversionMetrics {
  totalTrials: number;
  activeTrials: number;
  convertedTrials: number;
  expiredTrials: number;
  conversionRate: number;
  avgDaysToConvert: number;
  onboardingCompletionRate: number;
  trialExpiringIn5Days: number;
}

interface OnboardingStats {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  avgCompletion: number;
}

export default function AdminConversionScreen({ navigation }: any) {
  const { theme, mode } = useThemeCtx();
  const { width } = useWindowDimensions();
  const isDark = mode === 'dark';
  const isWeb = Platform.OS === 'web';
  const isWideScreen = width >= 768;
  const queryClient = useQueryClient();

  // Cores dinâmicas baseadas no tema
  const colors = {
    background: theme.background,
    cardBg: theme.card,
    text: theme.text,
    textSecondary: theme.textSecondary,
    textMuted: theme.textSecondary,
    border: theme.border,
  };

  // Query para métricas de conversão
  const { data: metrics, isLoading, refetch, isRefetching, error } = useQuery({
    queryKey: ['admin-conversion-metrics'],
    queryFn: async () => {
      try {
        // Total de empresas que já passaram por trial
        const { count: totalTrials } = await supabase
          .from('companies')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null);

        // Empresas em trial ativo
        const { count: activeTrials } = await supabase
          .from('companies')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'trial')
          .is('deleted_at', null);

        // Empresas convertidas (status active)
        const { count: convertedTrials } = await supabase
          .from('companies')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
          .is('deleted_at', null);

        // Empresas com trial expirado
        const { count: expiredTrials } = await supabase
          .from('companies')
          .select('*', { count: 'exact', head: true })
          .in('status', ['expired', 'blocked'])
          .is('deleted_at', null);

        // Empresas com trial expirando em 5 dias
        const fiveDaysFromNow = new Date();
        fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

        const { count: expiringIn5Days } = await supabase
          .from('companies')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'trial')
          .is('deleted_at', null)
          .lte('trial_end', fiveDaysFromNow.toISOString())
          .gte('trial_end', new Date().toISOString());

        // Calcular taxa de conversão
        const total = (totalTrials ?? 0);
        const converted = (convertedTrials ?? 0);
        const conversionRate = total > 0 ? (converted / total) * 100 : 0;

        // Buscar estatísticas de onboarding
        const { data: onboardingData } = await supabase
          .from('onboarding_progress')
          .select('completion_percent');

        let onboardingCompletionRate = 0;
        if (onboardingData && onboardingData.length > 0) {
          const totalPercent = onboardingData.reduce((sum, item) => sum + (item.completion_percent || 0), 0);
          onboardingCompletionRate = totalPercent / onboardingData.length;
        }

        return {
          totalTrials: totalTrials ?? 0,
          activeTrials: activeTrials ?? 0,
          convertedTrials: convertedTrials ?? 0,
          expiredTrials: expiredTrials ?? 0,
          conversionRate,
          avgDaysToConvert: 15, // Placeholder - calcular baseado em dados reais
          onboardingCompletionRate,
          trialExpiringIn5Days: expiringIn5Days ?? 0,
        } as ConversionMetrics;
      } catch (error) {
        console.error('Erro ao buscar métricas de conversão:', error);
        return {
          totalTrials: 0,
          activeTrials: 0,
          convertedTrials: 0,
          expiredTrials: 0,
          conversionRate: 0,
          avgDaysToConvert: 15,
          onboardingCompletionRate: 0,
          trialExpiringIn5Days: 0,
        } as ConversionMetrics;
      }
    },
    refetchInterval: 60000,
  });

  // Query para estatísticas de onboarding
  const { data: onboardingStats } = useQuery({
    queryKey: ['admin-onboarding-stats'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('onboarding_progress')
          .select('completion_percent, completed_at');

        if (error) {
          console.warn('Tabela onboarding_progress não disponível:', error.message);
          return null;
        }

        if (!data || data.length === 0) return null;

        const total = data.length;
        const completed = data.filter(d => d.completed_at).length;
        const inProgress = data.filter(d => !d.completed_at && (d.completion_percent || 0) > 0).length;
        const notStarted = data.filter(d => (d.completion_percent || 0) === 0).length;
        const avgCompletion = total > 0
          ? data.reduce((sum, d) => sum + (d.completion_percent || 0), 0) / total
          : 0;

        return {
          total,
          completed,
          inProgress,
          notStarted,
          avgCompletion,
        } as OnboardingStats;
      } catch (error) {
        console.error('Erro ao buscar estatísticas de onboarding:', error);
        return null;
      }
    },
  });

  // Query para empresas em risco (trial expirando)
  const { data: atRiskCompanies } = useQuery({
    queryKey: ['admin-at-risk-companies'],
    queryFn: async () => {
      const fiveDaysFromNow = new Date();
      fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

      const { data } = await supabase
        .from('companies')
        .select('id, name, status, trial_end, created_at')
        .eq('status', 'trial')
        .is('deleted_at', null)
        .lte('trial_end', fiveDaysFromNow.toISOString())
        .order('trial_end', { ascending: true })
        .limit(10);

      return data || [];
    },
  });

  // Card de métrica
  const MetricCard = ({
    title,
    value,
    subtitle,
    color,
    icon,
    target,
    isGood,
  }: {
    title: string;
    value: string | number;
    subtitle?: string;
    color: string;
    icon: string;
    target?: string;
    isGood?: boolean;
  }) => {
    const bgColor = isDark ? `${color}20` : `${color}10`;
    const statusColor = isGood === undefined ? color : isGood ? '#10B981' : '#EF4444';

    return (
      <View style={[
        styles.metricCard,
        {
          backgroundColor: bgColor,
          borderColor: isDark ? `${color}40` : 'transparent',
          borderWidth: isDark ? 1 : 0,
        }
      ]}>
        <View style={styles.metricHeader}>
          <Text style={styles.metricIcon}>{icon}</Text>
          <Text style={[styles.metricTitle, { color: colors.textSecondary }]}>{title}</Text>
        </View>
        <Text style={[styles.metricValue, { color: statusColor }]}>{value}</Text>
        {subtitle && (
          <Text style={[styles.metricSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>
        )}
        {target && (
          <Text style={[styles.metricTarget, { color: colors.textMuted }]}>Meta: {target}</Text>
        )}
      </View>
    );
  };

  // Card de empresa em risco
  const AtRiskCompanyCard = ({ company }: { company: any }) => {
    const trialEnd = new Date(company.trial_end);
    const today = new Date();
    const daysLeft = Math.ceil((trialEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const urgencyColor = daysLeft <= 2 ? '#EF4444' : daysLeft <= 5 ? '#F59E0B' : '#3B82F6';

    return (
      <TouchableOpacity
        style={[styles.atRiskCard, { backgroundColor: colors.cardBg, borderColor: urgencyColor }]}
        onPress={() => navigation.navigate('Empresas', { companyId: company.id })}
      >
        <View style={styles.atRiskHeader}>
          <Text style={[styles.atRiskName, { color: colors.text }]}>{company.name}</Text>
          <View style={[styles.daysLeftBadge, { backgroundColor: urgencyColor }]}>
            <Text style={styles.daysLeftText}>
              {daysLeft <= 0 ? 'Expirado' : `${daysLeft}d`}
            </Text>
          </View>
        </View>
        <Text style={[styles.atRiskDate, { color: colors.textSecondary }]}>
          Trial termina: {trialEnd.toLocaleDateString('pt-BR')}
        </Text>
      </TouchableOpacity>
    );
  };

  // Seção Header
  const SectionHeader = ({ icon, title }: { icon: string; title: string }) => (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconContainer, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
        <Text style={styles.sectionIcon}>{icon}</Text>
      </View>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Carregando métricas...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>⚠️</Text>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
          Não foi possível carregar os dados
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 20, textAlign: 'center', paddingHorizontal: 40 }}>
          Ocorreu um erro ao buscar as métricas. Verifique sua conexão e tente novamente.
        </Text>
        <TouchableOpacity
          onPress={() => refetch()}
          style={{
            backgroundColor: '#3B82F6',
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: '#FFF', fontWeight: '700' }}>Tentar novamente</Text>
        </TouchableOpacity>
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
          🎯 Conversão Trial → Pago
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Métricas e ferramentas para aumentar conversão
        </Text>
      </View>

      {/* KPIs Principais */}
      <View style={styles.section}>
        <SectionHeader icon="📊" title="KPIs DE CONVERSÃO" />
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Taxa de Conversão"
            value={`${(metrics?.conversionRate ?? 0).toFixed(1)}%`}
            target="30-40%"
            color="#3B82F6"
            icon="📈"
            isGood={(metrics?.conversionRate ?? 0) >= 30}
          />
          <MetricCard
            title="Trials Ativos"
            value={metrics?.activeTrials ?? 0}
            subtitle="Em período de teste"
            color="#8B5CF6"
            icon="⏳"
          />
          <MetricCard
            title="Convertidos"
            value={metrics?.convertedTrials ?? 0}
            subtitle="Assinantes pagos"
            color="#10B981"
            icon="✅"
          />
          <MetricCard
            title="Expirados"
            value={metrics?.expiredTrials ?? 0}
            subtitle="Não converteram"
            color="#EF4444"
            icon="❌"
          />
        </View>
      </View>

      {/* Onboarding Stats */}
      <View style={styles.section}>
        <SectionHeader icon="📋" title="ONBOARDING" />
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Conclusão Média"
            value={`${(onboardingStats?.avgCompletion ?? 0).toFixed(0)}%`}
            target="80%+"
            color="#3B82F6"
            icon="📊"
            isGood={(onboardingStats?.avgCompletion ?? 0) >= 80}
          />
          <MetricCard
            title="Completos"
            value={onboardingStats?.completed ?? 0}
            subtitle="100% concluído"
            color="#10B981"
            icon="✅"
          />
          <MetricCard
            title="Em Progresso"
            value={onboardingStats?.inProgress ?? 0}
            subtitle="Parcialmente"
            color="#F59E0B"
            icon="🔄"
          />
          <MetricCard
            title="Não Iniciados"
            value={onboardingStats?.notStarted ?? 0}
            subtitle="0% progresso"
            color="#EF4444"
            icon="⚠️"
          />
        </View>
      </View>

      {/* Alerta de Urgência */}
      {(metrics?.trialExpiringIn5Days ?? 0) > 0 && (
        <View style={[styles.urgentAlert, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
          <Text style={styles.urgentIcon}>⚠️</Text>
          <View style={styles.urgentContent}>
            <Text style={styles.urgentTitle}>
              {metrics?.trialExpiringIn5Days} trial{(metrics?.trialExpiringIn5Days ?? 0) !== 1 ? 's' : ''} expirando em 5 dias!
            </Text>
            <Text style={styles.urgentText}>
              Entre em contato para converter antes que expirem.
            </Text>
          </View>
        </View>
      )}

      {/* Empresas em Risco */}
      <View style={styles.section}>
        <SectionHeader icon="🚨" title="TRIALS EXPIRANDO" />
        {atRiskCompanies && atRiskCompanies.length > 0 ? (
          <View style={styles.atRiskList}>
            {atRiskCompanies.map((company) => (
              <AtRiskCompanyCard key={company.id} company={company} />
            ))}
          </View>
        ) : (
          <View style={[styles.emptyState, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
              ✅ Nenhum trial expirando nos próximos 5 dias
            </Text>
          </View>
        )}
      </View>

      {/* Dicas de Conversão */}
      <View style={styles.section}>
        <SectionHeader icon="💡" title="DICAS DE CONVERSÃO" />
        <View style={[styles.tipsCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <View style={styles.tipItem}>
            <Text style={styles.tipIcon}>📧</Text>
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, { color: colors.text }]}>
                Notificações Automáticas
              </Text>
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                Envie lembretes nos dias 1, 7, 25 e 28 do trial
              </Text>
            </View>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipIcon}>🎁</Text>
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, { color: colors.text }]}>
                Ofertas Personalizadas
              </Text>
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                Ofereça descontos baseados no perfil de uso
              </Text>
            </View>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipIcon}>✅</Text>
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, { color: colors.text }]}>
                Onboarding Completo
              </Text>
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                Empresas que completam têm 3x mais chance de converter
              </Text>
            </View>
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
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconContainer: {
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
    fontSize: 18,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    padding: 16,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  metricTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 11,
  },
  metricTarget: {
    fontSize: 10,
    marginTop: 4,
  },
  urgentAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  urgentIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  urgentContent: {
    flex: 1,
  },
  urgentTitle: {
    color: '#92400E',
    fontSize: 15,
    fontWeight: '700',
  },
  urgentText: {
    color: '#B45309',
    fontSize: 13,
    marginTop: 2,
  },
  atRiskList: {
    gap: 12,
  },
  atRiskCard: {
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
  },
  atRiskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  atRiskName: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  daysLeftBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  daysLeftText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  atRiskDate: {
    fontSize: 12,
  },
  emptyState: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
  },
  tipsCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    gap: 16,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tipIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  tipText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
