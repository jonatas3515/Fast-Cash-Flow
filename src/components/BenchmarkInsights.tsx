import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useQuery } from '@tanstack/react-query';
import { getCompanyBenchmarkComparison, CompanyBenchmarkComparison } from '../repositories/benchmarks';
import { getCurrentCompanyId } from '../lib/company';

interface BenchmarkInsightsProps {
  navigation?: any;
}

export default function BenchmarkInsights({ navigation }: BenchmarkInsightsProps) {
  const { theme } = useThemeCtx();

  const { data: comparison, isLoading } = useQuery({
    queryKey: ['benchmark-comparison'],
    queryFn: async () => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return null;
      return getCompanyBenchmarkComparison(companyId);
    },
    staleTime: 1000 * 60 * 30, // 30 minutos
  });

  if (isLoading || !comparison) return null;

  // Não mostrar se não houver insights
  if (comparison.insights.length === 0 && comparison.recommendations.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.card }]}>
      <Text style={[styles.title, { color: theme.text }]}>
        📊 Como você está comparado ao mercado
      </Text>

      {/* Métricas de comparação */}
      <View style={styles.metricsRow}>
        <View style={[
          styles.metricCard, 
          { backgroundColor: comparison.revenueVsAvg >= 0 ? '#DCFCE7' : '#FEE2E2' }
        ]}>
          <Text style={styles.metricIcon}>
            {comparison.revenueVsAvg >= 0 ? '📈' : '📉'}
          </Text>
          <Text style={[
            styles.metricValue, 
            { color: comparison.revenueVsAvg >= 0 ? '#166534' : '#991B1B' }
          ]}>
            {comparison.revenueVsAvg >= 0 ? '+' : ''}{comparison.revenueVsAvg}%
          </Text>
          <Text style={[styles.metricLabel, { color: comparison.revenueVsAvg >= 0 ? '#166534' : '#991B1B' }]}>
            Faturamento
          </Text>
        </View>

        <View style={[
          styles.metricCard, 
          { backgroundColor: comparison.expensesVsAvg <= 0 ? '#DCFCE7' : '#FEE2E2' }
        ]}>
          <Text style={styles.metricIcon}>
            {comparison.expensesVsAvg <= 0 ? '✅' : '⚠️'}
          </Text>
          <Text style={[
            styles.metricValue, 
            { color: comparison.expensesVsAvg <= 0 ? '#166534' : '#991B1B' }
          ]}>
            {comparison.expensesVsAvg >= 0 ? '+' : ''}{comparison.expensesVsAvg}%
          </Text>
          <Text style={[styles.metricLabel, { color: comparison.expensesVsAvg <= 0 ? '#166534' : '#991B1B' }]}>
            Despesas
          </Text>
        </View>

        <View style={[
          styles.metricCard, 
          { backgroundColor: comparison.goalCompletionVsAvg >= 0 ? '#DCFCE7' : '#FEF3C7' }
        ]}>
          <Text style={styles.metricIcon}>🎯</Text>
          <Text style={[
            styles.metricValue, 
            { color: comparison.goalCompletionVsAvg >= 0 ? '#166534' : '#92400E' }
          ]}>
            {comparison.goalCompletionVsAvg >= 0 ? '+' : ''}{comparison.goalCompletionVsAvg}%
          </Text>
          <Text style={[styles.metricLabel, { color: comparison.goalCompletionVsAvg >= 0 ? '#166534' : '#92400E' }]}>
            Metas
          </Text>
        </View>
      </View>

      {/* Insights positivos */}
      {comparison.insights.length > 0 && (
        <View style={[styles.insightsBox, { backgroundColor: '#DCFCE7' }]}>
          {comparison.insights.map((insight, i) => (
            <Text key={i} style={[styles.insightText, { color: '#166534' }]}>
              ✨ {insight}
            </Text>
          ))}
        </View>
      )}

      {/* Recomendações */}
      {comparison.recommendations.length > 0 && (
        <View style={[styles.insightsBox, { backgroundColor: '#DBEAFE' }]}>
          <Text style={[styles.insightsTitle, { color: '#1E40AF' }]}>
            💡 Dicas para melhorar:
          </Text>
          {comparison.recommendations.slice(0, 3).map((rec, i) => (
            <Text key={i} style={[styles.recommendationText, { color: '#1E40AF' }]}>
              • {rec}
            </Text>
          ))}
        </View>
      )}

      {/* Nota de privacidade */}
      <Text style={[styles.privacyNote, { color: theme.textSecondary }]}>
        📊 Comparações baseadas em dados agregados e anônimos de empresas do mesmo segmento
      </Text>
    </View>
  );
}

// Componente compacto para o Dashboard
export function BenchmarkBadge({ navigation }: { navigation?: any }) {
  const { theme } = useThemeCtx();

  const { data: comparison } = useQuery({
    queryKey: ['benchmark-badge'],
    queryFn: async () => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return null;
      return getCompanyBenchmarkComparison(companyId);
    },
    staleTime: 1000 * 60 * 30,
  });

  if (!comparison) return null;

  const isAboveAvg = comparison.revenueVsAvg > 0;

  return (
    <TouchableOpacity
      style={[styles.badge, { backgroundColor: isAboveAvg ? '#DCFCE7' : '#DBEAFE' }]}
      onPress={() => navigation?.navigate('Diagnóstico Financeiro')}
    >
      <Text style={styles.badgeIcon}>{isAboveAvg ? '🏆' : '📊'}</Text>
      <Text style={[styles.badgeText, { color: isAboveAvg ? '#166534' : '#1E40AF' }]}>
        {isAboveAvg 
          ? `Seu faturamento está ${comparison.revenueVsAvg}% acima da média!`
          : 'Veja como você se compara ao mercado'
        }
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  metricIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  insightsBox: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  insightsTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  insightText: {
    fontSize: 12,
    marginBottom: 4,
    lineHeight: 18,
  },
  recommendationText: {
    fontSize: 11,
    marginBottom: 4,
    lineHeight: 16,
  },
  privacyNote: {
    fontSize: 9,
    textAlign: 'center',
    marginTop: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  badgeIcon: {
    fontSize: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
});
