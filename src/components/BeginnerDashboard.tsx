import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useOnboarding } from '../contexts/OnboardingContext';
import { formatCentsBRL } from '../utils/money';

interface BeginnerDashboardProps {
  navigation: any;
  data: {
    income_cents: number;
    expense_cents: number;
    balance_cents: number;
  };
  onDismiss?: () => void;
}

// Atalhos rápidos para iniciantes
const QUICK_SHORTCUTS = [
  {
    id: 'income',
    icon: '💰',
    label: 'Registrar Entrada',
    description: 'Vendas, recebimentos',
    screen: 'Dia',
    color: '#16A34A',
    bgColor: '#DCFCE7',
  },
  {
    id: 'expense',
    icon: '💸',
    label: 'Registrar Saída',
    description: 'Despesas, pagamentos',
    screen: 'Dia',
    color: '#D90429',
    bgColor: '#FEE2E2',
  },
  {
    id: 'goal',
    icon: '🎯',
    label: 'Definir Meta',
    description: 'Meta de faturamento',
    screen: 'Dashboard',
    action: 'openGoal',
    color: '#6366F1',
    bgColor: '#E0E7FF',
  },
  {
    id: 'product',
    icon: '📦',
    label: 'Cadastrar Produto',
    description: 'Produtos e serviços',
    screen: 'Produtos',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
  },
  {
    id: 'report',
    icon: '📊',
    label: 'Ver Relatórios',
    description: 'Análise financeira',
    screen: 'Relatórios',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
  },
  {
    id: 'debts',
    icon: '📋',
    label: 'Controlar Dívidas',
    description: 'Contas a pagar',
    screen: 'Dívidas',
    color: '#EF4444',
    bgColor: '#FEE2E2',
  },
];

export default function BeginnerDashboard({ navigation, data, onDismiss }: BeginnerDashboardProps) {
  const { theme, mode } = useThemeCtx();
  const { isBeginnerMode, completedSteps, totalSteps, dismissBeginnerMode } = useOnboarding();

  // Não mostrar se não estiver em modo iniciante
  if (!isBeginnerMode) return null;

  const progress = totalSteps > 0 ? Math.round((completedSteps.length / totalSteps) * 100) : 0;
  const isNegative = data.balance_cents < 0;

  const handleShortcutPress = (shortcut: typeof QUICK_SHORTCUTS[0]) => {
    if (shortcut.action === 'openGoal') {
      // Abrir modal de meta (precisa ser implementado via callback)
      navigation.navigate(shortcut.screen);
    } else {
      navigation.navigate(shortcut.screen);
    }
  };

  const handleDismiss = () => {
    dismissBeginnerMode();
    onDismiss?.();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: '#FFC300' }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcon}>🚀</Text>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              Painel do Iniciante
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              {completedSteps.length}/{totalSteps} passos concluídos
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleDismiss} style={styles.dismissButton}>
          <Text style={[styles.dismissText, { color: theme.textSecondary }]}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Barra de progresso */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: theme.background }]}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={[styles.progressText, { color: theme.textSecondary }]}>{progress}%</Text>
      </View>

      {/* Cards resumidos */}
      <View style={styles.summaryCards}>
        <View style={[styles.summaryCard, { backgroundColor: '#DCFCE7' }]}>
          <Text style={styles.summaryIcon}>💰</Text>
          <Text style={styles.summaryLabel}>Entradas</Text>
          <Text style={[styles.summaryValue, { color: '#16A34A' }]}>
            {formatCentsBRL(data.income_cents)}
          </Text>
        </View>
        
        <View style={[styles.summaryCard, { backgroundColor: '#FEE2E2' }]}>
          <Text style={styles.summaryIcon}>💸</Text>
          <Text style={styles.summaryLabel}>Saídas</Text>
          <Text style={[styles.summaryValue, { color: '#D90429' }]}>
            {formatCentsBRL(data.expense_cents)}
          </Text>
        </View>
        
        <View style={[styles.summaryCard, { backgroundColor: isNegative ? '#FEE2E2' : '#DBEAFE' }]}>
          <Text style={styles.summaryIcon}>{isNegative ? '⚠️' : '📈'}</Text>
          <Text style={styles.summaryLabel}>Saldo</Text>
          <Text style={[styles.summaryValue, { color: isNegative ? '#D90429' : '#3B82F6' }]}>
            {formatCentsBRL(data.balance_cents)}
          </Text>
        </View>
      </View>

      {/* Atalhos rápidos */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        ⚡ Atalhos Rápidos
      </Text>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.shortcutsContainer}
      >
        {QUICK_SHORTCUTS.map((shortcut) => (
          <TouchableOpacity
            key={shortcut.id}
            style={[styles.shortcutCard, { backgroundColor: shortcut.bgColor }]}
            onPress={() => handleShortcutPress(shortcut)}
          >
            <Text style={styles.shortcutIcon}>{shortcut.icon}</Text>
            <Text style={[styles.shortcutLabel, { color: shortcut.color }]}>
              {shortcut.label}
            </Text>
            <Text style={styles.shortcutDescription}>
              {shortcut.description}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Dica do dia */}
      <View style={[styles.tipBox, { backgroundColor: '#FEF3C7' }]}>
        <Text style={styles.tipIcon}>💡</Text>
        <View style={styles.tipContent}>
          <Text style={styles.tipTitle}>Dica do Dia</Text>
          <Text style={styles.tipText}>
            {completedSteps.length === 0 
              ? 'Comece registrando sua primeira entrada ou saída do dia!'
              : completedSteps.length < 3
              ? 'Continue preenchendo os passos para dominar o app!'
              : 'Você está indo muito bem! Explore os relatórios para insights.'}
          </Text>
        </View>
      </View>

      {/* Botão para sair do modo iniciante */}
      {progress >= 80 && (
        <TouchableOpacity 
          style={styles.graduateButton}
          onPress={handleDismiss}
        >
          <Text style={styles.graduateText}>
            🎓 Já domino o básico - Sair do modo iniciante
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Componente compacto para mostrar apenas os atalhos
export function QuickShortcuts({ navigation }: { navigation: any }) {
  const { theme } = useThemeCtx();
  const { isBeginnerMode } = useOnboarding();

  // Mostrar atalhos mesmo fora do modo iniciante (versão compacta)
  const shortcuts = QUICK_SHORTCUTS.slice(0, 4);

  return (
    <View style={[styles.quickShortcutsContainer, { backgroundColor: theme.card }]}>
      <Text style={[styles.quickShortcutsTitle, { color: theme.text }]}>
        ⚡ Ações Rápidas
      </Text>
      <View style={styles.quickShortcutsGrid}>
        {shortcuts.map((shortcut) => (
          <TouchableOpacity
            key={shortcut.id}
            style={[styles.quickShortcutItem, { backgroundColor: shortcut.bgColor }]}
            onPress={() => navigation.navigate(shortcut.screen)}
          >
            <Text style={styles.quickShortcutIcon}>{shortcut.icon}</Text>
            <Text style={[styles.quickShortcutLabel, { color: shortcut.color }]}>
              {shortcut.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
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
    gap: 12,
  },
  headerIcon: {
    fontSize: 28,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
  },
  dismissButton: {
    padding: 8,
  },
  dismissText: {
    fontSize: 18,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    backgroundColor: '#FFC300',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 35,
  },
  summaryCards: {
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
    fontSize: 20,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  shortcutsContainer: {
    gap: 10,
    paddingBottom: 4,
  },
  shortcutCard: {
    width: 100,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  shortcutIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  shortcutLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
  },
  shortcutDescription: {
    fontSize: 9,
    color: '#666',
    textAlign: 'center',
  },
  tipBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    gap: 10,
  },
  tipIcon: {
    fontSize: 24,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 11,
    color: '#92400E',
    lineHeight: 16,
  },
  graduateButton: {
    backgroundColor: '#16A34A',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  graduateText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  // Quick shortcuts compact
  quickShortcutsContainer: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  quickShortcutsTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  quickShortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickShortcutItem: {
    flex: 1,
    minWidth: '22%',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  quickShortcutIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  quickShortcutLabel: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
});
