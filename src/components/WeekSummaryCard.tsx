import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useQuery } from '@tanstack/react-query';
import { getDailyTotals, getTransactionsByDate } from '../repositories/transactions';
import { todayYMD, addDays, startOfWeekSunday } from '../utils/date';
import { formatCentsBRL } from '../utils/money';
import { getWeeklyGoal, getCompanyProfile } from '../repositories/company_profile';
import { getCurrentCompanyId } from '../lib/company';

interface WeekSummaryCardProps {
  navigation?: any;
  startDate?: string;
}

export default function WeekSummaryCard({ navigation, startDate }: WeekSummaryCardProps) {
  const { theme } = useThemeCtx();
  const today = todayYMD();
  const weekStart = startDate || startOfWeekSunday(today);

  // Query para dados da semana
  const weekDataQuery = useQuery({
    queryKey: ['week-summary', weekStart],
    queryFn: async () => {
      let totalIncome = 0;
      let totalExpense = 0;
      let bestDay = { date: '', income: 0 };
      let daysWithoutTransactions = 0;
      const dailyData: { date: string; income: number; expense: number }[] = [];

      for (let i = 0; i < 7; i++) {
        const date = addDays(weekStart, i);
        const totals = await getDailyTotals(date);
        
        totalIncome += totals.income_cents;
        totalExpense += totals.expense_cents;
        
        dailyData.push({
          date,
          income: totals.income_cents,
          expense: totals.expense_cents,
        });

        if (totals.income_cents > bestDay.income) {
          bestDay = { date, income: totals.income_cents };
        }

        // Contar dias sem lançamentos (apenas dias passados)
        if (date <= today && totals.income_cents === 0 && totals.expense_cents === 0) {
          daysWithoutTransactions++;
        }
      }

      return {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        bestDay,
        daysWithoutTransactions,
        dailyData,
      };
    },
  });

  // Query para perfil da empresa (para meta semanal)
  const profileQuery = useQuery({
    queryKey: ['company-profile-week'],
    queryFn: async () => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return null;
      return getCompanyProfile(companyId);
    },
  });

  const weekData = weekDataQuery.data || {
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    bestDay: { date: '', income: 0 },
    daysWithoutTransactions: 0,
    dailyData: [],
  };

  const weeklyGoal = profileQuery.data?.business_type 
    ? getWeeklyGoal(profileQuery.data.business_type) 
    : 'Manter os registros em dia todos os dias';

  const formatDayName = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>📅</Text>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Resumo da Semana</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {formatDayName(weekStart)} a {formatDayName(addDays(weekStart, 6))}
          </Text>
        </View>
      </View>

      {/* Cards de resumo */}
      <View style={styles.cardsRow}>
        <View style={[styles.card, { backgroundColor: '#DCFCE7' }]}>
          <Text style={styles.cardIcon}>💰</Text>
          <Text style={styles.cardLabel}>Total Vendido</Text>
          <Text style={[styles.cardValue, { color: '#166534' }]}>
            {formatCentsBRL(weekData.totalIncome)}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: '#FEE2E2' }]}>
          <Text style={styles.cardIcon}>💸</Text>
          <Text style={styles.cardLabel}>Total Gasto</Text>
          <Text style={[styles.cardValue, { color: '#991B1B' }]}>
            {formatCentsBRL(weekData.totalExpense)}
          </Text>
        </View>
      </View>

      <View style={styles.cardsRow}>
        <View style={[styles.card, { backgroundColor: '#DBEAFE' }]}>
          <Text style={styles.cardIcon}>🏆</Text>
          <Text style={styles.cardLabel}>Melhor Dia</Text>
          <Text style={[styles.cardValue, { color: '#1E40AF' }]}>
            {weekData.bestDay.date ? formatDayName(weekData.bestDay.date) : '-'}
          </Text>
          {weekData.bestDay.income > 0 && (
            <Text style={[styles.cardSubvalue, { color: '#3B82F6' }]}>
              {formatCentsBRL(weekData.bestDay.income)}
            </Text>
          )}
        </View>

        <View style={[
          styles.card, 
          { backgroundColor: weekData.daysWithoutTransactions > 2 ? '#FEF3C7' : '#F3F4F6' }
        ]}>
          <Text style={styles.cardIcon}>
            {weekData.daysWithoutTransactions > 2 ? '⚠️' : '📊'}
          </Text>
          <Text style={styles.cardLabel}>Dias sem Registro</Text>
          <Text style={[
            styles.cardValue, 
            { color: weekData.daysWithoutTransactions > 2 ? '#92400E' : '#6B7280' }
          ]}>
            {weekData.daysWithoutTransactions}
          </Text>
        </View>
      </View>

      {/* Resultado da semana */}
      <View style={[
        styles.resultBox, 
        { backgroundColor: weekData.balance >= 0 ? '#DCFCE7' : '#FEE2E2' }
      ]}>
        <Text style={[
          styles.resultLabel, 
          { color: weekData.balance >= 0 ? '#166534' : '#991B1B' }
        ]}>
          Resultado da Semana:
        </Text>
        <Text style={[
          styles.resultValue, 
          { color: weekData.balance >= 0 ? '#16A34A' : '#D90429' }
        ]}>
          {weekData.balance >= 0 ? '+' : ''}{formatCentsBRL(weekData.balance)}
        </Text>
      </View>

      {/* Tarefas da semana */}
      <View style={[styles.tasksBox, { backgroundColor: theme.background }]}>
        <Text style={[styles.tasksTitle, { color: theme.text }]}>
          🎯 Meta da Semana
        </Text>
        <Text style={[styles.tasksText, { color: theme.textSecondary }]}>
          {weeklyGoal}
        </Text>
        
        {weekData.daysWithoutTransactions > 2 && (
          <View style={[styles.taskAlert, { backgroundColor: '#FEF3C7' }]}>
            <Text style={styles.taskAlertText}>
              ⚠️ Você tem {weekData.daysWithoutTransactions} dias sem registros. 
              Tente registrar suas movimentações diariamente!
            </Text>
          </View>
        )}
      </View>

      {/* Mini gráfico de barras */}
      <View style={styles.miniChart}>
        <Text style={[styles.chartTitle, { color: theme.textSecondary }]}>
          Vendas por dia:
        </Text>
        <View style={styles.barsContainer}>
          {weekData.dailyData.map((day, index) => {
            const maxIncome = Math.max(...weekData.dailyData.map(d => d.income), 1);
            const height = (day.income / maxIncome) * 40;
            const isToday = day.date === today;
            
            return (
              <View key={index} style={styles.barWrapper}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      height: Math.max(height, 4),
                      backgroundColor: isToday ? '#16A34A' : '#10B98150',
                    }
                  ]} 
                />
                <Text style={[
                  styles.barLabel, 
                  { 
                    color: isToday ? '#16A34A' : theme.textSecondary,
                    fontWeight: isToday ? '700' : '400',
                  }
                ]}>
                  {formatDayName(day.date).charAt(0).toUpperCase()}
                </Text>
              </View>
            );
          })}
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
  cardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  card: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  cardSubvalue: {
    fontSize: 10,
    marginTop: 2,
  },
  resultBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  resultLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  resultValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  tasksBox: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  tasksTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  tasksText: {
    fontSize: 12,
    lineHeight: 18,
  },
  taskAlert: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
  },
  taskAlertText: {
    fontSize: 11,
    color: '#92400E',
    lineHeight: 16,
  },
  miniChart: {
    marginTop: 4,
  },
  chartTitle: {
    fontSize: 11,
    marginBottom: 8,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 60,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '60%',
    borderRadius: 4,
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 10,
  },
});
