import { supabase } from '../lib/supabase';
import { getCurrentCompanyId } from '../lib/company';

// Interface para configurações da empresa
export interface CompanySettings {
  id: string;
  company_id: string;
  logo_url?: string;
  logo_updated_at?: string;
  created_at: string;
  updated_at: string;
}

// Buscar configurações da empresa
export async function getCompanySettings(companyId?: string): Promise<CompanySettings | null> {
  try {
    const id = companyId || await getCurrentCompanyId();
    if (!id) return null;

    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .eq('company_id', id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Erro ao buscar configurações da empresa:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Erro ao buscar configurações da empresa:', error);
    return null;
  }
}

// Salvar/atualizar logo da empresa
export async function saveCompanyLogo(logoUrl: string, companyId?: string): Promise<boolean> {
  try {
    const id = companyId || await getCurrentCompanyId();
    if (!id) {
      console.error('Company ID não encontrado');
      return false;
    }

    // Tentar atualizar configurações existentes
    const { error: updateError } = await supabase
      .from('company_settings')
      .upsert({
        company_id: id,
        logo_url: logoUrl,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'company_id'
      });

    if (updateError) {
      console.error('Erro ao salvar logo na company_settings:', updateError);

      // Fallback: tentar salvar diretamente na tabela companies
      const { error: fallbackError } = await supabase
        .from('companies')
        .update({ logo_url: logoUrl })
        .eq('id', id);

      if (fallbackError) {
        console.error('Erro ao salvar logo na companies:', fallbackError);
        return false;
      }
    }

    console.log('Logo salvo com sucesso:', logoUrl);
    return true;
  } catch (error) {
    console.error('Erro ao salvar logo da empresa:', error);
    return false;
  }
}

// Buscar logo da empresa (direto da tabela companies para evitar 406)
export async function getCompanyLogo(companyId?: string): Promise<string | null> {
  try {
    const id = companyId || await getCurrentCompanyId();
    if (!id) return null;

    // Buscar direto da tabela companies (evita 406 de company_settings)
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('logo_url')
      .eq('id', id)
      .single();

    if (companyError) {
      console.error('Erro ao buscar logo da empresa:', companyError);
      return null;
    }

    return company?.logo_url || null;
  } catch (error) {
    console.error('Erro ao buscar logo da empresa:', error);
    return null;
  }
}

// Remover logo da empresa
export async function removeCompanyLogo(companyId?: string): Promise<boolean> {
  try {
    const id = companyId || await getCurrentCompanyId();
    if (!id) return false;

    // Limpar logo da company_settings
    const { error: settingsError } = await supabase
      .from('company_settings')
      .update({ logo_url: null })
      .eq('company_id', id);

    // Limpar logo da companies (fallback)
    const { error: companyError } = await supabase
      .from('companies')
      .update({ logo_url: null })
      .eq('id', id);

    if (settingsError && companyError) {
      console.error('Erro ao remover logo:', settingsError, companyError);
      return false;
    }

    console.log('Logo removido com sucesso');
    return true;
  } catch (error) {
    console.error('Erro ao remover logo da empresa:', error);
    return false;
  }
}
