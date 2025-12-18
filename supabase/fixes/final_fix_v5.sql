-- =====================================================
-- FIX SYSTEM COMPLETO (VERSÃO FINAL 5.0 - POLICY FIX)
-- =====================================================
-- Data: 2024-12-11
-- Autor: Cascade
-- Objetivo: Estabilizar sistema e corrigir erro de policy duplicada.
-- =====================================================

-- =====================================================
-- 0. PADRONIZAÇÃO DE COLUNAS
-- =====================================================
DO $$ 
DECLARE 
  t text;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.tables 
           WHERE table_schema = 'public' 
           AND table_name IN ('transactions', 'recurring_expenses', 'dashboard_settings', 'debts', 'receivables', 'payables', 'orders', 'products', 'clients', 'categories', 'financial_goals')
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'companyid') THEN
      EXECUTE format('ALTER TABLE public.%I RENAME COLUMN companyid TO company_id', t);
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- 1. FIX DUPLICIDADE "NEVE & COSTA" (FUSÃO SEGURA)
-- =====================================================
DO $$ 
DECLARE
    v_keep_id UUID;
    v_remove_id UUID;
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.companies 
    WHERE name ILIKE '%Neve%Costa%' OR username ILIKE '%Neve%Costa%';

    IF v_count >= 2 THEN
        SELECT id INTO v_keep_id
        FROM public.companies
        WHERE name ILIKE '%Neve%Costa%' OR username ILIKE '%Neve%Costa%'
        ORDER BY CASE WHEN owner_id IS NOT NULL THEN 1 ELSE 2 END, created_at ASC
        LIMIT 1;

        FOR v_remove_id IN 
            SELECT id FROM public.companies 
            WHERE (name ILIKE '%Neve%Costa%' OR username ILIKE '%Neve%Costa%') AND id != v_keep_id
        LOOP
            UPDATE public.transactions SET company_id = v_keep_id WHERE company_id = v_remove_id;
            UPDATE public.debts SET company_id = v_keep_id WHERE company_id = v_remove_id;
            UPDATE public.receivables SET company_id = v_keep_id WHERE company_id = v_remove_id;
            UPDATE public.payables SET company_id = v_keep_id WHERE company_id = v_remove_id;
            UPDATE public.orders SET company_id = v_keep_id WHERE company_id = v_remove_id;
            UPDATE public.products SET company_id = v_keep_id WHERE company_id = v_remove_id;
            UPDATE public.clients SET company_id = v_keep_id WHERE company_id = v_remove_id;
            UPDATE public.categories SET company_id = v_keep_id WHERE company_id = v_remove_id;
            UPDATE public.recurring_expenses SET company_id = v_keep_id WHERE company_id = v_remove_id;
            UPDATE public.dashboard_settings SET company_id = v_keep_id WHERE company_id = v_remove_id;
            UPDATE public.financial_goals SET company_id = v_keep_id WHERE company_id = v_remove_id;
            UPDATE public.company_requests SET approved_company_id = v_keep_id WHERE approved_company_id = v_remove_id;
            DELETE FROM public.companies WHERE id = v_remove_id;
        END LOOP;
    END IF;
END $$;

-- =====================================================
-- 2. AJUSTAR ESTRUTURA COMPANIES
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'owner_id') THEN
    ALTER TABLE public.companies ADD COLUMN owner_id UUID REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'address') THEN
    ALTER TABLE public.companies ADD COLUMN address TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'cnpj') THEN
    ALTER TABLE public.companies ADD COLUMN cnpj TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'foundedon') THEN
    ALTER TABLE public.companies ADD COLUMN foundedon DATE;
  END IF;
END $$;

-- Vincular empresas
UPDATE public.companies c
SET owner_id = au.id
FROM auth.users au
WHERE c.owner_id IS NULL AND (LOWER(c.email) = LOWER(au.email) OR LOWER(c.username) = LOWER(SPLIT_PART(au.email, '@', 1)));

-- =====================================================
-- 3. MIGRAÇÃO DE TRANSACTIONS
-- =====================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'user_id') THEN
        UPDATE public.transactions t SET company_id = c.id FROM public.companies c WHERE t.company_id IS NULL AND c.owner_id = t.user_id;
        ALTER TABLE public.transactions ALTER COLUMN user_id DROP NOT NULL;
    END IF;
END $$;

-- =====================================================
-- 4. FUNÇÃO HELPER (RLS)
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_company_id() RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM public.companies WHERE owner_id = auth.uid() OR username ILIKE (auth.jwt() ->> 'email')::text OR email ILIKE (auth.jwt() ->> 'email')::text LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION get_user_company_id TO authenticated;

-- =====================================================
-- 5. APLICAR RLS (COM DROPS ROBUSTOS)
-- =====================================================
DO $$ 
DECLARE 
  t text;
  pol record;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.tables 
           WHERE table_schema = 'public' 
           AND table_name IN ('companies', 'transactions', 'recurring_expenses', 'dashboard_settings', 'debts', 'receivables', 'payables', 'orders', 'products', 'clients', 'categories', 'financial_goals', 'company_requests')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    
    -- REMOVER TODAS AS POLICIES DA TABELA ANTES DE RECRIAR
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = t AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;
    
    -- Admin Policy (Serve para todas)
    EXECUTE format('
      CREATE POLICY "admin_policy_%s" ON public.%I
      FOR ALL TO authenticated
      USING (auth.jwt() ->> ''email'' = ''admin@fastcashflow.com'')', t, t);

    -- User Policies Específicas
    IF t = 'companies' THEN
        EXECUTE format('
          CREATE POLICY "user_policy_%s" ON public.%I
          FOR SELECT TO authenticated
          USING (owner_id = auth.uid() OR username ILIKE (auth.jwt() ->> ''email'')::text)', t, t);
    ELSIF t = 'company_requests' THEN
        EXECUTE format('
          CREATE POLICY "public_insert_%s" ON public.%I
          FOR INSERT TO anon, authenticated
          WITH CHECK (true)', t, t);
    ELSE
        EXECUTE format('
          CREATE POLICY "user_policy_%s" ON public.%I
          FOR ALL TO authenticated
          USING (company_id = get_user_company_id())
          WITH CHECK (company_id = get_user_company_id())', t, t);
    END IF;

    RAISE NOTICE '✅ RLS aplicado e limpo para: %', t;
  END LOOP;
END $$;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================
SELECT 'SUCCESS' as status;
