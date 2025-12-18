-- Migração: copiar segmento da solicitação para a empresa ao aprovar

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
  new_company_id UUID;
  req RECORD;
BEGIN
  -- Verificar se é admin
  IF auth.jwt() ->> 'email' != 'admin@fastcashflow.com' THEN
    RAISE EXCEPTION 'Unauthorized: Only admin can approve requests';
  END IF;

  -- Buscar a solicitação
  SELECT * INTO req FROM public.company_requests WHERE id = request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  -- Criar a empresa com trial de 30 dias
  INSERT INTO public.companies (
    name,
    username,
    email,
    phone,
    address,
    cnpj,
    founded_on,
    segment,
    status,
    plan_type,
    trial_days,
    trial_start,
    trial_end
  ) VALUES (
    req.company_name,
    approved_user,
    req.email,
    req.phone,
    req.address,
    req.cnpj,
    req.founded_on,
    req.segment,
    'trial',
    'trial',
    30,
    NOW(),
    NOW() + INTERVAL '30 days'
  ) RETURNING id INTO new_company_id;

  -- Atualizar a solicitação
  UPDATE public.company_requests
  SET
    approved = true,
    approved_at = NOW(),
    approved_by = auth.jwt() ->> 'email',
    approved_username = approved_user,
    approved_temp_password = temp_pass,
    updated_at = NOW()
  WHERE id = request_id;

  RETURN new_company_id;
END;
$$;

GRANT EXECUTE ON FUNCTION approve_company_request(UUID, TEXT, TEXT) TO authenticated;
