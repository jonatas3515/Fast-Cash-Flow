-- ==============================================================
-- FASE 1.4: CORRIGIR RLS EM TODAS AS OUTRAS TABELAS
-- Adaptação: Usando 'company_id' e 'owner_id'
-- ==============================================================

DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'receivables',
    'recurring_expenses',
    'dashboard_settings',
    'debts',
    'payables',
    'orders',
    'products',
    'product_ingredients',
    'financial_goals',
    'clients',
    'categories'
  ];
  tbl TEXT;
  pol record;
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    -- Verificar se a tabela existe antes de prosseguir
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
        
        -- Reabilitar RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
        
        -- Remover policies antigas
        FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = tbl AND schemaname = 'public' LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
        END LOOP;
        
        -- Criar policy SELECT
        EXECUTE format('
          CREATE POLICY "Users can view their company %s"
            ON public.%I FOR SELECT TO authenticated
            USING (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()))
        ', tbl, tbl);
        
        -- Criar policy INSERT
        EXECUTE format('
          CREATE POLICY "Users can insert their company %s"
            ON public.%I FOR INSERT TO authenticated
            WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()))
        ', tbl, tbl);
        
        -- Criar policy UPDATE
        EXECUTE format('
          CREATE POLICY "Users can update their company %s"
            ON public.%I FOR UPDATE TO authenticated
            USING (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()))
        ', tbl, tbl);
        
        -- Criar policy DELETE
        EXECUTE format('
          CREATE POLICY "Users can delete their company %s"
            ON public.%I FOR DELETE TO authenticated
            USING (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()))
        ', tbl, tbl);

        -- Policy de Admin (opcional, mas boa prática)
        EXECUTE format('
          CREATE POLICY "Admin full access %s"
            ON public.%I FOR ALL TO authenticated
            USING ((auth.jwt()->>''email'')::text = ''admin@fastcashflow.com'')
        ', tbl, tbl);
        
        RAISE NOTICE '✅ RLS configurado para: %', tbl;
    END IF;
  END LOOP;
END $$;
