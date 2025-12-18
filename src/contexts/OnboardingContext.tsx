import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { getCurrentCompanyId } from '../lib/company';
import * as SecureStore from 'expo-secure-store';

// Passos do modo iniciante (primeiro dia)
export interface BeginnerStep {
  id: string;
  title: string;
  description: string;
  tooltip: string;
  icon: string;
  screen: string;
  completed: boolean;
  order: number;
}

interface OnboardingContextData {
  // Modo iniciante
  isBeginnerMode: boolean;
  beginnerSteps: BeginnerStep[];
  currentStep: BeginnerStep | null;
  completedSteps: string[];
  totalSteps: number;
  completeStep: (stepId: string) => Promise<void>;
  dismissBeginnerMode: () => Promise<void>;
  resetBeginnerMode: () => Promise<void>;
  
  // Tooltip atual
  activeTooltip: string | null;
  showTooltip: (stepId: string) => void;
  hideTooltip: () => void;
  
  // Loading
  isLoading: boolean;
  refreshProgress: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextData>({} as OnboardingContextData);

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
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      window.localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

// Definição dos passos do modo iniciante
const BEGINNER_STEPS_TEMPLATE: Omit<BeginnerStep, 'completed'>[] = [
  {
    id: 'company_profile',
    title: 'Cadastrar Empresa',
    description: 'Configure o nome e logo da sua empresa',
    tooltip: '👋 Bem-vindo! Primeiro, vamos configurar sua empresa. Adicione o nome e, se quiser, um logo para personalizar seus relatórios.',
    icon: '🏢',
    screen: 'Settings',
    order: 1,
  },
  {
    id: 'first_income',
    title: 'Registrar Primeira Entrada',
    description: 'Registre sua primeira venda ou recebimento',
    tooltip: '💰 Agora registre sua primeira entrada! Pode ser uma venda, um pagamento recebido ou qualquer dinheiro que entrou no caixa.',
    icon: '💵',
    screen: 'Dashboard',
    order: 2,
  },
  {
    id: 'first_expense',
    title: 'Registrar Primeira Saída',
    description: 'Registre sua primeira despesa ou pagamento',
    tooltip: '📤 Ótimo! Agora registre uma saída. Pode ser uma compra de material, conta paga ou qualquer gasto do negócio.',
    icon: '💸',
    screen: 'Dashboard',
    order: 3,
  },
  {
    id: 'monthly_goal',
    title: 'Definir Meta Mensal',
    description: 'Estabeleça quanto quer faturar este mês',
    tooltip: '🎯 Defina uma meta de faturamento para este mês! Isso vai te ajudar a acompanhar se está no caminho certo.',
    icon: '🎯',
    screen: 'Dashboard',
    order: 4,
  },
  {
    id: 'first_product',
    title: 'Cadastrar Produto/Serviço',
    description: 'Adicione pelo menos 1 produto ou serviço',
    tooltip: '📦 Por fim, cadastre um produto ou serviço que você vende. Isso facilita na hora de registrar vendas!',
    icon: '📦',
    screen: 'Produtos',
    order: 5,
  },
];

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [isBeginnerMode, setIsBeginnerMode] = useState(false);
  const [beginnerSteps, setBeginnerSteps] = useState<BeginnerStep[]>([]);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar progresso do modo iniciante
  const loadProgress = useCallback(async () => {
    try {
      setIsLoading(true);
      const companyId = await getCurrentCompanyId();
      if (!companyId) {
        setIsLoading(false);
        return;
      }

      // Verificar se o modo iniciante foi dispensado
      const dismissed = await storage.getItem(`beginner_dismissed_${companyId}`);
      if (dismissed === 'true') {
        setIsBeginnerMode(false);
        setIsLoading(false);
        return;
      }

      // Carregar progresso salvo
      const savedProgress = await storage.getItem(`beginner_progress_${companyId}`);
      let completedSteps: string[] = [];
      if (savedProgress) {
        try {
          completedSteps = JSON.parse(savedProgress);
        } catch {}
      }

      // Verificar automaticamente baseado nos dados
      const [
        { data: companyData },
        { count: incomeCount },
        { count: expenseCount },
        { count: goalCount },
        { count: productCount },
      ] = await Promise.all([
        supabase.from('companies').select('name, logo_url').eq('id', companyId).single(),
        supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('type', 'income').is('deleted_at', null),
        supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('type', 'expense').is('deleted_at', null),
        supabase.from('financial_goals').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('categories').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
      ]);

      // Auto-completar passos baseado nos dados
      const autoCompleted: string[] = [];
      if (companyData?.name) autoCompleted.push('company_profile');
      if ((incomeCount ?? 0) >= 1) autoCompleted.push('first_income');
      if ((expenseCount ?? 0) >= 1) autoCompleted.push('first_expense');
      if ((goalCount ?? 0) >= 1) autoCompleted.push('monthly_goal');
      if ((productCount ?? 0) >= 1) autoCompleted.push('first_product');

      // Combinar com progresso salvo
      const allCompleted = [...new Set([...completedSteps, ...autoCompleted])];

      // Construir lista de passos
      const steps: BeginnerStep[] = BEGINNER_STEPS_TEMPLATE.map(step => ({
        ...step,
        completed: allCompleted.includes(step.id),
      }));

      setBeginnerSteps(steps);

      // Verificar se deve mostrar modo iniciante
      // Mostrar se: empresa nova (menos de 7 dias) E não completou todos os passos
      const allDone = steps.every(s => s.completed);
      
      // Verificar data de criação da empresa
      const { data: companyCreated } = await supabase
        .from('companies')
        .select('created_at')
        .eq('id', companyId)
        .single();

      let isNewCompany = true;
      if (companyCreated?.created_at) {
        const createdDate = new Date(companyCreated.created_at);
        const daysSinceCreation = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        isNewCompany = daysSinceCreation <= 7;
      }

      setIsBeginnerMode(!allDone && isNewCompany);

    } catch (error) {
      console.error('Erro ao carregar progresso do onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  // Completar um passo
  const completeStep = async (stepId: string) => {
    try {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return;

      // Atualizar estado local
      setBeginnerSteps(prev => prev.map(step => 
        step.id === stepId ? { ...step, completed: true } : step
      ));

      // Salvar no storage
      const savedProgress = await storage.getItem(`beginner_progress_${companyId}`);
      let completedSteps: string[] = [];
      if (savedProgress) {
        try {
          completedSteps = JSON.parse(savedProgress);
        } catch {}
      }
      if (!completedSteps.includes(stepId)) {
        completedSteps.push(stepId);
        await storage.setItem(`beginner_progress_${companyId}`, JSON.stringify(completedSteps));
      }

      // Verificar se todos foram completados
      const updatedSteps = beginnerSteps.map(step => 
        step.id === stepId ? { ...step, completed: true } : step
      );
      if (updatedSteps.every(s => s.completed)) {
        setIsBeginnerMode(false);
      }

      // Esconder tooltip
      setActiveTooltip(null);
    } catch (error) {
      console.error('Erro ao completar passo:', error);
    }
  };

  // Dispensar modo iniciante
  const dismissBeginnerMode = async () => {
    try {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return;
      
      await storage.setItem(`beginner_dismissed_${companyId}`, 'true');
      setIsBeginnerMode(false);
      setActiveTooltip(null);
    } catch (error) {
      console.error('Erro ao dispensar modo iniciante:', error);
    }
  };

  // Resetar modo iniciante (para testes)
  const resetBeginnerMode = async () => {
    try {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return;
      
      await storage.removeItem(`beginner_dismissed_${companyId}`);
      await storage.removeItem(`beginner_progress_${companyId}`);
      await loadProgress();
    } catch (error) {
      console.error('Erro ao resetar modo iniciante:', error);
    }
  };

  // Passo atual (primeiro não completado)
  const currentStep = beginnerSteps.find(step => !step.completed) || null;
  
  // Passos completados e total
  const completedSteps = beginnerSteps.filter(step => step.completed).map(step => step.id);
  const totalSteps = beginnerSteps.length;

  return (
    <OnboardingContext.Provider
      value={{
        isBeginnerMode,
        beginnerSteps,
        currentStep,
        completedSteps,
        totalSteps,
        completeStep,
        dismissBeginnerMode,
        resetBeginnerMode,
        activeTooltip,
        showTooltip: setActiveTooltip,
        hideTooltip: () => setActiveTooltip(null),
        isLoading,
        refreshProgress: loadProgress,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding deve ser usado dentro de OnboardingProvider');
  }
  return context;
}
