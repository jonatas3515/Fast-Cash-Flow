-- ============================================================================
-- FAST CASH FLOW - SQL SETUP
-- ============================================================================

-- ============================================================================
-- 1. CRIAR EMPRESA ADMINISTRADORA
-- ============================================================================
-- Execute este comando para criar a empresa administradora (mãe)
INSERT INTO public.companies (name, username, deleted_at)
VALUES ('fastcashflow', 'fastcashflow', NULL)
ON CONFLICT (name, username) DO NOTHING;

-- Verificar se foi criada
SELECT id, name, username FROM public.companies WHERE name = 'fastcashflow';

-- ============================================================================
-- 2. TABELAS PARA DASHBOARD DE FLUXO DE CAIXA
-- ============================================================================

-- Tabela de Transações (Entradas e Saídas)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('entrada', 'saída')), -- entrada ou saída
  description TEXT NOT NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0), -- valor em centavos
  category VARCHAR(50), -- ex: vendas, aluguel, fornecedor, etc
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT unique_transaction_per_company_date UNIQUE (company_id, id)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_transactions_company_id ON public.transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_company_date ON public.transactions(company_id, date);

-- Tabela de Metas Financeiras
CREATE TABLE IF NOT EXISTS public.financial_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- primeiro dia do mês (ex: 2025-01-01)
  target_amount_cents BIGINT NOT NULL CHECK (target_amount_cents > 0), -- meta em centavos
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT unique_goal_per_company_month UNIQUE (company_id, month)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_financial_goals_company_id ON public.financial_goals(company_id);
CREATE INDEX IF NOT EXISTS idx_financial_goals_month ON public.financial_goals(month);

-- Tabela de Configurações de Dashboard
CREATE TABLE IF NOT EXISTS public.dashboard_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  default_period VARCHAR(20) DEFAULT 'month', -- 'day', 'week', 'month', 'custom'
  alert_debt_threshold_cents BIGINT DEFAULT 50000000, -- alerta quando dívida > R$ 500.000
  alert_negative_balance BOOLEAN DEFAULT true, -- alerta quando saldo negativo
  goal_alert_threshold_percent INT DEFAULT 50, -- alerta quando meta < 50%
  currency VARCHAR(3) DEFAULT 'BRL',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_dashboard_settings_company_id ON public.dashboard_settings(company_id);

-- ============================================================================
-- 3. POLÍTICAS RLS (Row Level Security) - SEGURANÇA
-- ============================================================================

-- Habilitar RLS nas tabelas
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_settings ENABLE ROW LEVEL SECURITY;

-- Políticas para transactions
CREATE POLICY "transactions_select_own_company" ON public.transactions
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "transactions_insert_own_company" ON public.transactions
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "transactions_update_own_company" ON public.transactions
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "transactions_delete_own_company" ON public.transactions
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid()
    )
  );

-- Políticas para financial_goals
CREATE POLICY "financial_goals_select_own_company" ON public.financial_goals
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "financial_goals_insert_own_company" ON public.financial_goals
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "financial_goals_update_own_company" ON public.financial_goals
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "financial_goals_delete_own_company" ON public.financial_goals
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid()
    )
  );

-- Políticas para dashboard_settings
CREATE POLICY "dashboard_settings_select_own_company" ON public.dashboard_settings
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "dashboard_settings_insert_own_company" ON public.dashboard_settings
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "dashboard_settings_update_own_company" ON public.dashboard_settings
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 4. FUNÇÕES ÚTEIS PARA CÁLCULOS
-- ============================================================================

-- Função para calcular saldo de um período
CREATE OR REPLACE FUNCTION calculate_balance(
  p_company_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS BIGINT AS $$
DECLARE
  v_entradas BIGINT;
  v_saidas BIGINT;
BEGIN
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_entradas
  FROM public.transactions
  WHERE company_id = p_company_id
    AND type = 'entrada'
    AND date >= p_start_date
    AND date <= p_end_date
    AND deleted_at IS NULL;

  SELECT COALESCE(SUM(amount_cents), 0) INTO v_saidas
  FROM public.transactions
  WHERE company_id = p_company_id
    AND type = 'saída'
    AND date >= p_start_date
    AND date <= p_end_date
    AND deleted_at IS NULL;

  RETURN v_entradas - v_saidas;
END;
$$ LANGUAGE plpgsql;

-- Função para calcular total de entradas
CREATE OR REPLACE FUNCTION calculate_total_income(
  p_company_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS BIGINT AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(amount_cents)
     FROM public.transactions
     WHERE company_id = p_company_id
       AND type = 'entrada'
       AND date >= p_start_date
       AND date <= p_end_date
       AND deleted_at IS NULL),
    0
  );
END;
$$ LANGUAGE plpgsql;

-- Função para calcular total de saídas
CREATE OR REPLACE FUNCTION calculate_total_expenses(
  p_company_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS BIGINT AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(amount_cents)
     FROM public.transactions
     WHERE company_id = p_company_id
       AND type = 'saída'
       AND date >= p_start_date
       AND date <= p_end_date
       AND deleted_at IS NULL),
    0
  );
END;
$$ LANGUAGE plpgsql;

-- Função para calcular progresso da meta
CREATE OR REPLACE FUNCTION calculate_goal_progress(
  p_company_id UUID,
  p_month DATE
)
RETURNS TABLE(
  target_amount_cents BIGINT,
  achieved_amount_cents BIGINT,
  progress_percent INT
) AS $$
DECLARE
  v_target BIGINT;
  v_achieved BIGINT;
  v_progress INT;
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- Obter a meta do mês
  SELECT financial_goals.target_amount_cents INTO v_target
  FROM public.financial_goals
  WHERE company_id = p_company_id
    AND month = DATE_TRUNC('month', p_month)::DATE;

  IF v_target IS NULL THEN
    RETURN QUERY SELECT 0::BIGINT, 0::BIGINT, 0::INT;
    RETURN;
  END IF;

  -- Calcular período do mês
  v_start_date := DATE_TRUNC('month', p_month)::DATE;
  v_end_date := (DATE_TRUNC('month', p_month) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  -- Calcular entradas do mês
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_achieved
  FROM public.transactions
  WHERE company_id = p_company_id
    AND type = 'entrada'
    AND date >= v_start_date
    AND date <= v_end_date
    AND deleted_at IS NULL;

  -- Calcular percentual
  v_progress := CASE
    WHEN v_target = 0 THEN 0
    ELSE LEAST(100, (v_achieved * 100) / v_target)
  END;

  RETURN QUERY SELECT v_target, v_achieved, v_progress;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. DADOS DE EXEMPLO (OPCIONAL - Remova se não quiser)
-- ============================================================================

-- Descomente para adicionar dados de exemplo:
/*
-- Inserir transações de exemplo
INSERT INTO public.transactions (company_id, type, description, amount_cents, category, date)
SELECT 
  (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1),
  'entrada',
  'Venda de produto',
  500000, -- R$ 5.000
  'vendas',
  CURRENT_DATE - INTERVAL '5 days'
UNION ALL
SELECT 
  (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1),
  'saída',
  'Pagamento de fornecedor',
  200000, -- R$ 2.000
  'fornecedor',
  CURRENT_DATE - INTERVAL '3 days'
UNION ALL
SELECT 
  (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1),
  'entrada',
  'Consultoria',
  300000, -- R$ 3.000
  'serviços',
  CURRENT_DATE - INTERVAL '1 day'
UNION ALL
SELECT 
  (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1),
  'saída',
  'Aluguel do escritório',
  150000, -- R$ 1.500
  'aluguel',
  CURRENT_DATE;

-- Inserir meta financeira
INSERT INTO public.financial_goals (company_id, month, target_amount_cents, description)
SELECT 
  (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1),
  DATE_TRUNC('month', CURRENT_DATE)::DATE,
  1000000, -- R$ 10.000
  'Meta de vendas para este mês'
ON CONFLICT DO NOTHING;

-- Inserir configurações de dashboard
INSERT INTO public.dashboard_settings (company_id, default_period, alert_debt_threshold_cents, goal_alert_threshold_percent)
SELECT 
  (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1),
  'month',
  50000000,
  50
ON CONFLICT (company_id) DO NOTHING;
*/

-- ============================================================================
-- 6. VERIFICAÇÃO FINAL
-- ============================================================================

-- Verificar se tudo foi criado corretamente
SELECT 'Empresa Administradora' as item, COUNT(*) as count FROM public.companies WHERE name = 'fastcashflow'
UNION ALL
SELECT 'Tabela Transactions' as item, COUNT(*) as count FROM information_schema.tables WHERE table_name = 'transactions'
UNION ALL
SELECT 'Tabela Financial Goals' as item, COUNT(*) as count FROM information_schema.tables WHERE table_name = 'financial_goals'
UNION ALL
SELECT 'Tabela Dashboard Settings' as item, COUNT(*) as count FROM information_schema.tables WHERE table_name = 'dashboard_settings';
