import { supabase } from '../lib/supabase';
import { getCurrentCompanyId } from '../lib/company';

// Status de uma conta a receber
export type ReceivableStatus = 'pending' | 'partial' | 'received' | 'overdue';

// Forma de pagamento que gera conta a receber
export type PaymentMethod = 'boleto' | 'pix_parcelado' | 'cartao_parcelado' | 'fiado' | 'cheque' | 'outro';

export interface Receivable {
  id: string;
  company_id: string;
  client_name: string;
  description: string;
  total_cents: number;
  received_cents: number;
  due_date: string; // YYYY-MM-DD
  payment_method: PaymentMethod;
  status: ReceivableStatus;
  transaction_id?: string | null; // Referência à transação original
  notes?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export type CreateReceivableInput = Omit<Receivable, 'id' | 'company_id' | 'created_at' | 'updated_at' | 'status'>;

// Listar todas as contas a receber
export async function listReceivables(): Promise<Receivable[]> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) throw new Error('Empresa não identificada');

  const { data, error } = await supabase
    .from('receivables')
    .select('*')
    .eq('company_id', companyId)
    .order('due_date', { ascending: true });

  if (error) {
    // Se tabela não existir, retornar array vazio
    if (error.code === '42P01') return [];
    throw error;
  }
  return (data || []) as Receivable[];
}

// Listar contas a receber por status
export async function listReceivablesByStatus(status: ReceivableStatus): Promise<Receivable[]> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) throw new Error('Empresa não identificada');

  const { data, error } = await supabase
    .from('receivables')
    .select('*')
    .eq('company_id', companyId)
    .eq('status', status)
    .order('due_date', { ascending: true });

  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }
  return (data || []) as Receivable[];
}

// Criar conta a receber
export async function createReceivable(input: CreateReceivableInput): Promise<Receivable> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) throw new Error('Empresa não identificada');

  const today = new Date().toISOString().split('T')[0];
  const isOverdue = input.due_date < today && input.received_cents < input.total_cents;
  const status: ReceivableStatus = isOverdue ? 'overdue' : 
    input.received_cents >= input.total_cents ? 'received' :
    input.received_cents > 0 ? 'partial' : 'pending';

  const { data, error } = await supabase
    .from('receivables')
    .insert({
      company_id: companyId,
      ...input,
      status,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as Receivable;
}

// Atualizar conta a receber
export async function updateReceivable(id: string, updates: Partial<CreateReceivableInput>): Promise<Receivable> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) throw new Error('Empresa não identificada');

  // Recalcular status se valores mudaram
  let status: ReceivableStatus | undefined;
  if (updates.received_cents !== undefined || updates.total_cents !== undefined || updates.due_date !== undefined) {
    const { data: current } = await supabase
      .from('receivables')
      .select('*')
      .eq('id', id)
      .single();
    
    if (current) {
      const total = updates.total_cents ?? current.total_cents;
      const received = updates.received_cents ?? current.received_cents;
      const dueDate = updates.due_date ?? current.due_date;
      const today = new Date().toISOString().split('T')[0];
      
      status = dueDate < today && received < total ? 'overdue' :
        received >= total ? 'received' :
        received > 0 ? 'partial' : 'pending';
    }
  }

  const { data, error } = await supabase
    .from('receivables')
    .update({ ...updates, ...(status && { status }), updated_at: new Date().toISOString() })
    .eq('company_id', companyId)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as Receivable;
}

// Marcar como recebido (total ou parcial)
export async function markAsReceived(id: string, amountCents: number): Promise<Receivable> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) throw new Error('Empresa não identificada');

  const { data: current, error: fetchError } = await supabase
    .from('receivables')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  const newReceived = (current.received_cents || 0) + amountCents;
  const status: ReceivableStatus = newReceived >= current.total_cents ? 'received' : 'partial';

  const { data, error } = await supabase
    .from('receivables')
    .update({ 
      received_cents: newReceived, 
      status,
      updated_at: new Date().toISOString() 
    })
    .eq('company_id', companyId)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as Receivable;
}

// Deletar conta a receber
export async function deleteReceivable(id: string): Promise<void> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) throw new Error('Empresa não identificada');

  const { error } = await supabase
    .from('receivables')
    .delete()
    .eq('company_id', companyId)
    .eq('id', id);

  if (error) throw error;
}

// Obter resumo de contas a receber
export async function getReceivablesSummary(): Promise<{
  total: number;
  overdue: number;
  dueThisWeek: number;
  dueThisMonth: number;
  byClient: { client: string; total: number; overdue: number }[];
  byDay: { date: string; amount: number }[];
}> {
  const receivables = await listReceivables();
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
  const clientMap = new Map<string, { total: number; overdue: number }>();
  const dayMap = new Map<string, number>();

  for (const r of receivables) {
    if (r.status === 'received') continue;
    
    const remaining = r.total_cents - r.received_cents;
    total += remaining;

    if (r.due_date < todayStr) {
      overdue += remaining;
    } else if (r.due_date <= nextWeekStr) {
      dueThisWeek += remaining;
    }
    
    if (r.due_date <= endOfMonthStr) {
      dueThisMonth += remaining;
    }

    // Por cliente
    const clientData = clientMap.get(r.client_name) || { total: 0, overdue: 0 };
    clientData.total += remaining;
    if (r.due_date < todayStr) clientData.overdue += remaining;
    clientMap.set(r.client_name, clientData);

    // Por dia (próximos 14 dias)
    const twoWeeks = new Date(today);
    twoWeeks.setDate(twoWeeks.getDate() + 14);
    if (r.due_date >= todayStr && r.due_date <= twoWeeks.toISOString().split('T')[0]) {
      dayMap.set(r.due_date, (dayMap.get(r.due_date) || 0) + remaining);
    }
  }

  return {
    total,
    overdue,
    dueThisWeek,
    dueThisMonth,
    byClient: Array.from(clientMap.entries())
      .map(([client, data]) => ({ client, ...data }))
      .sort((a, b) => b.total - a.total),
    byDay: Array.from(dayMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}
