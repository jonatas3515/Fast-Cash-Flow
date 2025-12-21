import { supabase } from '../lib/supabase';

// ========== TypeScript Interfaces ==========

export interface Feature {
    icon: string;
    title: string;
    description: string;
    benefit: string;
    highlight: boolean;
}

export interface TargetAudience {
    icon: string;
    label: string;
    benefit: string;
}

export interface Screenshot {
    title: string;
    subtitle: string;
    image_url: string; // Can be URL or local path like '/Dashboard.jpg'
}

export interface SocialProof {
    companies: string;
    transactions: string;
    satisfaction: string;
}

export interface Plan {
    name: string;
    description: string;
    monthlyPrice: number;
    yearlyPrice: number;
    features: string[];
    recommended: boolean;
    savingsBadge: string | null;
}

export interface SecurityBadge {
    icon: string;
    label: string;
}

export interface NavItem {
    label: string;
    ref: string;
}

export interface LandingSettings {
    id: string;
    version: number;
    status: 'draft' | 'published';

    // Hero
    hero_title: string;
    hero_subtitle: string;
    hero_cta_text: string;
    trial_days: number;

    // Features
    features: Feature[];

    // Target Audience
    target_audience: TargetAudience[];

    // Screenshots
    screenshots: Screenshot[];

    // Social Proof
    social_proof: SocialProof;

    // Plans
    plans: Plan[];

    // Security
    security_badges: SecurityBadge[];

    // Evolution
    evolution_title: string;
    evolution_subtitle: string;
    evolution_points: string[];

    // Final CTA
    final_cta_title: string;
    final_cta_subtitle: string;

    // Footer
    footer_year: number;
    footer_company_text: string;

    // Navigation
    nav_items: NavItem[];

    // Metadata
    published_at: string | null;
    updated_at: string;
    created_at: string;
}

// ========== Default Values (Fallback) ==========

export const DEFAULT_LANDING_SETTINGS: Omit<LandingSettings, 'id' | 'created_at' | 'updated_at' | 'published_at'> = {
    version: 1,
    status: 'published',

    hero_title: 'Gestão financeira para pequenos negócios',
    hero_subtitle: 'Controle seu fluxo de caixa sem complicação. Dashboard intuitivo, relatórios prontos e alertas automáticos.',
    hero_cta_text: 'Começar grátis',
    trial_days: 7,

    features: [
        { icon: '📊', title: 'Dashboard em tempo real', description: 'Veja entradas, saídas e saldo projetado.', benefit: 'Reduza 50% do tempo de fechamento', highlight: true },
        { icon: '📋', title: 'Contas a pagar e receber', description: 'Organize boletos, parcelas e vencimentos.', benefit: 'Evite multas e juros por atraso', highlight: false },
        { icon: '📈', title: 'Relatórios inteligentes', description: 'Análises prontas para decisões e contador.', benefit: 'Exporte em segundos', highlight: false },
        { icon: '🏷️', title: 'Gestão completa', description: 'Clientes, produtos e precificação.', benefit: 'Aumente sua margem de lucro', highlight: false },
    ],

    target_audience: [
        { icon: '🛒', label: 'Comércios', benefit: 'Vendas diárias organizadas' },
        { icon: '🔧', label: 'Serviços', benefit: 'Contratos e recorrências' },
        { icon: '🏥', label: 'Clínicas', benefit: 'Convênios e particulares' },
        { icon: '🏭', label: 'Indústrias', benefit: 'Custos de produção' },
        { icon: '📱', label: 'Delivery', benefit: 'Integração com apps' },
    ],

    screenshots: [
        { title: 'Visão geral do caixa', subtitle: 'Entradas, saídas e saldo projetado', image_url: '/Dashboard.jpg' },
        { title: 'Relatórios para o contador', subtitle: 'Exportações organizadas', image_url: '/Relatórios.jpg' },
    ],

    social_proof: { companies: '+150', transactions: '+10.000', satisfaction: '98%' },

    plans: [
        { name: 'Essencial', description: 'MEI e pequenos negócios', monthlyPrice: 9.99, yearlyPrice: 99.99, features: ['Dashboard de fluxo de caixa', 'Lançamentos diários', 'Contas a pagar e receber', 'Relatórios principais', '1 usuário'], recommended: false, savingsBadge: null },
        { name: 'Profissional', description: 'Crescimento e gestão avançada', monthlyPrice: 15.99, yearlyPrice: 159.90, features: ['Tudo do Essencial', 'Despesas recorrentes', 'Metas financeiras', 'Diagnóstico financeiro', 'Notificações automáticas', '3 usuários'], recommended: true, savingsBadge: 'Economize 17%' },
        { name: 'Avançado', description: 'Múltiplas empresas e equipe', monthlyPrice: 29.99, yearlyPrice: 299.90, features: ['Tudo do Profissional', 'Multiempresa', 'Relatórios detalhados', 'Gestão de equipe', 'Usuários ilimitados'], recommended: false, savingsBadge: null },
    ],

    security_badges: [
        { icon: '🛡️', label: 'Dados protegidos' },
        { icon: '☁️', label: 'Backup automático' },
        { icon: '🔐', label: 'Acesso seguro' },
    ],

    evolution_title: 'Em constante evolução',
    evolution_subtitle: 'Investimos continuamente para entregar a melhor experiência',
    evolution_points: ['Atualizações frequentes', 'Backup automático', 'Equipe de suporte dedicada'],

    final_cta_title: 'Pronto para organizar suas finanças?',
    final_cta_subtitle: 'Comece agora mesmo, sem compromisso.',

    footer_year: 2025,
    footer_company_text: 'Um produto da marca',

    nav_items: [
        { label: 'Como funciona', ref: 'features' },
        { label: 'Planos', ref: 'plans' },
        { label: 'Para quem', ref: 'audience' },
    ],
};

// ========== Repository Functions ==========

/**
 * Get the published landing settings for public display
 */
export async function getPublishedLandingSettings(): Promise<LandingSettings> {
    try {
        const { data, error } = await supabase
            .from('landing_settings')
            .select('*')
            .eq('status', 'published')
            .order('published_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.warn('[landing_settings] Error fetching published settings:', error);
            return createFallbackSettings();
        }

        if (!data) {
            console.log('[landing_settings] No published settings found, using defaults');
            return createFallbackSettings();
        }

        return data as LandingSettings;
    } catch (error) {
        console.error('[landing_settings] Exception fetching settings:', error);
        return createFallbackSettings();
    }
}

/**
 * Get all landing settings (for admin)
 */
export async function getAllLandingSettings(): Promise<LandingSettings[]> {
    const { data, error } = await supabase
        .from('landing_settings')
        .select('*')
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('[landing_settings] Error fetching all settings:', error);
        return [];
    }

    return (data || []) as LandingSettings[];
}

/**
 * Get latest settings (draft or published) for admin editing
 */
export async function getLatestLandingSettings(): Promise<LandingSettings | null> {
    console.log('[landing_settings] getLatestLandingSettings: Starting...');
    const { data, error } = await supabase
        .from('landing_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('[landing_settings] getLatestLandingSettings ERROR:', error);
        return null;
    }

    console.log('[landing_settings] getLatestLandingSettings: Found', data ? 'settings with id ' + data.id : 'no settings');
    return data as LandingSettings | null;
}

/**
 * Create new landing settings (admin only)
 */
export async function createLandingSettings(
    input: Partial<Omit<LandingSettings, 'id' | 'created_at' | 'updated_at'>>
): Promise<LandingSettings> {
    const { data, error } = await supabase
        .from('landing_settings')
        .insert({
            ...DEFAULT_LANDING_SETTINGS,
            ...input,
            status: 'draft',
        })
        .select('*')
        .single();

    if (error) throw error;
    return data as LandingSettings;
}

/**
 * Update landing settings (admin only)
 */
export async function updateLandingSettings(
    id: string,
    updates: Partial<Omit<LandingSettings, 'id' | 'created_at'>>
): Promise<LandingSettings> {
    console.log('[landing_settings] updateLandingSettings: Starting with id:', id);
    console.log('[landing_settings] updateLandingSettings: Updates:', JSON.stringify(updates, null, 2).substring(0, 500) + '...');

    const { data, error } = await supabase
        .from('landing_settings')
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();

    if (error) {
        console.error('[landing_settings] updateLandingSettings ERROR:', error);
        throw error;
    }

    console.log('[landing_settings] updateLandingSettings: Success! Updated id:', data?.id);
    return data as LandingSettings;
}

/**
 * Publish landing settings (admin only)
 * Sets status to 'published' and updates published_at timestamp
 */
export async function publishLandingSettings(id: string): Promise<LandingSettings> {
    console.log('[landing_settings] publishLandingSettings: Starting with id:', id);

    // First, set all other settings to draft
    const { error: draftError } = await supabase
        .from('landing_settings')
        .update({ status: 'draft' })
        .neq('id', id);

    if (draftError) {
        console.error('[landing_settings] publishLandingSettings: Error setting others to draft:', draftError);
    }

    // Then publish this one
    const { data, error } = await supabase
        .from('landing_settings')
        .update({
            status: 'published',
            published_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();

    if (error) {
        console.error('[landing_settings] publishLandingSettings ERROR:', error);
        throw error;
    }

    console.log('[landing_settings] publishLandingSettings: Success! Published id:', data?.id);
    return data as LandingSettings;
}

/**
 * Delete landing settings (admin only)
 */
export async function deleteLandingSettings(id: string): Promise<void> {
    const { error } = await supabase
        .from('landing_settings')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

/**
 * Get or create landing settings (ensures at least one exists)
 */
export async function getOrCreateLandingSettings(): Promise<LandingSettings> {
    console.log('[landing_settings] getOrCreateLandingSettings: Starting...');
    const latest = await getLatestLandingSettings();

    if (latest) {
        console.log('[landing_settings] getOrCreateLandingSettings: Found existing settings');
        return latest;
    }

    // Create new settings with defaults
    console.log('[landing_settings] getOrCreateLandingSettings: No settings found, creating new...');
    try {
        const created = await createLandingSettings({});
        console.log('[landing_settings] getOrCreateLandingSettings: Created new settings with id:', created.id);
        return created;
    } catch (error) {
        console.error('[landing_settings] getOrCreateLandingSettings: Error creating settings:', error);
        return createFallbackSettings();
    }
}

// ========== Helper Functions ==========

function createFallbackSettings(): LandingSettings {
    const now = new Date().toISOString();
    return {
        id: 'fallback',
        ...DEFAULT_LANDING_SETTINGS,
        published_at: now,
        updated_at: now,
        created_at: now,
    };
}

/**
 * Format the last updated date for display
 */
export function formatLastUpdated(date: string | null): string {
    if (!date) return 'Nunca publicado';

    const d = new Date(date);
    return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}
