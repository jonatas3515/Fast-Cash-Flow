import { supabase } from '../lib/supabase';

export interface DebtRow {
  id: string;
  company_id: string;
  description: string;
  total_cents: number;
  installment_count: number;
  installment_cents: number;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  paid_installments: number;
  invoice_due_date?: string | null;
  created_at: string;
  updated_at: string | null;
}

export async function listDebtsByDate(companyId: string, date: string): Promise<DebtRow[]> {
  // Evitar 400 quando date vier vazio ou inválido (ex.: input limpo no web)
  const q = supabase
    .from('debts')
    .select('*')
    .eq('company_id', companyId)
    .order('start_date', { ascending: true });
  if (date && /\d{4}-\d{2}-\d{2}/.test(date)) {
    // Filtra dívidas ativas no dia
    // start_date <= date <= end_date
    // @ts-ignore chaining
    q.lte('start_date', date).gte('end_date', date);
  }
  const { data, error } = await q as any;
  if (error) throw error;
  return (data as DebtRow[]) || [];
}

export type CreateDebtInput = Omit<DebtRow, 'id'|'company_id'|'created_at'|'updated_at'>;

export async function createDebt(companyId: string, payload: CreateDebtInput): Promise<DebtRow> {
  const { data, error } = await supabase
    .from('debts')
    .insert({ ...payload, company_id: companyId })
    .select('*')
    .single();
  if (error) throw error;
  return data as DebtRow;
}

export async function updateDebt(companyId: string, id: string, updates: Partial<CreateDebtInput>): Promise<DebtRow> {
  const { data, error } = await supabase
    .from('debts')
    .update({ ...updates })
    .eq('company_id', companyId)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as DebtRow;
}

export async function deleteDebt(companyId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('debts')
    .delete()
    .eq('company_id', companyId)
    .eq('id', id);
  if (error) throw error;
}

export async function listAllDebts(companyId: string): Promise<DebtRow[]> {
  const { data, error } = await supabase
    .from('debts')
    .select('*')
    .eq('company_id', companyId)
    .order('start_date', { ascending: true });
  if (error) throw error;
  return data || [];
}
