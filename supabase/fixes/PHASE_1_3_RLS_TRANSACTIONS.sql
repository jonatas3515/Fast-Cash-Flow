-- ==============================================================
-- FASE 1.3: CORRIGIR RLS POLICIES EM TRANSACTIONS
-- Adaptação: Usando 'company_id' e 'owner_id'
-- ==============================================================

-- 1. Habilitar RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 2. Remover policies antigas (Limpeza geral)
DO $$ 
DECLARE 
  pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'transactions' AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.transactions', pol.policyname);
    END LOOP;
END $$;

-- 3. Criar policies CORRETAS (Baseadas no owner_id da empresa)

-- SELECT: Usuário vê transações das empresas que ele é dono
CREATE POLICY "Users can view their company transactions"
  ON public.transactions FOR SELECT TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()));

-- INSERT: Usuário insere transações nas empresas que ele é dono
CREATE POLICY "Users can insert their company transactions"
  ON public.transactions FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()));

-- UPDATE: Usuário atualiza transações das empresas que ele é dono
CREATE POLICY "Users can update their company transactions"
  ON public.transactions FOR UPDATE TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()));

-- DELETE: Usuário deleta transações das empresas que ele é dono
CREATE POLICY "Users can delete their company transactions"
  ON public.transactions FOR DELETE TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()));

-- ADMIN: Ver tudo
CREATE POLICY "Admin can view all transactions"
  ON public.transactions FOR SELECT TO authenticated
  USING ((auth.jwt()->>'email')::text = 'admin@fastcashflow.com');

-- 4. Verificar policies criadas
SELECT schemaname, tablename, policyname, cmd FROM pg_policies WHERE tablename = 'transactions' ORDER BY cmd;
