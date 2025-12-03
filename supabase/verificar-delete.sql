-- =====================================================
-- VERIFICAR E CORRIGIR FUNÇÃO DELETE_COMPANY_CASCADE
-- =====================================================

-- 1. Verificar se a função existe
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'delete_company_cascade';

-- 2. Verificar estrutura das tabelas relacionadas
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('companies', 'transactions', 'payments', 'company_requests')
  AND column_name = 'company_id'
ORDER BY table_name, ordinal_position;

-- 3. Recriar a função delete_company_cascade
DROP FUNCTION IF EXISTS public.delete_company_cascade(UUID);

CREATE OR REPLACE FUNCTION public.delete_company_cascade(target_company_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  company_count INTEGER;
  transactions_count INTEGER;
  payments_count INTEGER;
  requests_count INTEGER;
BEGIN
  -- Verificar se é admin
  IF auth.jwt() ->> 'email' != 'admin@fastcashflow.com' THEN
    RETURN QUERY SELECT FALSE, 'Unauthorized: Only admin can delete companies';
    RETURN;
  END IF;

  -- Contar registros para feedback
  SELECT COUNT(*) INTO company_count FROM companies WHERE id = target_company_id;
  
  IF company_count = 0 THEN
    RETURN QUERY SELECT FALSE, 'Company not found';
    RETURN;
  END IF;

  -- Deletar em cascata (ordem inversa das dependências)
  
  -- 1. Deletar transações
  DELETE FROM transactions WHERE company_id = target_company_id;
  GET DIAGNOSTICS transactions_count = ROW_COUNT;
  
  -- 2. Deletar pagamentos
  DELETE FROM payments WHERE company_id = target_company_id;
  GET DIAGNOSTICS payments_count = ROW_COUNT;
  
  -- 3. Deletar solicitações
  DELETE FROM company_requests WHERE approved = true AND approved_username = (
    SELECT username FROM companies WHERE id = target_company_id
  );
  GET DIAGNOSTICS requests_count = ROW_COUNT;
  
  -- 4. Deletar a empresa
  DELETE FROM companies WHERE id = target_company_id;
  
  -- Retornar sucesso
  RETURN QUERY SELECT TRUE, format('Company deleted successfully. Removed: %d transactions, %d payments, %d requests', 
    transactions_count, payments_count, requests_count);
END;
$$;

-- 4. Dar permissão para executar
GRANT EXECUTE ON FUNCTION public.delete_company_cascade(UUID) TO authenticated;

-- 5. Verificar se foi criada
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'delete_company_cascade';

SELECT '✅ Função delete_company_cascade corrigida!' as status;
