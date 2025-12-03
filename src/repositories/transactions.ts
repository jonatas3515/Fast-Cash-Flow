import { getDb } from '../lib/db';
import { getCurrentCompanyId } from '../lib/company';

export type TxType = 'income' | 'expense';

export type Transaction = {
  id: string;
  type: TxType;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  datetime: string; // ISO
  description?: string;
  category?: string;
  amount_cents: number;
  source_device?: string;
  version: number;
  updated_at: string; // ISO
  deleted_at?: string | null;
  dirty: number; // 0/1
};

function uuidv4() {
  // Simple UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getTransactionsByRange(startYmd: string, endYmd: string): Promise<Transaction[]> {
  const db = getDb();
  const company_id = await getCurrentCompanyId();
  // Allow up to 3 months range (90 days)
  const rows = await db.getAllAsync<Transaction>(
    `SELECT * FROM transactions_local WHERE date >= ? AND date <= ? AND deleted_at IS NULL AND company_id = ? ORDER BY datetime ASC`,
    startYmd,
    endYmd,
    company_id
  );
  return rows;
}

export async function getWeeklyTotals(startYmd: string, endYmd: string): Promise<{ income_cents: number; expense_cents: number; balance_cents: number; avg_daily_cents: number; }>{
  const txs = await getTransactionsByRange(startYmd, endYmd);
  const income_cents = txs.filter(t => t.type === 'income').reduce((a, t) => a + (t.amount_cents || 0), 0);
  const expense_cents = txs.filter(t => t.type === 'expense').reduce((a, t) => a + (t.amount_cents || 0), 0);
  const balance_cents = income_cents - expense_cents;
  const avg_daily_cents = Math.round(balance_cents / 7);
  return { income_cents, expense_cents, balance_cents, avg_daily_cents };
}

export async function getWeeklySeries(startYmd: string): Promise<{ x: number; income: number; expense: number; balance: number }[]> {
  const endYmd = startYmd; // we'll compute 7 days forward in code using date utils in screen
  // This function will be composed in the screen using getTransactionsByRange to keep utils DRY.
  return [];
}

export async function getTransactionsByMonth(year: number, month: number): Promise<Transaction[]> {
  const db = getDb();
  const company_id = await getCurrentCompanyId();
  const monthStr = String(month).padStart(2, '0');
  const start = `${year}-${monthStr}-01`;
  // Allow up to 3 months range (90 days)
  const end = `${year}-${monthStr}-31`;
  const rows = await db.getAllAsync<Transaction>(
    `SELECT * FROM transactions_local WHERE date >= ? AND date <= ? AND deleted_at IS NULL AND company_id = ? ORDER BY datetime DESC`,
    start,
    end,
    company_id
  );
  return rows;
}

export async function getMonthlyTotals(year: number, month: number): Promise<{ income_cents: number; expense_cents: number; balance_cents: number; }>{
  const txs = await getTransactionsByMonth(year, month);
  const income_cents = txs.filter(t => t.type === 'income').reduce((a, t) => a + (t.amount_cents || 0), 0);
  const expense_cents = txs.filter(t => t.type === 'expense').reduce((a, t) => a + (t.amount_cents || 0), 0);
  return { income_cents, expense_cents, balance_cents: income_cents - expense_cents };
}

export async function getMonthlyDailySeries(year: number, month: number): Promise<{ day: number; income_cents: number; expense_cents: number; }[]> {
  const txs = await getTransactionsByMonth(year, month);
  const map = new Map<number, { income_cents: number; expense_cents: number }>();
  for (const t of txs) {
    const d = Number(t.date.split('-')[2]);
    const cur = map.get(d) || { income_cents: 0, expense_cents: 0 };
    if (t.type === 'income') cur.income_cents += t.amount_cents || 0;
    else cur.expense_cents += t.amount_cents || 0;
    map.set(d, cur);
  }
  
  // Calcular número correto de dias no mês
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  return days.map(day => ({ day, income_cents: map.get(day)?.income_cents || 0, expense_cents: map.get(day)?.expense_cents || 0 }));
}

// Função para calcular série semanal do mês
export async function getMonthlyWeeklySeries(year: number, month: number): Promise<{ week: number; income_cents: number; expense_cents: number; }[]> {
  const txs = await getTransactionsByMonth(year, month);
  const weekMap = new Map<number, { income_cents: number; expense_cents: number }>();
  
  for (const t of txs) {
    const day = Number(t.date.split('-')[2]);
    // Calcular semana do mês (1-5)
    const week = Math.ceil(day / 7);
    const cur = weekMap.get(week) || { income_cents: 0, expense_cents: 0 };
    if (t.type === 'income') cur.income_cents += t.amount_cents || 0;
    else cur.expense_cents += t.amount_cents || 0;
    weekMap.set(week, cur);
  }
  
  // Calcular número de semanas no mês
  const daysInMonth = new Date(year, month, 0).getDate();
  const weeksInMonth = Math.ceil(daysInMonth / 7);
  const weeks = Array.from({ length: weeksInMonth }, (_, i) => i + 1);
  return weeks.map(week => ({ week, income_cents: weekMap.get(week)?.income_cents || 0, expense_cents: weekMap.get(week)?.expense_cents || 0 }));
}

// Função para calcular série mensal do ano
export async function getYearlyMonthlySeries(year: number): Promise<{ month: number; monthName: string; income_cents: number; expense_cents: number; }[]> {
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const monthsData = [];
  
  for (let month = 1; month <= 12; month++) {
    const { income_cents, expense_cents } = await getMonthlyTotals(year, month);
    monthsData.push({
      month,
      monthName: monthNames[month - 1],
      income_cents,
      expense_cents,
    });
  }
  
  return monthsData;
}

function nowISO() {
  return new Date().toISOString();
}

export async function createTransaction(input: Omit<Transaction, 'id' | 'version' | 'updated_at' | 'deleted_at' | 'dirty'> & { id?: string; company_id?: string }) {
  const db = getDb();
  const company_id = input.company_id || await getCurrentCompanyId();
  
  console.log('[💾 CREATE] Criando transação...');
  console.log('[💾 CREATE] Company ID:', company_id);
  console.log('[💾 CREATE] Tipo:', input.type, 'Valor:', input.amount_cents);
  
  if (!company_id) {
    console.error('[❌ CREATE] ERRO: Sem company_id - transação não será criada!');
    throw new Error('Company ID não definido. Faça login novamente.');
  }
  
  const id = input.id ?? uuidv4();
  const updated_at = nowISO();
  const version = 1;
  const safeTime = input.time ?? updated_at.slice(11,16);
  let safeDatetime = input.datetime;
  if (!safeDatetime) {
    try {
      const base = input.date ? new Date(`${input.date}T${safeTime}:00`) : new Date();
      safeDatetime = base.toISOString();
    } catch { safeDatetime = updated_at; }
  }
  await db.runAsync(
    `INSERT INTO transactions_local (
      id, type, date, time, datetime, description, category, amount_cents, source_device, version, updated_at, deleted_at, dirty, company_id
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,?)`,
    id,
    input.type,
    input.date,
    safeTime,
    safeDatetime,
    input.description ?? null,
    input.category ?? null,
    input.amount_cents,
    input.source_device ?? null,
    version,
    updated_at,
    null,
    company_id
  );
  
  console.log('[✅ CREATE] Transação criada com ID:', id);
  console.log('[✅ CREATE] Marcada como dirty=1 para sincronização');
  
  // Tentar sincronizar imediatamente
  try {
    const { syncAll } = await import('../lib/sync');
    console.log('[🔄 CREATE] Iniciando sync imediato...');
    syncAll().catch(e => console.warn('[⚠️ CREATE] Sync imediato falhou:', e));
  } catch (e) {
    console.warn('[⚠️ CREATE] Não foi possível iniciar sync imediato:', e);
  }
  
  return id;
}

export async function updateTransaction(id: string, patch: Partial<Omit<Transaction, 'id' | 'version'>>) {
  const db = getDb();
  const updated_at = nowISO();
  // Build dynamic set clause
  const fields: string[] = [];
  const values: any[] = [];
  const allowed: (keyof Transaction)[] = ['type','date','time','datetime','description','category','amount_cents','source_device','deleted_at'];
  for (const key of allowed) {
    if (key in patch) {
      fields.push(`${key} = ?`);
      // @ts-ignore
      values.push(patch[key]);
    }
  }
  fields.push('updated_at = ?');
  values.push(updated_at);
  fields.push('version = version + 1');
  fields.push('dirty = 1');
  const sql = `UPDATE transactions_local SET ${fields.join(', ')} WHERE id = ?`;
  values.push(id);
  await db.runAsync(sql, ...values);
}

export async function softDeleteTransaction(id: string) {
  const db = getDb();
  const updated_at = nowISO();
  await db.runAsync(
    `UPDATE transactions_local SET deleted_at = ?, updated_at = ?, version = version + 1, dirty = 1 WHERE id = ?`,
    updated_at,
    updated_at,
    id
  );
}

export async function getTransactionsByDate(date: string): Promise<Transaction[]> {
  const db = getDb();
  const company_id = await getCurrentCompanyId();
  const rows = await db.getAllAsync<Transaction>(
    `SELECT * FROM transactions_local WHERE date = ? AND deleted_at IS NULL AND company_id = ? ORDER BY datetime DESC`,
    date,
    company_id
  );
  return rows;
}

export async function getDailyTotals(date: string): Promise<{ income_cents: number; expense_cents: number; balance_cents: number; }>{
  const db = getDb();
  const company_id = await getCurrentCompanyId();
  const incomeRow = await db.getFirstAsync<{ sum: number }>(
    `SELECT COALESCE(SUM(amount_cents),0) as sum FROM transactions_local WHERE date = ? AND type = 'income' AND deleted_at IS NULL AND company_id = ?`,
    date,
    company_id
  );
  const expenseRow = await db.getFirstAsync<{ sum: number }>(
    `SELECT COALESCE(SUM(amount_cents),0) as sum FROM transactions_local WHERE date = ? AND type = 'expense' AND deleted_at IS NULL AND company_id = ?`,
    date,
    company_id
  );
  const income_cents = incomeRow?.sum ?? 0;
  const expense_cents = expenseRow?.sum ?? 0;
  return { income_cents, expense_cents, balance_cents: income_cents - expense_cents };
}
