import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useQuery } from '@tanstack/react-query';
import { getDailyTotals, getTransactionsByDate } from '../repositories/transactions';
import { todayYMD, addDays } from '../utils/date';
import { formatCentsBRL } from '../utils/money';

interface TodayQuickActionsProps {
  navigation?: any;
  onRegisterIncome?: () => void;
  onRegisterExpense?: () => void;
  onCheckBalance?: () => void;
}

export default function TodayQuickActions({ 
  navigation, 
  onRegisterIncome, 
  onRegisterExpense, 
  onCheckBalance 
}: TodayQuickActionsProps) {
  const { theme } = useThemeCtx();
  const today = todayYMD();

  // Query para totais de hoje
  const todayQuery = useQuery({
    queryKey: ['today-totals', today],
    queryFn: () => getDailyTotals(today),
  });

  // Query para média dos últimos 7 dias
  const weekAverageQuery = useQuery({
    queryKey: ['week-average-totals'],
    queryFn: async () => {
      let totalIncome = 0;
      let totalExpense = 0;
      let daysWithData = 0;

      for (let i = 1; i <= 7; i++) {
        const date = addDays(today, -i);
        const totals = await getDailyTotals(date);
        if (totals.income_cents > 0 || totals.expense_cents > 0) {
          totalIncome += totals.income_cents;
          totalExpense += totals.expense_cents;
          daysWithData++;
        }
      }

      return {
        avgIncome: daysWithData > 0 ? Math.round(totalIncome / daysWithData) : 0,
        avgExpense: daysWithData > 0 ? Math.round(totalExpense / daysWithData) : 0,
        daysWithData,
      };
    },
  });

  const todayTotals = todayQuery.data || { income_cents: 0, expense_cents: 0, balance_cents: 0 };
  const weekAvg = weekAverageQuery.data || { avgIncome: 0, avgExpense: 0, daysWithData: 0 };

  // Comparação com média
  const incomeVsAvg = weekAvg.avgIncome > 0 
    ? ((todayTotals.income_cents - weekAvg.avgIncome) / weekAvg.avgIncome) * 100 
    : 0;
  
  const isAboveAverage = todayTotals.income_cents > weekAvg.avgIncome;
  const isBelowAverage = todayTotals.income_cents < weekAvg.avgIncome && weekAvg.avgIncome > 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>📅</Text>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Hoje</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>
      </View>

      {/* Botões de ação rápida */}
      <View style={styles.actionsRow}>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#16A34A' }]}
          onPress={onRegisterIncome}
        >
          <Text style={styles.actionIcon}>💰</Text>
          <Text style={styles.actionText}>Registrar Venda</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#D90429' }]}
          onPress={onRegisterExpense}
        >
          <Text style={styles.actionIcon}>💸</Text>
          <Text style={styles.actionText}>Registrar Gasto</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
          onPress={onCheckBalance}
        >
          <Text style={styles.actionIcon}>📊</Text>
          <Text style={styles.actionText}>Conferir Caixa</Text>
        </TouchableOpacity>
      </View>

      {/* Resumo do dia */}
      <View style={[styles.summaryContainer, { backgroundColor: theme.background }]}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Entradas</Text>
            <Text style={[styles.summaryValue, { color: '#16A34A' }]}>
              {formatCentsBRL(todayTotals.income_cents)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Saídas</Text>
            <Text style={[styles.summaryValue, { color: '#D90429' }]}>
              {formatCentsBRL(todayTotals.expense_cents)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Resultado</Text>
            <Text style={[
              styles.summaryValue, 
              { color: todayTotals.balance_cents >= 0 ? '#16A34A' : '#D90429' }
            ]}>
              {formatCentsBRL(todayTotals.balance_cents)}
            </Text>
          </View>
        </View>

        {/* Indicador vs média */}
        {weekAvg.daysWithData >= 3 && (
          <View style={[
            styles.avgIndicator, 
            { backgroundColor: isAboveAverage ? '#DCFCE7' : isBelowAverage ? '#FEE2E2' : '#F3F4F6' }
          ]}>
            <Text style={[
              styles.avgText, 
              { color: isAboveAverage ? '#166534' : isBelowAverage ? '#991B1B' : '#6B7280' }
            ]}>
              {isAboveAverage 
                ? `📈 Hoje você está ${Math.abs(incomeVsAvg).toFixed(0)}% acima da média diária!`
                : isBelowAverage 
                  ? `📉 Hoje você está ${Math.abs(incomeVsAvg).toFixed(0)}% abaixo da média diária`
                  : '📊 Média diária ainda não calculada'
              }
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// Componente compacto para uso em outras telas
export function TodaySummaryBadge() {
  const { theme } = useThemeCtx();
  const today = todayYMD();

  const todayQuery = useQuery({
    queryKey: ['today-totals', today],
    queryFn: () => getDailyTotals(today),
  });

  const totals = todayQuery.data || { income_cents: 0, expense_cents: 0, balance_cents: 0 };

  return (
    <View style={[badgeStyles.container, { backgroundColor: theme.card }]}>
      <Text style={[badgeStyles.label, { color: theme.textSecondary }]}>Hoje:</Text>
      <Text style={[badgeStyles.value, { color: '#16A34A' }]}>
        +{formatCentsBRL(totals.income_cents)}
      </Text>
      <Text style={[badgeStyles.separator, { color: theme.textSecondary }]}>|</Text>
      <Text style={[badgeStyles.value, { color: '#D90429' }]}>
        -{formatCentsBRL(totals.expense_cents)}
      </Text>
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
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    gap: 6,
  },
  actionIcon: {
    fontSize: 24,
  },
  actionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
    textAlign: 'center',
  },
  summaryContainer: {
    borderRadius: 12,
    padding: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  avgIndicator: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  avgText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

const badgeStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
  value: {
    fontSize: 12,
    fontWeight: '700',
  },
  separator: {
    fontSize: 12,
  },
});
