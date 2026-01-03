import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { getCurrentCompanyId } from '../lib/company';
import * as SecureStore from 'expo-secure-store';

// Storage helper
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return window.localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      window.localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
};

interface WeeklyStep {
  id: string;
  day: number; // Dia da semana (1-7)
  title: string;
  description: string;
  icon: string;
  screen?: string;
  completed: boolean;
}

// Passos da primeira semana
const WEEKLY_STEPS_TEMPLATE: Omit<WeeklyStep, 'completed'>[] = [
  // Dia 1 - Configuração básica
  { id: 'w1_setup', day: 1, title: 'Configurar empresa', description: 'Nome, logo e dados básicos', icon: '🏢', screen: 'Configuração' },
  { id: 'w1_first_tx', day: 1, title: 'Primeiro lançamento', description: 'Registrar entrada ou saída', icon: '💰', screen: 'Dia' },

  // Dia 2 - Organização
  { id: 'w2_products', day: 2, title: 'Cadastrar produtos', description: 'Adicione seus produtos/serviços', icon: '📦', screen: 'Produtos' },
  { id: 'w2_categories', day: 2, title: 'Usar categorias', description: 'Categorize seus lançamentos', icon: '🏷️', screen: 'Dia' },

  // Dia 3 - Planejamento
  { id: 'w3_goal', day: 3, title: 'Definir meta mensal', description: 'Estabeleça sua meta de faturamento', icon: '🎯', screen: 'Dashboard' },
  { id: 'w3_debts', day: 3, title: 'Registrar dívidas', description: 'Adicione contas a pagar', icon: '📋', screen: 'Dívidas' },

  // Dia 4 - Controle
  { id: 'w4_recurring', day: 4, title: 'Despesas recorrentes', description: 'Configure gastos fixos mensais', icon: '🔄', screen: 'Despesas Recorrentes' },
  { id: 'w4_check_balance', day: 4, title: 'Verificar saldo', description: 'Confira seu saldo no Dashboard', icon: '📊', screen: 'Dashboard' },

  // Dia 5 - Análise
  { id: 'w5_report', day: 5, title: 'Gerar relatório', description: 'Veja seu primeiro relatório', icon: '📈', screen: 'Relatórios' },
  { id: 'w5_health', day: 5, title: 'Checar saúde financeira', description: 'Veja o semáforo no Dashboard', icon: '🚦', screen: 'Dashboard' },

  // Dia 6 - Avançado
  { id: 'w6_orders', day: 6, title: 'Explorar encomendas', description: 'Gerencie pedidos de clientes', icon: '🛒', screen: 'Encomendas' },
  { id: 'w6_diagnostico', day: 6, title: 'Ver diagnóstico', description: 'Análise detalhada do negócio', icon: '🔍', screen: 'Diagnóstico' },

  // Dia 7 - Consolidação
  { id: 'w7_accountant', day: 7, title: 'Relatório para contador', description: 'Exporte dados para contabilidade', icon: '📑', screen: 'Relatórios' },
  { id: 'w7_backup', day: 7, title: 'Verificar sincronização', description: 'Confirme que dados estão salvos', icon: '☁️', screen: 'Configuração' },
];

interface WeeklyChecklistProps {
  navigation: any;
  compact?: boolean;
}

export default function WeeklyChecklist({ navigation, compact = false }: WeeklyChecklistProps) {
  const { theme, mode } = useThemeCtx();
  const [steps, setSteps] = useState<WeeklyStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  // Carregar progresso
  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const companyId = await getCurrentCompanyId();
      if (!companyId) {
        setIsLoading(false);
        return;
      }

      // Verificar se foi dispensado
      const dismissed = await storage.getItem(`weekly_dismissed_${companyId}`);
      if (dismissed === 'true') {
        setIsDismissed(true);
        setIsLoading(false);
        return;
      }

      // Carregar progresso salvo (manual)
      const savedProgress = await storage.getItem(`weekly_progress_${companyId}`);
      const manualCompletedIds = savedProgress ? JSON.parse(savedProgress) : [];

      // AUTO-DETECTAR passos completados baseado em dados reais
      const autoCompleted: string[] = [];

      try {
        // Importar supabase dinamicamente para evitar dependência circular
        const { supabase } = await import('../lib/supabase');

        const [
          { data: company },
          { count: transactionCount },
          { count: productCount },
          { count: categoryCount },
          { count: goalCount },
          { count: debtCount },
          { count: recurringCount },
        ] = await Promise.all([
          supabase.from('companies').select('name, logo_url').eq('id', companyId).single(),
          supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('company_id', companyId).is('deleted_at', null),
          supabase.from('products').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
          supabase.from('categories').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
          supabase.from('financial_goals').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
          supabase.from('debts').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
          supabase.from('recurring_expenses').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
        ]);

        // Dia 1: Configurar empresa (nome preenchido)
        if (company?.name && company.name.trim().length > 0) autoCompleted.push('w1_setup');
        // Dia 1: Primeiro lançamento
        if ((transactionCount ?? 0) >= 1) autoCompleted.push('w1_first_tx');

        // Dia 2: Cadastrar produtos
        if ((productCount ?? 0) >= 1) autoCompleted.push('w2_products');
        // Dia 2: Usar categorias (tem categorias ou usou em transações)
        if ((categoryCount ?? 0) >= 1 || (transactionCount ?? 0) >= 3) autoCompleted.push('w2_categories');

        // Dia 3: Definir meta mensal
        if ((goalCount ?? 0) >= 1) autoCompleted.push('w3_goal');
        // Dia 3: Registrar dívidas
        if ((debtCount ?? 0) >= 1) autoCompleted.push('w3_debts');

        // Dia 4: Despesas recorrentes
        if ((recurringCount ?? 0) >= 1) autoCompleted.push('w4_recurring');
        // Dia 4: Verificar saldo (se tem transações suficientes)
        if ((transactionCount ?? 0) >= 5) autoCompleted.push('w4_check_balance');

        // Dia 5: Gerar relatório (se tem transações)
        if ((transactionCount ?? 0) >= 5) autoCompleted.push('w5_report');
        // Dia 5: Checar saúde financeira (se tem metas)
        if ((goalCount ?? 0) >= 1) autoCompleted.push('w5_health');

        // Dia 6: Explorar encomendas (considerar visitado se tem produtos)
        if ((productCount ?? 0) >= 2) autoCompleted.push('w6_orders');
        // Dia 6: Ver diagnóstico (se tem dados suficientes)
        if ((transactionCount ?? 0) >= 10) autoCompleted.push('w6_diagnostico');

        // Dia 7: Relatório para contador (se tem dados)
        if ((transactionCount ?? 0) >= 10) autoCompleted.push('w7_accountant');
        // Dia 7: Verificar sincronização (sempre marcado se empresa existe)
        if (company?.name) autoCompleted.push('w7_backup');
      } catch (dbError) {
        console.log('Erro ao verificar dados para auto-complete:', dbError);
      }

      // Combinar manual + auto-detectado
      const allCompletedIds = [...new Set([...manualCompletedIds, ...autoCompleted])];

      // Montar steps com status de completado
      const stepsWithStatus = WEEKLY_STEPS_TEMPLATE.map(step => ({
        ...step,
        completed: allCompletedIds.includes(step.id),
      }));

      setSteps(stepsWithStatus);
      setIsLoading(false);
    } catch (error) {
      console.error('Erro ao carregar progresso semanal:', error);
      setIsLoading(false);
    }
  };

  const completeStep = async (stepId: string) => {
    try {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return;

      const updatedSteps = steps.map(step =>
        step.id === stepId ? { ...step, completed: true } : step
      );
      setSteps(updatedSteps);

      // Salvar progresso
      const completedIds = updatedSteps.filter(s => s.completed).map(s => s.id);
      await storage.setItem(`weekly_progress_${companyId}`, JSON.stringify(completedIds));
    } catch (error) {
      console.error('Erro ao completar passo:', error);
    }
  };

  const dismissChecklist = async () => {
    try {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return;
      await storage.setItem(`weekly_dismissed_${companyId}`, 'true');
      setIsDismissed(true);
    } catch (error) {
      console.error('Erro ao dispensar checklist:', error);
    }
  };

  if (isLoading || isDismissed || steps.length === 0) return null;

  const completedCount = steps.filter(s => s.completed).length;
  const progress = Math.round((completedCount / steps.length) * 100);

  // Agrupar por dia
  const stepsByDay = steps.reduce((acc, step) => {
    if (!acc[step.day]) acc[step.day] = [];
    acc[step.day].push(step);
    return acc;
  }, {} as Record<number, WeeklyStep[]>);

  const dayNames = ['', 'Dia 1', 'Dia 2', 'Dia 3', 'Dia 4', 'Dia 5', 'Dia 6', 'Dia 7'];
  const dayTitles = ['', 'Configuração', 'Organização', 'Planejamento', 'Controle', 'Análise', 'Avançado', 'Consolidação'];

  // Versão compacta
  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: theme.card }]}>
        <View style={styles.compactHeader}>
          <Text style={[styles.compactTitle, { color: theme.text }]}>
            📅 Primeira Semana
          </Text>
          <Text style={[styles.compactProgress, { color: theme.textSecondary }]}>
            {completedCount}/{steps.length}
          </Text>
        </View>
        <View style={[styles.progressBar, { backgroundColor: theme.background }]}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: '#6366F1' }]} />
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Configuração')}
          style={styles.compactButton}
        >
          <Text style={styles.compactButtonText}>Ver checklist completa →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>
            📅 Checklist da Primeira Semana
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Complete as tarefas para dominar o app
          </Text>
        </View>
        <TouchableOpacity onPress={dismissChecklist} style={styles.dismissBtn}>
          <Text style={[styles.dismissText, { color: theme.textSecondary }]}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Barra de progresso */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: theme.background }]}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: '#6366F1' }]} />
        </View>
        <Text style={[styles.progressText, { color: theme.textSecondary }]}>
          {completedCount}/{steps.length} ({progress}%)
        </Text>
      </View>

      {/* Dias */}
      {Object.entries(stepsByDay).map(([day, daySteps]) => {
        const dayNum = parseInt(day);
        const dayCompleted = daySteps.filter(s => s.completed).length;
        const isDayComplete = dayCompleted === daySteps.length;
        const isExpanded = expandedDay === dayNum;

        return (
          <View key={day} style={styles.dayContainer}>
            <TouchableOpacity
              style={[
                styles.dayHeader,
                { backgroundColor: isDayComplete ? '#DCFCE7' : theme.background }
              ]}
              onPress={() => setExpandedDay(isExpanded ? null : dayNum)}
            >
              <View style={styles.dayHeaderLeft}>
                <Text style={styles.dayIcon}>
                  {isDayComplete ? '✅' : '📆'}
                </Text>
                <View>
                  <Text style={[styles.dayName, { color: theme.text }]}>
                    {dayNames[dayNum]} - {dayTitles[dayNum]}
                  </Text>
                  <Text style={[styles.dayProgress, { color: theme.textSecondary }]}>
                    {dayCompleted}/{daySteps.length} tarefas
                  </Text>
                </View>
              </View>
              <Text style={[styles.expandIcon, { color: theme.textSecondary }]}>
                {isExpanded ? '▼' : '▶'}
              </Text>
            </TouchableOpacity>

            {isExpanded && (
              <View style={styles.stepsContainer}>
                {daySteps.map(step => (
                  <View key={step.id} style={styles.stepItem}>
                    <TouchableOpacity
                      style={[
                        styles.stepCheckbox,
                        { backgroundColor: step.completed ? '#16A34A' : theme.background }
                      ]}
                      onPress={() => !step.completed && completeStep(step.id)}
                    >
                      <Text style={styles.stepCheckIcon}>
                        {step.completed ? '✓' : ''}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.stepContent}
                      onPress={() => step.screen && navigation.navigate(step.screen)}
                    >
                      <Text style={[
                        styles.stepTitle,
                        {
                          color: theme.text,
                          textDecorationLine: step.completed ? 'line-through' : 'none',
                          opacity: step.completed ? 0.6 : 1,
                        }
                      ]}>
                        {step.icon} {step.title}
                      </Text>
                      <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
                        {step.description}
                      </Text>
                    </TouchableOpacity>
                    {step.screen && !step.completed && (
                      <TouchableOpacity
                        style={styles.goButton}
                        onPress={() => navigation.navigate(step.screen)}
                      >
                        <Text style={styles.goButtonText}>Ir →</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}

      {/* Mensagem de conclusão */}
      {progress === 100 && (
        <View style={styles.completionBox}>
          <Text style={styles.completionIcon}>🎉</Text>
          <Text style={styles.completionText}>
            Parabéns! Você completou a primeira semana!
          </Text>
          <TouchableOpacity style={styles.completionButton} onPress={dismissChecklist}>
            <Text style={styles.completionButtonText}>Fechar checklist</Text>
          </TouchableOpacity>
        </View>
      )}
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  dismissBtn: {
    padding: 4,
  },
  dismissText: {
    fontSize: 18,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dayContainer: {
    marginBottom: 8,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dayIcon: {
    fontSize: 20,
  },
  dayName: {
    fontSize: 14,
    fontWeight: '700',
  },
  dayProgress: {
    fontSize: 11,
  },
  expandIcon: {
    fontSize: 12,
  },
  stepsContainer: {
    paddingLeft: 16,
    paddingTop: 8,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  stepCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCheckIcon: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  stepDescription: {
    fontSize: 11,
  },
  goButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  goButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  completionBox: {
    backgroundColor: '#DCFCE7',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  completionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  completionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
    textAlign: 'center',
    marginBottom: 12,
  },
  completionButton: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  completionButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  // Compact styles
  compactContainer: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  compactProgress: {
    fontSize: 12,
  },
  compactButton: {
    marginTop: 8,
  },
  compactButtonText: {
    color: '#6366F1',
    fontSize: 12,
    fontWeight: '600',
  },
});
