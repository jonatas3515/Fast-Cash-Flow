-- =====================================================
-- ADICIONAR TODAS AS COLUNAS QUE FALTAM
-- =====================================================

-- 1. Verificar estrutura atual de company_requests
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'company_requests'
ORDER BY ordinal_position;

-- 2. Adicionar colunas que faltam em company_requests
ALTER TABLE public.company_requests 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_username TEXT,
  ADD COLUMN IF NOT EXISTS temp_password TEXT,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

-- 3. Verificar estrutura atual de companies
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'companies'
ORDER BY ordinal_position;

-- 4. Adicionar colunas que faltam em companies
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

-- 5. Desabilitar RLS em companies
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;

-- 6. Remover todas as políticas de companies
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

-- 7. Recriar function de aprovação (agora com todas as colunas)
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

  -- Criar a empresa
  INSERT INTO companies (
    name,
    username,
    email,
    phone,
    address,
    cnpj,
    founded_on,
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
    req_row.address,
    req_row.cnpj,
    req_row.founded_on,
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

-- 8. Dar permissão para executar
GRANT EXECUTE ON FUNCTION approve_company_request(uuid, text, text) TO authenticated;

-- 9. Verificação final
SELECT 
  'COMPANY_REQUESTS' as tabela,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'company_requests'
ORDER BY ordinal_position;

SELECT 
  'COMPANIES' as tabela,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'companies'
ORDER BY ordinal_position;

SELECT '✅ TODAS AS COLUNAS ADICIONADAS!' as status;
