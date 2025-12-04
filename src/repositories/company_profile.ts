import { supabase } from '../lib/supabase';

export interface CompanyProfile {
  id: string;
  company_id: string;
  business_type: 'commerce' | 'services' | 'food' | 'freelancer' | 'mei' | 'other';
  monthly_revenue_range: 'up_to_5k' | '5k_to_20k' | 'above_20k';
  main_goal: 'control_debts' | 'organize_cash_flow' | 'save_investments' | 'avoid_delays';
  created_at: string;
  updated_at: string;
}

export type CreateCompanyProfileInput = Omit<CompanyProfile, 'id' | 'company_id' | 'created_at' | 'updated_at'>;

export type UpdateCompanyProfileInput = Partial<CreateCompanyProfileInput>;

// Opções para os campos
export const BUSINESS_TYPE_OPTIONS = [
  { value: 'commerce', label: 'Comércio' },
  { value: 'services', label: 'Serviços' },
  { value: 'food', label: 'Alimentação' },
  { value: 'freelancer', label: 'Autônomo' },
  { value: 'mei', label: 'MEI' },
  { value: 'other', label: 'Outro' },
] as const;

export const REVENUE_RANGE_OPTIONS = [
  { value: 'up_to_5k', label: 'Até R$ 5 mil' },
  { value: '5k_to_20k', label: 'R$ 5 mil a R$ 20 mil' },
  { value: 'above_20k', label: 'Acima de R$ 20 mil' },
] as const;

export const MAIN_GOAL_OPTIONS = [
  { value: 'control_debts', label: 'Controlar dívidas' },
  { value: 'organize_cash_flow', label: 'Organizar fluxo de caixa diário' },
  { value: 'save_investments', label: 'Guardar para investimentos' },
  { value: 'avoid_delays', label: 'Evitar atrasos em contas' },
] as const;

// Funções do repository
export async function getCompanyProfile(companyId: string): Promise<CompanyProfile | null> {
  const { data, error } = await supabase
    .from('company_profile')
    .select('*')
    .eq('company_id', companyId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  
  return data as CompanyProfile;
}

export async function createCompanyProfile(companyId: string, profile: CreateCompanyProfileInput): Promise<CompanyProfile> {
  const { data, error } = await supabase
    .from('company_profile')
    .insert({ ...profile, company_id: companyId })
    .select('*')
    .single();
  
  if (error) throw error;
  return data as CompanyProfile;
}

export async function updateCompanyProfile(companyId: string, updates: UpdateCompanyProfileInput): Promise<CompanyProfile> {
  const { data, error } = await supabase
    .from('company_profile')
    .update(updates)
    .eq('company_id', companyId)
    .select('*')
    .single();
  
  if (error) throw error;
  return data as CompanyProfile;
}

export async function getOrCreateCompanyProfile(companyId: string, defaultProfile?: CreateCompanyProfileInput): Promise<CompanyProfile> {
  // Tentar buscar perfil existente
  const existing = await getCompanyProfile(companyId);
  if (existing) return existing;
  
  // Criar novo perfil com valores padrão ou fornecidos
  const profileToCreate = defaultProfile || {
    business_type: 'other',
    monthly_revenue_range: 'up_to_5k',
    main_goal: 'organize_cash_flow',
  };
  
  return await createCompanyProfile(companyId, profileToCreate);
}

// Função para obter recomendação baseada no objetivo
export function getRecommendationByGoal(goal: CompanyProfile['main_goal']): string {
  switch (goal) {
    case 'control_debts':
      return '💡 Dica: Acompanhe a aba "Dívidas" toda semana e use alertas de limite para não ultrapassar seu orçamento.';
    case 'organize_cash_flow':
      return '💡 Dica: Use a visão "Dia"/"Semana" e os filtros para revisar entradas e saídas todo fim de dia.';
    case 'save_investments':
      return '💡 Dica: Defina metas financeiras mensais e acompanhe seu progresso na seção "Meta Financeira".';
    case 'avoid_delays':
      return '💡 Dica: Configure alertas de saldo negativo e mantenha um controle rigoroso das datas de vencimento.';
    default:
      return '💡 Dica: Mantenha seus lançamentos sempre atualizados para ter uma visão clara da sua saúde financeira.';
  }
}
