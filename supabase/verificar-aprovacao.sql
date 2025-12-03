-- =====================================================
-- VERIFICAR E CORRIGIR FUNÇÃO APROVAÇÃO E TRIAL
-- =====================================================

-- 1. Verificar estrutura atual das tabelas
SELECT 
  'company_requests' as tabela,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'company_requests'
ORDER BY ordinal_position;

SELECT 
  'companies' as tabela,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'companies'
ORDER BY ordinal_position;

-- 2. Verificar se a função approve_company_request existe
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'approve_company_request';

-- 3. Recriar função de aprovação COM trial de 30 dias
DROP FUNCTION IF EXISTS public.approve_company_request(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.approve_company_request(
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

  -- Criar a empresa com trial de 30 dias AUTOMÁTICO
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
    'trial',                    -- Status inicial: trial
    'trial',                    -- Plano inicial: trial
    30,                         -- 30 dias de trial
    NOW(),                      -- Data de início do trial
    NOW() + INTERVAL '30 days', -- Data de fim do trial
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

-- 4. Dar permissão para executar
GRANT EXECUTE ON FUNCTION public.approve_company_request(UUID, TEXT, TEXT) TO authenticated;

-- 5. Verificar se foi criada corretamente
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'approve_company_request';

-- 6. Testar com uma solicitação existente (se houver)
SELECT 
  'Solicitações pendentes:' as info,
  id,
  company_name,
  owner_name,
  email,
  status,
  created_at
FROM company_requests 
WHERE status = 'pending' OR status IS NULL
LIMIT 5;

SELECT '✅ Função approve_company_request corrigida com trial automático!' as status;
