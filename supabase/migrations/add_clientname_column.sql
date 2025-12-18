-- Migração: Adicionar coluna clientname na tabela transactions
-- Execute este SQL no editor SQL do Supabase

-- 1. Adicionar coluna clientname na tabela transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS clientname TEXT;

-- 2. Comentário para documentação
COMMENT ON COLUMN transactions.clientname IS 'Nome do cliente para transações de entrada (income)';

-- 3. Verificar se a coluna foi criada
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions' AND column_name = 'clientname';
