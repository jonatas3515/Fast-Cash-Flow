-- =====================================================
-- FUNÇÃO PARA LIBERAR PERÍODO GRÁTIS
-- =====================================================

-- Criar função para adicionar tempo grátis ao trial
DROP FUNCTION IF EXISTS public.add_free_trial(UUID, INTEGER, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.add_free_trial(
  company_id UUID,
  days INTEGER DEFAULT 0,
  months INTEGER DEFAULT 0,
  years INTEGER DEFAULT 0
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  company_record RECORD;
  total_days INTEGER;
  new_trial_end TIMESTAMPTZ;
BEGIN
  -- Verificar se é admin
  IF auth.jwt() ->> 'email' != 'admin@fastcashflow.com' THEN
    RETURN QUERY SELECT FALSE, 'Unauthorized: Only admin can add free trial';
    RETURN;
  END IF;

  -- Buscar a empresa
  SELECT * INTO company_record FROM companies WHERE id = company_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Company not found';
    RETURN;
  END IF;

  -- Calcular total de dias a adicionar
  total_days := days + (months * 30) + (years * 365);
  
  IF total_days <= 0 THEN
    RETURN QUERY SELECT FALSE, 'Invalid trial period';
    RETURN;
  END IF;

  -- Calcular nova data de fim do trial
  -- Se o trial já expirou, começa de hoje; senão, adiciona ao fim atual
  IF company_record.trial_end IS NULL OR company_record.trial_end < NOW() THEN
    new_trial_end := NOW() + INTERVAL '1 day' * total_days;
  ELSE
    new_trial_end := company_record.trial_end + INTERVAL '1 day' * total_days;
  END IF;

  -- Atualizar a empresa
  UPDATE companies 
  SET 
    trial_end = new_trial_end,
    trial_days = total_days,
    status = 'trial',
    updated_at = NOW()
  WHERE id = company_id;

  -- Retornar sucesso
  RETURN QUERY SELECT TRUE, format('Período grátis de %d dias adicionado com sucesso! Novo fim do trial: %s', 
    total_days, to_char(new_trial_end, 'DD/MM/YYYY'));
END;
$$;

-- Dar permissão para executar
GRANT EXECUTE ON FUNCTION public.add_free_trial(UUID, INTEGER, INTEGER, INTEGER) TO authenticated;

-- Verificar se foi criada
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'add_free_trial';

SELECT '✅ Função add_free_trial criada!' as status;
