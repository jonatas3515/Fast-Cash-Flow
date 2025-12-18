import { supabase } from './supabase';
import { getDb } from '../lib/db';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { QueryClient } from '@tanstack/react-query';
import SyncMonitor from './syncMonitor';

// Minimal anonymous auth and two-way sync scaffold
// Assumes a Supabase table named 'transactions' with columns matching local schema
// If backend schema differs, adjust the mapping below.

// ============================================
// REALTIME SYNC - Sincronização em tempo real
// ============================================
let realtimeChannel: any = null;
let currentCompanyId: string | null = null;
let queryClientRef: QueryClient | null = null;

type TxRow = {
  id: string;
  type: 'income' | 'expense';
  date: string;
  time?: string | null;
  datetime: string;
  description?: string | null;
  category?: string | null;
  clientname?: string | null;
  expensetype?: 'operational' | 'withdrawal' | null;
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

    // Buscar do storage - usar localStorage para persistir entre refreshes
    let companyId: string | null = null;
    if (Platform.OS === 'web') {
      companyId = window.localStorage.getItem('auth_company_id');
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
    try { cb(v); } catch { }
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
  console.log('[🔄 SYNC] Platform:', Platform.OS);

  if (!company_id) {
    console.warn('[⚠️ SYNC] Sem company_id definido - não é possível fazer push');
    return;
  }

  // DEBUG ESPECIAL: Verificar se o company_id corresponde à FastSavorys
  if (Platform.OS !== 'web') {
    console.log('[🔍 DEBUG] Verificação especial para Android...');
    try {
      // Verificar empresa no Supabase com este ID
      const { data: empresaSupabase } = await supabase
        .from('companies')
        .select('name, username, email')
        .eq('id', company_id)
        .maybeSingle();

      console.log('[🔍 DEBUG] Empresa no Supabase:', empresaSupabase);

      if (empresaSupabase?.name?.includes('FastSavory')) {
        console.log('[⚠️ DEBUG] DETECTADO: FastSavorys no Android!');
        console.log('[⚠️ DEBUG] Verificando sync forçado...');

        // Buscar TODOS os registros dirty (sem filtro de company_id para debug)
        const allDirty = await db.getAllAsync<any>(
          `SELECT id, type, amount_cents, company_id FROM transactions_local WHERE dirty = 1 LIMIT 5`
        );
        console.log('[🔍 DEBUG] TODOS os registros dirty:', allDirty.length);
        allDirty.forEach(r => {
          console.log(`   - ${r.type} R$${r.amount_cents / 100} (company: ${r.company_id})`);
        });

        // Se houver dirty mas company_id não bater, tentar corrigir
        if (allDirty.length > 0) {
          const wrongCompany = allDirty.find(r => r.company_id !== company_id);
          if (wrongCompany) {
            console.log('[🔧 DEBUG] Tentando corrigir company_id nos registros...');
            await db.runAsync(
              `UPDATE transactions_local SET company_id = ? WHERE dirty = 1`,
              company_id
            );
            console.log('[✅ DEBUG] Company_id atualizado nos registros dirty');
          }
        }
      }
    } catch (e) {
      console.warn('[⚠️ DEBUG] Erro na verificação especial:', e);
    }
  }

  // Debug: verificar TODOS os registros primeiro
  try {
    const allRows = await db.getAllAsync<any>(`SELECT id, dirty, company_id FROM transactions_local LIMIT 10`);
    console.log('[🔍 DEBUG] Primeiros 10 registros no banco:', allRows.length);
    if (allRows.length > 0) {
      console.log('[🔍 DEBUG] Exemplo:', JSON.stringify(allRows[0]));
    }
  } catch (e) {
    console.warn('[⚠️ DEBUG] Erro ao buscar registros para debug:', e);
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
    clientname: r.clientname ?? null,
    expensetype: r.expensetype ?? 'operational',
    amount_cents: r.amount_cents,
    source_device: r.source_device ?? null,
    version: r.version,
    updated_at: r.updated_at,
    deleted_at: r.deleted_at ?? null,
  }));

  console.log('[🔄 SYNC] Enviando', payload.length, 'registros para Supabase...');
  console.log('[🔄 SYNC] IDs dos registros:', payload.map(p => p.id).join(', '));
  console.log('[🔄 SYNC] Exemplo de registro:', JSON.stringify(payload[0], null, 2));

  setSyncing(true);
  const startTime = Date.now();
  const { error, data } = await supabase.from('transactions').upsert(
    // @ts-ignore include company_id column on backend
    (payload as any).map((p: any) => ({ ...p, company_id })),
    { onConflict: 'id' }
  );
  setSyncing(false);
  const elapsed = Date.now() - startTime;

  if (error) {
    console.error('[❌ SYNC] Push falhou após', elapsed, 'ms');
    console.error('[❌ SYNC] Erro:', error.message);
    console.error('[❌ SYNC] Código:', error.code);
    console.error('[❌ SYNC] Detalhes:', error.details);
    console.error('[❌ SYNC] Hint:', error.hint);
    throw new Error(error.message);
  }

  console.log('[✅ SYNC] Push concluído com sucesso em', elapsed, 'ms!', rows.length, 'registros');
  console.log('[✅ SYNC] Resposta do Supabase:', data ? `${(data as any[]).length} registros` : 'sem dados retornados');

  // Mark local as clean
  for (const r of rows) {
    await db.runAsync(`UPDATE transactions_local SET dirty = 0 WHERE id = ?`, r.id);
  }
  console.log('[✅ SYNC] Registros marcados como limpos localmente');
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
      `INSERT INTO transactions_local (id, type, date, time, datetime, description, category, clientname, expensetype, amount_cents, source_device, version, updated_at, deleted_at, dirty, company_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?)
       ON CONFLICT(id) DO UPDATE SET 
         type = excluded.type,
         date = excluded.date,
         time = excluded.time,
         datetime = excluded.datetime,
         description = excluded.description,
         category = excluded.category,
         clientname = excluded.clientname,
         expensetype = excluded.expensetype,
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
      r.clientname ?? null,
      r.expensetype ?? 'operational',
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

/**
 * @deprecated Use setupRealtimeSync() instead - gerenciado pelo CompanyContext
 * Esta função foi mantida apenas para compatibilidade, mas não faz nada.
 */
export function subscribeRealtime() {
  console.log('[📡 SYNC] subscribeRealtime() deprecated - use setupRealtimeSync() via CompanyContext');
  return () => { };
}

export async function quickSync() {
  try { await syncAll(); } catch { }
}

// ============================================
// REALTIME SYNC - Funções de sincronização em tempo real
// ============================================

// Variáveis para reconexão automática
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 15;
const RECONNECT_DELAY_MS = 2000;
let reconnectTimeout: NodeJS.Timeout | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;
let isReconnecting = false;

// Função para verificar se o canal está ativo e reconectar se necessário
function startHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  heartbeatInterval = setInterval(async () => {
    if (!realtimeChannel || !currentCompanyId || !queryClientRef) {
      console.log('💓 Heartbeat: Canal não configurado, ignorando...');
      return;
    }

    // Verificar estado do canal
    const state = realtimeChannel.state;
    console.log('💓 Heartbeat: Estado do canal =', state);

    if (state !== 'joined' && state !== 'joining' && !isReconnecting) {
      console.log('💓 Heartbeat: Canal desconectado, reconectando...');
      attemptReconnect();
    }
  }, 30000); // Verificar a cada 30 segundos
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

async function attemptReconnect() {
  if (isReconnecting) {
    console.log('🔄 Já está reconectando, ignorando...');
    return;
  }

  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('❌ Máximo de tentativas de reconexão atingido');
    SyncMonitor.setConnectionStatus('disconnected');
    isReconnecting = false;
    // Reset após 1 minuto para tentar novamente
    setTimeout(() => {
      reconnectAttempts = 0;
    }, 60000);
    return;
  }

  isReconnecting = true;
  reconnectAttempts++;
  console.log(`🔄 Tentativa de reconexão ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}...`);
  SyncMonitor.setConnectionStatus('reconnecting');

  if (currentCompanyId && queryClientRef) {
    try {
      await setupRealtimeSync(queryClientRef, currentCompanyId);
      reconnectAttempts = 0; // Reset on success
      isReconnecting = false;
    } catch (error) {
      console.error('❌ Falha na reconexão:', error);
      isReconnecting = false;
      // Tentar novamente após delay exponencial
      const delay = Math.min(RECONNECT_DELAY_MS * Math.pow(1.5, reconnectAttempts), 30000);
      reconnectTimeout = setTimeout(attemptReconnect, delay);
    }
  } else {
    isReconnecting = false;
  }
}

export async function setupRealtimeSync(queryClient: QueryClient, companyId: string) {
  const startTime = Date.now();

  try {
    // Limpar timeout de reconexão se existir
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    // Remover TODOS os canais anteriores para evitar conflitos
    const channels = supabase.getChannels();
    for (const ch of channels) {
      console.log('🧹 Removendo canal existente:', ch.topic);
      await supabase.removeChannel(ch);
    }
    realtimeChannel = null;

    currentCompanyId = companyId;
    queryClientRef = queryClient;
    console.log('🔄 Configurando Realtime Sync para empresa:', companyId);

    // Criar novo canal específico para a empresa
    realtimeChannel = supabase
      .channel(`company-${companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'transactions',
          filter: `company_id=eq.${companyId}`,
        },
        async (payload) => {
          const eventStart = Date.now();
          console.log('📡 Realtime event (transactions):', payload.eventType, payload.new || payload.old);

          try {
            // PRIMEIRO: Baixar dados remotos para o banco local
            console.log('📡 Baixando dados remotos...');
            await pullRemoteSince();

            // Invalidar TODAS as queries relacionadas a transações
            await queryClient.invalidateQueries({ queryKey: ['transactions-by-date'] });
            await queryClient.invalidateQueries({ queryKey: ['month-totals'] });
            await queryClient.invalidateQueries({ queryKey: ['month-series'] });
            await queryClient.invalidateQueries({ queryKey: ['week-totals'] });
            await queryClient.invalidateQueries({ queryKey: ['week-series'] });
            await queryClient.invalidateQueries({ queryKey: ['weekly-data'] });
            await queryClient.invalidateQueries({ queryKey: ['monthly-data'] });
            await queryClient.invalidateQueries({ queryKey: ['year-totals'] });
            await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            await queryClient.invalidateQueries({ queryKey: ['recent-transactions'] });
            await queryClient.invalidateQueries({ queryKey: ['category-breakdown'] });
            await queryClient.invalidateQueries({ queryKey: ['daily-totals'] });

            // Forçar refetch AGRESSIVO de todas as queries ativas
            await queryClient.refetchQueries({ type: 'active' });

            // Log de sucesso
            await SyncMonitor.logSyncEvent(
              companyId,
              payload.eventType,
              'transactions',
              true,
              eventStart
            );
            console.log('✅ Realtime event processado com sucesso!');
          } catch (error: any) {
            console.error('Erro ao processar evento realtime:', error);
            await SyncMonitor.logSyncEvent(
              companyId,
              payload.eventType,
              'transactions',
              false,
              eventStart,
              error.message
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'debts',
          filter: `company_id=eq.${companyId}`,
        },
        async (payload) => {
          const eventStart = Date.now();
          console.log('📡 Realtime event (debts):', payload.eventType);

          try {
            await queryClient.invalidateQueries({ queryKey: ['debts'] });
            await queryClient.invalidateQueries({ queryKey: ['debts-summary'] });
            await queryClient.refetchQueries({ queryKey: ['debts'], type: 'active' });

            await SyncMonitor.logSyncEvent(
              companyId,
              payload.eventType,
              'debts',
              true,
              eventStart
            );
          } catch (error: any) {
            await SyncMonitor.logSyncEvent(
              companyId,
              payload.eventType,
              'debts',
              false,
              eventStart,
              error.message
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `company_id=eq.${companyId}`,
        },
        async (payload) => {
          const eventStart = Date.now();
          console.log('📡 Realtime event (orders):', payload.eventType);

          try {
            await queryClient.invalidateQueries({ queryKey: ['orders'] });
            await queryClient.refetchQueries({ queryKey: ['orders'], type: 'active' });

            await SyncMonitor.logSyncEvent(
              companyId,
              payload.eventType,
              'orders',
              true,
              eventStart
            );
          } catch (error: any) {
            await SyncMonitor.logSyncEvent(
              companyId,
              payload.eventType,
              'orders',
              false,
              eventStart,
              error.message
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recurring_expenses',
          filter: `company_id=eq.${companyId}`,
        },
        async (payload) => {
          const eventStart = Date.now();
          console.log('📡 Realtime event (recurring_expenses):', payload.eventType);

          try {
            await queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] });
            await queryClient.refetchQueries({ queryKey: ['recurring-expenses'], type: 'active' });

            await SyncMonitor.logSyncEvent(
              companyId,
              payload.eventType,
              'recurring_expenses',
              true,
              eventStart
            );
          } catch (error: any) {
            await SyncMonitor.logSyncEvent(
              companyId,
              payload.eventType,
              'recurring_expenses',
              false,
              eventStart,
              error.message
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'financial_goals',
          filter: `company_id=eq.${companyId}`,
        },
        async (payload) => {
          const eventStart = Date.now();
          console.log('📡 Realtime event (financial_goals):', payload.eventType);

          try {
            await queryClient.invalidateQueries({ queryKey: ['financial-goals'] });
            await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            await queryClient.refetchQueries({ queryKey: ['dashboard'], type: 'active' });

            await SyncMonitor.logSyncEvent(
              companyId,
              payload.eventType,
              'financial_goals',
              true,
              eventStart
            );
          } catch (error: any) {
            await SyncMonitor.logSyncEvent(
              companyId,
              payload.eventType,
              'financial_goals',
              false,
              eventStart,
              error.message
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'receivables',
          filter: `company_id=eq.${companyId}`,
        },
        async (payload) => {
          const eventStart = Date.now();
          console.log('📡 Realtime event (receivables):', payload.eventType);
          try {
            await queryClient.invalidateQueries({ queryKey: ['receivables'] });
            await queryClient.refetchQueries({ queryKey: ['receivables'], type: 'active' });
            await SyncMonitor.logSyncEvent(companyId, payload.eventType, 'receivables', true, eventStart);
          } catch (error: any) {
            await SyncMonitor.logSyncEvent(companyId, payload.eventType, 'receivables', false, eventStart, error.message);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `company_id=eq.${companyId}`,
        },
        async (payload) => {
          const eventStart = Date.now();
          console.log('📡 Realtime event (products):', payload.eventType);
          try {
            await queryClient.invalidateQueries({ queryKey: ['products'] });
            await queryClient.refetchQueries({ queryKey: ['products'], type: 'active' });
            await SyncMonitor.logSyncEvent(companyId, payload.eventType, 'products', true, eventStart);
          } catch (error: any) {
            await SyncMonitor.logSyncEvent(companyId, payload.eventType, 'products', false, eventStart, error.message);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients',
          filter: `company_id=eq.${companyId}`,
        },
        async (payload) => {
          const eventStart = Date.now();
          console.log('📡 Realtime event (clients):', payload.eventType);
          try {
            await queryClient.invalidateQueries({ queryKey: ['clients'] });
            await queryClient.refetchQueries({ queryKey: ['clients'], type: 'active' });
            await SyncMonitor.logSyncEvent(companyId, payload.eventType, 'clients', true, eventStart);
          } catch (error: any) {
            await SyncMonitor.logSyncEvent(companyId, payload.eventType, 'clients', false, eventStart, error.message);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories',
          filter: `company_id=eq.${companyId}`,
        },
        async (payload) => {
          const eventStart = Date.now();
          console.log('📡 Realtime event (categories):', payload.eventType);
          try {
            await queryClient.invalidateQueries({ queryKey: ['categories'] });
            await queryClient.refetchQueries({ queryKey: ['categories'], type: 'active' });
            await SyncMonitor.logSyncEvent(companyId, payload.eventType, 'categories', true, eventStart);
          } catch (error: any) {
            await SyncMonitor.logSyncEvent(companyId, payload.eventType, 'categories', false, eventStart, error.message);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime status:', status);

        if (status === 'SUBSCRIBED') {
          reconnectAttempts = 0; // Reset contador ao conectar com sucesso
          isReconnecting = false;
          SyncMonitor.setConnectionStatus('connected');
          // Iniciar heartbeat para manter conexão viva
          startHeartbeat();
          SyncMonitor.logSyncEvent(
            companyId,
            'SUBSCRIBED',
            'realtime',
            true,
            startTime
          );
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          stopHeartbeat();
          SyncMonitor.setConnectionStatus('disconnected');
          SyncMonitor.logSyncEvent(
            companyId,
            status,
            'realtime',
            false,
            startTime,
            'Falha ao conectar ao Realtime'
          );
          // Tentar reconectar automaticamente
          if (!isReconnecting) {
            console.log('🔄 Iniciando reconexão automática...');
            reconnectTimeout = setTimeout(attemptReconnect, RECONNECT_DELAY_MS);
          }
        } else if (status === 'CLOSED') {
          stopHeartbeat();
          SyncMonitor.setConnectionStatus('disconnected');
          // Tentar reconectar se foi fechado inesperadamente
          if (currentCompanyId && queryClientRef && !isReconnecting) {
            console.log('🔄 Canal fechado, tentando reconectar...');
            reconnectTimeout = setTimeout(attemptReconnect, RECONNECT_DELAY_MS);
          }
        }
      });

    console.log('✅ Realtime Sync configurado com sucesso');
    return realtimeChannel;
  } catch (error: any) {
    console.error('❌ Erro ao configurar Realtime Sync:', error);
    SyncMonitor.setConnectionStatus('disconnected');
    await SyncMonitor.logSyncEvent(
      companyId,
      'SETUP_ERROR',
      'realtime',
      false,
      startTime,
      error.message
    );
    throw error;
  }
}

export async function cleanupRealtimeSync() {
  console.log('🛑 Limpando Realtime Sync...');

  // Parar heartbeat
  stopHeartbeat();

  // Limpar timeout de reconexão
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  // Remover canal
  if (realtimeChannel) {
    try {
      await supabase.removeChannel(realtimeChannel);
    } catch (e) {
      console.warn('Erro ao remover canal:', e);
    }
    realtimeChannel = null;
  }

  // Limpar estado
  currentCompanyId = null;
  queryClientRef = null;
  isReconnecting = false;
  reconnectAttempts = 0;
  SyncMonitor.setConnectionStatus('disconnected');

  console.log('✅ Realtime Sync limpo');
}

// Função para obter o QueryClient atual (útil para invalidações manuais)
export function getQueryClientRef(): QueryClient | null {
  return queryClientRef;
}
