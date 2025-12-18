-- =====================================================
-- DIAGNÓSTICO E CORREÇÃO: Empresa "Neves & Costa"
-- Execute este SQL no editor SQL do Supabase
-- =====================================================

-- =====================================================
-- PARTE 1: DIAGNÓSTICO
-- =====================================================

-- 1. Verificar como a empresa está cadastrada
SELECT id, name, username, status, trial_end, created_at 
FROM companies 
WHERE name ILIKE '%neves%' OR name ILIKE '%costa%' OR username ILIKE '%neves%';

-- 2. Verificar TODAS as empresas cadastradas
SELECT id, name, username, status, created_at
FROM companies
ORDER BY created_at DESC;

-- 3. Verificar transações por empresa
SELECT 
  c.name as empresa,
  c.id as company_id,
  COUNT(t.id) as total_transacoes,
  SUM(CASE WHEN t.type = 'income' THEN t.amount_cents ELSE 0 END) / 100.0 as total_entradas,
  SUM(CASE WHEN t.type = 'expense' THEN t.amount_cents ELSE 0 END) / 100.0 as total_saidas
FROM companies c
LEFT JOIN transactions t ON t.company_id = c.id AND t.deleted_at IS NULL
GROUP BY c.id, c.name
ORDER BY c.name;

-- 4. Verificar se existem transações com company_id NULL ou incorreto
SELECT t.id, t.description, t.date, t.company_id, c.name as company_name
FROM transactions t
LEFT JOIN companies c ON t.company_id = c.id
WHERE t.company_id IS NULL 
   OR t.company_id NOT IN (SELECT id FROM companies)
LIMIT 50;

-- 5. Verificar metas financeiras por empresa
SELECT 
  c.name as empresa,
  fg.month,
  fg.target_amount_cents / 100.0 as meta_reais,
  fg.created_at
FROM financial_goals fg
JOIN companies c ON fg.company_id = c.id
ORDER BY c.name, fg.month DESC;

-- 6. Verificar políticas RLS ativas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 7. Verificar se RLS está habilitado nas tabelas
SELECT 
  relname as table_name,
  relrowsecurity as rls_enabled
FROM pg_class
WHERE relname IN ('transactions', 'financial_goals', 'debts', 'companies')
ORDER BY relname;

-- =====================================================
-- PARTE 2: CORREÇÕES DE RLS (EXECUTE ESTAS!)
-- =====================================================

-- Habilitar RLS e criar políticas permissivas para transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for transactions" ON transactions;
CREATE POLICY "Allow all for transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);

-- Habilitar RLS e criar políticas permissivas para financial_goals
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for financial_goals" ON financial_goals;
CREATE POLICY "Allow all for financial_goals" ON financial_goals FOR ALL USING (true) WITH CHECK (true);

-- Habilitar RLS e criar políticas permissivas para debts
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for debts" ON debts;
CREATE POLICY "Allow all for debts" ON debts FOR ALL USING (true) WITH CHECK (true);

-- Habilitar RLS e criar políticas permissivas para companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for companies" ON companies;
CREATE POLICY "Allow all for companies" ON companies FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- PARTE 3: VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar se as políticas foram criadas corretamente
SELECT 
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('transactions', 'financial_goals', 'debts', 'companies')
ORDER BY tablename;
