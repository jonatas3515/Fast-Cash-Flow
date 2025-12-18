import { supabase } from '../lib/supabase';

// =====================================================
// BENCHMARKS - Insights Agregados entre Empresas
// =====================================================

export interface BusinessTypeBenchmark {
  businessType: string;
  companyCount: number;
  
  // Métricas financeiras (médias)
  avgMonthlyRevenue: number;
  avgMonthlyExpenses: number;
  avgTicketSize: number;
  avgTransactionsPerMonth: number;
  
  // Métricas de metas
  avgGoalCompletionRate: number;
  companiesWithGoals: number;
  companiesHittingGoals: number;
  
  // Uso de recursos
  featureUsage: {
    feature: string;
    usagePercent: number;
    avgImpactOnGoals: number; // % a mais de metas batidas
  }[];
  
  // Insights
  insights: string[];
}

export interface CompanyBenchmarkComparison {
  companyId: string;
  businessType: string;
  
  // Comparações
  revenueVsAvg: number; // % acima/abaixo da média
  expensesVsAvg: number;
  goalCompletionVsAvg: number;
  
  // Insights personalizados
  insights: string[];
  recommendations: string[];
}

export interface AggregatedInsight {
  id: string;
  type: 'pattern' | 'correlation' | 'benchmark';
  title: string;
  description: string;
  data: {
    metric: string;
    value: number;
    comparison?: number;
  };
  applicableTo: string[]; // business_types
}

/**
 * Calcula benchmarks por tipo de negócio
 */
export async function getBenchmarksByBusinessType(): Promise<BusinessTypeBenchmark[]> {
  const today = new Date();
  const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

  // Buscar todas as empresas com business_type
  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, name, business_type');

  if (error || !companies) return [];

  // Agrupar por business_type
  const typeGroups = new Map<string, string[]>();
  for (const company of companies) {
    const type = company.business_type || 'Outros';
    const list = typeGroups.get(type) || [];
    list.push(company.id);
    typeGroups.set(type, list);
  }

  const benchmarks: BusinessTypeBenchmark[] = [];

  for (const [businessType, companyIds] of typeGroups) {
    if (companyIds.length < 2) continue; // Precisa de pelo menos 2 empresas para benchmark

    let totalRevenue = 0;
    let totalExpenses = 0;
    let totalTransactions = 0;
    let totalTicketSum = 0;
    let ticketCount = 0;
    let companiesWithGoals = 0;
    let companiesHittingGoals = 0;
    let totalGoalCompletion = 0;
    let goalCount = 0;

    // Features tracking
    const featureUsage = new Map<string, { count: number; goalHitRate: number; goalCount: number }>();
    const features = ['goals', 'products', 'clients', 'debts', 'recurring'];

    for (const companyId of companyIds) {
      // Transações do último mês
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount_cents, type')
        .eq('company_id', companyId)
        .gte('date', `${lastMonth}-01`)
        .lte('date', `${lastMonth}-31`);

      const txList = transactions || [];
      const income = txList.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount_cents, 0);
      const expenses = txList.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount_cents, 0);
      const incomeCount = txList.filter(t => t.type === 'income').length;

      totalRevenue += income;
      totalExpenses += expenses;
      totalTransactions += txList.length;
      
      if (incomeCount > 0) {
        totalTicketSum += income;
        ticketCount += incomeCount;
      }

      // Metas
      const { data: goals } = await supabase
        .from('financial_goals')
        .select('id, target_amount_cents, year, month')
        .eq('company_id', companyId);

      const companyGoals = goals || [];
      if (companyGoals.length > 0) {
        companiesWithGoals++;
        
        let hitCount = 0;
        for (const goal of companyGoals) {
          const monthStart = `${goal.year}-${String(goal.month).padStart(2, '0')}-01`;
          const monthEnd = `${goal.year}-${String(goal.month).padStart(2, '0')}-31`;
          
          const { data: monthTx } = await supabase
            .from('transactions')
            .select('amount_cents')
            .eq('company_id', companyId)
            .eq('type', 'income')
            .gte('date', monthStart)
            .lte('date', monthEnd);

          const monthIncome = (monthTx || []).reduce((sum, t) => sum + t.amount_cents, 0);
          const completion = goal.target_amount_cents > 0 ? (monthIncome / goal.target_amount_cents) * 100 : 0;
          
          totalGoalCompletion += completion;
          goalCount++;
          
          if (completion >= 100) hitCount++;
        }
        
        if (hitCount > 0) companiesHittingGoals++;
      }

      // Verificar uso de features
      const usedFeatures: string[] = [];
      
      const { data: hasGoals } = await supabase.from('financial_goals').select('id').eq('company_id', companyId).limit(1);
      if ((hasGoals || []).length > 0) usedFeatures.push('goals');
      
      const { data: hasProducts } = await supabase.from('products').select('id').eq('company_id', companyId).limit(1);
      if ((hasProducts || []).length > 0) usedFeatures.push('products');
      
      const { data: hasClients } = await supabase.from('clients').select('id').eq('company_id', companyId).limit(1);
      if ((hasClients || []).length > 0) usedFeatures.push('clients');
      
      const { data: hasDebts } = await supabase.from('debts').select('id').eq('company_id', companyId).limit(1);
      if ((hasDebts || []).length > 0) usedFeatures.push('debts');
      
      const { data: hasRecurring } = await supabase.from('recurring_expenses').select('id').eq('company_id', companyId).limit(1);
      if ((hasRecurring || []).length > 0) usedFeatures.push('recurring');

      // Calcular impacto no goal hit rate
      const companyHitGoal = companyGoals.length > 0 && companiesHittingGoals > 0;
      
      for (const feature of usedFeatures) {
        const current = featureUsage.get(feature) || { count: 0, goalHitRate: 0, goalCount: 0 };
        current.count++;
        if (companyHitGoal) current.goalHitRate++;
        if (companyGoals.length > 0) current.goalCount++;
        featureUsage.set(feature, current);
      }
    }

    const companyCount = companyIds.length;
    const avgMonthlyRevenue = Math.round(totalRevenue / companyCount);
    const avgMonthlyExpenses = Math.round(totalExpenses / companyCount);
    const avgTicketSize = ticketCount > 0 ? Math.round(totalTicketSum / ticketCount) : 0;
    const avgTransactionsPerMonth = Math.round(totalTransactions / companyCount);
    const avgGoalCompletionRate = goalCount > 0 ? Math.round(totalGoalCompletion / goalCount) : 0;

    // Calcular feature usage com impacto
    const featureUsageList = features.map(feature => {
      const data = featureUsage.get(feature) || { count: 0, goalHitRate: 0, goalCount: 0 };
      const usagePercent = Math.round((data.count / companyCount) * 100);
      const avgImpactOnGoals = data.goalCount > 0 
        ? Math.round((data.goalHitRate / data.goalCount) * 100) 
        : 0;
      return { feature, usagePercent, avgImpactOnGoals };
    }).sort((a, b) => b.usagePercent - a.usagePercent);

    // Gerar insights
    const insights: string[] = [];
    
    if (avgGoalCompletionRate >= 80) {
      insights.push(`Empresas de ${businessType} têm alta taxa de cumprimento de metas (${avgGoalCompletionRate}%)`);
    }
    
    const topFeature = featureUsageList.find(f => f.avgImpactOnGoals > 60);
    if (topFeature) {
      insights.push(`Quem usa "${topFeature.feature}" tem ${topFeature.avgImpactOnGoals}% mais chances de bater metas`);
    }

    benchmarks.push({
      businessType,
      companyCount,
      avgMonthlyRevenue,
      avgMonthlyExpenses,
      avgTicketSize,
      avgTransactionsPerMonth,
      avgGoalCompletionRate,
      companiesWithGoals,
      companiesHittingGoals,
      featureUsage: featureUsageList,
      insights,
    });
  }

  return benchmarks.sort((a, b) => b.companyCount - a.companyCount);
}

/**
 * Compara uma empresa com o benchmark do seu segmento
 */
export async function getCompanyBenchmarkComparison(companyId: string): Promise<CompanyBenchmarkComparison | null> {
  // Buscar dados da empresa
  const { data: company, error } = await supabase
    .from('companies')
    .select('id, business_type')
    .eq('id', companyId)
    .single();

  if (error || !company) return null;

  const businessType = company.business_type || 'Outros';
  
  // Buscar benchmarks
  const benchmarks = await getBenchmarksByBusinessType();
  const benchmark = benchmarks.find(b => b.businessType === businessType);
  
  if (!benchmark) return null;

  // Calcular métricas da empresa
  const today = new Date();
  const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount_cents, type')
    .eq('company_id', companyId)
    .gte('date', `${lastMonth}-01`)
    .lte('date', `${lastMonth}-31`);

  const txList = transactions || [];
  const income = txList.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount_cents, 0);
  const expenses = txList.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount_cents, 0);

  // Calcular comparações
  const revenueVsAvg = benchmark.avgMonthlyRevenue > 0 
    ? Math.round(((income - benchmark.avgMonthlyRevenue) / benchmark.avgMonthlyRevenue) * 100)
    : 0;
  
  const expensesVsAvg = benchmark.avgMonthlyExpenses > 0
    ? Math.round(((expenses - benchmark.avgMonthlyExpenses) / benchmark.avgMonthlyExpenses) * 100)
    : 0;

  // Buscar goal completion da empresa
  const { data: goals } = await supabase
    .from('financial_goals')
    .select('id, target_amount_cents, year, month')
    .eq('company_id', companyId);

  let companyGoalCompletion = 0;
  const companyGoals = goals || [];
  
  if (companyGoals.length > 0) {
    let totalCompletion = 0;
    for (const goal of companyGoals) {
      const monthStart = `${goal.year}-${String(goal.month).padStart(2, '0')}-01`;
      const monthEnd = `${goal.year}-${String(goal.month).padStart(2, '0')}-31`;
      
      const { data: monthTx } = await supabase
        .from('transactions')
        .select('amount_cents')
        .eq('company_id', companyId)
        .eq('type', 'income')
        .gte('date', monthStart)
        .lte('date', monthEnd);

      const monthIncome = (monthTx || []).reduce((sum, t) => sum + t.amount_cents, 0);
      totalCompletion += goal.target_amount_cents > 0 ? (monthIncome / goal.target_amount_cents) * 100 : 0;
    }
    companyGoalCompletion = Math.round(totalCompletion / companyGoals.length);
  }

  const goalCompletionVsAvg = benchmark.avgGoalCompletionRate > 0
    ? companyGoalCompletion - benchmark.avgGoalCompletionRate
    : 0;

  // Gerar insights personalizados
  const insights: string[] = [];
  const recommendations: string[] = [];

  if (revenueVsAvg > 20) {
    insights.push(`Seu faturamento está ${revenueVsAvg}% acima da média do segmento! 🎉`);
  } else if (revenueVsAvg < -20) {
    insights.push(`Seu faturamento está ${Math.abs(revenueVsAvg)}% abaixo da média do segmento`);
    recommendations.push('Considere revisar sua estratégia de vendas');
  }

  if (expensesVsAvg > 30) {
    insights.push(`Suas despesas estão ${expensesVsAvg}% acima da média do segmento`);
    recommendations.push('Analise suas despesas fixas para identificar oportunidades de economia');
  }

  if (goalCompletionVsAvg > 10) {
    insights.push(`Você bate metas ${goalCompletionVsAvg}% mais que a média! Continue assim!`);
  } else if (goalCompletionVsAvg < -10) {
    recommendations.push('Empresas que usam metas e A Receber/A Pagar têm mais sucesso');
  }

  // Sugestões baseadas em features
  const topFeatures = benchmark.featureUsage.filter(f => f.avgImpactOnGoals > 50);
  for (const feature of topFeatures) {
    recommendations.push(`Empresas do seu segmento que usam "${feature.feature}" têm ${feature.avgImpactOnGoals}% mais sucesso`);
  }

  return {
    companyId,
    businessType,
    revenueVsAvg,
    expensesVsAvg,
    goalCompletionVsAvg,
    insights,
    recommendations,
  };
}

/**
 * Gera insights agregados para exibição no admin
 */
export async function getAggregatedInsights(): Promise<AggregatedInsight[]> {
  const benchmarks = await getBenchmarksByBusinessType();
  const insights: AggregatedInsight[] = [];

  // Padrões gerais
  for (const benchmark of benchmarks) {
    if (benchmark.companyCount < 3) continue;

    // Insight de uso de metas
    if (benchmark.companiesWithGoals > 0) {
      const goalUsageRate = Math.round((benchmark.companiesWithGoals / benchmark.companyCount) * 100);
      const hitRate = Math.round((benchmark.companiesHittingGoals / benchmark.companiesWithGoals) * 100);
      
      insights.push({
        id: `goals-${benchmark.businessType}`,
        type: 'pattern',
        title: `Metas em ${benchmark.businessType}`,
        description: `${goalUsageRate}% das empresas de ${benchmark.businessType} usam metas, e ${hitRate}% delas batem suas metas`,
        data: { metric: 'goal_hit_rate', value: hitRate },
        applicableTo: [benchmark.businessType],
      });
    }

    // Insight de feature com maior impacto
    const topFeature = benchmark.featureUsage.find(f => f.avgImpactOnGoals > 60);
    if (topFeature) {
      insights.push({
        id: `feature-${benchmark.businessType}-${topFeature.feature}`,
        type: 'correlation',
        title: `Impacto de "${topFeature.feature}"`,
        description: `Empresas de ${benchmark.businessType} que usam "${topFeature.feature}" têm ${topFeature.avgImpactOnGoals}% mais chances de bater metas`,
        data: { metric: 'feature_impact', value: topFeature.avgImpactOnGoals },
        applicableTo: [benchmark.businessType],
      });
    }

    // Benchmark de ticket médio
    if (benchmark.avgTicketSize > 0) {
      insights.push({
        id: `ticket-${benchmark.businessType}`,
        type: 'benchmark',
        title: `Ticket médio em ${benchmark.businessType}`,
        description: `O ticket médio das empresas de ${benchmark.businessType} é R$ ${(benchmark.avgTicketSize / 100).toFixed(2)}`,
        data: { metric: 'avg_ticket', value: benchmark.avgTicketSize },
        applicableTo: [benchmark.businessType],
      });
    }
  }

  return insights;
}
