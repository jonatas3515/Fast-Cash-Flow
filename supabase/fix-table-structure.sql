-- =====================================================
-- CORRIGIR ESTRUTURA DA TABELA company_requests
-- =====================================================

-- 1. Ver estrutura atual
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'company_requests'
ORDER BY ordinal_position;

-- 2. Adicionar colunas que faltam
ALTER TABLE public.company_requests 
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS founded_on DATE;

-- 3. Desabilitar RLS
ALTER TABLE public.company_requests DISABLE ROW LEVEL SECURITY;

-- 4. Remover todas as políticas
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

-- 5. Verificar estrutura final
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'company_requests'
ORDER BY ordinal_position;

-- 6. Testar INSERT com todas as colunas
INSERT INTO public.company_requests (
  company_name, 
  owner_name, 
  phone, 
  email, 
  address, 
  cnpj, 
  founded_on
) VALUES (
  'Teste Completo',
  'Owner Teste',
  '73999999999',
  'teste@teste.com',
  'Rua Teste',
  '12345678901234',
  '2020-01-01'
);

-- 7. Verificar
SELECT * FROM public.company_requests 
WHERE company_name = 'Teste Completo';

-- 8. Deletar teste
DELETE FROM public.company_requests 
WHERE company_name = 'Teste Completo';

SELECT '✅ Tabela corrigida e testada!' as status;
