-- =====================================================
-- FIX: Remover trigger que chama função inexistente
-- Erro: function update_onboarding_progress(uuid) does not exist
-- =====================================================

-- 1. Listar triggers na tabela transactions para diagnóstico
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'transactions';

-- 2. Remover trigger problemático (se existir)
DROP TRIGGER IF EXISTS on_transaction_insert ON transactions;
DROP TRIGGER IF EXISTS on_transaction_update ON transactions;
DROP TRIGGER IF EXISTS update_onboarding_on_transaction ON transactions;
DROP TRIGGER IF EXISTS trigger_update_onboarding_progress ON transactions;

-- 3. Dropar função existente e recriar
DROP FUNCTION IF EXISTS update_onboarding_progress(uuid);

-- 4. Criar função dummy para evitar erro (caso seja chamada de outro lugar)
CREATE OR REPLACE FUNCTION update_onboarding_progress(user_uuid uuid)
RETURNS void AS $$
BEGIN
  -- Função dummy - não faz nada
  -- Pode ser implementada futuramente para tracking de onboarding
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Verificar se há outros triggers
SELECT 
    tgname as trigger_name,
    proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'transactions';

-- =====================================================
-- RESULTADO ESPERADO:
-- Após executar, o sync deve funcionar normalmente
-- =====================================================
