-- =====================================================
-- FAST CASH FLOW - CORREÇÃO COMPLETA DE RLS E REALTIME
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1. GARANTIR QUE A TABELA TRANSACTIONS EXISTE COM ESTRUTURA CORRETA
-- =====================================================

CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  date TEXT NOT NULL,
  time TEXT,
  datetime TEXT NOT NULL,
  description TEXT,
  category TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  source_device TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_transactions_company_id ON public.transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_updated_at ON public.transactions(updated_at);
CREATE INDEX IF NOT EXISTS idx_transactions_deleted_at ON public.transactions(deleted_at);
CREATE INDEX IF NOT EXISTS idx_transactions_datetime ON public.transactions(datetime);
CREATE INDEX IF NOT EXISTS idx_transactions_company_date ON public.transactions(company_id, date);

-- 3. HABILITAR RLS
-- =====================================================

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 4. REMOVER TODAS AS POLÍTICAS ANTIGAS
-- =====================================================

DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'transactions'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.transactions', pol.policyname);
    END LOOP;
END $$;

-- 5. CRIAR POLÍTICAS DE ACESSO
-- =====================================================

-- Admin pode ver todas as transações
CREATE POLICY "Admin can view all transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') = 'admin@fastcashflow.com'
  );

-- Admin pode inserir transações
CREATE POLICY "Admin can insert all transactions"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() ->> 'email') = 'admin@fastcashflow.com'
  );

-- Admin pode atualizar transações
CREATE POLICY "Admin can update all transactions"
  ON public.transactions FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') = 'admin@fastcashflow.com'
  );

-- Admin pode deletar transações
CREATE POLICY "Admin can delete all transactions"
  ON public.transactions FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') = 'admin@fastcashflow.com'
  );

-- Empresas: SELECT (casar por username OU email)
CREATE POLICY "Company users can view own transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM public.companies
      WHERE username ILIKE split_part((auth.jwt() ->> 'email'), '@', 1)
         OR email ILIKE (auth.jwt() ->> 'email')
    )
  );

-- Empresas: INSERT
CREATE POLICY "Company users can insert own transactions"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT id FROM public.companies
      WHERE username ILIKE split_part((auth.jwt() ->> 'email'), '@', 1)
         OR email ILIKE (auth.jwt() ->> 'email')
    )
  );

-- Empresas: UPDATE
CREATE POLICY "Company users can update own transactions"
  ON public.transactions FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM public.companies
      WHERE username ILIKE split_part((auth.jwt() ->> 'email'), '@', 1)
         OR email ILIKE (auth.jwt() ->> 'email')
    )
  );

-- Empresas: DELETE
CREATE POLICY "Company users can delete own transactions"
  ON public.transactions FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM public.companies
      WHERE username ILIKE split_part((auth.jwt() ->> 'email'), '@', 1)
         OR email ILIKE (auth.jwt() ->> 'email')
    )
  );

-- 6. HABILITAR REALTIME
-- =====================================================

-- Garantir que a tabela está na publicação do Realtime
DO $$
BEGIN
  -- Verificar se já existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'transactions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions';
  END IF;
END $$;

-- 7. VERIFICAÇÕES FINAIS
-- =====================================================

-- Verificar políticas criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as comando,
  roles as papeis
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'transactions'
ORDER BY policyname;

-- Verificar se está na publicação Realtime
SELECT 
  schemaname,
  tablename,
  pubname
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND schemaname = 'public'
  AND tablename = 'transactions';

-- Verificar estrutura da tabela
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'transactions'
ORDER BY ordinal_position;

-- Contar registros por empresa
SELECT 
  c.username,
  c.email,
  COUNT(t.id) as total_transacoes
FROM public.companies c
LEFT JOIN public.transactions t ON t.company_id = c.id
GROUP BY c.id, c.username, c.email
ORDER BY total_transacoes DESC;

-- 8. MENSAGEM FINAL
-- =====================================================

SELECT '✅ CONFIGURAÇÃO COMPLETA!' as status,
       'RLS habilitado e políticas criadas' as rls,
       'Realtime habilitado para transactions' as realtime,
       'Pronto para sincronização entre dispositivos' as resultado;
