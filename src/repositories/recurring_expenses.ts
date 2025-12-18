import { supabase } from '../lib/supabase';
import { getCurrentCompanyId } from '../lib/company';

export type RecurrenceType = 'monthly' | 'weekly' | 'biweekly' | 'annual' | 'custom';

export interface RecurringExpense {
  id: string;
  company_id: string;
  description: string;
  category?: string | null;
  amount_cents: number;
  recurrence_type: RecurrenceType;
  interval_days?: number | null; // usado quando recurrence_type = 'custom'
  start_date: string; // YYYY-MM-DD
  end_date?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export async function listRecurringExpenses(): Promise<RecurringExpense[]> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) throw new Error('Empresa não identificada. Faça login novamente.');

  const { data, error } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('company_id', companyId)
    .order('start_date', { ascending: true });

  if (error) throw error;
  return (data || []) as RecurringExpense[];
}

export async function createRecurringExpense(input: Omit<RecurringExpense, 'id' | 'company_id' | 'created_at' | 'updated_at'>): Promise<RecurringExpense> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) throw new Error('Empresa não identificada. Faça login novamente.');

  const { data, error } = await supabase
    .from('recurring_expenses')
    .insert({
      company_id: companyId,
      description: input.description,
      category: input.category ?? null,
      amount_cents: input.amount_cents,
      recurrence_type: input.recurrence_type,
      interval_days: input.interval_days ?? null,
      start_date: input.start_date,
      end_date: input.end_date ?? null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as RecurringExpense;
}

export async function updateRecurringExpense(id: string, updates: Partial<Omit<RecurringExpense, 'id' | 'company_id' | 'created_at'>>): Promise<RecurringExpense> {
  const { data, error } = await supabase
    .from('recurring_expenses')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as RecurringExpense;
}

export async function deleteRecurringExpense(id: string): Promise<void> {
  const { error } = await supabase
    .from('recurring_expenses')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export function getNextOccurrence(rec: RecurringExpense, fromDate: Date): Date | null {
  const start = new Date(`${rec.start_date}T12:00:00`);
  const end = rec.end_date ? new Date(`${rec.end_date}T12:00:00`) : null;

  const clampDayInMonth = (year: number, monthIndex: number, day: number) => {
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    return Math.min(day, lastDay);
  };

  // Regra especial para mensal: queremos o vencimento do mês corrente (mesmo se já passou)
  // para suportar os estados Pagar/Vencido/Pago dentro do mês.
  if (rec.recurrence_type === 'monthly') {
    const dueDay = start.getDate();
    const from = new Date(fromDate);
    from.setHours(12, 0, 0, 0);

    const startYM = start.getFullYear() * 12 + start.getMonth();
    const fromYM = from.getFullYear() * 12 + from.getMonth();

    let candidate: Date;
    if (fromYM <= startYM) {
      candidate = new Date(start);
    } else {
      const day = clampDayInMonth(from.getFullYear(), from.getMonth(), dueDay);
      candidate = new Date(from.getFullYear(), from.getMonth(), day, 12, 0, 0, 0);
    }

    if (end && candidate > end) return null;
    return candidate;
  }

  let current = new Date(start);
  if (fromDate > current) {
    const stepDays = rec.recurrence_type === 'weekly' ? 7
      : rec.recurrence_type === 'biweekly' ? 14
      : rec.recurrence_type === 'custom' && rec.interval_days ? rec.interval_days
      : null;

    if (rec.recurrence_type === 'annual') {
      while (current < fromDate) {
        current.setFullYear(current.getFullYear() + 1);
      }
    } else if (stepDays) {
      const msStep = stepDays * 24 * 60 * 60 * 1000;
      while (current < fromDate) {
        current = new Date(current.getTime() + msStep);
      }
    }
  }

  if (end && current > end) return null;
  return current;
}
