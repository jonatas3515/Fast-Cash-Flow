-- ============================================================================
-- FAST CASH FLOW - SQL SETUP (VERSÃO SEGURA)
-- ============================================================================

-- ============================================================================
-- 1. CRIAR EMPRESA ADMINISTRADORA
-- ============================================================================

-- Primeiro verifica se já existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.companies 
        WHERE lower(name) IN ('fastcashflow', 'fast cash flow')
           OR username = 'fastcashflow'
    ) THEN
        INSERT INTO public.companies (name, username, deleted_at)
        VALUES ('Fast Cash Flow', 'fastcashflow', NULL);
        RAISE NOTICE 'Empresa administradora criada com sucesso!';
    ELSE
        RAISE NOTICE 'Empresa administradora já existe!';
    END IF;
END $$;

-- Verificar se foi criada
SELECT id, name, username FROM public.companies WHERE lower(name) IN ('fastcashflow', 'fast cash flow') OR username = 'fastcashflow';

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
  deleted_at TIMESTAMP WITH TIME ZONE
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

-- Tabela de Despesas Recorrentes
CREATE TABLE IF NOT EXISTS public.recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category VARCHAR(50),
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  recurrence_type VARCHAR(20) NOT NULL, -- 'monthly','weekly','biweekly','annual','custom'
  interval_days INT, -- usado quando recurrence_type = 'custom'
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_recurring_expenses_company_id ON public.recurring_expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_start_date ON public.recurring_expenses(start_date);

-- Tabela de Configurações de Dashboard
CREATE TABLE IF NOT EXISTS public.dashboard_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  default_period VARCHAR(20) DEFAULT 'month', -- 'day', 'week', 'month', 'custom'
  alert_debt_threshold_cents BIGINT DEFAULT 50000000, -- alerta quando dívida > R$ 500.000
  alert_negative_balance BOOLEAN DEFAULT true, -- alerta quando saldo negativo
  goal_alert_threshold_percent INT DEFAULT 50, -- alerta quando meta < 50%
  goal_motivation_threshold_percent INT DEFAULT 80, -- limiar para mensagem motivacional (ex: 80%)
  currency VARCHAR(3) DEFAULT 'BRL',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_dashboard_settings_company_id ON public.dashboard_settings(company_id);

-- Garantir coluna de threshold motivacional mesmo em bancos já existentes
ALTER TABLE public.dashboard_settings
  ADD COLUMN IF NOT EXISTS goal_motivation_threshold_percent INT DEFAULT 80;

-- ============================================================================
-- 3. POLÍTICAS RLS (Row Level Security) - SEGURANÇA
-- ============================================================================

-- Habilitar RLS nas tabelas
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;

-- Políticas para transactions
DROP POLICY IF EXISTS "transactions_select_own_company" ON public.transactions;
CREATE POLICY "transactions_select_own_company" ON public.transactions
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "transactions_insert_own_company" ON public.transactions;
CREATE POLICY "transactions_insert_own_company" ON public.transactions
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "transactions_update_own_company" ON public.transactions;
CREATE POLICY "transactions_update_own_company" ON public.transactions
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "transactions_delete_own_company" ON public.transactions;
CREATE POLICY "transactions_delete_own_company" ON public.transactions
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid()
    )
  );

-- Políticas para financial_goals
DROP POLICY IF EXISTS "financial_goals_select_own_company" ON public.financial_goals;
CREATE POLICY "financial_goals_select_own_company" ON public.financial_goals
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "financial_goals_insert_own_company" ON public.financial_goals;
CREATE POLICY "financial_goals_insert_own_company" ON public.financial_goals
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "financial_goals_update_own_company" ON public.financial_goals;
CREATE POLICY "financial_goals_update_own_company" ON public.financial_goals
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "financial_goals_delete_own_company" ON public.financial_goals;
CREATE POLICY "financial_goals_delete_own_company" ON public.financial_goals
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid()
    )
  );

-- Políticas para dashboard_settings
DROP POLICY IF EXISTS "dashboard_settings_select_own_company" ON public.dashboard_settings;
CREATE POLICY "dashboard_settings_select_own_company" ON public.dashboard_settings
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "dashboard_settings_insert_own_company" ON public.dashboard_settings;
CREATE POLICY "dashboard_settings_insert_own_company" ON public.dashboard_settings
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "dashboard_settings_update_own_company" ON public.dashboard_settings;
CREATE POLICY "dashboard_settings_update_own_company" ON public.dashboard_settings
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid()
    )
  );

-- Políticas para recurring_expenses
DROP POLICY IF EXISTS "recurring_expenses_select_own_company" ON public.recurring_expenses;
CREATE POLICY "recurring_expenses_select_own_company" ON public.recurring_expenses
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "recurring_expenses_insert_own_company" ON public.recurring_expenses;
CREATE POLICY "recurring_expenses_insert_own_company" ON public.recurring_expenses
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "recurring_expenses_update_own_company" ON public.recurring_expenses;
CREATE POLICY "recurring_expenses_update_own_company" ON public.recurring_expenses
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "recurring_expenses_delete_own_company" ON public.recurring_expenses;
CREATE POLICY "recurring_expenses_delete_own_company" ON public.recurring_expenses
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 4. FUNÇÕES ÚTEIS PARA CÁLCULOS
-- ============================================================================

-- Função para calcular saldo de um período
DROP FUNCTION IF EXISTS calculate_balance(UUID, DATE, DATE);
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
DROP FUNCTION IF EXISTS calculate_total_income(UUID, DATE, DATE);
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
DROP FUNCTION IF EXISTS calculate_total_expenses(UUID, DATE, DATE);
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
DROP FUNCTION IF EXISTS calculate_goal_progress(UUID, DATE);
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
-- 5. DADOS DE EXEMPLO (OPCIONAL - Descomente se quiser)
-- ============================================================================

-- Descomente para adicionar dados de exemplo:
/*
-- Inserir transações de exemplo
DO $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT id INTO v_company_id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1;
  
  IF v_company_id IS NOT NULL THEN
    INSERT INTO public.transactions (company_id, type, description, amount_cents, category, date)
    VALUES 
      (v_company_id, 'entrada', 'Venda de produto', 500000, 'vendas', CURRENT_DATE - INTERVAL '5 days'),
      (v_company_id, 'saída', 'Pagamento de fornecedor', 200000, 'fornecedor', CURRENT_DATE - INTERVAL '3 days'),
      (v_company_id, 'entrada', 'Consultoria', 300000, 'serviços', CURRENT_DATE - INTERVAL '1 day'),
      (v_company_id, 'saída', 'Aluguel do escritório', 150000, 'aluguel', CURRENT_DATE);
    
    -- Inserir meta financeira
    INSERT INTO public.financial_goals (company_id, month, target_amount_cents, description)
    VALUES 
      (v_company_id, DATE_TRUNC('month', CURRENT_DATE)::DATE, 1000000, 'Meta de vendas para este mês');
    
    -- Inserir configurações de dashboard
    INSERT INTO public.dashboard_settings (company_id, default_period, alert_debt_threshold_cents, goal_alert_threshold_percent)
    VALUES 
      (v_company_id, 'month', 50000000, 50);
    
    RAISE NOTICE 'Dados de exemplo inseridos com sucesso!';
  END IF;
END $$;
*/

-- ============================================================================
-- 6. VERIFICAÇÃO FINAL
-- ============================================================================

-- Verificar se tudo foi criado corretamente
SELECT 'Empresa Administradora' as item, COUNT(*) as count FROM public.companies WHERE lower(name) IN ('fastcashflow','fast cash flow') OR username = 'fastcashflow'
UNION ALL
SELECT 'Tabela Transactions' as item, COUNT(*) as count FROM information_schema.tables WHERE table_name = 'transactions'
UNION ALL
SELECT 'Tabela Financial Goals' as item, COUNT(*) as count FROM information_schema.tables WHERE table_name = 'financial_goals'
UNION ALL
SELECT 'Tabela Dashboard Settings' as item, COUNT(*) as count FROM information_schema.tables WHERE table_name = 'dashboard_settings';

-- Mensagem final
DO $$
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'FAST CASH FLOW - SETUP COMPLETO!';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Tabelas criadas: transactions, financial_goals, dashboard_settings';
  RAISE NOTICE 'RLS habilitado com políticas de segurança';
  RAISE NOTICE 'Funções de cálculo criadas';
  RAISE NOTICE 'Empresa administradora: Fast Cash Flow';
  RAISE NOTICE '============================================================================';
END $$;
