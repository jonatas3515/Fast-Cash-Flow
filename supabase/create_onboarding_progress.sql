-- =====================================================
-- TABELA DE PROGRESSO DO ONBOARDING - Fast Cash Flow
-- =====================================================
-- Execute este script no Supabase SQL Editor

-- 1. Criar tabela de progresso do onboarding
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Passos do onboarding
  profile_completed BOOLEAN DEFAULT false,
  first_transactions BOOLEAN DEFAULT false,
  categories_configured BOOLEAN DEFAULT false,
  first_goal_created BOOLEAN DEFAULT false,
  recurring_expense_added BOOLEAN DEFAULT false,
  first_report_generated BOOLEAN DEFAULT false,
  
  -- Progresso
  completed_steps INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 6,
  completion_percent INTEGER DEFAULT 0,
  
  -- Bônus
  bonus_days_earned INTEGER DEFAULT 0,
  bonus_applied BOOLEAN DEFAULT false,
  bonus_applied_at TIMESTAMPTZ,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar índices
CREATE INDEX IF NOT EXISTS idx_onboarding_company ON public.onboarding_progress(company_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_completed ON public.onboarding_progress(completed_steps);

-- 3. Habilitar RLS
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

-- 4. Remover políticas existentes
DROP POLICY IF EXISTS "onboarding_select_policy" ON public.onboarding_progress;
DROP POLICY IF EXISTS "onboarding_insert_policy" ON public.onboarding_progress;
DROP POLICY IF EXISTS "onboarding_update_policy" ON public.onboarding_progress;
DROP POLICY IF EXISTS "onboarding_delete_policy" ON public.onboarding_progress;

-- 5. Criar políticas RLS
CREATE POLICY "onboarding_select_policy" ON public.onboarding_progress
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "onboarding_insert_policy" ON public.onboarding_progress
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "onboarding_update_policy" ON public.onboarding_progress
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "onboarding_delete_policy" ON public.onboarding_progress
  FOR DELETE TO authenticated
  USING (true);

-- 6. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_onboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS onboarding_updated_at_trigger ON public.onboarding_progress;
CREATE TRIGGER onboarding_updated_at_trigger
  BEFORE UPDATE ON public.onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_updated_at();

-- 7. Função para atualizar progresso automaticamente
CREATE OR REPLACE FUNCTION update_onboarding_progress(p_company_id UUID)
RETURNS void AS $$
DECLARE
  v_profile_completed BOOLEAN;
  v_first_transactions BOOLEAN;
  v_categories_configured BOOLEAN;
  v_first_goal_created BOOLEAN;
  v_recurring_expense_added BOOLEAN;
  v_first_report_generated BOOLEAN;
  v_completed_steps INTEGER;
  v_completion_percent INTEGER;
  v_transaction_count INTEGER;
  v_category_count INTEGER;
  v_goal_count INTEGER;
  v_recurring_count INTEGER;
  v_company_name TEXT;
  v_company_logo TEXT;
BEGIN
  -- Verificar perfil
  SELECT name, logo_url INTO v_company_name, v_company_logo
  FROM companies WHERE id = p_company_id;
  v_profile_completed := (v_company_name IS NOT NULL AND v_company_logo IS NOT NULL);
  
  -- Contar transações
  SELECT COUNT(*) INTO v_transaction_count
  FROM transactions WHERE company_id = p_company_id AND deleted_at IS NULL;
  v_first_transactions := (v_transaction_count >= 5);
  
  -- Contar categorias
  SELECT COUNT(*) INTO v_category_count
  FROM categories WHERE company_id = p_company_id;
  v_categories_configured := (v_category_count >= 3);
  
  -- Contar metas
  SELECT COUNT(*) INTO v_goal_count
  FROM financial_goals WHERE company_id = p_company_id;
  v_first_goal_created := (v_goal_count >= 1);
  
  -- Contar despesas recorrentes
  SELECT COUNT(*) INTO v_recurring_count
  FROM recurring_expenses WHERE company_id = p_company_id;
  v_recurring_expense_added := (v_recurring_count >= 1);
  
  -- Relatório gerado (consideramos se tem 10+ transações)
  v_first_report_generated := (v_transaction_count >= 10);
  
  -- Calcular progresso
  v_completed_steps := 0;
  IF v_profile_completed THEN v_completed_steps := v_completed_steps + 1; END IF;
  IF v_first_transactions THEN v_completed_steps := v_completed_steps + 1; END IF;
  IF v_categories_configured THEN v_completed_steps := v_completed_steps + 1; END IF;
  IF v_first_goal_created THEN v_completed_steps := v_completed_steps + 1; END IF;
  IF v_recurring_expense_added THEN v_completed_steps := v_completed_steps + 1; END IF;
  IF v_first_report_generated THEN v_completed_steps := v_completed_steps + 1; END IF;
  
  v_completion_percent := ROUND((v_completed_steps::DECIMAL / 6) * 100);
  
  -- Inserir ou atualizar
  INSERT INTO onboarding_progress (
    company_id, profile_completed, first_transactions, categories_configured,
    first_goal_created, recurring_expense_added, first_report_generated,
    completed_steps, completion_percent, bonus_days_earned
  ) VALUES (
    p_company_id, v_profile_completed, v_first_transactions, v_categories_configured,
    v_first_goal_created, v_recurring_expense_added, v_first_report_generated,
    v_completed_steps, v_completion_percent, CASE WHEN v_completed_steps = 6 THEN 7 ELSE 0 END
  )
  ON CONFLICT (company_id) DO UPDATE SET
    profile_completed = EXCLUDED.profile_completed,
    first_transactions = EXCLUDED.first_transactions,
    categories_configured = EXCLUDED.categories_configured,
    first_goal_created = EXCLUDED.first_goal_created,
    recurring_expense_added = EXCLUDED.recurring_expense_added,
    first_report_generated = EXCLUDED.first_report_generated,
    completed_steps = EXCLUDED.completed_steps,
    completion_percent = EXCLUDED.completion_percent,
    bonus_days_earned = CASE 
      WHEN onboarding_progress.bonus_applied THEN onboarding_progress.bonus_days_earned
      ELSE EXCLUDED.bonus_days_earned 
    END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 8. Verificar estrutura
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'onboarding_progress'
ORDER BY ordinal_position;
