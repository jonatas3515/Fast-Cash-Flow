import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useThemeCtx } from '../../theme/ThemeProvider';
import { supabase } from '../../lib/supabase';
import { useQuery } from '@tanstack/react-query';

interface MRRData {
  mrr_cents: number;
  active_count: number;
  trial_count: number;
  monthly_price: number;
}

interface Projection {
  month_offset: number;
  projected_mrr_cents: number;
  projected_active: number;
  projected_new: number;
  projected_churn: number;
}

export default function AdminFinanceScreen({ navigation }: any) {
  const { theme, mode } = useThemeCtx();
  const { width } = useWindowDimensions();
  const isDark = mode === 'dark';
  const isWideScreen = width >= 768;

  // Cores dinâmicas
  const colors = {
    background: theme.background,
    cardBg: theme.card,
    text: theme.text,
    textSecondary: theme.textSecondary,
    border: theme.border,
    primary: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
  };

  // Query para MRR atual
  const { data: mrrData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin-mrr'],
    queryFn: async () => {
      // Buscar empresas ativas e em trial
      const { data: companies } = await supabase
        .from('companies')
        .select('id, status')
        .is('deleted_at', null);

      const activeCount = companies?.filter(c => c.status === 'active').length || 0;
      const trialCount = companies?.filter(c => c.status === 'trial').length || 0;
      const expiredCount = companies?.filter(c => c.status === 'expired' || c.status === 'blocked').length || 0;

      // Preço mensal em centavos (R$ 9,99)
      const monthlyPrice = 999;
      const mrrCents = activeCount * monthlyPrice;

      return {
        mrr_cents: mrrCents,
        active_count: activeCount,
        trial_count: trialCount,
        expired_count: expiredCount,
        monthly_price: monthlyPrice,
      };
    },
  });

  // Query para histórico de MRR (simulado)
  const { data: mrrHistory } = useQuery({
    queryKey: ['admin-mrr-history'],
    queryFn: async () => {
      // Simular histórico dos últimos 6 meses
      const months = [];
      const now = new Date();
      const baseActive = (mrrData?.active_count || 10);
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        // Simular crescimento
        const factor = 1 - (i * 0.15);
        const active = Math.floor(baseActive * factor);
        months.push({
          month: monthName,
          active,
          mrr: active * 999,
          growth: i === 0 ? 0 : Math.floor((1 - factor) * 100),
        });
      }
      return months;
    },
    enabled: !!mrrData,
  });

  // Projeções
  const projections = React.useMemo(() => {
    if (!mrrData) return [];
    
    const conversionRate = 0.30; // 30% de conversão
    const churnRate = 0.05; // 5% de churn
    
    let active = mrrData.active_count;
    const trial = mrrData.trial_count;
    const monthlyPrice = mrrData.monthly_price;
    
    const result: Projection[] = [];
    
    for (let i = 1; i <= 3; i++) {
      const newCustomers = Math.floor(trial * conversionRate);
      const churned = Math.floor(active * churnRate);
      active = active + newCustomers - churned;
      
      result.push({
        month_offset: i,
        projected_mrr_cents: active * monthlyPrice,
        projected_active: active,
        projected_new: newCustomers,
        projected_churn: churned,
      });
    }
    
    return result;
  }, [mrrData]);

  // Formatar valor em reais
  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Obter nome do mês
  const getMonthName = (offset: number) => {
    const date = new Date();
    date.setMonth(date.getMonth() + offset);
    return date.toLocaleDateString('pt-BR', { month: 'long' });
  };

  // Card de métrica
  const MetricCard = ({ title, value, subtitle, color, icon }: any) => (
    <View style={[styles.metricCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
      <View style={[styles.metricIcon, { backgroundColor: color + '20' }]}>
        <Text style={styles.metricIconText}>{icon}</Text>
      </View>
      <Text style={[styles.metricTitle, { color: colors.textSecondary }]}>{title}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      {subtitle && (
        <Text style={[styles.metricSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            💰 Gestão Financeira
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Previsão de receita e métricas do negócio
          </Text>
        </View>

        {/* MRR Atual */}
        <View style={[styles.mrrCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.mrrLabel}>MRR ATUAL</Text>
          <Text style={styles.mrrValue}>
            {formatCurrency(mrrData?.mrr_cents || 0)}
          </Text>
          <Text style={styles.mrrDetail}>
            {mrrData?.active_count || 0} empresas ativas × R$ 9,99
          </Text>
        </View>

        {/* Métricas Rápidas */}
        <View style={[styles.metricsGrid, isWideScreen && styles.metricsGridWide]}>
          <MetricCard
            title="Empresas Ativas"
            value={mrrData?.active_count || 0}
            subtitle="Pagantes"
            color={colors.success}
            icon="✅"
          />
          <MetricCard
            title="Em Trial"
            value={mrrData?.trial_count || 0}
            subtitle="Potenciais"
            color={colors.primary}
            icon="⏳"
          />
          <MetricCard
            title="MRR Potencial"
            value={formatCurrency((mrrData?.trial_count || 0) * 999 * 0.3)}
            subtitle="30% conversão"
            color={colors.warning}
            icon="🎯"
          />
          <MetricCard
            title="Churn Estimado"
            value={formatCurrency((mrrData?.active_count || 0) * 999 * 0.05)}
            subtitle="5% mensal"
            color={colors.danger}
            icon="📉"
          />
        </View>

        {/* Projeção de Receita */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            📈 Projeção de Receita
          </Text>
          <View style={[styles.projectionCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            {projections.map((proj, index) => (
              <View 
                key={index} 
                style={[
                  styles.projectionRow,
                  index < projections.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }
                ]}
              >
                <View style={styles.projectionMonth}>
                  <Text style={[styles.projectionMonthName, { color: colors.text }]}>
                    {getMonthName(proj.month_offset)}
                  </Text>
                  <Text style={[styles.projectionDetail, { color: colors.textSecondary }]}>
                    {proj.projected_active} empresas
                  </Text>
                </View>
                <View style={styles.projectionValues}>
                  <Text style={[styles.projectionMrr, { color: colors.success }]}>
                    {formatCurrency(proj.projected_mrr_cents)}
                  </Text>
                  <View style={styles.projectionChanges}>
                    <Text style={[styles.projectionNew, { color: colors.success }]}>
                      +{proj.projected_new} novos
                    </Text>
                    <Text style={[styles.projectionChurn, { color: colors.danger }]}>
                      -{proj.projected_churn} churn
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Histórico */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            📊 Histórico de Crescimento
          </Text>
          <View style={[styles.historyCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            {mrrHistory?.map((month: any, index: number) => (
              <View 
                key={index}
                style={[
                  styles.historyRow,
                  index < mrrHistory.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }
                ]}
              >
                <Text style={[styles.historyMonth, { color: colors.text }]}>
                  {month.month}
                </Text>
                <View style={styles.historyBar}>
                  <View 
                    style={[
                      styles.historyBarFill,
                      { 
                        backgroundColor: colors.primary,
                        width: `${Math.min(100, (month.active / (mrrData?.active_count || 1)) * 100)}%`
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.historyValue, { color: colors.text }]}>
                  {formatCurrency(month.mrr)}
                </Text>
                {month.growth > 0 && (
                  <Text style={[styles.historyGrowth, { color: colors.success }]}>
                    +{month.growth}%
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Ações Rápidas */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            ⚡ Ações Rápidas
          </Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.warning + '20', borderColor: colors.warning }]}
              onPress={() => navigation.navigate('Inadimplência')}
            >
              <Text style={styles.actionIcon}>🔴</Text>
              <Text style={[styles.actionLabel, { color: colors.text }]}>Inadimplentes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
              onPress={() => navigation.navigate('Cupons')}
            >
              <Text style={styles.actionIcon}>🎟️</Text>
              <Text style={[styles.actionLabel, { color: colors.text }]}>Cupons</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.success + '20', borderColor: colors.success }]}
              onPress={() => navigation.navigate('Conversão')}
            >
              <Text style={styles.actionIcon}>🎯</Text>
              <Text style={[styles.actionLabel, { color: colors.text }]}>Conversão</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  mrrCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  mrrLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  mrrValue: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
    marginVertical: 8,
  },
  mrrDetail: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  metricsGridWide: {
    flexWrap: 'nowrap',
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricIconText: {
    fontSize: 18,
  },
  metricTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  metricSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  projectionCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  projectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  projectionMonth: {},
  projectionMonthName: {
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  projectionDetail: {
    fontSize: 12,
    marginTop: 2,
  },
  projectionValues: {
    alignItems: 'flex-end',
  },
  projectionMrr: {
    fontSize: 18,
    fontWeight: '800',
  },
  projectionChanges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  projectionNew: {
    fontSize: 11,
    fontWeight: '600',
  },
  projectionChurn: {
    fontSize: 11,
    fontWeight: '600',
  },
  historyCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  historyMonth: {
    width: 60,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  historyBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  historyBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  historyValue: {
    width: 80,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  historyGrowth: {
    width: 40,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
});
