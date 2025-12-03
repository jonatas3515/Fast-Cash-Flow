-- =====================================================
-- CORREÇÃO FINAL - TODOS OS PROBLEMAS
-- =====================================================

-- PROBLEMA 1: Tabela companies sem colunas necessárias
-- =====================================================

-- Ver estrutura atual de companies
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'companies'
ORDER BY ordinal_position;

-- Adicionar colunas que faltam em companies
ALTER TABLE public.companies 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS plan_type TEXT,
  ADD COLUMN IF NOT EXISTS trial_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- PROBLEMA 2: RPC approve_company_request não existe ou está quebrada
-- =====================================================

-- Recriar a function de aprovação
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

-- Dar permissão para executar
GRANT EXECUTE ON FUNCTION approve_company_request(uuid, text, text) TO authenticated;

-- PROBLEMA 3: Verificar se admin_users existe
-- =====================================================

-- Criar tabela admin_users se não existir
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir admin padrão se não existir
INSERT INTO public.admin_users (username, password_hash, email)
VALUES ('jonatas', 'fastcashflow', 'admin@fastcashflow.com')
ON CONFLICT (username) DO NOTHING;

-- VERIFICAÇÕES FINAIS
-- =====================================================

-- Ver estrutura final de companies
SELECT 'COMPANIES' as tabela, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'companies'
ORDER BY ordinal_position;

-- Ver estrutura final de company_requests
SELECT 'COMPANY_REQUESTS' as tabela, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'company_requests'
ORDER BY ordinal_position;

-- Ver functions criadas
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('approve_company_request', 'delete_company_cascade');

SELECT '✅ TUDO CORRIGIDO!' as status;
