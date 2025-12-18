import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useQuery } from '@tanstack/react-query';
import { getTransactionsByMonth, getMonthlyTotals } from '../repositories/transactions';
import { getGoalByMonth } from '../repositories/financial_goals';
import { getCurrentCompanyId } from '../lib/company';
import { todayYMD, addDays } from '../utils/date';
import { formatCentsBRL } from '../utils/money';
import { useResolvedBusinessType } from '../hooks/useSegmentCategories';
import { getCategoryGroupKey } from '../utils/segment';

interface SmartAlert {
  id: string;
  type: 'warning' | 'danger' | 'info';
  icon: string;
  title: string;
  message: string;
  action?: {
    label: string;
    screen: string;
  };
}

interface SmartAlertsProps {
  navigation?: any;
  compact?: boolean;
}

export default function SmartAlerts({ navigation, compact = false }: SmartAlertsProps) {
  const { theme } = useThemeCtx();
  const today = todayYMD();
  const [year, month] = today.split('-').map(Number);
  const businessType = useResolvedBusinessType();

  // Query para verificar dias sem lançamentos
  const daysWithoutTxQuery = useQuery({
    queryKey: ['days-without-transactions', today],
    queryFn: async () => {
      let consecutiveDays = 0;
      
      for (let i = 1; i <= 7; i++) {
        const date = addDays(today, -i);
        const { getTransactionsByDate } = await import('../repositories/transactions');
        const transactions = await getTransactionsByDate(date);
        
        if (transactions.length === 0) {
          consecutiveDays++;
        } else {
          break;
        }
      }
      
      return consecutiveDays;
    },
  });

  // Query para verificar meta ativa
  const goalQuery = useQuery({
    queryKey: ['smart-alerts-goal', year, month],
    queryFn: async () => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return null;
      const monthStr = `${year}-${String(month).padStart(2, '0')}-01`;
      return getGoalByMonth(companyId, monthStr);
    },
  });

  // Query para verificar categorias com aumento
  const categoryAlertsQuery = useQuery({
    queryKey: ['category-alerts', year, month, businessType],
    queryFn: async () => {
      const alerts: { category: string; increase: number; current: number; average: number }[] = [];
      
      // Buscar transações dos últimos 3 meses
      const monthsData: Record<string, Record<string, number>> = {};
      
      for (let i = 0; i < 3; i++) {
        const m = month - i;
        const y = m <= 0 ? year - 1 : year;
        const adjustedMonth = m <= 0 ? 12 + m : m;
        const key = `${y}-${adjustedMonth}`;
        
        const transactions = await getTransactionsByMonth(y, adjustedMonth);
        monthsData[key] = {};
        
        transactions
          .filter(tx => tx.type === 'expense')
          .forEach(tx => {
            const cat = getCategoryGroupKey(businessType, tx.category, tx.description, 'Outros');
            monthsData[key][cat] = (monthsData[key][cat] || 0) + tx.amount_cents;
          });
      }

      // Comparar mês atual com média dos anteriores
      const currentMonthKey = `${year}-${month}`;
      const currentData = monthsData[currentMonthKey] || {};
      
      const previousMonths = Object.keys(monthsData).filter(k => k !== currentMonthKey);
      
      for (const category of Object.keys(currentData)) {
        const currentValue = currentData[category];
        
        // Calcular média dos meses anteriores
        let totalPrevious = 0;
        let countPrevious = 0;
        
        for (const prevKey of previousMonths) {
          if (monthsData[prevKey][category]) {
            totalPrevious += monthsData[prevKey][category];
            countPrevious++;
          }
        }
        
        if (countPrevious > 0) {
          const average = totalPrevious / countPrevious;
          const increase = ((currentValue - average) / average) * 100;
          
          if (increase > 30) {
            alerts.push({
              category,
              increase,
              current: currentValue,
              average,
            });
          }
        }
      }
      
      return alerts.sort((a, b) => b.increase - a.increase).slice(0, 3);
    },
  });

  // Montar lista de alertas
  const alerts: SmartAlert[] = [];

  // Alerta de dias sem lançamentos
  const daysWithout = daysWithoutTxQuery.data || 0;
  const hasGoal = goalQuery.data?.target_amount_cents && goalQuery.data.target_amount_cents > 0;
  
  if (daysWithout >= 3 && hasGoal) {
    alerts.push({
      id: 'days-without-tx',
      type: 'warning',
      icon: '📝',
      title: `${daysWithout} dias sem registros`,
      message: 'Você tem uma meta ativa mas está há alguns dias sem lançar. Quer registrar agora ou ajustar sua meta?',
      action: { label: 'Registrar agora', screen: 'Lançamentos' },
    });
  } else if (daysWithout >= 5) {
    alerts.push({
      id: 'days-without-tx',
      type: 'danger',
      icon: '⚠️',
      title: `${daysWithout} dias sem registros`,
      message: 'Manter os registros em dia é essencial para o controle financeiro. Que tal atualizar agora?',
      action: { label: 'Registrar agora', screen: 'Lançamentos' },
    });
  }

  // Alertas de categorias com aumento
  const categoryAlerts = categoryAlertsQuery.data || [];
  if (categoryAlerts.length > 0) {
    const topAlert = categoryAlerts[0];
    alerts.push({
      id: 'category-increase',
      type: 'warning',
      icon: '📊',
      title: `Gastos com "${topAlert.category}" subiram`,
      message: `Seus gastos com ${topAlert.category} estão ${topAlert.increase.toFixed(0)}% acima da média (${formatCentsBRL(topAlert.current)} vs média de ${formatCentsBRL(topAlert.average)}). Vale revisar!`,
      action: { label: 'Ver categorias', screen: 'Relatórios' },
    });
  }

  if (alerts.length === 0) return null;

  const getAlertColors = (type: SmartAlert['type']) => {
    switch (type) {
      case 'danger':
        return { bg: '#FEE2E2', border: '#D90429', text: '#991B1B' };
      case 'warning':
        return { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' };
      case 'info':
        return { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF' };
    }
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        {alerts.slice(0, 1).map(alert => {
          const colors = getAlertColors(alert.type);
          return (
            <TouchableOpacity
              key={alert.id}
              style={[styles.compactAlert, { backgroundColor: colors.bg, borderColor: colors.border }]}
              onPress={() => alert.action && navigation?.navigate(alert.action.screen)}
            >
              <Text style={styles.compactIcon}>{alert.icon}</Text>
              <Text style={[styles.compactText, { color: colors.text }]} numberOfLines={2}>
                {alert.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.card }]}>
      <Text style={[styles.title, { color: theme.text }]}>
        🔔 Alertas Inteligentes
      </Text>

      {alerts.map(alert => {
        const colors = getAlertColors(alert.type);
        return (
          <View
            key={alert.id}
            style={[styles.alertCard, { backgroundColor: colors.bg, borderLeftColor: colors.border }]}
          >
            <View style={styles.alertHeader}>
              <Text style={styles.alertIcon}>{alert.icon}</Text>
              <Text style={[styles.alertTitle, { color: colors.text }]}>{alert.title}</Text>
            </View>
            <Text style={[styles.alertMessage, { color: colors.text }]}>
              {alert.message}
            </Text>
            {alert.action && (
              <TouchableOpacity
                style={[styles.alertButton, { backgroundColor: colors.border }]}
                onPress={() => navigation?.navigate(alert.action!.screen)}
              >
                <Text style={styles.alertButtonText}>{alert.action.label}</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </View>
  );
}

// Componente para explicar motivos do semáforo
export function HealthExplanation({ 
  status, 
  factors,
  navigation,
}: { 
  status: 'green' | 'yellow' | 'red';
  factors: { id: string; label: string; status: string; recommendation: string }[];
  navigation?: any;
}) {
  const { theme } = useThemeCtx();

  if (status === 'green') return null;

  const criticalFactors = factors.filter(f => f.status === 'critical');
  const warningFactors = factors.filter(f => f.status === 'warning');

  return (
    <View style={[explainStyles.container, { backgroundColor: theme.card }]}>
      <TouchableOpacity
        style={[explainStyles.header, { backgroundColor: status === 'red' ? '#FEE2E2' : '#FEF3C7' }]}
        onPress={() => navigation?.navigate('Diagnóstico Financeiro')}
      >
        <Text style={explainStyles.headerIcon}>
          {status === 'red' ? '🔴' : '🟡'}
        </Text>
        <View style={explainStyles.headerContent}>
          <Text style={[explainStyles.headerTitle, { color: status === 'red' ? '#991B1B' : '#92400E' }]}>
            {status === 'red' ? 'Situação crítica' : 'Atenção necessária'}
          </Text>
          <Text style={[explainStyles.headerSubtitle, { color: status === 'red' ? '#991B1B' : '#92400E' }]}>
            Toque para ver o diagnóstico completo
          </Text>
        </View>
        <Text style={explainStyles.headerArrow}>→</Text>
      </TouchableOpacity>

      {/* Motivos principais */}
      <View style={explainStyles.reasons}>
        <Text style={[explainStyles.reasonsTitle, { color: theme.text }]}>
          📋 Por que isso está acontecendo:
        </Text>
        
        {criticalFactors.slice(0, 2).map(factor => (
          <View key={factor.id} style={[explainStyles.reasonItem, { backgroundColor: '#FEE2E2' }]}>
            <Text style={explainStyles.reasonIcon}>❌</Text>
            <View style={explainStyles.reasonContent}>
              <Text style={[explainStyles.reasonLabel, { color: '#991B1B' }]}>{factor.label}</Text>
              <Text style={[explainStyles.reasonText, { color: '#991B1B' }]}>{factor.recommendation}</Text>
            </View>
          </View>
        ))}
        
        {warningFactors.slice(0, 2).map(factor => (
          <View key={factor.id} style={[explainStyles.reasonItem, { backgroundColor: '#FEF3C7' }]}>
            <Text style={explainStyles.reasonIcon}>⚠️</Text>
            <View style={explainStyles.reasonContent}>
              <Text style={[explainStyles.reasonLabel, { color: '#92400E' }]}>{factor.label}</Text>
              <Text style={[explainStyles.reasonText, { color: '#92400E' }]}>{factor.recommendation}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Sugestões práticas */}
      <View style={[explainStyles.suggestions, { backgroundColor: theme.background }]}>
        <Text style={[explainStyles.suggestionsTitle, { color: theme.text }]}>
          💡 Sugestões práticas:
        </Text>
        
        {status === 'red' && (
          <>
            <Text style={[explainStyles.suggestionItem, { color: theme.textSecondary }]}>
              • Crie uma meta específica para reduzir despesas fixas em 10% nos próximos 3 meses
            </Text>
            <Text style={[explainStyles.suggestionItem, { color: theme.textSecondary }]}>
              • Revise contratos e negocie com fornecedores
            </Text>
          </>
        )}
        
        {status === 'yellow' && (
          <>
            <Text style={[explainStyles.suggestionItem, { color: theme.textSecondary }]}>
              • Ative lembretes diários de registro de movimento
            </Text>
            <Text style={[explainStyles.suggestionItem, { color: theme.textSecondary }]}>
              • Acompanhe o semáforo semanalmente para ver a evolução
            </Text>
          </>
        )}
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
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
  },
  alertCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  alertIcon: {
    fontSize: 18,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  alertMessage: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  alertButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  alertButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  // Compact styles
  compactContainer: {
    marginBottom: 12,
  },
  compactAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  compactIcon: {
    fontSize: 16,
  },
  compactText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
});

const explainStyles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  headerIcon: {
    fontSize: 24,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  headerArrow: {
    fontSize: 18,
    color: '#6B7280',
  },
  reasons: {
    padding: 14,
  },
  reasonsTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  reasonItem: {
    flexDirection: 'row',
    gap: 10,
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  reasonIcon: {
    fontSize: 14,
  },
  reasonContent: {
    flex: 1,
  },
  reasonLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  reasonText: {
    fontSize: 11,
    lineHeight: 16,
  },
  suggestions: {
    padding: 14,
    margin: 14,
    marginTop: 0,
    borderRadius: 10,
  },
  suggestionsTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  suggestionItem: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
});
