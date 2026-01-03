import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { supabase } from '../lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCurrentCompanyId } from '../lib/company';

interface OnboardingStep {
  key: string;
  title: string;
  description: string;
  icon: string;
  completed: boolean;
  action?: () => void;
}

interface OnboardingChecklistProps {
  navigation: any;
  onDismiss?: () => void;
  compact?: boolean;
}

export default function OnboardingChecklist({
  navigation,
  onDismiss,
  compact = false
}: OnboardingChecklistProps) {
  const { theme, mode } = useThemeCtx();
  const isDark = mode === 'dark';
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(!compact);
  const [animatedHeight] = useState(new Animated.Value(compact ? 0 : 1));

  // Usar cores do tema diretamente
  const colors = {
    background: theme.card,
    border: theme.border,
    text: theme.text,
    textSecondary: theme.textSecondary,
    accent: theme.primary,
    success: theme.positive,
    warning: theme.warning,
    progressBg: theme.border,
  };

  // Query para buscar progresso do onboarding
  const { data: progress, isLoading } = useQuery({
    queryKey: ['onboarding-progress'],
    queryFn: async () => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return null;

      // SEMPRE calcular baseado nos dados reais (não usar cache da tabela)
      const [
        { count: transactionCount },
        { count: categoryCount },
        { count: goalCount },
        { count: recurringCount },
        { data: companyData },
      ] = await Promise.all([
        supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('company_id', companyId).is('deleted_at', null),
        supabase.from('categories').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('financial_goals').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('recurring_expenses').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('companies').select('name, logo_url').eq('id', companyId).single(),
      ]);

      // Verificar se perfil está completo (tem nome é suficiente)
      const profile_completed = !!(companyData?.name && companyData.name.trim().length > 0);
      const first_transactions = (transactionCount ?? 0) >= 5;
      const categories_configured = (categoryCount ?? 0) >= 3;
      const first_goal_created = (goalCount ?? 0) >= 1;
      const recurring_expense_added = (recurringCount ?? 0) >= 1;

      // Considerar relatório gerado se tem pelo menos 5 transações
      let first_report_generated = false;
      if (Platform.OS === 'web') {
        try {
          const reportFlag = window.localStorage.getItem(`report_generated_${companyId}`);
          first_report_generated = reportFlag === 'true' || (transactionCount ?? 0) >= 5;
        } catch {
          first_report_generated = (transactionCount ?? 0) >= 5;
        }
      } else {
        first_report_generated = (transactionCount ?? 0) >= 5;
      }

      const completed_steps = [
        profile_completed,
        first_transactions,
        categories_configured,
        first_goal_created,
        recurring_expense_added,
        first_report_generated,
      ].filter(Boolean).length;

      return {
        profile_completed,
        first_transactions,
        categories_configured,
        first_goal_created,
        recurring_expense_added,
        first_report_generated,
        completed_steps,
        total_steps: 6,
        completion_percent: Math.round((completed_steps / 6) * 100),
        bonus_days_earned: completed_steps === 6 ? 7 : 0,
        bonus_applied: false,
      };
    },
    refetchInterval: 30000,
  });

  // Definir os passos do onboarding
  const steps: OnboardingStep[] = [
    {
      key: 'profile',
      title: 'Complete seu perfil',
      description: 'Adicione o nome e logo da sua empresa',
      icon: '👤',
      completed: progress?.profile_completed ?? false,
      action: () => navigation.navigate('Configuração'),
    },
    {
      key: 'transactions',
      title: 'Registre 5 lançamentos',
      description: 'Comece a controlar suas finanças',
      icon: '💰',
      completed: progress?.first_transactions ?? false,
      action: () => navigation.navigate('Dashboard'),
    },
    {
      key: 'categories',
      title: 'Configure suas categorias',
      description: 'Personalize com pelo menos 3 categorias',
      icon: '🏷️',
      completed: progress?.categories_configured ?? false,
      action: () => navigation.navigate('Categorias'),
    },
    {
      key: 'goal',
      title: 'Defina uma meta financeira',
      description: 'Estabeleça seu primeiro objetivo',
      icon: '🎯',
      completed: progress?.first_goal_created ?? false,
      action: () => navigation.navigate('Goals'),
    },
    {
      key: 'recurring',
      title: 'Cadastre despesa recorrente',
      description: 'Automatize seus gastos fixos',
      icon: '🔄',
      completed: progress?.recurring_expense_added ?? false,
      action: () => navigation.navigate('Recurring'),
    },
    {
      key: 'report',
      title: 'Gere seu primeiro relatório',
      description: 'Visualize seus dados em gráficos',
      icon: '📊',
      completed: progress?.first_report_generated ?? false,
      action: () => navigation.navigate('Reports'),
    },
  ];

  const completedCount = progress?.completed_steps ?? 0;
  const totalSteps = 6;
  const progressPercent = progress?.completion_percent ?? 0;
  const isComplete = completedCount === totalSteps;
  const bonusDays = progress?.bonus_days_earned ?? 0;

  // Toggle expandir/recolher
  const toggleExpanded = () => {
    const toValue = expanded ? 0 : 1;
    Animated.timing(animatedHeight, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setExpanded(!expanded);
  };

  // Se já completou tudo e não quer mostrar
  if (isComplete && onDismiss) {
    return null;
  }

  if (isLoading) {
    return null;
  }

  // Versão compacta (apenas barra de progresso)
  if (compact && !expanded) {
    return (
      <TouchableOpacity
        style={[styles.compactContainer, { backgroundColor: colors.background, borderColor: colors.border }]}
        onPress={toggleExpanded}
        activeOpacity={0.8}
      >
        <View style={styles.compactHeader}>
          <Text style={styles.compactIcon}>📋</Text>
          <View style={styles.compactInfo}>
            <Text style={[styles.compactTitle, { color: colors.text }]}>
              Primeiros Passos
            </Text>
            <Text style={[styles.compactSubtitle, { color: colors.textSecondary }]}>
              {completedCount}/{totalSteps} completos
            </Text>
          </View>
          <View style={styles.compactProgress}>
            <Text style={[styles.compactPercent, { color: colors.accent }]}>
              {progressPercent}%
            </Text>
          </View>
          <Text style={[styles.expandIcon, { color: colors.textSecondary }]}>▼</Text>
        </View>
        <View style={[styles.progressBar, { backgroundColor: colors.progressBg }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progressPercent}%`,
                backgroundColor: isComplete ? colors.success : colors.accent,
              }
            ]}
          />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcon}>📋</Text>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Primeiros Passos
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Complete para ganhar +7 dias grátis!
            </Text>
          </View>
        </View>
        {compact && (
          <TouchableOpacity onPress={toggleExpanded} style={styles.collapseButton}>
            <Text style={[styles.collapseIcon, { color: colors.textSecondary }]}>▲</Text>
          </TouchableOpacity>
        )}
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <Text style={[styles.dismissIcon, { color: colors.textSecondary }]}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Barra de Progresso */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressText, { color: colors.text }]}>
            Progresso: {completedCount}/{totalSteps}
          </Text>
          <Text style={[styles.progressPercent, { color: colors.accent }]}>
            {progressPercent}%
          </Text>
        </View>
        <View style={[styles.progressBar, { backgroundColor: colors.progressBg }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progressPercent}%`,
                backgroundColor: isComplete ? colors.success : colors.accent,
              }
            ]}
          />
        </View>
      </View>

      {/* Lista de Passos */}
      <View style={styles.stepsList}>
        {steps.map((step, index) => (
          <TouchableOpacity
            key={step.key}
            style={[
              styles.stepItem,
              { borderBottomColor: colors.border },
              index === steps.length - 1 && { borderBottomWidth: 0 },
            ]}
            onPress={step.action}
            disabled={step.completed}
            activeOpacity={0.7}
          >
            <View style={[
              styles.stepCheckbox,
              {
                backgroundColor: step.completed ? colors.success : 'transparent',
                borderColor: step.completed ? colors.success : colors.border,
              }
            ]}>
              {step.completed ? (
                <Text style={styles.checkmark}>✓</Text>
              ) : (
                <Text style={styles.stepIcon}>{step.icon}</Text>
              )}
            </View>
            <View style={styles.stepContent}>
              <Text style={[
                styles.stepTitle,
                {
                  color: step.completed ? colors.textSecondary : colors.text,
                  textDecorationLine: step.completed ? 'line-through' : 'none',
                }
              ]}>
                {step.title}
              </Text>
              <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
                {step.description}
              </Text>
            </View>
            {!step.completed && (
              <Text style={[styles.stepArrow, { color: colors.accent }]}>→</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Recompensa */}
      {isComplete ? (
        <View style={[styles.rewardBanner, { backgroundColor: colors.success + '20' }]}>
          <Text style={styles.rewardIcon}>🎉</Text>
          <View style={styles.rewardContent}>
            <Text style={[styles.rewardTitle, { color: colors.success }]}>
              Parabéns! Você ganhou +{bonusDays} dias grátis!
            </Text>
            <Text style={[styles.rewardText, { color: colors.textSecondary }]}>
              Seu período de trial foi estendido automaticamente.
            </Text>
          </View>
        </View>
      ) : (
        <View style={[styles.rewardBanner, { backgroundColor: colors.warning + '20' }]}>
          <Text style={styles.rewardIcon}>🎁</Text>
          <View style={styles.rewardContent}>
            <Text style={[styles.rewardTitle, { color: colors.warning }]}>
              Complete tudo e ganhe +7 dias grátis!
            </Text>
            <Text style={[styles.rewardText, { color: colors.textSecondary }]}>
              Faltam apenas {totalSteps - completedCount} passos.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  compactContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  compactIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  compactInfo: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  compactSubtitle: {
    fontSize: 11,
  },
  compactProgress: {
    marginRight: 8,
  },
  compactPercent: {
    fontSize: 14,
    fontWeight: '700',
  },
  expandIcon: {
    fontSize: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  collapseButton: {
    padding: 8,
  },
  collapseIcon: {
    fontSize: 14,
  },
  dismissButton: {
    padding: 8,
  },
  dismissIcon: {
    fontSize: 18,
  },
  progressSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  stepsList: {
    paddingHorizontal: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  stepCheckbox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  stepIcon: {
    fontSize: 16,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  stepDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  stepArrow: {
    fontSize: 18,
    fontWeight: '700',
  },
  rewardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
  },
  rewardIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  rewardContent: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  rewardText: {
    fontSize: 12,
    marginTop: 2,
  },
});
