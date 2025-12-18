import { supabase } from '../lib/supabase';
import { getCurrentCompanyId } from '../lib/company';
import { listAllDebts, DebtRow } from './debts';
import { listRecurringExpenses, RecurringExpense, getNextOccurrence } from './recurring_expenses';
import { getTransactionsByMonth, Transaction } from './transactions';

// Status de uma conta a pagar
export type PayableStatus = 'pending' | 'partial' | 'paid' | 'overdue';

// Tipo de conta a pagar
export type PayableType = 'debt' | 'recurring' | 'bill' | 'supplier';

export interface Payable {
  id: string;
  company_id: string;
  supplier_name: string;
  category: string;
  description: string;
  total_cents: number;
  paid_cents: number;
  due_date: string; // YYYY-MM-DD
  type: PayableType;
  status: PayableStatus;
  source_id?: string | null; // ID da dívida ou despesa recorrente original
  notes?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export type CreatePayableInput = Omit<Payable, 'id' | 'company_id' | 'created_at' | 'updated_at' | 'status'>;

// Listar todas as contas a pagar
export async function listPayables(): Promise<Payable[]> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) throw new Error('Empresa não identificada');

  const { data, error } = await supabase
    .from('payables')
    .select('*')
    .eq('company_id', companyId)
    .order('due_date', { ascending: true });

  if (error) {
    // Se tabela não existir, retornar array vazio
    if (error.code === '42P01') return [];
    throw error;
  }
  return (data || []) as Payable[];
}

// Criar conta a pagar
export async function createPayable(input: CreatePayableInput): Promise<Payable> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) throw new Error('Empresa não identificada');

  const today = new Date().toISOString().split('T')[0];
  const isOverdue = input.due_date < today && input.paid_cents < input.total_cents;
  const status: PayableStatus = isOverdue ? 'overdue' :
    input.paid_cents >= input.total_cents ? 'paid' :
      input.paid_cents > 0 ? 'partial' : 'pending';

  const { data, error } = await supabase
    .from('payables')
    .insert({
      company_id: companyId,
      ...input,
      status,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as Payable;
}

// Atualizar conta a pagar
export async function updatePayable(id: string, updates: Partial<CreatePayableInput>): Promise<Payable> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) throw new Error('Empresa não identificada');

  // Recalcular status se valores mudaram
  let status: PayableStatus | undefined;
  if (updates.paid_cents !== undefined || updates.total_cents !== undefined || updates.due_date !== undefined) {
    const { data: current } = await supabase
      .from('payables')
      .select('*')
      .eq('id', id)
      .single();

    if (current) {
      const total = updates.total_cents ?? current.total_cents;
      const paid = updates.paid_cents ?? current.paid_cents;
      const dueDate = updates.due_date ?? current.due_date;
      const today = new Date().toISOString().split('T')[0];

      status = dueDate < today && paid < total ? 'overdue' :
        paid >= total ? 'paid' :
          paid > 0 ? 'partial' : 'pending';
    }
  }

  const { data, error } = await supabase
    .from('payables')
    .update({ ...updates, ...(status && { status }), updated_at: new Date().toISOString() })
    .eq('company_id', companyId)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as Payable;
}

// Marcar como pago (total ou parcial)
export async function markAsPaid(id: string, amountCents: number): Promise<Payable> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) throw new Error('Empresa não identificada');

  const { data: current, error: fetchError } = await supabase
    .from('payables')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  const newPaid = (current.paid_cents || 0) + amountCents;
  const status: PayableStatus = newPaid >= current.total_cents ? 'paid' : 'partial';

  const { data, error } = await supabase
    .from('payables')
    .update({
      paid_cents: newPaid,
      status,
      updated_at: new Date().toISOString()
    })
    .eq('company_id', companyId)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as Payable;
}

// Deletar conta a pagar
export async function deletePayable(id: string): Promise<void> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) throw new Error('Empresa não identificada');

  const { error } = await supabase
    .from('payables')
    .delete()
    .eq('company_id', companyId)
    .eq('id', id);

  if (error) throw error;
}

// Obter resumo de contas a pagar (incluindo dívidas e despesas recorrentes)
export async function getPayablesSummary(): Promise<{
  total: number;
  overdue: number;
  dueThisWeek: number;
  dueThisMonth: number;
  byCategory: { category: string; total: number; overdue: number }[];
  byDay: { date: string; amount: number }[];
  fromDebts: number;
  fromRecurring: number;
  fromBills: number;
}> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) throw new Error('Empresa não identificada');

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Próximos 7 dias
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  // Fim do mês
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const endOfMonthStr = endOfMonth.toISOString().split('T')[0];

  let total = 0;
  let overdue = 0;
  let dueThisWeek = 0;
  let dueThisMonth = 0;
  let fromDebts = 0;
  let fromRecurring = 0;
  let fromBills = 0;
  const categoryMap = new Map<string, { total: number; overdue: number }>();
  const dayMap = new Map<string, number>();

  // 1. Buscar contas a pagar cadastradas
  const payables = await listPayables();
  for (const p of payables) {
    if (p.status === 'paid') continue;

    const remaining = p.total_cents - p.paid_cents;
    total += remaining;
    fromBills += remaining;

    if (p.due_date < todayStr) {
      overdue += remaining;
    } else if (p.due_date <= nextWeekStr) {
      dueThisWeek += remaining;
    }

    if (p.due_date <= endOfMonthStr) {
      dueThisMonth += remaining;
    }

    // Por categoria
    const catData = categoryMap.get(p.category) || { total: 0, overdue: 0 };
    catData.total += remaining;
    if (p.due_date < todayStr) catData.overdue += remaining;
    categoryMap.set(p.category, catData);

    // Por dia
    const twoWeeks = new Date(today);
    twoWeeks.setDate(twoWeeks.getDate() + 14);
    if (p.due_date >= todayStr && p.due_date <= twoWeeks.toISOString().split('T')[0]) {
      dayMap.set(p.due_date, (dayMap.get(p.due_date) || 0) + remaining);
    }
  }

  // 2. Buscar dívidas ativas (usando mesma lógica do Dashboard)
  try {
    const debts = await listAllDebts(companyId);

    // Calcular próximo mês
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const nextMonthYear = nextMonth.getFullYear();
    const nextMonthNum = nextMonth.getMonth(); // 0-indexed

    for (const debt of debts) {
      const paidInstallments = debt.paid_installments || 0;
      const totalInstallments = debt.installment_count || 1;
      const installmentCents = debt.installment_cents || 0;
      const remainingInstallments = totalInstallments - paidInstallments;

      // Se não tem parcelas restantes, pular
      if (remainingInstallments <= 0) continue;

      // Usar invoice_due_date se disponível
      if (debt.invoice_due_date) {
        const [baseYear, baseMonth, baseDay] = debt.invoice_due_date.split('-').map(Number);

        // Iterar sobre cada parcela não paga
        for (let i = paidInstallments; i < totalInstallments; i++) {
          // Calcular data de vencimento desta parcela
          const dueDate = new Date(baseYear, baseMonth - 1 + i, baseDay);
          dueDate.setHours(0, 0, 0, 0);

          const dueDateStr = dueDate.toISOString().split('T')[0];

          // Verificar se está vencida (antes de hoje)
          if (dueDate < today) {
            overdue += installmentCents;
            total += installmentCents;
            fromDebts += installmentCents;
          }
          // Verificar se é do próximo mês
          else if (dueDate.getFullYear() === nextMonthYear && dueDate.getMonth() === nextMonthNum) {
            total += installmentCents;
            fromDebts += installmentCents;
            dueThisMonth += installmentCents;
          }

          // Verificar se está nos próximos 7 dias
          if (dueDateStr >= todayStr && dueDateStr <= nextWeekStr) {
            dueThisWeek += installmentCents;
          }

          // Por categoria
          const catData = categoryMap.get('Dívidas') || { total: 0, overdue: 0 };
          if (dueDate < today || (dueDate.getFullYear() === nextMonthYear && dueDate.getMonth() === nextMonthNum)) {
            catData.total += installmentCents;
            if (dueDate < today) catData.overdue += installmentCents;
            categoryMap.set('Dívidas', catData);
          }
        }
      }
    }
  } catch (e) {
    console.warn('Erro ao buscar dívidas:', e);
  }

  // 3. Buscar despesas recorrentes
  try {
    const monthTransactions: Transaction[] = await getTransactionsByMonth(today.getFullYear(), today.getMonth() + 1);

    const recurring = await listRecurringExpenses();
    for (const rec of recurring) {
      // Pular despesas com valor variável (amount_cents = 0) ou data especial "Não se Aplica"
      if (rec.amount_cents <= 0 || rec.start_date === '9999-12-31' || rec.start_date === '1900-01-01') {
        continue;
      }

      // Calcular próxima ocorrência
      const nextDateObj = getNextOccurrence(rec, today);
      if (!nextDateObj) continue;

      const nextDate = nextDateObj.toISOString().split('T')[0];
      if (nextDate > endOfMonthStr) continue;

      // Verificação melhorada: Se já foi pago no mês (via tag determinística), não entra no "A Pagar"
      const paymentKey = rec.recurrence_type === 'monthly' ? nextDate.slice(0, 7) : nextDate;
      const paymentTag = `recurring_expense:${rec.id}:${paymentKey}`;
      
      // Buscar todas as transações do mês para verificar pagamento
      const alreadyPaid = monthTransactions.some((tx) => {
        return tx.type === 'expense' && (
          (tx.source_device || '') === paymentTag ||
          // Verificação adicional: mesma descrição, valor aproximado e mês atual
          (tx.description === rec.description && 
           Math.abs(tx.amount_cents - rec.amount_cents) < 100 && // diferença de até R$ 1,00
           tx.date.startsWith(nextDate.slice(0, 7)))
        );
      });
      
      if (alreadyPaid) continue;

      total += rec.amount_cents;
      fromRecurring += rec.amount_cents;

      if (nextDate < todayStr) {
        overdue += rec.amount_cents;
      } else if (nextDate <= nextWeekStr) {
        dueThisWeek += rec.amount_cents;
      }

      if (nextDate <= endOfMonthStr) {
        dueThisMonth += rec.amount_cents;
      }

      // Por categoria
      const category = rec.category || 'Despesas Recorrentes';
      const catData = categoryMap.get(category) || { total: 0, overdue: 0 };
      catData.total += rec.amount_cents;
      if (nextDate < todayStr) catData.overdue += rec.amount_cents;
      categoryMap.set(category, catData);

      // Por dia
      const twoWeeksStr = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      if (nextDate >= todayStr && nextDate <= twoWeeksStr) {
        dayMap.set(nextDate, (dayMap.get(nextDate) || 0) + rec.amount_cents);
      }
    }
  } catch (e) {
    console.warn('Erro ao buscar despesas recorrentes:', e);
  }

  return {
    total,
    overdue,
    dueThisWeek,
    dueThisMonth,
    byCategory: Array.from(categoryMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.total - a.total),
    byDay: Array.from(dayMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    fromDebts,
    fromRecurring,
    fromBills,
  };
}

// Função auxiliar para calcular data de vencimento de parcela
function calculateInstallmentDueDate(startDate: string, installmentIndex: number): string {
  const [year, month, day] = startDate.split('-').map(Number);
  const date = new Date(year, month - 1 + installmentIndex, day);
  return date.toISOString().split('T')[0];
}
