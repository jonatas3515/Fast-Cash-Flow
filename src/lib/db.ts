import { Platform } from 'react-native';

export type TxType = 'income' | 'expense';

type DB = {
  execAsync: (sql: string) => Promise<void>;
  runAsync: (sql: string, ...args: any[]) => Promise<void>;
  getAllAsync: <T = any>(sql: string, ...args: any[]) => Promise<T[]>;
  getFirstAsync: <T = any>(sql: string, ...args: any[]) => Promise<T | null>;
};

let _db: DB | null = null;

export const getDb = (): DB => {
  if (_db) return _db;
  if (Platform.OS === 'web') {
    // Minimal in-memory DB interface for web preview
    const rows: any[] = [];
    const getCompanyId = (): string | null => {
      try { return typeof window !== 'undefined' ? window.localStorage.getItem('auth_company_id') : null; } catch { return null; }
    };
    _db = {
      execAsync: async () => { },
      runAsync: async (sql: string, ...args: any[]) => {
        // Handle INSERT and UPDATE patterns used by repository
        if (sql.startsWith('INSERT INTO transactions_local')) {
          // Ordem dos args: id, type, date, time, datetime, description, category, clientname, expensetype, amount_cents, source_device, version, updated_at, deleted_at, company_id
          // Nota: dirty é literal "1" no SQL, não é um placeholder
          const [id, type, date, time, datetime, description, category, clientname, expensetype, amount_cents, source_device, version, updated_at, deleted_at, company_id] = args;
          const finalCompanyId = company_id || getCompanyId();
          rows.push({ id, type, date, time, datetime, description, category, clientname, expensetype: expensetype || 'operational', amount_cents, source_device, version, updated_at, deleted_at: deleted_at || null, dirty: 1, company_id: finalCompanyId });
          return;
        }
        if (sql.startsWith('UPDATE transactions_local SET')) {
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
          return;
        }
      },
      getAllAsync: async <T = any>(sql: string, ...args: any[]) => {
        const cid = getCompanyId();
        if (sql.startsWith('SELECT * FROM transactions_local WHERE date = ?')) {
          const date = args[0];
          return rows.filter(r => r.company_id === cid && r.date === date && !r.deleted_at).sort((a, b) => (b.datetime as string).localeCompare(a.datetime)) as T[];
        }
        if (sql.includes('WHERE date >= ? AND date <= ?')) {
          const start = args[0] as string;
          const end = args[1] as string;
          return rows
            .filter(r => r.company_id === cid && !r.deleted_at && r.date >= start && r.date <= end)
            .sort((a, b) => (a.datetime as string).localeCompare(b.datetime as string)) as T[];
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
        return null;
      },
    };
    return _db;
  }
  // Native: use expo-sqlite lazily
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const SQLite: typeof import('expo-sqlite') = require('expo-sqlite');
  // @ts-ignore - openDatabaseSync exists in SDK 54+
  _db = SQLite.openDatabaseSync('fastcashflow.db') as unknown as DB;
  return _db as DB;
};

export const migrate = async () => {
  if (Platform.OS === 'web') return; // no-op on web
  const db = getDb();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS transactions_local (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('income','expense')),
      date TEXT NOT NULL,
      time TEXT,
      datetime TEXT NOT NULL,
      description TEXT,
      category TEXT,
      clientname TEXT,
      expensetype TEXT DEFAULT 'operational',
      amount_cents INTEGER NOT NULL,
      source_device TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      dirty INTEGER NOT NULL DEFAULT 1,
      company_id TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_tx_local_date ON transactions_local(date);
    CREATE INDEX IF NOT EXISTS idx_tx_local_updated ON transactions_local(updated_at);
    CREATE INDEX IF NOT EXISTS idx_tx_local_deleted ON transactions_local(deleted_at);
    CREATE INDEX IF NOT EXISTS idx_tx_local_company ON transactions_local(company_id);

    CREATE TABLE IF NOT EXISTS sync_state (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
  try {
    // Backfill company_id for legacy rows
    let companyId: string | null = null;
    try { companyId = typeof window !== 'undefined' ? window.localStorage.getItem('auth_company_id') : null; } catch { }
    if (!companyId) {
      try { const SecureStore = require('expo-secure-store') as typeof import('expo-secure-store'); companyId = await SecureStore.getItemAsync('auth_company_id'); } catch { }
    }
    if (companyId) {
      await db.runAsync("UPDATE transactions_local SET company_id = ? WHERE company_id IS NULL", companyId);
    }
  } catch { }

  // Migração: adicionar coluna clientname se não existir
  try {
    await db.execAsync(`ALTER TABLE transactions_local ADD COLUMN clientname TEXT;`);
  } catch {
    // Coluna já existe, ignorar erro
  }

  // Migração: adicionar coluna expensetype se não existir
  try {
    await db.execAsync(`ALTER TABLE transactions_local ADD COLUMN expensetype TEXT DEFAULT 'operational';`);
  } catch {
    // Coluna já existe, ignorar erro
  }
};
