import { supabase } from '../lib/supabase';

export interface FinancialGoal {
  id: string;
  company_id: string;
  year: number;
  month: number; // 1-12
  target_amount_cents: number;
  description?: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Busca meta por ano e mês (use year/month como INTEGER)
 * Mantém compatibilidade: aceita string 'YYYY-MM-01' e converte automaticamente
 */
export async function getGoalByMonth(companyId: string, monthOrYear: string | number, monthNum?: number): Promise<FinancialGoal | null> {
  let year: number;
  let month: number;

  // Compatibilidade: aceita tanto string 'YYYY-MM-01' quanto year, month separados
  if (typeof monthOrYear === 'string') {
    // Formato legado: 'YYYY-MM-01'
    const parts = monthOrYear.split('-');
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
  } else {
    // Novo formato: year, month
    year = monthOrYear;
    month = monthNum ?? 1;
  }

  const { data, error } = await supabase
    .from('financial_goals')
    .select('*')
    .eq('company_id', companyId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();

  if (error) {
    const anyErr: any = error;
    if (anyErr.code === 'PGRST205') {
      console.warn('[financial_goals] Tabela financial_goals não encontrada no Supabase; retornando null');
      return null;
    }
    // Silenciar 400 errors (schema mismatch é tratado graciosamente)
    if (error.code === 'PGRST301' || error.message?.includes('400')) {
      console.warn('[financial_goals] Erro de query (possível schema mismatch):', error.message);
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
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (error) {
    console.warn('[financial_goals] Erro ao buscar metas:', error.message);
    return [];
  }
  return (data || []) as FinancialGoal[];
}

export async function createGoal(input: Omit<FinancialGoal, 'id' | 'created_at' | 'updated_at'>): Promise<FinancialGoal> {
  console.log('[📝 GOAL] Criando meta no Supabase:', JSON.stringify(input, null, 2));

  const { data, error } = await supabase
    .from('financial_goals')
    .insert(input)
    .select('*')
    .single();

  if (error) {
    console.error('[❌ GOAL] Erro ao criar meta no Supabase:', error);
    console.error('[❌ GOAL] Código:', error.code, 'Mensagem:', error.message, 'Detalhes:', error.details);
    throw error;
  }

  console.log('[✅ GOAL] Meta criada com sucesso no Supabase:', data);
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
  monthOrYear: string | number,
  currentIncomeOrMonth: number,
  incomeIfYearMonth?: number
): Promise<{ target: number; achieved: number; percent: number }> {
  // Mantém compatibilidade: (companyId, 'YYYY-MM-01', income) ou (companyId, year, month, income)
  let currentIncome: number;
  let goal: FinancialGoal | null;

  if (typeof monthOrYear === 'string') {
    currentIncome = currentIncomeOrMonth;
    goal = await getGoalByMonth(companyId, monthOrYear);
  } else {
    currentIncome = incomeIfYearMonth ?? 0;
    goal = await getGoalByMonth(companyId, monthOrYear, currentIncomeOrMonth);
  }

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
