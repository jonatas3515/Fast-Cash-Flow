import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useNavigation } from '@react-navigation/native';
import { formatCentsBRL } from '../utils/money';

interface BusinessHealthData {
  income_cents: number;
  expense_cents: number;
  balance_cents: number;
  overdueDebtsCount: number;
  nearDueDebtsCount: number; // Vencendo em até 3 dias
}

interface BusinessHealthCardProps {
  data: BusinessHealthData;
  period?: string; // Ex: "Dezembro 2024"
}

type HealthStatus = 'green' | 'yellow' | 'red';

interface HealthAnalysis {
  status: HealthStatus;
  title: string;
  message: string;
  tips: string[];
  icon: string;
}

function analyzeHealth(data: BusinessHealthData): HealthAnalysis {
  const { income_cents, expense_cents, balance_cents, overdueDebtsCount, nearDueDebtsCount } = data;
  
  // Calcular proporção de saídas vs entradas
  const expenseRatio = income_cents > 0 ? (expense_cents / income_cents) * 100 : 100;
  const hasProfit = balance_cents > 0;
  const hasSmallProfit = balance_cents > 0 && balance_cents < income_cents * 0.1; // Lucro menor que 10%
  const hasLoss = balance_cents < 0;
  const hasOverdueDebts = overdueDebtsCount > 0;
  const hasNearDueDebts = nearDueDebtsCount > 0;

  // VERMELHO: Situação crítica
  // - Prejuízo no período
  // - Saídas > 90% das entradas
  // - Dívidas vencidas
  if (hasLoss || expenseRatio > 90 || hasOverdueDebts) {
    const tips: string[] = [];
    
    if (hasLoss) {
      tips.push('Reduza gastos não essenciais imediatamente');
      tips.push('Busque aumentar vendas ou renegociar custos');
    }
    if (expenseRatio > 90) {
      tips.push('Suas despesas estão consumindo quase toda a receita');
      tips.push('Revise contratos e fornecedores');
    }
    if (hasOverdueDebts) {
      tips.push(`Você tem ${overdueDebtsCount} dívida(s) vencida(s)`);
      tips.push('Priorize a regularização para evitar juros');
    }

    let message = '';
    if (hasLoss) {
      message = `Prejuízo de ${formatCentsBRL(Math.abs(balance_cents))} no período. Atenção urgente necessária!`;
    } else if (hasOverdueDebts) {
      message = `Você tem ${overdueDebtsCount} conta(s) vencida(s). Regularize para evitar juros e multas.`;
    } else {
      message = `Despesas em ${expenseRatio.toFixed(0)}% da receita. Margem muito apertada!`;
    }

    return {
      status: 'red',
      title: 'Atenção Urgente',
      message,
      tips,
      icon: '🔴',
    };
  }

  // AMARELO: Situação de alerta
  // - Lucro pequeno ou zerado
  // - Saídas entre 70% e 90% das entradas
  // - Contas próximas do vencimento
  if (hasSmallProfit || (expenseRatio >= 70 && expenseRatio <= 90) || hasNearDueDebts) {
    const tips: string[] = [];
    
    if (hasSmallProfit) {
      tips.push('Sua margem de lucro está baixa');
      tips.push('Considere aumentar preços ou reduzir custos');
    }
    if (expenseRatio >= 70) {
      tips.push(`Despesas em ${expenseRatio.toFixed(0)}% da receita`);
      tips.push('Tente manter abaixo de 70% para maior segurança');
    }
    if (hasNearDueDebts) {
      tips.push(`${nearDueDebtsCount} conta(s) vencem nos próximos dias`);
      tips.push('Prepare-se para os pagamentos');
    }

    let message = '';
    if (hasNearDueDebts) {
      message = `${nearDueDebtsCount} conta(s) vencem em breve. Fique atento aos prazos!`;
    } else if (hasSmallProfit) {
      message = `Lucro de apenas ${formatCentsBRL(balance_cents)}. Margem apertada este período.`;
    } else {
      message = `Despesas em ${expenseRatio.toFixed(0)}% da receita. Cuidado com os gastos!`;
    }

    return {
      status: 'yellow',
      title: 'Fique Atento',
      message,
      tips,
      icon: '🟡',
    };
  }

  // VERDE: Situação saudável
  // - Lucro positivo
  // - Saídas <= 70% das entradas
  // - Sem dívidas vencidas ou próximas
  const tips: string[] = [
    'Continue monitorando suas finanças',
    'Considere investir parte do lucro',
    'Mantenha uma reserva de emergência',
  ];

  return {
    status: 'green',
    title: 'Tudo Certo!',
    message: `Lucro de ${formatCentsBRL(balance_cents)} no período. Despesas controladas em ${expenseRatio.toFixed(0)}% da receita.`,
    tips,
    icon: '🟢',
  };
}

export default function BusinessHealthCard({ data, period }: BusinessHealthCardProps) {
  const { theme } = useThemeCtx();
  const navigation = useNavigation<any>();
  const [expanded, setExpanded] = React.useState(false);

  const analysis = analyzeHealth(data);

  const statusColors = {
    green: { bg: '#10B98120', border: '#10B981', text: '#10B981' },
    yellow: { bg: '#F59E0B20', border: '#F59E0B', text: '#F59E0B' },
    red: { bg: '#EF444420', border: '#EF4444', text: '#EF4444' },
  };

  const colors = statusColors[analysis.status];

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        { 
          backgroundColor: colors.bg, 
          borderColor: colors.border,
        }
      ]}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.icon}>{analysis.icon}</Text>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>
              Saúde do Negócio
            </Text>
            {period && (
              <Text style={[styles.period, { color: theme.textSecondary }]}>
                {period}
              </Text>
            )}
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: colors.border }]}>
          <Text style={styles.statusText}>{analysis.title}</Text>
        </View>
      </View>

      <Text style={[styles.message, { color: theme.text }]}>
        {analysis.message}
      </Text>

      {/* Botão "Ver por quê" destacado para status amarelo/vermelho */}
      {analysis.status !== 'green' && !expanded && (
        <TouchableOpacity 
          style={[styles.whyButton, { backgroundColor: colors.border }]}
          onPress={() => navigation.navigate('Diagnóstico Financeiro' as never)}
        >
          <Text style={styles.whyButtonText}>
            🔍 Ver por quê →
          </Text>
        </TouchableOpacity>
      )}

      {expanded && (
        <View style={styles.tipsContainer}>
          <Text style={[styles.tipsTitle, { color: theme.textSecondary }]}>
            💡 Dicas:
          </Text>
          {analysis.tips.map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <Text style={[styles.tipBullet, { color: colors.text }]}>•</Text>
              <Text style={[styles.tipText, { color: theme.text }]}>{tip}</Text>
            </View>
          ))}
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.border }]}
            onPress={() => navigation.navigate('Diagnóstico Financeiro' as never)}
          >
            <Text style={styles.actionButtonText}>
              📊 Ver Diagnóstico Completo →
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.expandHint}>
        <Text style={[styles.expandText, { color: theme.textSecondary }]}>
          {expanded ? '▲ Menos detalhes' : '▼ Mais detalhes'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// Versão compacta para uso em listas
export function BusinessHealthBadge({ data }: { data: BusinessHealthData }) {
  const analysis = analyzeHealth(data);
  
  const statusColors = {
    green: '#10B981',
    yellow: '#F59E0B',
    red: '#EF4444',
  };

  return (
    <View style={[styles.badge, { backgroundColor: statusColors[analysis.status] }]}>
      <Text style={styles.badgeIcon}>{analysis.icon}</Text>
      <Text style={styles.badgeText}>{analysis.title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 28,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  period: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  tipsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  tipBullet: {
    fontSize: 14,
    marginRight: 8,
    fontWeight: '700',
  },
  tipText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  actionButton: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  whyButton: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  whyButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  expandHint: {
    alignItems: 'center',
    marginTop: 8,
  },
  expandText: {
    fontSize: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});
