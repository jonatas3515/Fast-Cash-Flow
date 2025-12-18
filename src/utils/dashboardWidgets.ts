import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DashboardWidget {
  id: string;
  title: string;
  description: string;
  icon: string;
  enabled: boolean;
  order: number;
}

export const DEFAULT_WIDGETS: DashboardWidget[] = [
  {
    id: 'saude_negocio',
    title: 'Resumo Financeiro',
    description: 'Saldo, entradas e saídas (Saúde do Negócio)',
    icon: 'wallet-outline',
    enabled: true,
    order: 0,
  },
  {
    id: 'charts',
    title: 'Gráficos de Fluxo',
    description: 'Visualização gráfica diária, semanal e mensal',
    icon: 'bar-chart-outline',
    enabled: true,
    order: 1,
  },
  {
    id: 'a_receber_pagar',
    title: 'A Receber / A Pagar',
    description: 'Resumo de contas futuras e vencidas',
    icon: 'card-outline',
    enabled: true,
    order: 2,
  },
  {
    id: 'benchmarks',
    title: 'Comparação com Mercado',
    description: 'Alertas de dívidas e progresso da meta',
    icon: 'analytics-outline',
    enabled: true,
    order: 3,
  },
  {
    id: 'meta_financeira',
    title: 'Meta Financeira',
    description: 'Card de progresso da meta mensal',
    icon: 'trophy-outline',
    enabled: true,
    order: 4,
  },
  {
    id: 'alertas_inteligentes',
    title: 'Alertas Inteligentes',
    description: 'Avisos importantes sobre sua saúde financeira',
    icon: 'notifications-outline',
    enabled: true,
    order: 5,
  },
  {
    id: 'recent_transactions',
    title: 'Últimos Lançamentos',
    description: 'Lista das transações mais recentes',
    icon: 'list-outline',
    enabled: true,
    order: 6,
  },
  {
    id: 'dicas_rotina',
    title: 'Dicas de Rotina',
    description: 'Sugestões baseadas no seu perfil de negócio',
    icon: 'bulb-outline',
    enabled: true,
    order: 7,
  },
];

const STORAGE_KEY = '@dashboard_widgets';

export const getDashboardWidgets = async (): Promise<DashboardWidget[]> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return DEFAULT_WIDGETS;
  } catch (error) {
    console.error('Erro ao carregar widgets:', error);
    return DEFAULT_WIDGETS;
  }
};

export const saveDashboardWidgets = async (widgets: DashboardWidget[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
  } catch (error) {
    console.error('Erro ao salvar widgets:', error);
    throw error;
  }
};

export const resetDashboardWidgets = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Erro ao resetar widgets:', error);
    throw error;
  }
};

// ============================================
// Dashboard Modes System
// ============================================

export type DashboardMode = 'beginner' | 'intermediate' | 'advanced';

export interface DashboardModeConfig {
  id: DashboardMode;
  label: string;
  description: string;
  icon: string;
  enabledWidgets: string[];
}

/**
 * Configuração dos modos de dashboard
 * Cada modo define quais widgets são visíveis
 */
export const DASHBOARD_MODES: DashboardModeConfig[] = [
  {
    id: 'beginner',
    label: 'Iniciante',
    description: 'Visão simplificada para quem está começando',
    icon: '🌱',
    enabledWidgets: [
      'saude_negocio',        // Resumo Financeiro (essencial)
      'meta_financeira',      // Meta simples
      'alertas_inteligentes', // Alertas importantes
      'dicas_rotina',         // Dicas de rotina
    ],
  },
  {
    id: 'intermediate',
    label: 'Intermediário',
    description: 'Visão balanceada com gráficos e metas',
    icon: '📊',
    enabledWidgets: [
      'saude_negocio',        // Resumo Financeiro
      'charts',               // Gráficos
      'a_receber_pagar',      // Contas futuras
      'meta_financeira',      // Meta
      'alertas_inteligentes', // Alertas
      'recent_transactions',  // Últimos lançamentos
    ],
  },
  {
    id: 'advanced',
    label: 'Avançado',
    description: 'Visão completa com todos os recursos',
    icon: '🚀',
    enabledWidgets: [
      'saude_negocio',
      'charts',
      'a_receber_pagar',
      'benchmarks',
      'meta_financeira',
      'alertas_inteligentes',
      'recent_transactions',
      'dicas_rotina',
    ],
  },
];

const MODE_STORAGE_KEY = '@dashboard_mode';

/**
 * Obtém o modo atual do dashboard
 */
export const getDashboardMode = async (): Promise<DashboardMode> => {
  try {
    const stored = await AsyncStorage.getItem(MODE_STORAGE_KEY);
    if (stored && ['beginner', 'intermediate', 'advanced'].includes(stored)) {
      return stored as DashboardMode;
    }
    return 'intermediate'; // Padrão
  } catch (error) {
    console.error('Erro ao carregar modo do dashboard:', error);
    return 'intermediate';
  }
};

/**
 * Salva o modo do dashboard
 */
export const saveDashboardMode = async (mode: DashboardMode): Promise<void> => {
  try {
    await AsyncStorage.setItem(MODE_STORAGE_KEY, mode);
  } catch (error) {
    console.error('Erro ao salvar modo do dashboard:', error);
    throw error;
  }
};

/**
 * Obtém a configuração de um modo específico
 */
export const getModeConfig = (mode: DashboardMode): DashboardModeConfig => {
  return DASHBOARD_MODES.find(m => m.id === mode) || DASHBOARD_MODES[1]; // Fallback intermediate
};

/**
 * Verifica se um widget está habilitado no modo atual
 */
export const isWidgetEnabledInMode = (widgetId: string, mode: DashboardMode): boolean => {
  const config = getModeConfig(mode);
  return config.enabledWidgets.includes(widgetId);
};

/**
 * Obtém os widgets habilitados para um modo
 */
export const getWidgetsForMode = (mode: DashboardMode): DashboardWidget[] => {
  const config = getModeConfig(mode);
  return DEFAULT_WIDGETS
    .filter(w => config.enabledWidgets.includes(w.id))
    .map((w, index) => ({ ...w, enabled: true, order: index }));
};
