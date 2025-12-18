import { supabase } from '../lib/supabase';

// =====================================================
// HEALTH SCORE - Score de Saúde do Cliente
// =====================================================

export type HealthStatus = 'green' | 'yellow' | 'red';

export interface HealthScoreBreakdown {
  // Engajamento de Produto (peso 50%)
  engagement: {
    score: number; // 0-10
    loginFrequency: number; // dias com login nos últimos 30 dias
    transactionCount: number; // lançamentos nos últimos 30 dias
    featuresUsed: string[]; // funcionalidades usadas
    featureUsageScore: number; // 0-10 baseado em features
  };
  
  // Suporte/Risco (peso 20%)
  support: {
    score: number; // 0-10
    openTickets: number;
    supportUsage: number; // interações com suporte
    isDelinquent: boolean;
    daysSinceLastActivity: number;
  };
  
  // Resultado Percebido (peso 30%)
  results: {
    score: number; // 0-10
    goalsSet: number;
    goalsMet: number;
    goalsNearlyMet: number; // chegou a 80%+
    avgGoalCompletion: number; // % média de cumprimento
  };
}

export interface CompanyHealthScore {
  company_id: string;
  company_name: string;
  business_type: string | null;
  status: string;
  created_at: string;
  
  // Score final
  totalScore: number; // 0-100
  healthStatus: HealthStatus;
  
  // Breakdown
  breakdown: HealthScoreBreakdown;
  
  // Recomendações
  recommendations: string[];
  
  // Flags de ação
  needsAttention: boolean;
  suggestedActions: string[];
}

// Pesos dos componentes
const WEIGHTS = {
  engagement: 0.50, // 50%
  support: 0.20,    // 20%
  results: 0.30,    // 30%
};

// Faixas de score
const SCORE_THRESHOLDS = {
  green: 70,  // >= 70 = saudável
  yellow: 40, // >= 40 = em risco
  // < 40 = crítico (vermelho)
};

// Funcionalidades-chave para tracking
const KEY_FEATURES = [
  'goals',           // Definiu metas
  'receivables',     // Usa A Receber
  'payables',        // Usa A Pagar
  'pricing',         // Usa precificação
  'reports',         // Gerou relatórios
  'recurring',       // Usa despesas recorrentes
  'debts',           // Controla dívidas
  'products',        // Cadastrou produtos
  'clients',         // Cadastrou clientes
];

/**
 * Calcula o Health Score de uma empresa
 */
export async function calculateCompanyHealthScore(companyId: string): Promise<CompanyHealthScore | null> {
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  // Buscar dados da empresa
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, name, status, created_at, business_type')
    .eq('id', companyId)
    .single();

  if (companyError || !company) return null;

  // =====================================================
  // 1. ENGAJAMENTO DE PRODUTO (peso 50%)
  // =====================================================
  
  // Transações nos últimos 30 dias
  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, date, created_at')
    .eq('company_id', companyId)
    .gte('date', thirtyDaysAgoStr);

  const txList = transactions || [];
  const transactionCount = txList.length;
  const activeDays = new Set(txList.map(tx => tx.date)).size;

  // Verificar uso de funcionalidades
  const featuresUsed: string[] = [];

  // Metas
  const { data: goals } = await supabase
    .from('financial_goals')
    .select('id')
    .eq('company_id', companyId)
    .limit(1);
  if ((goals || []).length > 0) featuresUsed.push('goals');

  // Produtos
  const { data: products } = await supabase
    .from('products')
    .select('id')
    .eq('company_id', companyId)
    .limit(1);
  if ((products || []).length > 0) featuresUsed.push('products');

  // Clientes
  const { data: clients } = await supabase
    .from('clients')
    .select('id')
    .eq('company_id', companyId)
    .limit(1);
  if ((clients || []).length > 0) featuresUsed.push('clients');

  // Dívidas
  const { data: debts } = await supabase
    .from('debts')
    .select('id')
    .eq('company_id', companyId)
    .limit(1);
  if ((debts || []).length > 0) featuresUsed.push('debts');

  // Despesas recorrentes
  const { data: recurring } = await supabase
    .from('recurring_expenses')
    .select('id')
    .eq('company_id', companyId)
    .limit(1);
  if ((recurring || []).length > 0) featuresUsed.push('recurring');

  // Calcular score de engajamento
  const loginScore = Math.min(10, activeDays / 2); // 20 dias = 10 pontos
  const txScore = Math.min(10, transactionCount / 10); // 100 tx = 10 pontos
  const featureScore = Math.min(10, (featuresUsed.length / KEY_FEATURES.length) * 10);
  const engagementScore = (loginScore * 0.3 + txScore * 0.4 + featureScore * 0.3);

  // =====================================================
  // 2. SUPORTE/RISCO (peso 20%)
  // =====================================================
  
  // Dias desde última atividade
  const { data: lastTx } = await supabase
    .from('transactions')
    .select('created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(1);

  let daysSinceLastActivity = 999;
  if (lastTx && lastTx.length > 0) {
    const lastDate = new Date(lastTx[0].created_at);
    daysSinceLastActivity = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Verificar inadimplência (status expired/blocked)
  const isDelinquent = company.status === 'expired' || company.status === 'blocked';

  // Calcular score de suporte (inverso - menos problemas = mais pontos)
  let supportScore = 10;
  if (daysSinceLastActivity > 30) supportScore -= 5;
  else if (daysSinceLastActivity > 14) supportScore -= 3;
  else if (daysSinceLastActivity > 7) supportScore -= 1;
  if (isDelinquent) supportScore -= 4;
  supportScore = Math.max(0, supportScore);

  // =====================================================
  // 3. RESULTADO PERCEBIDO (peso 30%)
  // =====================================================
  
  // Buscar histórico de metas
  const { data: allGoals } = await supabase
    .from('financial_goals')
    .select('id, target_amount_cents, year, month')
    .eq('company_id', companyId);

  let goalsSet = (allGoals || []).length;
  let goalsMet = 0;
  let goalsNearlyMet = 0;
  let totalCompletion = 0;

  for (const goal of allGoals || []) {
    // Buscar receitas do mês da meta
    const monthStart = `${goal.year}-${String(goal.month).padStart(2, '0')}-01`;
    const monthEnd = `${goal.year}-${String(goal.month).padStart(2, '0')}-31`;
    
    const { data: monthTx } = await supabase
      .from('transactions')
      .select('amount_cents')
      .eq('company_id', companyId)
      .eq('type', 'income')
      .gte('date', monthStart)
      .lte('date', monthEnd);

    const totalIncome = (monthTx || []).reduce((sum, tx) => sum + tx.amount_cents, 0);
    const completion = goal.target_amount_cents > 0 ? (totalIncome / goal.target_amount_cents) * 100 : 0;
    
    totalCompletion += completion;
    if (completion >= 100) goalsMet++;
    else if (completion >= 80) goalsNearlyMet++;
  }

  const avgGoalCompletion = goalsSet > 0 ? totalCompletion / goalsSet : 0;
  
  // Calcular score de resultados
  let resultsScore = 5; // Base
  if (goalsSet > 0) {
    const metRate = (goalsMet + goalsNearlyMet * 0.5) / goalsSet;
    resultsScore = Math.min(10, metRate * 10 + (avgGoalCompletion / 20));
  }

  // =====================================================
  // CÁLCULO FINAL
  // =====================================================
  
  const totalScore = Math.round(
    engagementScore * 10 * WEIGHTS.engagement +
    supportScore * 10 * WEIGHTS.support +
    resultsScore * 10 * WEIGHTS.results
  );

  const healthStatus: HealthStatus = 
    totalScore >= SCORE_THRESHOLDS.green ? 'green' :
    totalScore >= SCORE_THRESHOLDS.yellow ? 'yellow' : 'red';

  // Gerar recomendações
  const recommendations: string[] = [];
  const suggestedActions: string[] = [];

  if (engagementScore < 5) {
    recommendations.push('Baixo engajamento: usuário não está usando o app regularmente');
    suggestedActions.push('Enviar dicas de uso');
  }
  if (!featuresUsed.includes('goals')) {
    recommendations.push('Não definiu metas financeiras');
    suggestedActions.push('Sugerir criação de meta');
  }
  if (daysSinceLastActivity > 7) {
    recommendations.push(`${daysSinceLastActivity} dias sem atividade`);
    suggestedActions.push('Enviar mensagem de reengajamento');
  }
  if (isDelinquent) {
    recommendations.push('Conta com pagamento pendente');
    suggestedActions.push('Contato sobre pagamento');
  }
  if (goalsSet > 0 && avgGoalCompletion < 50) {
    recommendations.push('Baixa taxa de cumprimento de metas');
    suggestedActions.push('Oferecer treinamento');
  }

  return {
    company_id: companyId,
    company_name: company.name,
    business_type: company.business_type || null,
    status: company.status,
    created_at: company.created_at,
    totalScore,
    healthStatus,
    breakdown: {
      engagement: {
        score: Math.round(engagementScore * 10) / 10,
        loginFrequency: activeDays,
        transactionCount,
        featuresUsed,
        featureUsageScore: Math.round(featureScore * 10) / 10,
      },
      support: {
        score: supportScore,
        openTickets: 0, // TODO: implementar tracking de tickets
        supportUsage: 0,
        isDelinquent,
        daysSinceLastActivity,
      },
      results: {
        score: Math.round(resultsScore * 10) / 10,
        goalsSet,
        goalsMet,
        goalsNearlyMet,
        avgGoalCompletion: Math.round(avgGoalCompletion),
      },
    },
    recommendations,
    needsAttention: healthStatus !== 'green',
    suggestedActions,
  };
}

/**
 * Calcula Health Score de todas as empresas
 */
export async function getAllCompaniesHealthScores(): Promise<CompanyHealthScore[]> {
  const { data: companies, error } = await supabase
    .from('companies')
    .select('id')
    .order('name');

  if (error || !companies) return [];

  const scores: CompanyHealthScore[] = [];
  
  for (const company of companies) {
    const score = await calculateCompanyHealthScore(company.id);
    if (score) scores.push(score);
  }

  return scores;
}

/**
 * Busca empresas por faixa de saúde
 */
export async function getCompaniesByHealthStatus(status: HealthStatus): Promise<CompanyHealthScore[]> {
  const allScores = await getAllCompaniesHealthScores();
  return allScores.filter(s => s.healthStatus === status);
}

/**
 * Resumo de saúde para o dashboard
 */
export interface HealthSummary {
  total: number;
  green: number;
  yellow: number;
  red: number;
  avgScore: number;
  needsAttention: number;
}

export async function getHealthSummary(): Promise<HealthSummary> {
  const allScores = await getAllCompaniesHealthScores();
  
  const summary: HealthSummary = {
    total: allScores.length,
    green: allScores.filter(s => s.healthStatus === 'green').length,
    yellow: allScores.filter(s => s.healthStatus === 'yellow').length,
    red: allScores.filter(s => s.healthStatus === 'red').length,
    avgScore: allScores.length > 0 
      ? Math.round(allScores.reduce((sum, s) => sum + s.totalScore, 0) / allScores.length)
      : 0,
    needsAttention: allScores.filter(s => s.needsAttention).length,
  };

  return summary;
}
