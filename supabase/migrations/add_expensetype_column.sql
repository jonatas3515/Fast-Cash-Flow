-- =====================================================
-- MIGRAÇÃO: Separar Fluxo de Caixa Real de Dívidas
-- Adicionar campo expensetype para separar despesas 
-- operacionais de retiradas de sócio
-- Execute este SQL no editor SQL do Supabase
-- =====================================================

-- 1. Adicionar coluna expensetype na tabela transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS expensetype TEXT DEFAULT 'operational';

-- 2. Comentário explicativo
COMMENT ON COLUMN transactions.expensetype IS 'Tipo de saída: operational (despesa operacional) ou withdrawal (retirada de sócio)';

-- 3. Atualizar transações existentes que são retiradas (baseado na categoria/descrição)
UPDATE transactions 
SET expensetype = 'withdrawal' 
WHERE type = 'expense' 
  AND (
    category ILIKE '%retirada%' 
    OR category ILIKE '%sócio%' 
    OR category ILIKE '%socio%'
    OR description ILIKE '%retirada%sócio%'
    OR description ILIKE '%retirada%socio%'
    OR description ILIKE '%pro labore%'
    OR description ILIKE '%pró-labore%'
  );

-- 4. Verificar resultado
SELECT 
  expensetype,
  COUNT(*) as total_transacoes,
  SUM(amount_cents) / 100.0 as valor_total_reais
FROM transactions
WHERE type = 'expense'
GROUP BY expensetype;

-- =====================================================
-- CONSULTAS ÚTEIS PARA RELATÓRIOS
-- =====================================================

-- Saldo em Caixa por empresa (Entradas - Saídas Efetivas)
-- Nota: Isso NÃO inclui dívidas pendentes, apenas transações efetivas
SELECT 
  c.name as empresa,
  SUM(CASE WHEN t.type = 'income' THEN t.amount_cents ELSE 0 END) / 100.0 as entradas,
  SUM(CASE WHEN t.type = 'expense' THEN t.amount_cents ELSE 0 END) / 100.0 as saidas,
  (SUM(CASE WHEN t.type = 'income' THEN t.amount_cents ELSE 0 END) - 
   SUM(CASE WHEN t.type = 'expense' THEN t.amount_cents ELSE 0 END)) / 100.0 as saldo_caixa
FROM companies c
LEFT JOIN transactions t ON t.company_id = c.id AND t.deleted_at IS NULL
GROUP BY c.id, c.name
ORDER BY c.name;

-- Total de Dívidas Pendentes por empresa
SELECT 
  c.name as empresa,
  SUM((d.installment_count - d.paid_installments) * d.installment_cents) / 100.0 as dividas_pendentes
FROM companies c
LEFT JOIN debts d ON d.company_id = c.id
GROUP BY c.id, c.name
ORDER BY c.name;

-- Retiradas de Sócio por empresa (mês atual)
SELECT 
  c.name as empresa,
  SUM(t.amount_cents) / 100.0 as retiradas_mes
FROM companies c
LEFT JOIN transactions t ON t.company_id = c.id 
  AND t.type = 'expense' 
  AND t.expensetype = 'withdrawal'
  AND t.deleted_at IS NULL
  AND t.date >= DATE_TRUNC('month', CURRENT_DATE)::text
GROUP BY c.id, c.name
ORDER BY c.name;
