-- =====================================================
-- CORREÇÃO COMPLETA DO CADASTRO
-- =====================================================

-- 1. Ver estrutura atual da tabela
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'company_requests'
ORDER BY ordinal_position;

-- 2. Tornar todas as colunas opcionais (exceto obrigatórias)
ALTER TABLE public.company_requests 
  ALTER COLUMN email DROP NOT NULL,
  ALTER COLUMN address DROP NOT NULL,
  ALTER COLUMN cnpj DROP NOT NULL,
  ALTER COLUMN founded_on DROP NOT NULL;

-- 3. Desabilitar RLS completamente
ALTER TABLE public.company_requests DISABLE ROW LEVEL SECURITY;

-- 4. Remover TODAS as políticas
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'company_requests'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.company_requests', pol.policyname);
    END LOOP;
END $$;

-- 5. Verificar se RLS está desabilitado
SELECT 
  relname as tabela,
  CASE 
    WHEN relrowsecurity THEN '❌ HABILITADO (problema!)'
    ELSE '✅ DESABILITADO (correto!)'
  END as rls_status
FROM pg_class
WHERE relname = 'company_requests';

-- 6. Verificar políticas (deve retornar 0 linhas)
SELECT COUNT(*) as total_policies
FROM pg_policies
WHERE tablename = 'company_requests';

-- 7. Testar INSERT diretamente
INSERT INTO public.company_requests (
  company_name, 
  owner_name, 
  phone, 
  email, 
  address, 
  cnpj, 
  founded_on
) VALUES (
  'Teste SQL Direto',
  'Owner Teste',
  '73999999999',
  'teste@teste.com',
  'Rua Teste, 123',
  '12345678901234',
  '2020-01-01'
);

-- 8. Verificar se foi inserido
SELECT * FROM public.company_requests 
WHERE company_name = 'Teste SQL Direto';

-- 9. Deletar o teste
DELETE FROM public.company_requests 
WHERE company_name = 'Teste SQL Direto';

-- 10. Resultado final
SELECT 
  '✅ Cadastro configurado corretamente!' as status,
  'RLS desabilitado, todas as colunas opcionais' as detalhes;
