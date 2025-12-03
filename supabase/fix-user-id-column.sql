-- =====================================================
-- FIX USER_ID COLUMN IN TRANSACTIONS TABLE
-- =====================================================
-- Este script corrige o problema onde a coluna user_id 
-- é obrigatória mas o app não envia esse valor.
-- O app usa company_id para segregação de dados.
-- =====================================================

-- OPÇÃO 1: Remover a coluna user_id (RECOMENDADO)
-- Se você não usa autenticação por usuário individual
ALTER TABLE public.transactions DROP COLUMN IF EXISTS user_id;

-- OPÇÃO 2: Tornar user_id opcional (caso você queira manter a coluna)
-- Descomente as linhas abaixo se preferir manter a coluna:
-- ALTER TABLE public.transactions ALTER COLUMN user_id DROP NOT NULL;
-- ALTER TABLE public.transactions ALTER COLUMN user_id DROP DEFAULT;

-- Verificar estrutura final
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'transactions'
ORDER BY ordinal_position;
