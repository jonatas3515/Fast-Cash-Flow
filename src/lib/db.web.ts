import { Platform } from 'react-native';

export type TxType = 'income' | 'expense';

type DB = {
  execAsync: (sql: string) => Promise<void>;
  runAsync: (sql: string, ...args: any[]) => Promise<void>;
  getAllAsync: <T = any>(sql: string, ...args: any[]) => Promise<T[]>;
  getFirstAsync: <T = any>(sql: string, ...args: any[]) => Promise<T | null>;
};

let _db: DB | null = null;
const STORAGE_KEY = 'fastcashflow_transactions_local_v1';
const SYNC_KEY = 'fastcashflow_sync_state_v1';

function getCompanyId(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage.getItem('auth_company_id');
  } catch { return null; }
}

export const getDb = (): DB => {
  if (_db) return _db;
  let rows: any[] = [];
  let lastSync: string | null = null;
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) rows = JSON.parse(raw) || [];
      const s = window.localStorage.getItem(SYNC_KEY);
      if (s) lastSync = JSON.parse(s) || null;
    } catch {}
  }
  const persist = () => {
    if (typeof window === 'undefined') return;
    try { 
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows)); 
      console.log('[💾 PERSIST] Salvando', rows.length, 'transações no localStorage');
    } catch (e) {
      console.error('[❌ PERSIST] Erro ao salvar transações:', e);
    }
    try { 
      window.localStorage.setItem(SYNC_KEY, JSON.stringify(lastSync)); 
    } catch (e) {
      console.error('[❌ PERSIST] Erro ao salvar sync state:', e);
    }
  };
  _db = {
    execAsync: async () => {},
    runAsync: async (sql: string, ...args: any[]) => {
      if (sql.startsWith('INSERT INTO transactions_local') && !sql.includes('ON CONFLICT')) {
        const [id, type, date, time, datetime, description, category, amount_cents, source_device, version, updated_at] = args;
        const company_id = getCompanyId();
        rows.push({ id, type, date, time, datetime, description, category, amount_cents, source_device, version, updated_at, deleted_at: null, dirty: 1, company_id });
        persist();
        return;
      }
      if (sql.startsWith('INSERT INTO transactions_local') && sql.includes('ON CONFLICT')) {
        const [id, type, date, time, datetime, description, category, amount_cents, source_device, version, updated_at, deleted_at] = args;
        const i = rows.findIndex(r => r.id === id);
        const base = { id, type, date, time, datetime, description, category, amount_cents, source_device, version, updated_at, deleted_at, dirty: 0, company_id: getCompanyId() } as any;
        if (i >= 0) rows[i] = { ...rows[i], ...base };
        else rows.push(base);
        persist();
        return;
      }
      if (sql.startsWith('UPDATE transactions_local SET')) {
        if (sql.includes('dirty = 0') && sql.includes('WHERE id = ?')) {
          const id = args[0];
          const row = rows.find(r => r.id === id);
          if (row) row.dirty = 0;
          persist();
          return;
        }
        const id = args[args.length - 1];
        const row = rows.find(r => r.id === id);
        if (row) {
          if (sql.includes('deleted_at = ?')) {
            row.deleted_at = args[0];
          }
          row.updated_at = args[1] || row.updated_at;
          row.version = (row.version ?? 1) + 1;
          row.dirty = 1;
        }
        persist();
        return;
      }
      if (sql.startsWith("INSERT INTO sync_state") && sql.includes("ON CONFLICT")) {
        lastSync = args[0] ?? null;
        persist();
        return;
      }
    },
    getAllAsync: async <T = any>(sql: string, ...args: any[]) => {
      const cid = getCompanyId();
      if (sql.startsWith('SELECT * FROM transactions_local WHERE date = ?')) {
        const date = args[0];
        return rows.filter(r => r.company_id === cid && r.date === date && !r.deleted_at).sort((a,b) => (b.datetime as string).localeCompare(a.datetime)) as T[];
      }
      if (sql.includes('WHERE date >= ? AND date <= ?')) {
        const start = args[0] as string;
        const end = args[1] as string;
        return rows
          .filter(r => r.company_id === cid && !r.deleted_at && r.date >= start && r.date <= end)
          .sort((a,b) => (a.datetime as string).localeCompare(b.datetime as string)) as T[];
      }
      if (sql.includes('WHERE dirty = 1')) {
        const dirtyRows = rows.filter(r => r.company_id === cid && r.dirty === 1);
        console.log('[🔍 DB] Query dirty rows - Company ID:', cid, 'Found:', dirtyRows.length);
        if (dirtyRows.length > 0) {
          console.log('[🔍 DB] Primeiro registro dirty:', dirtyRows[0]);
        }
        return dirtyRows as T[];
      }
      return [] as T[];
    },
    getFirstAsync: async <T = any>(sql: string, ...args: any[]) => {
      const cid = getCompanyId();
      if (sql.includes("type = 'income'")) {
        const date = args[0];
        const sum = rows.filter(r => r.company_id === cid && r.date === date && !r.deleted_at && r.type === 'income').reduce((acc, r) => acc + (r.amount_cents || 0), 0);
        return { sum } as unknown as T;
      }
      if (sql.includes("type = 'expense'")) {
        const date = args[0];
        const sum = rows.filter(r => r.company_id === cid && r.date === date && !r.deleted_at && r.type === 'expense').reduce((acc, r) => acc + (r.amount_cents || 0), 0);
        return { sum } as unknown as T;
      }
      if (sql.includes("SELECT value FROM sync_state WHERE key = 'last_sync'")) {
        return (lastSync ? { value: lastSync } : null) as unknown as T;
      }
      return null;
    },
  };
  return _db;
};

export const migrate = async () => {
  // no-op on web
};
