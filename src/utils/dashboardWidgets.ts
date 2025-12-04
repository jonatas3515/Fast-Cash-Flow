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
    id: 'balance',
    title: 'Saldo Disponível',
    description: 'Visualize seu saldo atual em tempo real',
    icon: 'wallet-outline',
    enabled: true,
    order: 0,
  },
  {
    id: 'monthly_summary',
    title: 'Resumo Mensal',
    description: 'Receitas, despesas e saldo do mês',
    icon: 'calendar-outline',
    enabled: true,
    order: 1,
  },
  {
    id: 'charts',
    title: 'Gráficos',
    description: 'Visualização gráfica do fluxo de caixa',
    icon: 'bar-chart-outline',
    enabled: true,
    order: 2,
  },
  {
    id: 'alerts',
    title: 'Alertas',
    description: 'Avisos sobre dívidas e metas',
    icon: 'notifications-outline',
    enabled: true,
    order: 3,
  },
  {
    id: 'goals',
    title: 'Metas Financeiras',
    description: 'Progresso das suas metas',
    icon: 'trophy-outline',
    enabled: true,
    order: 4,
  },
  {
    id: 'pending_debts',
    title: 'Dívidas Pendentes',
    description: 'Parcelas e contas a pagar',
    icon: 'card-outline',
    enabled: true,
    order: 5,
  },
  {
    id: 'recent_transactions',
    title: 'Últimos Lançamentos',
    description: 'Transações recentes',
    icon: 'list-outline',
    enabled: true,
    order: 6,
  },
  {
    id: 'quick_actions',
    title: 'Ações Rápidas',
    description: 'Botões para adicionar lançamentos',
    icon: 'add-circle-outline',
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
