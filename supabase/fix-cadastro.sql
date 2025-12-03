-- =====================================================
-- CORRIGIR CADASTRO DE EMPRESAS
-- =====================================================

-- 1. Desabilitar RLS temporariamente para testar
ALTER TABLE public.company_requests DISABLE ROW LEVEL SECURITY;

-- 2. Ou manter RLS e criar política correta
ALTER TABLE public.company_requests ENABLE ROW LEVEL SECURITY;

-- Remover todas as políticas antigas
DROP POLICY IF EXISTS "Anyone can submit company request" ON public.company_requests;
DROP POLICY IF EXISTS "Admin can view all requests" ON public.company_requests;
DROP POLICY IF EXISTS "Admin can update requests" ON public.company_requests;
DROP POLICY IF EXISTS "Admin can delete requests" ON public.company_requests;
DROP POLICY IF EXISTS "Public can create requests" ON public.company_requests;
DROP POLICY IF EXISTS "Anyone can create requests" ON public.company_requests;
DROP POLICY IF EXISTS "Public can insert requests" ON public.company_requests;

-- Criar política que permite INSERT sem autenticação
CREATE POLICY "allow_public_insert"
  ON public.company_requests
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Admin pode ver todas
CREATE POLICY "admin_select"
  ON public.company_requests
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'admin@fastcashflow.com');

-- Admin pode atualizar
CREATE POLICY "admin_update"
  ON public.company_requests
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'admin@fastcashflow.com');

-- Admin pode deletar
CREATE POLICY "admin_delete"
  ON public.company_requests
  FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'admin@fastcashflow.com');

-- Verificar políticas
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'company_requests';

-- Testar INSERT (deve funcionar)
INSERT INTO company_requests (company_name, owner_name, phone, email, address, cnpj, founded_on)
VALUES ('Teste SQL', 'Owner Teste', '73999999999', 'teste@teste.com', 'Rua Teste', '12345678901234', '2020-01-01');

-- Se funcionou, deletar o teste
DELETE FROM company_requests WHERE company_name = 'Teste SQL';

SELECT 'Cadastro corrigido!' as status;
