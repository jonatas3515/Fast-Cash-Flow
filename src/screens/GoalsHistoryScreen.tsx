import React from 'react';
import { View, Text, FlatList, StyleSheet, useWindowDimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getGoalsByCompany } from '../repositories/financial_goals';
import { getMonthlyTotals } from '../repositories/transactions';
import { getCurrentCompanyId } from '../lib/company';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useI18n } from '../i18n/I18nProvider';
import ScreenTitle from '../components/ScreenTitle';

interface GoalHistoryItem {
  id: string;
  month: string;
  year: string;
  target_cents: number;
  achieved_cents: number;
  percent: number;
  status: 'Atingida' | 'Não atingida';
  monthLabel: string;
}

export default function GoalsHistoryScreen() {
  const { theme } = useThemeCtx();
  const { formatMoney } = useI18n();
  const { width } = useWindowDimensions();
  const isWideWeb = width >= 1024;

  // Query para buscar metas da empresa
  const goalsQuery = useQuery({
    queryKey: ['goals-history'],
    queryFn: async () => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return [];
      
      const goals = await getGoalsByCompany(companyId);
      const history: GoalHistoryItem[] = [];

      // Para cada meta, buscar o total do mês e calcular status
      for (const goal of goals) {
        try {
          // Extrair ano e mês do formato YYYY-MM-01
          const [year, month] = goal.month.split('-');
          const monthTotals = await getMonthlyTotals(parseInt(year), parseInt(month));
          const achieved = monthTotals?.income_cents || 0;
          const percent = goal.target_amount_cents > 0 ? Math.round((achieved / goal.target_amount_cents) * 100) : 0;
          
          const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
          const monthLabel = `${monthNames[parseInt(month) - 1]} ${year}`;

          history.push({
            id: goal.id,
            month,
            year,
            target_cents: goal.target_amount_cents,
            achieved_cents: achieved,
            percent,
            status: achieved >= goal.target_amount_cents ? 'Atingida' : 'Não atingida',
            monthLabel
          });
        } catch (error) {
          console.error(`Erro ao buscar totais para ${goal.month}:`, error);
        }
      }

      // Ordenar por data (mais recente primeiro)
      return history.sort((a, b) => {
        const dateA = new Date(parseInt(a.year), parseInt(a.month) - 1);
        const dateB = new Date(parseInt(b.year), parseInt(b.month) - 1);
        return dateB.getTime() - dateA.getTime();
      });
    },
  });

  const renderGoalItem = ({ item }: { item: GoalHistoryItem }) => (
    <View style={[
      styles.goalItem, 
      { 
        backgroundColor: theme.card,
        borderColor: item.status === 'Atingida' ? '#16a34a' : '#ef4444',
        borderWidth: 1
      }
    ]}>
      <View style={styles.goalHeader}>
        <Text style={[styles.monthLabel, { color: theme.text }]}>
          {item.monthLabel}
        </Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.status === 'Atingida' ? '#dcfce7' : '#fee2e2' }
        ]}>
          <Text style={[
            styles.statusText,
            { color: item.status === 'Atingida' ? '#166534' : '#991b1b' }
          ]}>
            {item.status}
          </Text>
        </View>
      </View>
      
      <View style={styles.goalDetails}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Meta definida:</Text>
          <Text style={[styles.detailValue, { color: theme.text }]}>
            {formatMoney(item.target_cents)}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Resultado:</Text>
          <Text style={[styles.detailValue, { color: theme.text }]}>
            {formatMoney(item.achieved_cents)}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Percentual:</Text>
          <Text style={[
            styles.detailValue,
            { color: item.status === 'Atingida' ? '#16a34a' : '#ef4444' }
          ]}>
            {item.percent}%
          </Text>
        </View>
      </View>
      
      {/* Barra de progresso */}
      <View style={styles.progressBar}>
        <View style={styles.progressBackground}>
          <View style={[
            styles.progressFill,
            {
              width: `${Math.min(100, item.percent)}%`,
              backgroundColor: item.status === 'Atingida' ? '#16a34a' : '#ef4444'
            }
          ]} />
        </View>
      </View>
    </View>
  );

  if (goalsQuery.isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScreenTitle title="Histórico de Metas" subtitle="Carregando..." />
        <View style={styles.loadingContainer}>
          <Text style={{ color: theme.text }}>Carregando histórico de metas...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenTitle 
        title="Histórico de Metas" 
        subtitle="Acompanhe suas metas financeiras mensais" 
      />
      
      <View style={styles.content}>
        {goalsQuery.data?.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              🎯 Nenhuma meta encontrada
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
              Defina metas financeiras no dashboard para acompanhar seu histórico aqui.
            </Text>
          </View>
        ) : (
          <FlatList
            data={goalsQuery.data}
            renderItem={renderGoalItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={true}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContainer: {
    gap: 12,
    paddingBottom: 20,
  },
  goalItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  goalDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressBar: {
    marginTop: 8,
  },
  progressBackground: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});
