-- =====================================================
-- CORRIGIR APROVAÇÃO - EMPRESA SUMIR DAS SOLICITAÇÕES
-- =====================================================

-- 1. Atualizar função de aprovação para marcar como approved
DROP FUNCTION IF EXISTS public.approve_company_request(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.approve_company_request(
  request_id UUID,
  approved_user TEXT,
  temp_pass TEXT
)
RETURNS TABLE(company_id UUID, message TEXT)
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

  -- Atualizar a solicitação para APPROVED (isso faz sumir das pendentes)
  UPDATE company_requests
  SET 
    status = 'approved',        -- Muda de pending para approved
    approved_at = NOW(),
    approved_username = approved_user,
    temp_password = temp_pass,
    updated_at = NOW()
  WHERE id = request_id;

  -- Retornar sucesso
  RETURN QUERY SELECT new_company_id, format('Empresa %s aprovada com sucesso! Trial de 30 dias iniciado.', req_row.company_name);
END;
$$;

-- 2. Dar permissão
GRANT EXECUTE ON FUNCTION public.approve_company_request(UUID, TEXT, TEXT) TO authenticated;

-- 3. Verificar se funciona
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'approve_company_request';

SELECT '✅ Função de aprovação corrigida!' as status;
