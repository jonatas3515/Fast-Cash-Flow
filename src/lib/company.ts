import { supabase } from './supabase';
import * as SecureStore from 'expo-secure-store';

export async function getCurrentCompanyId(): Promise<string | null> {
  try {
    // 1) Try direct company_id from storage
    let companyId: string | null = null;
    let name: string | null = null;
    if (typeof window !== 'undefined') {
      companyId = window.sessionStorage.getItem('auth_company_id');
      name = window.sessionStorage.getItem('auth_name');
    }
    if (!companyId) {
      try { companyId = await SecureStore.getItemAsync('auth_company_id'); } catch {}
    }
    if (companyId) return companyId;

    // 2) Fallback: resolve by company name
    if (!name) {
      try { name = await SecureStore.getItemAsync('auth_name'); } catch {}
    }
    if (!name) return null;
    const { data, error } = await supabase
      .from('companies')
      .select('id,name')
      .ilike('name', name)
      .maybeSingle();
    if (error) throw error;
    if (data?.id) return data.id;
    // 3) Fallback: try username match
    const { data: dataU, error: errorU } = await supabase
      .from('companies')
      .select('id,name')
      .ilike('username', name)
      .maybeSingle();
    if (errorU) throw errorU;
    if (dataU?.id) {
      // Cache it for next calls
      try {
        if (typeof window !== 'undefined') { window.sessionStorage.setItem('auth_company_id', dataU.id); }
        else { await SecureStore.setItemAsync('auth_company_id', dataU.id); }
      } catch {}
      return dataU.id;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getAdminAppCompanyId(): Promise<string | null> {
  try {
    const candidates = ['fast cash flow', 'fastcashflow', 'admin'];
    for (const c of candidates) {
      const { data, error } = await supabase
        .from('companies')
        .select('id,name,username')
        .ilike('name', `%${c}%`)
        .maybeSingle();
      if (!error && data?.id) return data.id;
      const { data: d2, error: e2 } = await supabase
        .from('companies')
        .select('id,name,username')
        .ilike('username', `%${c}%`)
        .maybeSingle();
      if (!e2 && d2?.id) return d2.id;
    }
    return null;
  } catch {
    return null;
  }
}
