import { supabase } from '../lib/supabase';

export interface FinancialGoal {
  id: string;
  company_id: string;
  month: string; // YYYY-MM-01 (primeiro dia do mês)
  target_amount_cents: number;
  description?: string;
  created_at: string;
  updated_at?: string;
}

export async function getGoalByMonth(companyId: string, month: string): Promise<FinancialGoal | null> {
  const { data, error } = await supabase
    .from('financial_goals')
    .select('*')
    .eq('company_id', companyId)
    .eq('month', month)
    .maybeSingle();

  if (error) {
    const anyErr: any = error;
    if (anyErr.code === 'PGRST205') {
      console.warn('[financial_goals] Tabela financial_goals não encontrada no Supabase; retornando null');
      return null;
    }
    throw error;
  }
  return data as FinancialGoal | null;
}

export async function getGoalsByCompany(companyId: string): Promise<FinancialGoal[]> {
  const { data, error } = await supabase
    .from('financial_goals')
    .select('*')
    .eq('company_id', companyId)
    .order('month', { ascending: false });
  
  if (error) throw error;
  return data as FinancialGoal[];
}

export async function createGoal(input: Omit<FinancialGoal, 'id' | 'created_at' | 'updated_at'>): Promise<FinancialGoal> {
  const { data, error } = await supabase
    .from('financial_goals')
    .insert(input)
    .select('*')
    .single();
  
  if (error) throw error;
  return data as FinancialGoal;
}

export async function updateGoal(id: string, updates: Partial<Omit<FinancialGoal, 'id' | 'company_id' | 'created_at'>>): Promise<FinancialGoal> {
  const { data, error } = await supabase
    .from('financial_goals')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  
  if (error) throw error;
  return data as FinancialGoal;
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase
    .from('financial_goals')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

export async function calculateGoalProgress(
  companyId: string,
  month: string,
  currentIncome: number
): Promise<{ target: number; achieved: number; percent: number }> {
  const goal = await getGoalByMonth(companyId, month);
  
  if (!goal) {
    return { target: 0, achieved: currentIncome, percent: 0 };
  }
  
  const percent = Math.min(100, Math.round((currentIncome * 100) / goal.target_amount_cents));
  
  return {
    target: goal.target_amount_cents,
    achieved: currentIncome,
    percent,
  };
}
