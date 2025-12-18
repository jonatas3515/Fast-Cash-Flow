-- ==============================================================
-- FASE 1.5: CORRIGIR FUNÇÃO DE APROVAÇÃO (V2 - SYNTAX FIX)
-- ==============================================================

DROP FUNCTION IF EXISTS approve_company_request(UUID, TEXT, TEXT);

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
  current_user_id UUID;
BEGIN
  -- Validar admin
  IF (auth.jwt()->>'email')::text != 'admin@fastcashflow.com' THEN
    RAISE EXCEPTION 'Unauthorized: Only admin can approve requests';
  END IF;

  -- Buscar request
  SELECT * INTO req_row FROM company_requests WHERE id = request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;

  current_user_id := auth.uid();

  -- Inserir empresa
  INSERT INTO companies (
    name, username, email, phone, 
    address, cnpj, foundedon, owner_id,
    status, plantype, trialdays, trialstart, trialend
  ) VALUES (
    req_row.company_name,
    LOWER(approved_user),
    req_row.email,
    req_row.phone,
    req_row.address,
    req_row.cnpj,
    req_row.founded_on,
    current_user_id,
    'trial', 'trial', 30, NOW(), NOW() + INTERVAL '30 days'
  )
  RETURNING id INTO new_company_id;

  -- Atualizar request
  UPDATE company_requests
  SET 
    status = 'approved',
    approved = true,
    approved_at = NOW(),
    approved_username = approved_user,
    approved_temp_password = temp_pass,
    approved_company_id = new_company_id
  WHERE id = request_id;

  RETURN new_company_id;
END;
$$;

GRANT EXECUTE ON FUNCTION approve_company_request(UUID, TEXT, TEXT) TO authenticated;

-- Wrap notification in a DO block to avoid syntax error
DO $$
BEGIN
  RAISE NOTICE '✅ Função approve_company_request atualizada com sucesso.';
END $$;
