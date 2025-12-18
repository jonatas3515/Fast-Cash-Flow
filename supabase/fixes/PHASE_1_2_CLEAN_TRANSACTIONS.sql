-- ==============================================================
-- FASE 1.2: REMOVER USER_ID DA TABELA TRANSACTIONS
-- Adaptação: Usando 'company_id' e 'user_id' conforme schema atual
-- ==============================================================

-- Remover coluna user_id (não é mais usada, pois usamos company_id)
ALTER TABLE public.transactions 
  DROP COLUMN IF EXISTS user_id;

-- Verificar estrutura final
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'transactions'
ORDER BY ordinal_position;
