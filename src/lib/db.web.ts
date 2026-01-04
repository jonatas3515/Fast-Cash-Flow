import { Platform } from 'react-native';

export type TxType = 'income' | 'expense';

type DB = {
  execAsync: (sql: string) => Promise<void>;
  runAsync: (sql: string, ...args: any[]) => Promise<void>;
  getAllAsync: <T = any>(sql: string, ...args: any[]) => Promise<T[]>;
  getFirstAsync: <T = any>(sql: string, ...args: any[]) => Promise<T | null>;
};

let _db: DB | null = null;
let _currentCompanyId: string | null = null;
const STORAGE_KEY_BASE = 'fastcashflow_transactions_local_v2';
const SYNC_KEY_BASE = 'fastcashflow_sync_state_v2';

function getCompanyId(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem('auth_company_id');
  } catch { return null; }
}

function getStorageKey(): string {
  const cid = getCompanyId();
  return cid ? `${STORAGE_KEY_BASE}_${cid}` : STORAGE_KEY_BASE;
}

function getSyncKey(): string {
  const cid = getCompanyId();
  return cid ? `${SYNC_KEY_BASE}_${cid}` : SYNC_KEY_BASE;
}

export const getDb = (): DB => {
  // Verificar se mudou de empresa - se sim, recarregar dados
  const currentCid = getCompanyId();
  if (_db && _currentCompanyId !== currentCid) {
    console.log('[🔄 DB.WEB] Empresa mudou de', _currentCompanyId, 'para', currentCid, '- recarregando dados');
    _db = null;
  }

  if (_db) return _db;

  _currentCompanyId = currentCid;
  let rows: any[] = [];
  let lastSync: string | null = null;

  if (typeof window !== 'undefined') {
    try {
      const storageKey = getStorageKey();
      const syncKey = getSyncKey();
      console.log('[📂 DB.WEB] Carregando dados de:', storageKey);
      const raw = window.localStorage.getItem(storageKey);
      if (raw) rows = JSON.parse(raw) || [];
      const s = window.localStorage.getItem(syncKey);
      if (s) lastSync = JSON.parse(s) || null;
      console.log('[📂 DB.WEB] Carregados', rows.length, 'registros para empresa:', currentCid);
    } catch (e) {
      console.error('[❌ DB.WEB] Erro ao carregar dados:', e);
    }
  }

  const persist = () => {
    if (typeof window === 'undefined') return;
    const storageKey = getStorageKey();
    const syncKey = getSyncKey();
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(rows));
      console.log('[💾 PERSIST] Salvando', rows.length, 'transações em', storageKey);
    } catch (e) {
      console.error('[❌ PERSIST] Erro ao salvar transações:', e);
    }
    try {
      window.localStorage.setItem(syncKey, JSON.stringify(lastSync));
    } catch (e) {
      console.error('[❌ PERSIST] Erro ao salvar sync state:', e);
    }
  };
  _db = {
    execAsync: async () => { },
    runAsync: async (sql: string, ...args: any[]) => {
      if (sql.startsWith('INSERT INTO transactions_local') && !sql.includes('ON CONFLICT')) {
        // Ordem dos args: id, type, date, time, datetime, description, category, clientname, expensetype, amount_cents, source_device, version, updated_at, deleted_at, company_id
        // Nota: dirty é literal "1" no SQL, não é um placeholder
        const [id, type, date, time, datetime, description, category, clientname, expensetype, amount_cents, source_device, version, updated_at, deleted_at, company_id] = args;
        const finalCompanyId = company_id || getCompanyId();
        console.log('[💾 DB.WEB] INSERT transação:', { id, type, date, amount_cents, expensetype, company_id: finalCompanyId });
        rows.push({ id, type, date, time, datetime, description, category, clientname, expensetype: expensetype || 'operational', amount_cents, source_device, version, updated_at, deleted_at: deleted_at || null, dirty: 1, company_id: finalCompanyId });
        persist();
        return;
      }
      if (sql.startsWith('INSERT INTO transactions_local') && sql.includes('ON CONFLICT')) {
        // Ordem dos args para sync pull: id, type, date, time, datetime, description, category, clientname, expensetype, amount_cents, source_device, version, updated_at, deleted_at, company_id
        // Nota: dirty é literal "0" no SQL para sync
        const [id, type, date, time, datetime, description, category, clientname, expensetype, amount_cents, source_device, version, updated_at, deleted_at, company_id] = args;
        const i = rows.findIndex(r => r.id === id);
        const finalCompanyId = company_id || getCompanyId();
        const base = { id, type, date, time, datetime, description, category, clientname, expensetype: expensetype || 'operational', amount_cents, source_device, version, updated_at, deleted_at, dirty: 0, company_id: finalCompanyId } as any;
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
          // Parse SQL para identificar posições corretas dos campos
          // Formato: UPDATE transactions_local SET field1 = ?, field2 = ?, ... WHERE id = ?
          const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/i);
          if (setMatch) {
            const setPart = setMatch[1];
            // Encontrar campos com placeholders (ignorar literals como 'version + 1')
            const fieldMatches = setPart.matchAll(/(\w+)\s*=\s*\?/g);
            let argIndex = 0;
            for (const match of fieldMatches) {
              const fieldName = match[1];
              if (argIndex < args.length - 1) { // -1 porque o último é o ID
                const value = args[argIndex];
                // Atribuir valor ao campo correspondente
                if (fieldName === 'type') row.type = value;
                else if (fieldName === 'description') row.description = value;
                else if (fieldName === 'category') row.category = value;
                else if (fieldName === 'clientname') row.clientname = value;
                else if (fieldName === 'expensetype') row.expensetype = value;
                else if (fieldName === 'amount_cents') row.amount_cents = value;
                else if (fieldName === 'date') row.date = value;
                else if (fieldName === 'time') row.time = value;
                else if (fieldName === 'datetime') row.datetime = value;
                else if (fieldName === 'updated_at') row.updated_at = value;
                else if (fieldName === 'deleted_at') row.deleted_at = value;
                else if (fieldName === 'source_device') row.source_device = value;
                argIndex++;
              }
            }
          }
          // Sempre incrementar versão e marcar como dirty
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
        const filtered = rows.filter(r => r.company_id === cid && r.date === date && !r.deleted_at).sort((a, b) => (b.datetime as string).localeCompare(a.datetime));
        console.log('[🔍 DB.WEB] Query by date:', date, 'Company:', cid, 'Found:', filtered.length);
        return filtered as T[];
      }
      if (sql.includes('WHERE date >= ? AND date <= ?') && sql.includes('company_id = ?')) {
        const start = args[0] as string;
        const end = args[1] as string;
        const queryCompanyId = args[2] as string || cid;
        const filtered = rows
          .filter(r => r.company_id === queryCompanyId && !r.deleted_at && r.date >= start && r.date <= end)
          .sort((a, b) => (b.datetime as string).localeCompare(a.datetime as string));
        console.log('[🔍 DB.WEB] Query by range:', start, '-', end, 'Company:', queryCompanyId, 'Found:', filtered.length);
        return filtered as T[];
      }
      if (sql.includes('WHERE date >= ? AND date <= ?')) {
        const start = args[0] as string;
        const end = args[1] as string;
        const filtered = rows
          .filter(r => r.company_id === cid && !r.deleted_at && r.date >= start && r.date <= end)
          .sort((a, b) => (b.datetime as string).localeCompare(a.datetime as string));
        console.log('[🔍 DB.WEB] Query by range (no cid):', start, '-', end, 'Company:', cid, 'Found:', filtered.length);
        return filtered as T[];
      }
      if (sql.includes('WHERE dirty = 1')) {
        const queryCompanyId = args[0] as string || cid;
        const dirtyRows = rows.filter(r => r.company_id === queryCompanyId && r.dirty === 1);
        console.log('[🔍 DB.WEB] Query dirty rows - Company ID:', queryCompanyId, 'Found:', dirtyRows.length);
        if (dirtyRows.length > 0) {
          console.log('[🔍 DB.WEB] Primeiro registro dirty:', dirtyRows[0]);
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

// Função para forçar reload do DB (útil ao trocar de empresa)
export const resetDb = () => {
  console.log('[🔄 DB.WEB] Resetando DB...');
  _db = null;
  _currentCompanyId = null;
};
