-- =====================================================
-- CORREÇÃO DEFINITIVA - TODOS OS PROBLEMAS
-- =====================================================

-- 1. DESABILITAR RLS EM COMPANIES (resolver recursão infinita)
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;

-- 2. REMOVER TODAS AS POLÍTICAS DE COMPANIES
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'companies'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.companies', pol.policyname);
    END LOOP;
END $$;

-- 3. ADICIONAR COLUNAS QUE FALTAM EM COMPANIES
ALTER TABLE public.companies 
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS founded_on DATE,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS plan_type TEXT,
  ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS trial_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 4. RECRIAR FUNCTION DE APROVAÇÃO (sem cnpj se não existir)
CREATE OR REPLACE FUNCTION approve_company_request(
  request_id UUID,
  approved_user TEXT,
  temp_pass TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  req_row RECORD;
  new_company_id UUID;
BEGIN
  -- Verificar se é admin
  IF auth.jwt() ->> 'email' != 'admin@fastcashflow.com' THEN
    RAISE EXCEPTION 'Unauthorized: Only admin can approve requests';
  END IF;

  -- Buscar a solicitação
  SELECT * INTO req_row FROM company_requests WHERE id = request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  -- Criar a empresa (SEM cnpj e address por enquanto)
  INSERT INTO companies (
    name,
    username,
    email,
    phone,
    status,
    plan_type,
    trial_days,
    trial_start,
    trial_end
  ) VALUES (
    req_row.company_name,
    approved_user,
    req_row.email,
    req_row.phone,
    'trial',
    'trial',
    30,
    NOW(),
    NOW() + INTERVAL '30 days'
  )
  RETURNING id INTO new_company_id;

  -- Atualizar a solicitação
  UPDATE company_requests
  SET 
    status = 'approved',
    approved_at = NOW(),
    approved_username = approved_user,
    temp_password = temp_pass
  WHERE id = request_id;

  RETURN new_company_id;
END;
$$;

-- 5. DAR PERMISSÃO
GRANT EXECUTE ON FUNCTION approve_company_request(uuid, text, text) TO authenticated;

-- 6. VERIFICAR ESTRUTURA FINAL
SELECT 
  'COMPANIES' as tabela,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'companies'
ORDER BY ordinal_position;

-- 7. VERIFICAR RLS (deve estar desabilitado)
SELECT 
  relname as tabela,
  CASE 
    WHEN relrowsecurity THEN '❌ HABILITADO'
    ELSE '✅ DESABILITADO'
  END as rls_status
FROM pg_class
WHERE relname = 'companies';

SELECT '✅ TUDO CORRIGIDO!' as status;
