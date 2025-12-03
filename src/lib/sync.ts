import { supabase } from './supabase';
import { getDb } from '../lib/db';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Minimal anonymous auth and two-way sync scaffold
// Assumes a Supabase table named 'transactions' with columns matching local schema
// If backend schema differs, adjust the mapping below.

type TxRow = {
  id: string;
  type: 'income' | 'expense';
  date: string;
  time?: string | null;
  datetime: string;
  description?: string | null;
  category?: string | null;
  amount_cents: number;
  source_device?: string | null;
  version: number;
  updated_at: string;
  deleted_at?: string | null;
};

export async function ensureAnonAuth() {
  // Disabled: avoid 422 errors; we will sync only when company_id is present
}

// Cache do company_id em memória para evitar reads repetidos
let _cachedCompanyId: string | null | undefined = undefined;
let _lastCompanyIdCheck: number = 0;
const COMPANY_ID_CACHE_MS = 2000; // Cache por 2 segundos

async function getAuthCompanyId(): Promise<string | null> {
  try {
    // Usar cache se disponível e recente
    const now = Date.now();
    if (_cachedCompanyId !== undefined && (now - _lastCompanyIdCheck) < COMPANY_ID_CACHE_MS) {
      return _cachedCompanyId;
    }
    
    // Buscar do storage
    let companyId: string | null = null;
    if (Platform.OS === 'web') {
      companyId = window.sessionStorage.getItem('auth_company_id');
    } else {
      companyId = (await SecureStore.getItemAsync('auth_company_id')) || null;
    }
    
    // Atualizar cache
    _cachedCompanyId = companyId;
    _lastCompanyIdCheck = now;
    
    return companyId;
  } catch {
    return null;
  }
}

// Função para limpar o cache (útil ao fazer logout)
export function clearCompanyIdCache() {
  _cachedCompanyId = undefined;
  _lastCompanyIdCheck = 0;
}

// Syncing listeners (simple pub/sub)
let syncingListeners: Array<(v: boolean) => void> = [];
function setSyncing(v: boolean) {
  syncingListeners.forEach(cb => {
    try { cb(v); } catch {}
  });
}
export function onSyncing(cb: (v: boolean) => void) {
  syncingListeners.push(cb);
  return () => { syncingListeners = syncingListeners.filter(x => x !== cb); };
}

export async function pushDirty() {
  const db = getDb();
  // Fetch local dirty rows
  const company_id = await getAuthCompanyId();
  console.log('[🔄 SYNC] pushDirty iniciando...');
  console.log('[🔄 SYNC] Company ID:', company_id);
  
  if (!company_id) {
    console.warn('[⚠️ SYNC] Sem company_id definido - não é possível fazer push');
    return;
  }
  
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM transactions_local WHERE dirty = 1 AND company_id = ?`,
    company_id
  );
  console.log('[🔄 SYNC] Registros dirty encontrados:', rows.length);
  
  if (!rows.length) {
    console.log('[✅ SYNC] Nenhum registro para sincronizar');
    return;
  }
  
  const payload: TxRow[] = rows.map((r: any) => ({
    id: r.id,
    type: r.type,
    date: r.date,
    time: r.time ?? null,
    datetime: r.datetime,
    description: r.description ?? null,
    category: r.category ?? null,
    amount_cents: r.amount_cents,
    source_device: r.source_device ?? null,
    version: r.version,
    updated_at: r.updated_at,
    deleted_at: r.deleted_at ?? null,
  }));
  
  console.log('[🔄 SYNC] Enviando', payload.length, 'registros para Supabase...');
  console.log('[🔄 SYNC] Exemplo de registro:', payload[0]);
  
  setSyncing(true);
  const { error, data } = await supabase.from('transactions').upsert(
    // @ts-ignore include company_id column on backend
    (payload as any).map((p: any) => ({ ...p, company_id })),
    { onConflict: 'id' }
  );
  setSyncing(false);
  
  if (error) {
    console.error('[❌ SYNC] Push falhou!');
    console.error('[❌ SYNC] Erro:', error.message);
    console.error('[❌ SYNC] Código:', error.code);
    console.error('[❌ SYNC] Detalhes:', error.details);
    throw new Error(error.message);
  }
  
  console.log('[✅ SYNC] Push concluído com sucesso!', rows.length, 'registros');
  console.log('[✅ SYNC] Resposta do Supabase:', data);
  
  // Mark local as clean
  for (const r of rows) {
    await db.runAsync(`UPDATE transactions_local SET dirty = 0 WHERE id = ?`, r.id);
  }
  console.log('[✅ SYNC] Registros marcados como limpos');
}

export async function pullRemoteSince() {
  const db = getDb();
  const state = await db.getFirstAsync<{ value: string }>(`SELECT value FROM sync_state WHERE key = 'last_sync'`);
  const last = state?.value ?? '1970-01-01T00:00:00.000Z';
  const company_id = await getAuthCompanyId();
  
  console.log('[⬇️ SYNC] pullRemoteSince iniciando...');
  console.log('[⬇️ SYNC] Company ID:', company_id);
  console.log('[⬇️ SYNC] Last sync:', last);
  
  if (!company_id) {
    console.warn('[⚠️ SYNC] Sem company_id definido - não é possível fazer pull');
    return;
  }
  
  setSyncing(true);
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .gt('updated_at', last)
    .eq('company_id', company_id)
    .order('updated_at', { ascending: true });
  setSyncing(false);
  
  if (error) {
    console.error('[❌ SYNC] Pull falhou!');
    console.error('[❌ SYNC] Erro:', error.message);
    console.error('[❌ SYNC] Código:', error.code);
    throw new Error(error.message);
  }
  
  const recordCount = Array.isArray(data) ? data.length : 0;
  console.log('[⬇️ SYNC] Recebidos', recordCount, 'registros do Supabase');
  
  if (recordCount > 0) {
    console.log('[⬇️ SYNC] Exemplo do primeiro registro:', data[0]);
  }
  
  for (const r of (data as TxRow[])) {
    // Upsert into local
    await db.runAsync(
      `INSERT INTO transactions_local (id, type, date, time, datetime, description, category, amount_cents, source_device, version, updated_at, deleted_at, dirty, company_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0,?)
       ON CONFLICT(id) DO UPDATE SET 
         type = excluded.type,
         date = excluded.date,
         time = excluded.time,
         datetime = excluded.datetime,
         description = excluded.description,
         category = excluded.category,
         amount_cents = excluded.amount_cents,
         source_device = excluded.source_device,
         version = excluded.version,
         updated_at = excluded.updated_at,
         deleted_at = excluded.deleted_at,
         dirty = 0,
         company_id = excluded.company_id
      `,
      r.id,
      r.type,
      r.date,
      r.time ?? null,
      r.datetime,
      r.description ?? null,
      r.category ?? null,
      r.amount_cents,
      r.source_device ?? null,
      r.version,
      r.updated_at,
      r.deleted_at ?? null,
      company_id,
    );
  }
  const newLast = (data && (data as TxRow[]).length) ? (data as TxRow[])[(data as TxRow[]).length - 1].updated_at : last;
  await db.runAsync(`INSERT INTO sync_state(key, value) VALUES('last_sync', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, newLast);
  console.log('[✅ SYNC] Pull concluído! Novo last_sync:', newLast);
}

export async function syncAll() {
  // Skip anon auth; only sync if company_id is set
  console.log('[🔄 SYNC] syncAll iniciando...');
  try {
    await pushDirty();
  } catch (e) {
    console.error('[❌ SYNC] Erro no push:', e);
  }
  try {
    await pullRemoteSince();
  } catch (e) {
    console.error('[❌ SYNC] Erro no pull:', e);
  }
  console.log('[✅ SYNC] syncAll concluído!');
}

export function subscribeRealtime() {
  // Requires Supabase Realtime enabled for 'transactions'
  console.log('[📡 SYNC] Configurando subscrição Realtime...');
  const channel = supabase.channel('tx-changes');
  // Bind by current company_id
  getAuthCompanyId().then((cid: string | null) => {
    console.log('[📡 SYNC] Company ID para Realtime:', cid);
    const opts: any = { event: '*', schema: 'public', table: 'transactions' };
    if (cid) {
      opts.filter = `company_id=eq.${cid}`;
      console.log('[📡 SYNC] Filtro Realtime:', opts.filter);
    }
    channel.on('postgres_changes', opts, async (payload: any) => {
      console.log('[📡 SYNC] Evento Realtime recebido!');
      console.log('[📡 SYNC] Tipo de evento:', payload?.eventType || '*');
      console.log('[📡 SYNC] Dados:', payload?.new || payload?.old);
      try { 
        await pullRemoteSince(); 
        console.log('[✅ SYNC] Pull após Realtime concluído!');
      } catch (e) { 
        console.error('[❌ SYNC] Realtime pull failed:', e); 
      }
    }).subscribe((status) => {
      console.log('[📡 SYNC] Status da subscrição Realtime:', status);
    });
  });
  return () => {
    try {
      console.log('[📡 SYNC] Removendo canal Realtime...');
      supabase.removeChannel(channel);
    } catch {}
  };
}

export async function quickSync() {
  try { await syncAll(); } catch {}
}
