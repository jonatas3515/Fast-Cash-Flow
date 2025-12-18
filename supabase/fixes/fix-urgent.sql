-- =====================================================
-- SCRIPT DE CORREÇÃO URGENTE
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. EXCLUIR EMPRESAS NEVES & COSTA E IMPÉRIO BURGUER
-- =====================================================

-- Excluir transações relacionadas
DELETE FROM transactions WHERE company_id IN (
  SELECT id FROM companies WHERE name IN ('Neves & Costa', 'Império Burguer')
);

-- Excluir pagamentos relacionados
DELETE FROM payments WHERE company_id IN (
  SELECT id FROM companies WHERE name IN ('Neves & Costa', 'Império Burguer')
);

-- Excluir solicitações relacionadas
DELETE FROM company_requests WHERE company_name IN ('Neves & Costa', 'Império Burguer');

-- Excluir as empresas
DELETE FROM companies WHERE name IN ('Neves & Costa', 'Império Burguer');

-- Verificar o que sobrou
SELECT id, name, username, status FROM companies;

-- 2. CORRIGIR RLS DA TABELA company_requests
-- =====================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Anyone can submit company request" ON public.company_requests;
DROP POLICY IF EXISTS "Admin can view all requests" ON public.company_requests;
DROP POLICY IF EXISTS "Admin can update requests" ON public.company_requests;
DROP POLICY IF EXISTS "Admin can delete requests" ON public.company_requests;
DROP POLICY IF EXISTS "Public can create requests" ON public.company_requests;
DROP POLICY IF EXISTS "Anyone can create requests" ON public.company_requests;

-- Criar políticas corretas
-- Permitir INSERT para TODOS (anon e authenticated)
CREATE POLICY "Public can insert requests"
  ON public.company_requests FOR INSERT
  WITH CHECK (true);

-- Admin pode ver todas
CREATE POLICY "Admin can view requests"
  ON public.company_requests FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'admin@fastcashflow.com');

-- Admin pode atualizar
CREATE POLICY "Admin can update requests"
  ON public.company_requests FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'admin@fastcashflow.com');

-- Admin pode deletar
CREATE POLICY "Admin can delete requests"
  ON public.company_requests FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'admin@fastcashflow.com');

-- 3. GARANTIR QUE RLS ESTÁ HABILITADO
-- =====================================================

ALTER TABLE public.company_requests ENABLE ROW LEVEL SECURITY;

-- 4. VERIFICAR POLÍTICAS CRIADAS
-- =====================================================

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'company_requests';

-- 5. TESTAR INSERT (deve funcionar)
-- =====================================================

-- Este comando deve funcionar sem erro:
-- INSERT INTO company_requests (company_name, owner_name, phone, email)
-- VALUES ('Teste', 'Teste Owner', '73999999999', 'teste@teste.com');

-- Se funcionou, delete o teste:
-- DELETE FROM company_requests WHERE company_name = 'Teste';

SELECT 'Script executado com sucesso!' as status;
