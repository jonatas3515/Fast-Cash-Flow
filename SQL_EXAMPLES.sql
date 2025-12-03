-- ============================================================================
-- FAST CASH FLOW - EXEMPLOS DE SQL PARA OPERAÇÕES COMUNS
-- ============================================================================

-- ============================================================================
-- TRANSAÇÕES
-- ============================================================================

-- Inserir uma entrada (venda)
INSERT INTO public.transactions (company_id, type, description, amount_cents, category, date, notes)
VALUES (
  (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1),
  'entrada',
  'Venda de produto XYZ',
  500000, -- R$ 5.000
  'vendas',
  CURRENT_DATE,
  'Venda para cliente ABC'
);

-- Inserir uma saída (despesa)
INSERT INTO public.transactions (company_id, type, description, amount_cents, category, date, notes)
VALUES (
  (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1),
  'saída',
  'Pagamento de fornecedor',
  200000, -- R$ 2.000
  'fornecedor',
  CURRENT_DATE,
  'Compra de matéria-prima'
);

-- Listar todas as transações de um mês
SELECT * FROM public.transactions
WHERE company_id = (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1)
  AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
  AND deleted_at IS NULL
ORDER BY date DESC;

-- Calcular saldo de um período
SELECT 
  SUM(CASE WHEN type = 'entrada' THEN amount_cents ELSE 0 END) as total_entradas,
  SUM(CASE WHEN type = 'saída' THEN amount_cents ELSE 0 END) as total_saidas,
  SUM(CASE WHEN type = 'entrada' THEN amount_cents ELSE -amount_cents END) as saldo
FROM public.transactions
WHERE company_id = (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1)
  AND date >= CURRENT_DATE - INTERVAL '30 days'
  AND deleted_at IS NULL;

-- Totais por dia do mês
SELECT 
  DATE(date) as dia,
  SUM(CASE WHEN type = 'entrada' THEN amount_cents ELSE 0 END) as entradas,
  SUM(CASE WHEN type = 'saída' THEN amount_cents ELSE 0 END) as saidas
FROM public.transactions
WHERE company_id = (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1)
  AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
  AND deleted_at IS NULL
GROUP BY DATE(date)
ORDER BY DATE(date) DESC;

-- Totais por categoria
SELECT 
  category,
  type,
  COUNT(*) as quantidade,
  SUM(amount_cents) as total
FROM public.transactions
WHERE company_id = (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1)
  AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
  AND deleted_at IS NULL
GROUP BY category, type
ORDER BY total DESC;

-- Atualizar uma transação
UPDATE public.transactions
SET description = 'Venda de produto ABC',
    amount_cents = 600000,
    updated_at = NOW()
WHERE id = 'seu-transaction-id'
  AND company_id = (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1);

-- Deletar uma transação (soft delete)
UPDATE public.transactions
SET deleted_at = NOW()
WHERE id = 'seu-transaction-id'
  AND company_id = (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1);

-- ============================================================================
-- METAS FINANCEIRAS
-- ============================================================================

-- Inserir meta para o mês atual
INSERT INTO public.financial_goals (company_id, month, target_amount_cents, description)
VALUES (
  (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1),
  DATE_TRUNC('month', CURRENT_DATE)::DATE,
  1000000, -- R$ 10.000
  'Meta de vendas para este mês'
)
ON CONFLICT (company_id, month) DO UPDATE
SET target_amount_cents = 1000000,
    updated_at = NOW();

-- Listar metas de uma empresa
SELECT * FROM public.financial_goals
WHERE company_id = (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1)
ORDER BY month DESC;

-- Calcular progresso da meta do mês atual
SELECT 
  fg.target_amount_cents,
  COALESCE(SUM(CASE WHEN t.type = 'entrada' THEN t.amount_cents ELSE 0 END), 0) as achieved,
  ROUND(
    COALESCE(SUM(CASE WHEN t.type = 'entrada' THEN t.amount_cents ELSE 0 END), 0) * 100.0 / 
    NULLIF(fg.target_amount_cents, 0)
  , 2) as progress_percent
FROM public.financial_goals fg
LEFT JOIN public.transactions t ON 
  t.company_id = fg.company_id 
  AND DATE_TRUNC('month', t.date) = fg.month
  AND t.type = 'entrada'
  AND t.deleted_at IS NULL
WHERE fg.company_id = (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1)
  AND fg.month = DATE_TRUNC('month', CURRENT_DATE)::DATE
GROUP BY fg.id, fg.target_amount_cents;

-- Atualizar meta
UPDATE public.financial_goals
SET target_amount_cents = 1500000,
    description = 'Meta revisada para este mês',
    updated_at = NOW()
WHERE company_id = (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1)
  AND month = DATE_TRUNC('month', CURRENT_DATE)::DATE;

-- Deletar meta
DELETE FROM public.financial_goals
WHERE company_id = (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1)
  AND month = DATE_TRUNC('month', CURRENT_DATE)::DATE;

-- ============================================================================
-- CONFIGURAÇÕES DO DASHBOARD
-- ============================================================================

-- Obter configurações de uma empresa
SELECT * FROM public.dashboard_settings
WHERE company_id = (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1);

-- Criar/atualizar configurações
INSERT INTO public.dashboard_settings (
  company_id, 
  default_period, 
  alert_debt_threshold_cents, 
  alert_negative_balance, 
  goal_alert_threshold_percent,
  currency
)
VALUES (
  (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1),
  'month',
  50000000,  -- R$ 500.000
  true,
  50,
  'BRL'
)
ON CONFLICT (company_id) DO UPDATE
SET default_period = 'month',
    alert_debt_threshold_cents = 50000000,
    alert_negative_balance = true,
    goal_alert_threshold_percent = 50,
    updated_at = NOW();

-- Atualizar apenas o limite de alerta de dívida
UPDATE public.dashboard_settings
SET alert_debt_threshold_cents = 100000000  -- R$ 1.000.000
WHERE company_id = (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1);

-- ============================================================================
-- RELATÓRIOS E ANÁLISES
-- ============================================================================

-- Dashboard completo do mês
SELECT 
  'Entradas' as tipo,
  COALESCE(SUM(amount_cents), 0) as total
FROM public.transactions
WHERE company_id = (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1)
  AND type = 'entrada'
  AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
  AND deleted_at IS NULL
UNION ALL
SELECT 
  'Saídas' as tipo,
  COALESCE(SUM(amount_cents), 0) as total
FROM public.transactions
WHERE company_id = (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1)
  AND type = 'saída'
  AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
  AND deleted_at IS NULL
UNION ALL
SELECT 
  'Dívidas em Aberto' as tipo,
  COALESCE(SUM((d.installment_count - COALESCE(d.paid_installments, 0)) * d.installment_cents), 0) as total
FROM public.debts d
WHERE d.company_id = (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1)
  AND (d.paid_installments IS NULL OR d.paid_installments < d.installment_count);

-- Comparação mês a mês
SELECT 
  DATE_TRUNC('month', date)::DATE as mes,
  SUM(CASE WHEN type = 'entrada' THEN amount_cents ELSE 0 END) as entradas,
  SUM(CASE WHEN type = 'saída' THEN amount_cents ELSE 0 END) as saidas,
  SUM(CASE WHEN type = 'entrada' THEN amount_cents ELSE -amount_cents END) as saldo
FROM public.transactions
WHERE company_id = (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1)
  AND deleted_at IS NULL
  AND date >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', date)
ORDER BY mes DESC;

-- Top 10 maiores transações do mês
SELECT 
  date,
  type,
  description,
  category,
  amount_cents,
  notes
FROM public.transactions
WHERE company_id = (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1)
  AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
  AND deleted_at IS NULL
ORDER BY amount_cents DESC
LIMIT 10;

-- ============================================================================
-- LIMPEZA E MANUTENÇÃO
-- ============================================================================

-- Contar transações por empresa
SELECT 
  c.name,
  COUNT(t.id) as total_transacoes,
  COUNT(CASE WHEN t.deleted_at IS NULL THEN 1 END) as ativas,
  COUNT(CASE WHEN t.deleted_at IS NOT NULL THEN 1 END) as deletadas
FROM public.companies c
LEFT JOIN public.transactions t ON c.id = t.company_id
GROUP BY c.id, c.name;

-- Listar empresas sem transações
SELECT c.id, c.name
FROM public.companies c
LEFT JOIN public.transactions t ON c.id = t.company_id
WHERE t.id IS NULL;

-- Remover transações deletadas há mais de 90 dias (hard delete)
DELETE FROM public.transactions
WHERE deleted_at IS NOT NULL
  AND deleted_at < NOW() - INTERVAL '90 days';

-- Verificar integridade de dados
SELECT 
  'Transações' as tabela,
  COUNT(*) as total
FROM public.transactions
UNION ALL
SELECT 
  'Metas Financeiras',
  COUNT(*)
FROM public.financial_goals
UNION ALL
SELECT 
  'Configurações Dashboard',
  COUNT(*)
FROM public.dashboard_settings;
