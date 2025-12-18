-- =====================================================
-- CORREÇÃO DE POLÍTICAS RLS PARA TODAS AS TABELAS
-- Execute este SQL no editor SQL do Supabase
-- =====================================================

-- 1. TABELA: financial_goals
-- Habilitar RLS se não estiver habilitado
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes (se houver)
DROP POLICY IF EXISTS "financial_goals_select" ON financial_goals;
DROP POLICY IF EXISTS "financial_goals_insert" ON financial_goals;
DROP POLICY IF EXISTS "financial_goals_update" ON financial_goals;
DROP POLICY IF EXISTS "financial_goals_delete" ON financial_goals;
DROP POLICY IF EXISTS "Allow all for financial_goals" ON financial_goals;

-- Criar política permissiva para todas as operações
CREATE POLICY "Allow all for financial_goals" ON financial_goals
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 2. TABELA: transactions
-- Verificar se RLS está habilitado
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes
DROP POLICY IF EXISTS "transactions_select" ON transactions;
DROP POLICY IF EXISTS "transactions_insert" ON transactions;
DROP POLICY IF EXISTS "transactions_update" ON transactions;
DROP POLICY IF EXISTS "transactions_delete" ON transactions;
DROP POLICY IF EXISTS "Allow all for transactions" ON transactions;

-- Criar política permissiva
CREATE POLICY "Allow all for transactions" ON transactions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. TABELA: debts
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for debts" ON debts;
CREATE POLICY "Allow all for debts" ON debts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. TABELA: companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for companies" ON companies;
CREATE POLICY "Allow all for companies" ON companies
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5. TABELA: dashboard_settings
ALTER TABLE dashboard_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for dashboard_settings" ON dashboard_settings;
CREATE POLICY "Allow all for dashboard_settings" ON dashboard_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. TABELA: categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for categories" ON categories;
CREATE POLICY "Allow all for categories" ON categories
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 7. TABELA: recurring_expenses
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for recurring_expenses" ON recurring_expenses;
CREATE POLICY "Allow all for recurring_expenses" ON recurring_expenses
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 8. TABELA: admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for admin_users" ON admin_users;
CREATE POLICY "Allow all for admin_users" ON admin_users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

-- Verificar políticas criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verificar se RLS está habilitado nas tabelas
SELECT 
  relname as table_name,
  relrowsecurity as rls_enabled
FROM pg_class
WHERE relname IN ('transactions', 'financial_goals', 'debts', 'companies', 'dashboard_settings', 'categories', 'recurring_expenses', 'admin_users')
ORDER BY relname;
