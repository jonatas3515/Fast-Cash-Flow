import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useQuery } from '@tanstack/react-query';
import { getMonthlyTotals, getTransactionsByMonth } from '../repositories/transactions';
import { listAllDebts } from '../repositories/debts';
import { getCurrentCompanyId } from '../lib/company';
import { formatCentsBRL } from '../utils/money';
import ScreenTitle from '../components/ScreenTitle';
import FeatureBanner, { FEATURE_BANNERS } from '../components/FeatureBanner';
import { useResolvedBusinessType } from '../hooks/useSegmentCategories';
import { getCategoryGroupKey } from '../utils/segment';

interface HealthStatus {
  status: 'green' | 'yellow' | 'red';
  score: number;
  factors: {
    id: string;
    label: string;
    status: 'good' | 'warning' | 'critical';
    value: string;
    recommendation: string;
  }[];
}

export default function FinancialDiagnosticScreen({ navigation }: any) {
  const { theme, mode } = useThemeCtx();
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const businessType = useResolvedBusinessType();

  // Query para totais do mês
  const totalsQuery = useQuery({
    queryKey: ['diagnostic-totals', year, month],
    queryFn: () => getMonthlyTotals(year, month),
  });

  // Query para transações
  const txQuery = useQuery({
    queryKey: ['diagnostic-transactions', year, month],
    queryFn: () => getTransactionsByMonth(year, month),
  });

  // Query para dívidas
  const debtsQuery = useQuery({
    queryKey: ['diagnostic-debts'],
    queryFn: async () => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return [];
      return listAllDebts(companyId);
    },
  });

  const totals = totalsQuery.data || { income_cents: 0, expense_cents: 0, balance_cents: 0 };
  const transactions = txQuery.data || [];
  const debts = debtsQuery.data || [];

  // Calcular saúde financeira
  const calculateHealth = (): HealthStatus => {
    const factors: HealthStatus['factors'] = [];
    let score = 100;

    // 1. Análise de lucro/prejuízo
    const profit = totals.balance_cents;
    if (profit > 0) {
      factors.push({
        id: 'profit',
        label: 'Resultado do Período',
        status: 'good',
        value: `Lucro de ${formatCentsBRL(profit)}`,
        recommendation: 'Continue assim! Considere reservar parte do lucro para emergências.',
      });
    } else if (profit === 0) {
      score -= 20;
      factors.push({
        id: 'profit',
        label: 'Resultado do Período',
        status: 'warning',
        value: 'Empate (sem lucro nem prejuízo)',
        recommendation: 'Tente aumentar vendas ou reduzir custos para gerar lucro.',
      });
    } else {
      score -= 40;
      factors.push({
        id: 'profit',
        label: 'Resultado do Período',
        status: 'critical',
        value: `Prejuízo de ${formatCentsBRL(Math.abs(profit))}`,
        recommendation: 'URGENTE: Revise seus custos e busque aumentar o faturamento imediatamente.',
      });
    }

    // 2. Análise de proporção despesas/receitas
    const expenseRatio = totals.income_cents > 0
      ? (totals.expense_cents / totals.income_cents) * 100
      : 100;

    if (expenseRatio <= 70) {
      factors.push({
        id: 'expense_ratio',
        label: 'Proporção de Despesas',
        status: 'good',
        value: `${expenseRatio.toFixed(0)}% das receitas`,
        recommendation: 'Excelente controle de custos! Margem saudável.',
      });
    } else if (expenseRatio <= 90) {
      score -= 15;
      factors.push({
        id: 'expense_ratio',
        label: 'Proporção de Despesas',
        status: 'warning',
        value: `${expenseRatio.toFixed(0)}% das receitas`,
        recommendation: 'Despesas estão altas. Revise gastos não essenciais.',
      });
    } else {
      score -= 30;
      factors.push({
        id: 'expense_ratio',
        label: 'Proporção de Despesas',
        status: 'critical',
        value: `${expenseRatio.toFixed(0)}% das receitas`,
        recommendation: 'ALERTA: Despesas consomem quase toda a receita. Corte custos urgentemente.',
      });
    }

    // 3. Análise de dívidas
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    let overdueDebts = 0;
    let nearDueDebts = 0;
    let totalDebtRemaining = 0;

    for (const debt of debts) {
      const remainingInstallments = debt.installment_count - debt.paid_installments;
      totalDebtRemaining += remainingInstallments * debt.installment_cents;

      if (remainingInstallments > 0 && debt.invoice_due_date) {
        const [baseYear, baseMonth, baseDay] = debt.invoice_due_date.split('-').map(Number);

        for (let i = debt.paid_installments; i < debt.installment_count; i++) {
          const dueDate = new Date(baseYear, baseMonth - 1 + i, baseDay);
          dueDate.setHours(0, 0, 0, 0);

          const diffDays = Math.floor((dueDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays < 0) {
            overdueDebts++;
          } else if (diffDays <= 7) {
            nearDueDebts++;
          }
        }
      }
    }

    if (overdueDebts > 0) {
      score -= 30;
      factors.push({
        id: 'overdue_debts',
        label: 'Dívidas Vencidas',
        status: 'critical',
        value: `${overdueDebts} parcela${overdueDebts > 1 ? 's' : ''} em atraso`,
        recommendation: 'URGENTE: Regularize as dívidas vencidas para evitar juros e negativação.',
      });
    } else if (nearDueDebts > 0) {
      score -= 10;
      factors.push({
        id: 'near_due_debts',
        label: 'Dívidas Próximas',
        status: 'warning',
        value: `${nearDueDebts} parcela${nearDueDebts > 1 ? 's' : ''} vencendo em 7 dias`,
        recommendation: 'Prepare-se para os pagamentos próximos. Reserve o valor necessário.',
      });
    } else {
      factors.push({
        id: 'debts_ok',
        label: 'Situação das Dívidas',
        status: 'good',
        value: 'Todas em dia',
        recommendation: 'Ótimo! Continue pagando em dia para manter o crédito.',
      });
    }

    // 4. Análise de fluxo de caixa
    const incomeCount = transactions.filter(t => t.type === 'income').length;
    const expenseCount = transactions.filter(t => t.type === 'expense').length;
    const daysPassed = today.getDate();
    const avgDailyIncome = totals.income_cents / daysPassed;
    const avgDailyExpense = totals.expense_cents / daysPassed;

    if (incomeCount >= daysPassed * 0.5) {
      factors.push({
        id: 'cash_flow',
        label: 'Frequência de Vendas',
        status: 'good',
        value: `${incomeCount} entradas em ${daysPassed} dias`,
        recommendation: 'Bom fluxo de vendas! Mantenha a consistência.',
      });
    } else if (incomeCount >= daysPassed * 0.25) {
      score -= 10;
      factors.push({
        id: 'cash_flow',
        label: 'Frequência de Vendas',
        status: 'warning',
        value: `${incomeCount} entradas em ${daysPassed} dias`,
        recommendation: 'Vendas poderiam ser mais frequentes. Invista em marketing.',
      });
    } else {
      score -= 20;
      factors.push({
        id: 'cash_flow',
        label: 'Frequência de Vendas',
        status: 'critical',
        value: `Apenas ${incomeCount} entradas em ${daysPassed} dias`,
        recommendation: 'Poucas vendas! Revise sua estratégia comercial urgentemente.',
      });
    }

    // 5. Análise de diversificação
    const categories = new Set(
      transactions
        .filter(t => t.type === 'income')
        .map(t => getCategoryGroupKey(businessType, t.category, t.description, 'Outros'))
    );
    if (categories.size >= 3) {
      factors.push({
        id: 'diversification',
        label: 'Diversificação de Receitas',
        status: 'good',
        value: `${categories.size} fontes diferentes`,
        recommendation: 'Boa diversificação! Isso reduz riscos.',
      });
    } else if (categories.size >= 2) {
      factors.push({
        id: 'diversification',
        label: 'Diversificação de Receitas',
        status: 'warning',
        value: `${categories.size} fontes de receita`,
        recommendation: 'Considere diversificar suas fontes de receita.',
      });
    } else {
      score -= 10;
      factors.push({
        id: 'diversification',
        label: 'Diversificação de Receitas',
        status: 'critical',
        value: 'Receita concentrada',
        recommendation: 'RISCO: Depender de uma única fonte é perigoso. Diversifique!',
      });
    }

    // Determinar status geral
    let status: 'green' | 'yellow' | 'red' = 'green';
    if (score < 50) status = 'red';
    else if (score < 75) status = 'yellow';

    return { status, score: Math.max(0, score), factors };
  };

  const health = calculateHealth();

  const getStatusColor = (status: 'green' | 'yellow' | 'red' | 'good' | 'warning' | 'critical') => {
    switch (status) {
      case 'green':
      case 'good':
        return '#16A34A';
      case 'yellow':
      case 'warning':
        return '#F59E0B';
      case 'red':
      case 'critical':
        return '#D90429';
      default:
        return '#6B7280';
    }
  };

  const getStatusEmoji = (status: 'green' | 'yellow' | 'red') => {
    switch (status) {
      case 'green': return '🟢';
      case 'yellow': return '🟡';
      case 'red': return '🔴';
    }
  };

  const getStatusMessage = (status: 'green' | 'yellow' | 'red') => {
    switch (status) {
      case 'green': return 'Sua empresa está saudável!';
      case 'yellow': return 'Atenção: alguns pontos precisam de cuidado';
      case 'red': return 'Alerta: situação crítica, ação imediata necessária';
    }
  };

  const monthName = new Date(year, month - 1, 1).toLocaleString('pt-BR', { month: 'long' });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenTitle
          title="Diagnóstico Financeiro"
          subtitle={`Análise de ${monthName} ${year}`}
        />

        <FeatureBanner {...FEATURE_BANNERS.diagnostic} />

        {/* Card de Status Geral */}
        <View style={[styles.statusCard, { backgroundColor: getStatusColor(health.status), borderColor: getStatusColor(health.status) }]}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusEmoji}>{getStatusEmoji(health.status)}</Text>
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>Saúde Financeira</Text>
              <Text style={styles.statusScore}>Pontuação: {health.score}/100</Text>
            </View>
          </View>
          <Text style={styles.statusMessage}>{getStatusMessage(health.status)}</Text>
        </View>

        {/* Resumo Rápido */}
        <View style={[styles.summaryRow, { backgroundColor: theme.card }]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Entradas</Text>
            <Text style={[styles.summaryValue, { color: '#16A34A' }]}>{formatCentsBRL(totals.income_cents)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Saídas</Text>
            <Text style={[styles.summaryValue, { color: '#D90429' }]}>{formatCentsBRL(totals.expense_cents)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Saldo</Text>
            <Text style={[styles.summaryValue, { color: totals.balance_cents >= 0 ? '#16A34A' : '#D90429' }]}>
              {formatCentsBRL(totals.balance_cents)}
            </Text>
          </View>
        </View>

        {/* Fatores de Análise */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          📊 Análise Detalhada
        </Text>

        {health.factors.map((factor) => (
          <View
            key={factor.id}
            style={[
              styles.factorCard,
              {
                backgroundColor: theme.card,
                borderLeftColor: getStatusColor(factor.status),
              }
            ]}
          >
            <View style={styles.factorHeader}>
              <Text style={[styles.factorLabel, { color: theme.text }]}>
                {factor.label}
              </Text>
              <View style={[styles.factorBadge, { backgroundColor: getStatusColor(factor.status) + '20' }]}>
                <Text style={[styles.factorBadgeText, { color: getStatusColor(factor.status) }]}>
                  {factor.status === 'good' ? '✓ Bom' : factor.status === 'warning' ? '⚠ Atenção' : '✗ Crítico'}
                </Text>
              </View>
            </View>
            <Text style={[styles.factorValue, { color: getStatusColor(factor.status) }]}>
              {factor.value}
            </Text>
            <View style={[styles.recommendationBox, { backgroundColor: theme.background }]}>
              <Text style={[styles.recommendationLabel, { color: theme.textSecondary }]}>
                💡 Recomendação:
              </Text>
              <Text style={[styles.recommendationText, { color: theme.text }]}>
                {factor.recommendation}
              </Text>
            </View>
          </View>
        ))}

        {/* Ações Sugeridas */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          🎯 Próximos Passos
        </Text>

        <View style={[styles.actionsCard, { backgroundColor: theme.card }]}>
          {health.status === 'red' && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#D90429' }]}
                onPress={() => navigation.navigate('Dívidas')}
              >
                <Text style={styles.actionButtonText}>📋 Revisar Dívidas</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#F59E0B' }]}
                onPress={() => navigation.navigate('Relatórios')}
              >
                <Text style={styles.actionButtonText}>📊 Ver Relatórios</Text>
              </TouchableOpacity>
            </>
          )}

          {health.status === 'yellow' && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#F59E0B' }]}
                onPress={() => navigation.navigate('Dashboard')}
              >
                <Text style={styles.actionButtonText}>🎯 Definir Meta</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
                onPress={() => navigation.navigate('Despesas Recorrentes')}
              >
                <Text style={styles.actionButtonText}>🔄 Revisar Despesas Fixas</Text>
              </TouchableOpacity>
            </>
          )}

          {health.status === 'green' && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#16A34A' }]}
                onPress={() => navigation.navigate('Relatórios')}
              >
                <Text style={styles.actionButtonText}>📊 Relatório para Contador</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#6366F1' }]}
                onPress={() => navigation.navigate('Dashboard')}
              >
                <Text style={styles.actionButtonText}>📈 Ver Dashboard</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
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
    paddingBottom: 32,
  },
  statusCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusEmoji: {
    fontSize: 48,
    marginRight: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  statusScore: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  statusMessage: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
    marginTop: 8,
  },
  factorCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  factorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  factorLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  factorBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  factorBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  factorValue: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  recommendationBox: {
    padding: 12,
    borderRadius: 8,
  },
  recommendationLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 13,
    lineHeight: 18,
  },
  actionsCard: {
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  actionButton: {
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
