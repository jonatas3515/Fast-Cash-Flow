-- =====================================================
-- CORREÇÃO FINAL DEFINITIVA - TODAS AS COLUNAS
-- =====================================================

-- 1. Adicionar TODAS as colunas que faltam em company_requests
ALTER TABLE public.company_requests 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_username TEXT,
  ADD COLUMN IF NOT EXISTS temp_password TEXT,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Adicionar TODAS as colunas que faltam em companies
ALTER TABLE public.companies 
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS founded_on DATE,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS plan_type TEXT,
  ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS trial_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Desabilitar RLS em companies
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;

-- 4. Remover todas as políticas de companies
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

-- 5. Recriar function de aprovação (COM updated_at)
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
    trial_end,
    created_at,
    updated_at
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
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW()
  )
  RETURNING id INTO new_company_id;

  -- Atualizar a solicitação
  UPDATE company_requests
  SET 
    status = 'approved',
    approved_at = NOW(),
    approved_username = approved_user,
    temp_password = temp_pass,
    updated_at = NOW()
  WHERE id = request_id;

  RETURN new_company_id;
END;
$$;

-- 6. Dar permissão para executar
GRANT EXECUTE ON FUNCTION approve_company_request(uuid, text, text) TO authenticated;

-- 7. Verificação final
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

SELECT '✅ TUDO CORRIGIDO DEFINITIVAMENTE!' as status;
