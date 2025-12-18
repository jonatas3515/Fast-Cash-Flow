import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeCtx } from '../../theme/ThemeProvider';
import { CompanyHealthScore, HealthStatus } from '../../repositories/health_score';

interface HealthScoreCardProps {
  company: CompanyHealthScore;
  onAction?: (action: string, companyId: string) => void;
  compact?: boolean;
}

const STATUS_CONFIG: Record<HealthStatus, { color: string; bgColor: string; label: string; icon: string }> = {
  green: { color: '#166534', bgColor: '#DCFCE7', label: 'Saudável', icon: '🟢' },
  yellow: { color: '#92400E', bgColor: '#FEF3C7', label: 'Em Risco', icon: '🟡' },
  red: { color: '#991B1B', bgColor: '#FEE2E2', label: 'Crítico', icon: '🔴' },
};

export default function HealthScoreCard({ company, onAction, compact = false }: HealthScoreCardProps) {
  const { theme } = useThemeCtx();
  const config = STATUS_CONFIG[company.healthStatus];

  if (compact) {
    return (
      <View style={[styles.compactCard, { backgroundColor: config.bgColor }]}>
        <Text style={styles.compactIcon}>{config.icon}</Text>
        <Text style={[styles.compactScore, { color: config.color }]}>{company.totalScore}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.companyInfo}>
          <Text style={[styles.companyName, { color: theme.text }]}>{company.company_name}</Text>
          {company.business_type && (
            <Text style={[styles.businessType, { color: theme.textSecondary }]}>
              {company.business_type}
            </Text>
          )}
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: config.bgColor }]}>
          <Text style={styles.scoreIcon}>{config.icon}</Text>
          <Text style={[styles.scoreValue, { color: config.color }]}>{company.totalScore}</Text>
        </View>
      </View>

      {/* Status Label */}
      <View style={[styles.statusBanner, { backgroundColor: config.bgColor }]}>
        <Text style={[styles.statusLabel, { color: config.color }]}>
          {config.icon} {config.label}
        </Text>
      </View>

      {/* Breakdown */}
      <View style={styles.breakdown}>
        <View style={styles.breakdownItem}>
          <Text style={[styles.breakdownLabel, { color: theme.textSecondary }]}>Engajamento</Text>
          <View style={styles.breakdownBar}>
            <View style={[styles.breakdownFill, { width: `${company.breakdown.engagement.score * 10}%`, backgroundColor: '#6366F1' }]} />
          </View>
          <Text style={[styles.breakdownValue, { color: theme.text }]}>
            {company.breakdown.engagement.score.toFixed(1)}
          </Text>
        </View>

        <View style={styles.breakdownItem}>
          <Text style={[styles.breakdownLabel, { color: theme.textSecondary }]}>Suporte</Text>
          <View style={styles.breakdownBar}>
            <View style={[styles.breakdownFill, { width: `${company.breakdown.support.score * 10}%`, backgroundColor: '#10B981' }]} />
          </View>
          <Text style={[styles.breakdownValue, { color: theme.text }]}>
            {company.breakdown.support.score.toFixed(1)}
          </Text>
        </View>

        <View style={styles.breakdownItem}>
          <Text style={[styles.breakdownLabel, { color: theme.textSecondary }]}>Resultados</Text>
          <View style={styles.breakdownBar}>
            <View style={[styles.breakdownFill, { width: `${company.breakdown.results.score * 10}%`, backgroundColor: '#F59E0B' }]} />
          </View>
          <Text style={[styles.breakdownValue, { color: theme.text }]}>
            {company.breakdown.results.score.toFixed(1)}
          </Text>
        </View>
      </View>

      {/* Métricas rápidas */}
      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: theme.text }]}>
            {company.breakdown.engagement.loginFrequency}
          </Text>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>dias ativos</Text>
        </View>
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: theme.text }]}>
            {company.breakdown.engagement.transactionCount}
          </Text>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>lançamentos</Text>
        </View>
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: theme.text }]}>
            {company.breakdown.results.goalsMet}/{company.breakdown.results.goalsSet}
          </Text>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>metas batidas</Text>
        </View>
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: company.breakdown.support.daysSinceLastActivity > 7 ? '#EF4444' : theme.text }]}>
            {company.breakdown.support.daysSinceLastActivity}d
          </Text>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>sem atividade</Text>
        </View>
      </View>

      {/* Features usadas */}
      <View style={styles.features}>
        <Text style={[styles.featuresLabel, { color: theme.textSecondary }]}>Funcionalidades:</Text>
        <View style={styles.featuresList}>
          {company.breakdown.engagement.featuresUsed.map(feature => (
            <View key={feature} style={[styles.featureBadge, { backgroundColor: '#DBEAFE' }]}>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
          {company.breakdown.engagement.featuresUsed.length === 0 && (
            <Text style={[styles.noFeatures, { color: theme.textSecondary }]}>Nenhuma</Text>
          )}
        </View>
      </View>

      {/* Recomendações */}
      {company.recommendations.length > 0 && (
        <View style={styles.recommendations}>
          <Text style={[styles.recommendationsTitle, { color: theme.text }]}>⚠️ Atenção:</Text>
          {company.recommendations.map((rec, i) => (
            <Text key={i} style={[styles.recommendation, { color: theme.textSecondary }]}>
              • {rec}
            </Text>
          ))}
        </View>
      )}

      {/* Ações */}
      {company.needsAttention && onAction && (
        <View style={styles.actions}>
          {company.suggestedActions.includes('Enviar dicas de uso') && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#6366F1' }]}
              onPress={() => onAction('send_tips', company.company_id)}
            >
              <Text style={styles.actionBtnText}>📚 Enviar Dicas</Text>
            </TouchableOpacity>
          )}
          {company.suggestedActions.includes('Enviar mensagem de reengajamento') && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#F59E0B' }]}
              onPress={() => onAction('reengage', company.company_id)}
            >
              <Text style={styles.actionBtnText}>📨 Reengajar</Text>
            </TouchableOpacity>
          )}
          {company.suggestedActions.includes('Oferecer treinamento') && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
              onPress={() => onAction('training', company.company_id)}
            >
              <Text style={styles.actionBtnText}>🎓 Treinamento</Text>
            </TouchableOpacity>
          )}
          {company.suggestedActions.includes('Contato sobre pagamento') && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#EF4444' }]}
              onPress={() => onAction('payment', company.company_id)}
            >
              <Text style={styles.actionBtnText}>💳 Pagamento</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#8B5CF6' }]}
            onPress={() => onAction('support', company.company_id)}
          >
            <Text style={styles.actionBtnText}>💬 Suporte</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// Componente de resumo para o Dashboard
export function HealthScoreSummary({ 
  summary, 
  onFilterClick 
}: { 
  summary: { total: number; green: number; yellow: number; red: number; avgScore: number };
  onFilterClick?: (status: HealthStatus | 'all') => void;
}) {
  const { theme } = useThemeCtx();

  return (
    <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
      <Text style={[styles.summaryTitle, { color: theme.text }]}>🏥 Saúde dos Clientes</Text>
      
      <View style={styles.summaryScore}>
        <Text style={[styles.avgScore, { color: summary.avgScore >= 70 ? '#16A34A' : summary.avgScore >= 40 ? '#F59E0B' : '#EF4444' }]}>
          {summary.avgScore}
        </Text>
        <Text style={[styles.avgLabel, { color: theme.textSecondary }]}>Score Médio</Text>
      </View>

      <View style={styles.summaryBars}>
        <TouchableOpacity 
          style={styles.summaryBar}
          onPress={() => onFilterClick?.('green')}
        >
          <View style={[styles.barIcon, { backgroundColor: '#DCFCE7' }]}>
            <Text>🟢</Text>
          </View>
          <Text style={[styles.barCount, { color: '#166534' }]}>{summary.green}</Text>
          <Text style={[styles.barLabel, { color: theme.textSecondary }]}>Saudáveis</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.summaryBar}
          onPress={() => onFilterClick?.('yellow')}
        >
          <View style={[styles.barIcon, { backgroundColor: '#FEF3C7' }]}>
            <Text>🟡</Text>
          </View>
          <Text style={[styles.barCount, { color: '#92400E' }]}>{summary.yellow}</Text>
          <Text style={[styles.barLabel, { color: theme.textSecondary }]}>Em Risco</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.summaryBar}
          onPress={() => onFilterClick?.('red')}
        >
          <View style={[styles.barIcon, { backgroundColor: '#FEE2E2' }]}>
            <Text>🔴</Text>
          </View>
          <Text style={[styles.barCount, { color: '#991B1B' }]}>{summary.red}</Text>
          <Text style={[styles.barLabel, { color: theme.textSecondary }]}>Críticos</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 16,
    fontWeight: '700',
  },
  businessType: {
    fontSize: 12,
    marginTop: 2,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  scoreIcon: {
    fontSize: 14,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statusBanner: {
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  breakdown: {
    gap: 8,
    marginBottom: 12,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownLabel: {
    width: 80,
    fontSize: 11,
  },
  breakdownBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
  breakdownFill: {
    height: '100%',
    borderRadius: 4,
  },
  breakdownValue: {
    width: 30,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
  },
  metrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metric: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 9,
    marginTop: 2,
  },
  features: {
    marginBottom: 12,
  },
  featuresLabel: {
    fontSize: 11,
    marginBottom: 6,
  },
  featuresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  featureBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  featureText: {
    fontSize: 10,
    color: '#1E40AF',
    fontWeight: '600',
  },
  noFeatures: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  recommendations: {
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  recommendationsTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  recommendation: {
    fontSize: 11,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  compactIcon: {
    fontSize: 12,
  },
  compactScore: {
    fontSize: 12,
    fontWeight: '700',
  },
  summaryCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  summaryScore: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avgScore: {
    fontSize: 48,
    fontWeight: '800',
  },
  avgLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  summaryBars: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryBar: {
    alignItems: 'center',
  },
  barIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  barCount: {
    fontSize: 20,
    fontWeight: '800',
  },
  barLabel: {
    fontSize: 10,
  },
});
