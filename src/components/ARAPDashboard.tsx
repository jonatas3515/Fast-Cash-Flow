import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useQuery } from '@tanstack/react-query';
import { getReceivablesSummary } from '../repositories/receivables';
import { getPayablesSummary } from '../repositories/payables';
import { formatCentsBRL } from '../utils/money';

interface ARAPDashboardProps {
  navigation?: any;
  compact?: boolean;
  metaCard?: React.ReactNode;
}

export default function ARAPDashboard({ navigation, compact = false, metaCard }: ARAPDashboardProps) {
  const { theme } = useThemeCtx();

  // Query para contas a receber
  const receivablesQuery = useQuery({
    queryKey: ['receivables-summary'],
    queryFn: getReceivablesSummary,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Query para contas a pagar
  const payablesQuery = useQuery({
    queryKey: ['payables-summary'],
    queryFn: getPayablesSummary,
    staleTime: 1000 * 60 * 5,
  });

  const isLoading = receivablesQuery.isLoading || payablesQuery.isLoading;
  const receivables = receivablesQuery.data || { total: 0, overdue: 0, dueThisWeek: 0, dueThisMonth: 0, byDay: [] };
  const payables = payablesQuery.data || { total: 0, overdue: 0, dueThisWeek: 0, dueThisMonth: 0, byDay: [] };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.card }]}>
        <ActivityIndicator size="small" color={theme.text} />
      </View>
    );
  }

  // Mini gráfico de barras
  const MiniBarChart = ({ data, color }: { data: { date: string; amount: number }[], color: string }) => {
    if (data.length === 0) return null;
    const maxAmount = Math.max(...data.map(d => d.amount), 1);

    return (
      <View style={styles.miniChart}>
        {data.slice(0, 7).map((item, index) => {
          const height = Math.max((item.amount / maxAmount) * 24, 2);
          const dayName = new Date(item.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }).charAt(0).toUpperCase();
          return (
            <View key={index} style={styles.barWrapper}>
              <View style={[styles.bar, { height, backgroundColor: color }]} />
              <Text style={[styles.barLabel, { color: theme.textSecondary }]}>{dayName}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: theme.card }]}>
        <View style={styles.compactRow}>
          {/* A Receber */}
          <TouchableOpacity
            style={[styles.compactBlock, { borderLeftColor: '#10B981' }]}
            onPress={() => navigation?.navigate('A Receber')}
          >
            <Text style={[styles.compactLabel, { color: theme.textSecondary }]}>A Receber</Text>
            <Text style={[styles.compactValue, { color: '#10B981' }]}>
              {formatCentsBRL(receivables.total)}
            </Text>
            {receivables.overdue > 0 && (
              <Text style={styles.compactOverdue}>
                ⚠️ {formatCentsBRL(receivables.overdue)} vencido
              </Text>
            )}
          </TouchableOpacity>

          {/* A Pagar */}
          <TouchableOpacity
            style={[styles.compactBlock, { borderLeftColor: '#EF4444' }]}
            onPress={() => navigation?.navigate('A Pagar')}
          >
            <Text style={[styles.compactLabel, { color: theme.textSecondary }]}>A Pagar</Text>
            <Text style={[styles.compactValue, { color: '#EF4444' }]}>
              {formatCentsBRL(payables.total)}
            </Text>
            {payables.overdue > 0 && (
              <Text style={styles.compactOverdue}>
                ⚠️ {formatCentsBRL(payables.overdue)} vencido
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.card }]}>
      <Text style={[styles.title, { color: theme.text }]}>
        💰 Fluxo de Caixa Futuro
      </Text>

      <View style={styles.blocksRow}>
        {/* Bloco A Receber */}
        <TouchableOpacity
          style={[styles.block, styles.receivableBlock]}
          onPress={() => navigation?.navigate('A Receber')}
        >
          <View style={styles.blockHeader}>
            <Text style={styles.blockIcon}>📥</Text>
            <Text style={styles.blockTitle}>A Receber</Text>
          </View>

          <Text style={[styles.blockTotal, { color: '#10B981' }]}>
            {formatCentsBRL(receivables.total)}
          </Text>

          <View style={styles.blockDetails}>
            {receivables.overdue > 0 && (
              <View style={[styles.detailRow, { backgroundColor: '#FEE2E2' }]}>
                <Text style={styles.detailIcon}>🔴</Text>
                <Text style={[styles.detailText, { color: '#991B1B' }]}>
                  Vencido: {formatCentsBRL(receivables.overdue)}
                </Text>
              </View>
            )}
            <View style={[styles.detailRow, { backgroundColor: '#FEF3C7' }]}>
              <Text style={styles.detailIcon}>🟡</Text>
              <Text style={[styles.detailText, { color: '#92400E' }]}>
                7 dias: {formatCentsBRL(receivables.dueThisWeek)}
              </Text>
            </View>
            <View style={[styles.detailRow, { backgroundColor: '#DBEAFE' }]}>
              <Text style={styles.detailIcon}>🔵</Text>
              <Text style={[styles.detailText, { color: '#1E40AF' }]}>
                Mês: {formatCentsBRL(receivables.dueThisMonth)}
              </Text>
            </View>
          </View>

          <MiniBarChart data={receivables.byDay} color="#10B981" />

          <View style={styles.blockAction}>
            <Text style={styles.blockActionText}>Ver detalhes →</Text>
          </View>
        </TouchableOpacity>

        {/* Bloco A Pagar */}
        <TouchableOpacity
          style={[styles.block, styles.payableBlock]}
          onPress={() => navigation?.navigate('A Pagar')}
        >
          <View style={styles.blockHeader}>
            <Text style={styles.blockIcon}>📤</Text>
            <Text style={styles.blockTitle}>A Pagar</Text>
          </View>

          <Text style={[styles.blockTotal, { color: '#EF4444' }]}>
            {formatCentsBRL(payables.total)}
          </Text>

          <View style={styles.blockDetails}>
            {payables.overdue > 0 && (
              <View style={[styles.detailRow, { backgroundColor: '#FEE2E2' }]}>
                <Text style={styles.detailIcon}>🔴</Text>
                <Text style={[styles.detailText, { color: '#991B1B' }]}>
                  Vencido: {formatCentsBRL(payables.overdue)}
                </Text>
              </View>
            )}
            <View style={[styles.detailRow, { backgroundColor: '#FEF3C7' }]}>
              <Text style={styles.detailIcon}>🟡</Text>
              <Text style={[styles.detailText, { color: '#92400E' }]}>
                7 dias: {formatCentsBRL(payables.dueThisWeek)}
              </Text>
            </View>
            <View style={[styles.detailRow, { backgroundColor: '#DBEAFE' }]}>
              <Text style={styles.detailIcon}>🔵</Text>
              <Text style={[styles.detailText, { color: '#1E40AF' }]}>
                Mês: {formatCentsBRL(payables.dueThisMonth)}
              </Text>
            </View>
          </View>

          <MiniBarChart data={payables.byDay} color="#EF4444" />

          <View style={styles.blockAction}>
            <Text style={styles.blockActionText}>Ver detalhes →</Text>
          </View>
        </TouchableOpacity>

        {/* Terceira coluna: Meta Financeira (se fornecido) */}
        {metaCard}
      </View>

      {/* Saldo Projetado */}
      <View style={[styles.projectedBalance, { backgroundColor: theme.background }]}>
        <Text style={[styles.projectedLabel, { color: theme.textSecondary }]}>
          Saldo Projetado (próx. 7 dias):
        </Text>
        <Text style={[
          styles.projectedValue,
          { color: receivables.dueThisWeek - payables.dueThisWeek >= 0 ? '#10B981' : '#EF4444' }
        ]}>
          {receivables.dueThisWeek - payables.dueThisWeek >= 0 ? '+' : ''}
          {formatCentsBRL(receivables.dueThisWeek - payables.dueThisWeek)}
        </Text>
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
  title: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 16,
  },
  blocksRow: {
    flexDirection: 'row',
    gap: 12,
  },
  block: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
  },
  receivableBlock: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  payableBlock: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  blockIcon: {
    fontSize: 18,
  },
  blockTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  blockTotal: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
  },
  blockDetails: {
    gap: 4,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  detailIcon: {
    fontSize: 10,
  },
  detailText: {
    fontSize: 11,
    fontWeight: '600',
  },
  blockAction: {
    alignItems: 'center',
    marginTop: 8,
  },
  blockActionText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  miniChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 36,
    marginTop: 8,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '60%',
    borderRadius: 2,
    marginBottom: 2,
  },
  barLabel: {
    fontSize: 8,
  },
  projectedBalance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  projectedLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  projectedValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  // Compact styles
  compactContainer: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  compactRow: {
    flexDirection: 'row',
    gap: 10,
  },
  compactBlock: {
    flex: 1,
    paddingLeft: 10,
    borderLeftWidth: 3,
  },
  compactLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  compactValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  compactOverdue: {
    fontSize: 10,
    color: '#991B1B',
    marginTop: 2,
  },
});
