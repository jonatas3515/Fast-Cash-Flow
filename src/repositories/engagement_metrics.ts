import { supabase } from '../lib/supabase';

// Eventos-chave de ativação
export const ACTIVATION_EVENTS = {
  COMPANY_CREATED: 'company_created',
  FIRST_PRODUCT: 'first_product',
  FIRST_TRANSACTION: 'first_transaction',
  FIRST_GOAL: 'first_goal',
  FIVE_TRANSACTIONS: 'five_transactions',
  FIRST_WEEK_ACTIVE: 'first_week_active',
};

// Segmentos de usuários
export type UserSegment = 
  | 'highly_engaged'    // Lança quase todos os dias
  | 'regular'           // Lança algumas vezes por semana
  | 'at_risk'           // Ficou X dias sem logar
  | 'dormant'           // Mais de 14 dias sem atividade
  | 'view_only'         // Acessa mas quase não lança
  | 'new_user';         // Menos de 7 dias de conta

export interface CompanyEngagement {
  company_id: string;
  company_name: string;
  status: string;
  created_at: string;
  last_activity_at: string | null;
  days_since_activity: number;
  total_transactions: number;
  transactions_this_month: number;
  active_days_this_month: number;
  has_goal: boolean;
  has_products: boolean;
  has_debts: boolean;
  generated_reports: number;
  segment: UserSegment;
  activation_score: number; // 0-100
  activation_events: string[];
}

export interface ActivationMetrics {
  total_companies: number;
  activated_companies: number;
  activation_rate: number;
  avg_time_to_activation_days: number;
  funnel: {
    step: string;
    count: number;
    percent: number;
  }[];
}

export interface EngagementOverview {
  total_active_30d: number;
  total_at_risk: number;
  total_dormant: number;
  avg_transactions_per_company: number;
  avg_active_days: number;
  segments: {
    segment: UserSegment;
    count: number;
    percent: number;
  }[];
}

// Buscar métricas de engajamento de todas as empresas
export async function getCompaniesEngagement(): Promise<CompanyEngagement[]> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const thisMonthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;

  // Buscar todas as empresas
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id, name, status, created_at');

  if (companiesError) throw companiesError;

  const engagementData: CompanyEngagement[] = [];

  for (const company of companies || []) {
    // Buscar transações
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id, date, created_at')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });

    // Buscar metas
    const { data: goals } = await supabase
      .from('financial_goals')
      .select('id')
      .eq('company_id', company.id)
      .limit(1);

    // Buscar produtos
    const { data: products } = await supabase
      .from('products')
      .select('id')
      .eq('company_id', company.id)
      .limit(1);

    // Buscar dívidas
    const { data: debts } = await supabase
      .from('debts')
      .select('id')
      .eq('company_id', company.id)
      .limit(1);

    const txList = transactions || [];
    const lastTx = txList[0];
    const lastActivityAt = lastTx?.created_at || null;
    
    // Calcular dias desde última atividade
    let daysSinceActivity = 999;
    if (lastActivityAt) {
      const lastDate = new Date(lastActivityAt);
      daysSinceActivity = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Transações deste mês
    const txThisMonth = txList.filter(tx => tx.date >= thisMonthStart);
    
    // Dias ativos este mês
    const activeDays = new Set(txThisMonth.map(tx => tx.date)).size;

    // Calcular eventos de ativação
    const activationEvents: string[] = [];
    if (company.created_at) activationEvents.push(ACTIVATION_EVENTS.COMPANY_CREATED);
    if ((products || []).length > 0) activationEvents.push(ACTIVATION_EVENTS.FIRST_PRODUCT);
    if (txList.length > 0) activationEvents.push(ACTIVATION_EVENTS.FIRST_TRANSACTION);
    if (txList.length >= 5) activationEvents.push(ACTIVATION_EVENTS.FIVE_TRANSACTIONS);
    if ((goals || []).length > 0) activationEvents.push(ACTIVATION_EVENTS.FIRST_GOAL);

    // Score de ativação (0-100)
    const activationScore = Math.min(100, Math.round((activationEvents.length / 5) * 100));

    // Determinar segmento
    let segment: UserSegment = 'new_user';
    const accountAge = Math.floor((today.getTime() - new Date(company.created_at).getTime()) / (1000 * 60 * 60 * 24));
    
    if (accountAge < 7) {
      segment = 'new_user';
    } else if (daysSinceActivity > 14) {
      segment = 'dormant';
    } else if (daysSinceActivity > 7) {
      segment = 'at_risk';
    } else if (activeDays >= 20) {
      segment = 'highly_engaged';
    } else if (activeDays >= 8) {
      segment = 'regular';
    } else if (txThisMonth.length < 3 && accountAge > 14) {
      segment = 'view_only';
    } else {
      segment = 'regular';
    }

    engagementData.push({
      company_id: company.id,
      company_name: company.name,
      status: company.status,
      created_at: company.created_at,
      last_activity_at: lastActivityAt,
      days_since_activity: daysSinceActivity,
      total_transactions: txList.length,
      transactions_this_month: txThisMonth.length,
      active_days_this_month: activeDays,
      has_goal: (goals || []).length > 0,
      has_products: (products || []).length > 0,
      has_debts: (debts || []).length > 0,
      generated_reports: 0, // TODO: implementar tracking de relatórios
      segment,
      activation_score: activationScore,
      activation_events: activationEvents,
    });
  }

  return engagementData;
}

// Calcular métricas de ativação
export async function getActivationMetrics(): Promise<ActivationMetrics> {
  const engagementData = await getCompaniesEngagement();
  
  const totalCompanies = engagementData.length;
  const activatedCompanies = engagementData.filter(c => c.activation_score >= 80).length;
  
  // Funil de ativação
  const funnel = [
    { 
      step: 'Criou conta', 
      count: engagementData.filter(c => c.activation_events.includes(ACTIVATION_EVENTS.COMPANY_CREATED)).length 
    },
    { 
      step: 'Cadastrou produto', 
      count: engagementData.filter(c => c.activation_events.includes(ACTIVATION_EVENTS.FIRST_PRODUCT)).length 
    },
    { 
      step: 'Fez 1º lançamento', 
      count: engagementData.filter(c => c.activation_events.includes(ACTIVATION_EVENTS.FIRST_TRANSACTION)).length 
    },
    { 
      step: 'Fez 5+ lançamentos', 
      count: engagementData.filter(c => c.activation_events.includes(ACTIVATION_EVENTS.FIVE_TRANSACTIONS)).length 
    },
    { 
      step: 'Definiu meta', 
      count: engagementData.filter(c => c.activation_events.includes(ACTIVATION_EVENTS.FIRST_GOAL)).length 
    },
  ].map(item => ({
    ...item,
    percent: totalCompanies > 0 ? Math.round((item.count / totalCompanies) * 100) : 0,
  }));

  return {
    total_companies: totalCompanies,
    activated_companies: activatedCompanies,
    activation_rate: totalCompanies > 0 ? Math.round((activatedCompanies / totalCompanies) * 100) : 0,
    avg_time_to_activation_days: 0, // TODO: calcular
    funnel,
  };
}

// Calcular visão geral de engajamento
export async function getEngagementOverview(): Promise<EngagementOverview> {
  const engagementData = await getCompaniesEngagement();
  
  const totalCompanies = engagementData.length;
  const active30d = engagementData.filter(c => c.days_since_activity <= 30).length;
  const atRisk = engagementData.filter(c => c.segment === 'at_risk').length;
  const dormant = engagementData.filter(c => c.segment === 'dormant').length;
  
  const avgTransactions = totalCompanies > 0 
    ? Math.round(engagementData.reduce((sum, c) => sum + c.transactions_this_month, 0) / totalCompanies)
    : 0;
  
  const avgActiveDays = totalCompanies > 0
    ? Math.round(engagementData.reduce((sum, c) => sum + c.active_days_this_month, 0) / totalCompanies)
    : 0;

  // Contagem por segmento
  const segmentCounts = new Map<UserSegment, number>();
  for (const c of engagementData) {
    segmentCounts.set(c.segment, (segmentCounts.get(c.segment) || 0) + 1);
  }

  const segments = Array.from(segmentCounts.entries()).map(([segment, count]) => ({
    segment,
    count,
    percent: totalCompanies > 0 ? Math.round((count / totalCompanies) * 100) : 0,
  }));

  return {
    total_active_30d: active30d,
    total_at_risk: atRisk,
    total_dormant: dormant,
    avg_transactions_per_company: avgTransactions,
    avg_active_days: avgActiveDays,
    segments,
  };
}

// Buscar empresas por segmento
export async function getCompaniesBySegment(segment: UserSegment): Promise<CompanyEngagement[]> {
  const engagementData = await getCompaniesEngagement();
  return engagementData.filter(c => c.segment === segment);
}

// Buscar empresas em risco de churn
export async function getAtRiskCompanies(): Promise<CompanyEngagement[]> {
  const engagementData = await getCompaniesEngagement();
  return engagementData.filter(c => c.segment === 'at_risk' || c.segment === 'dormant');
}

// Buscar empresas não ativadas
export async function getNotActivatedCompanies(): Promise<CompanyEngagement[]> {
  const engagementData = await getCompaniesEngagement();
  return engagementData.filter(c => c.activation_score < 60);
}
