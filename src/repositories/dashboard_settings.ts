import { supabase } from '../lib/supabase';

export interface DashboardSettings {
  id: string;
  company_id: string;
  default_period: 'day' | 'week' | 'month' | 'custom';
  alert_debt_threshold_cents: number;
  alert_negative_balance: boolean;
  goal_alert_threshold_percent: number;
  goal_motivation_threshold_percent: number;
  currency: string;
  created_at: string;
  updated_at?: string;
}

export async function getSettingsByCompany(companyId: string): Promise<DashboardSettings | null> {
  const { data, error } = await supabase
    .from('dashboard_settings')
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle();

  if (error) {
    const anyErr: any = error;
    if (anyErr.code === 'PGRST205') {
      console.warn('[dashboard_settings] Tabela dashboard_settings não encontrada no Supabase; usando defaults locais');
      return null;
    }
    throw error;
  }
  return data as DashboardSettings | null;
}

export async function createSettings(input: Omit<DashboardSettings, 'id' | 'created_at' | 'updated_at'>): Promise<DashboardSettings> {
  const { data, error } = await supabase
    .from('dashboard_settings')
    .insert(input)
    .select('*')
    .single();
  
  if (error) throw error;
  return data as DashboardSettings;
}

export async function updateSettings(companyId: string, updates: Partial<Omit<DashboardSettings, 'id' | 'company_id' | 'created_at'>>): Promise<DashboardSettings> {
  const { data, error } = await supabase
    .from('dashboard_settings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('company_id', companyId)
    .select('*')
    .single();
  
  if (error) throw error;
  return data as DashboardSettings;
}

export async function getOrCreateSettings(companyId: string): Promise<DashboardSettings> {
  try {
    let settings = await getSettingsByCompany(companyId);

    if (!settings) {
      try {
        settings = await createSettings({
          company_id: companyId,
          default_period: 'month',
          alert_debt_threshold_cents: 50000000,
          alert_negative_balance: true,
          goal_alert_threshold_percent: 50,
          goal_motivation_threshold_percent: 80,
          currency: 'BRL',
        });
      } catch (err: any) {
        if (err?.code === 'PGRST205') {
          console.warn('[dashboard_settings] Tabela dashboard_settings não encontrada ao criar; usando defaults locais');
        } else {
          throw err;
        }
      }
    }

    if (settings) return settings;
  } catch (err) {
    console.error('[dashboard_settings] Erro ao obter configurações, usando defaults locais', err);
  }

  const now = new Date().toISOString();
  return {
    id: 'local-fallback',
    company_id: companyId,
    default_period: 'month',
    alert_debt_threshold_cents: 50000000,
    alert_negative_balance: true,
    goal_alert_threshold_percent: 50,
    goal_motivation_threshold_percent: 80,
    currency: 'BRL',
    created_at: now,
  };
}
