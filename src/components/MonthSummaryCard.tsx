import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useQuery } from '@tanstack/react-query';
import { getMonthlyTotals } from '../repositories/transactions';
import { getGoalByMonth } from '../repositories/financial_goals';
import { formatCentsBRL } from '../utils/money';
import { getCurrentCompanyId } from '../lib/company';

interface MonthSummaryCardProps {
  year: number;
  month: number;
  navigation?: any;
}

export default function MonthSummaryCard({ year, month, navigation }: MonthSummaryCardProps) {
  const { theme } = useThemeCtx();

  // Query para totais do mês
  const totalsQuery = useQuery({
    queryKey: ['month-totals', year, month],
    queryFn: () => getMonthlyTotals(year, month),
  });

  // Query para meta do mês
  const goalQuery = useQuery({
    queryKey: ['month-goal', year, month],
    queryFn: async () => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return null;
      const monthStr = `${year}-${String(month).padStart(2, '0')}-01`;
      return getGoalByMonth(companyId, monthStr);
    },
  });

  const totals = totalsQuery.data || { income_cents: 0, expense_cents: 0, balance_cents: 0 };
  const goal = goalQuery.data;

  // Cálculos de projeção
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const daysPassed = isCurrentMonth ? today.getDate() : new Date(year, month, 0).getDate();
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysRemaining = daysInMonth - daysPassed;

  const avgDailyIncome = daysPassed > 0 ? totals.income_cents / daysPassed : 0;
  const projectedMonthlyIncome = Math.round(avgDailyIncome * daysInMonth);

  const goalAmount = goal?.target_amount_cents || 0;
  const goalProgress = goalAmount > 0 ? (totals.income_cents / goalAmount) * 100 : 0;
  const projectedGoalProgress = goalAmount > 0 ? (projectedMonthlyIncome / goalAmount) * 100 : 0;

  const willHitGoal = projectedMonthlyIncome >= goalAmount;
  const neededPerDay = goalAmount > 0 && daysRemaining > 0 
    ? Math.max(0, (goalAmount - totals.income_cents) / daysRemaining) 
    : 0;

  const monthName = new Date(year, month - 1, 1).toLocaleString('pt-BR', { month: 'long' });

  return (
    <View style={[styles.container, { backgroundColor: theme.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>📊</Text>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>
            Visão do Mês
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {monthName.charAt(0).toUpperCase() + monthName.slice(1)} {year}
          </Text>
        </View>
      </View>

      {/* Cards de resumo */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: '#DCFCE7' }]}>
          <Text style={styles.summaryIcon}>💰</Text>
          <Text style={styles.summaryLabel}>Entradas</Text>
          <Text style={[styles.summaryValue, { color: '#166534' }]}>
            {formatCentsBRL(totals.income_cents)}
          </Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: '#FEE2E2' }]}>
          <Text style={styles.summaryIcon}>💸</Text>
          <Text style={styles.summaryLabel}>Saídas</Text>
          <Text style={[styles.summaryValue, { color: '#991B1B' }]}>
            {formatCentsBRL(totals.expense_cents)}
          </Text>
        </View>

        <View style={[
          styles.summaryCard, 
          { backgroundColor: totals.balance_cents >= 0 ? '#DBEAFE' : '#FEE2E2' }
        ]}>
          <Text style={styles.summaryIcon}>📈</Text>
          <Text style={styles.summaryLabel}>Resultado</Text>
          <Text style={[
            styles.summaryValue, 
            { color: totals.balance_cents >= 0 ? '#1E40AF' : '#991B1B' }
          ]}>
            {formatCentsBRL(totals.balance_cents)}
          </Text>
        </View>
      </View>

      {/* Progresso da meta */}
      {goalAmount > 0 && (
        <View style={[styles.goalSection, { backgroundColor: theme.background }]}>
          <View style={styles.goalHeader}>
            <Text style={[styles.goalTitle, { color: theme.text }]}>
              🎯 Meta: {formatCentsBRL(goalAmount)}
            </Text>
            <Text style={[
              styles.goalPercentage, 
              { color: goalProgress >= 100 ? '#16A34A' : goalProgress >= 70 ? '#F59E0B' : '#D90429' }
            ]}>
              {goalProgress.toFixed(0)}%
            </Text>
          </View>

          {/* Barra de progresso */}
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { backgroundColor: '#E5E7EB' }]}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${Math.min(goalProgress, 100)}%`,
                    backgroundColor: goalProgress >= 100 ? '#16A34A' : goalProgress >= 70 ? '#F59E0B' : '#D90429',
                  }
                ]} 
              />
            </View>
          </View>

          {/* Projeção */}
          {isCurrentMonth && daysRemaining > 0 && (
            <View style={[
              styles.projectionBox, 
              { backgroundColor: willHitGoal ? '#DCFCE7' : '#FEF3C7' }
            ]}>
              <Text style={[
                styles.projectionTitle, 
                { color: willHitGoal ? '#166534' : '#92400E' }
              ]}>
                {willHitGoal ? '✅ Projeção positiva!' : '⚠️ Atenção à projeção'}
              </Text>
              <Text style={[
                styles.projectionText, 
                { color: willHitGoal ? '#166534' : '#92400E' }
              ]}>
                {willHitGoal 
                  ? `No ritmo atual, você deve faturar ${formatCentsBRL(projectedMonthlyIncome)} (${projectedGoalProgress.toFixed(0)}% da meta)`
                  : `Para bater a meta, você precisa faturar ${formatCentsBRL(neededPerDay)}/dia nos próximos ${daysRemaining} dias`
                }
              </Text>
            </View>
          )}

          {goalProgress >= 100 && (
            <View style={[styles.celebrationBox, { backgroundColor: '#DCFCE7' }]}>
              <Text style={styles.celebrationIcon}>🎉</Text>
              <Text style={styles.celebrationText}>
                Parabéns! Você bateu a meta do mês!
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Sem meta definida */}
      {goalAmount === 0 && (
        <TouchableOpacity 
          style={[styles.noGoalBox, { backgroundColor: '#FEF3C7' }]}
          onPress={() => navigation?.navigate('Dashboard')}
        >
          <Text style={styles.noGoalIcon}>🎯</Text>
          <View style={styles.noGoalContent}>
            <Text style={styles.noGoalTitle}>Defina uma meta mensal</Text>
            <Text style={styles.noGoalText}>
              Ter uma meta ajuda a manter o foco e acompanhar seu progresso
            </Text>
          </View>
          <Text style={styles.noGoalArrow}>→</Text>
        </TouchableOpacity>
      )}

      {/* Estatísticas adicionais */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Dias passados</Text>
          <Text style={[styles.statValue, { color: theme.text }]}>{daysPassed}/{daysInMonth}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Média/dia</Text>
          <Text style={[styles.statValue, { color: '#16A34A' }]}>{formatCentsBRL(avgDailyIncome)}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Projeção</Text>
          <Text style={[styles.statValue, { color: theme.text }]}>{formatCentsBRL(projectedMonthlyIncome)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  headerIcon: {
    fontSize: 28,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  goalSection: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  goalPercentage: {
    fontSize: 16,
    fontWeight: '800',
  },
  progressBarContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  projectionBox: {
    padding: 12,
    borderRadius: 10,
  },
  projectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  projectionText: {
    fontSize: 12,
    lineHeight: 18,
  },
  celebrationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  celebrationIcon: {
    fontSize: 24,
  },
  celebrationText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
  },
  noGoalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  noGoalIcon: {
    fontSize: 24,
  },
  noGoalContent: {
    flex: 1,
  },
  noGoalTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  noGoalText: {
    fontSize: 11,
    color: '#92400E',
    marginTop: 2,
  },
  noGoalArrow: {
    fontSize: 18,
    color: '#92400E',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
  },
});
