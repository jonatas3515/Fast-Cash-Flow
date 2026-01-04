-- CORREÇÃO COMPLETA DE RLS PARA TODAS AS TABELAS AFETADAS
-- O sistema usa autenticação customizada (company_requests), não auth.uid() nativo
-- Por isso, precisamos de políticas permissivas para usuários autenticados

-- =============================================
-- 1. TABELA: recurring_expenses
-- =============================================
DROP POLICY IF EXISTS "recurring_expenses_insert" ON recurring_expenses;
DROP POLICY IF EXISTS "recurring_expenses_select" ON recurring_expenses;
DROP POLICY IF EXISTS "recurring_expenses_update" ON recurring_expenses;
DROP POLICY IF EXISTS "recurring_expenses_delete" ON recurring_expenses;
DROP POLICY IF EXISTS "recurring_insert" ON recurring_expenses;
DROP POLICY IF EXISTS "recurring_select" ON recurring_expenses;
DROP POLICY IF EXISTS "recurring_update" ON recurring_expenses;
DROP POLICY IF EXISTS "recurring_delete" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can insert their own recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can view their own recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can update their own recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can delete their own recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "allow_all_recurring" ON recurring_expenses;
DROP POLICY IF EXISTS "allow_all" ON recurring_expenses;
DROP POLICY IF EXISTS "allow_authenticated_all" ON recurring_expenses;

ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_authenticated_all" ON recurring_expenses
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- =============================================
-- 2. TABELA: categories
-- =============================================
DROP POLICY IF EXISTS "categories_insert" ON categories;
DROP POLICY IF EXISTS "categories_select" ON categories;
DROP POLICY IF EXISTS "categories_update" ON categories;
DROP POLICY IF EXISTS "categories_delete" ON categories;
DROP POLICY IF EXISTS "Users can insert categories" ON categories;
DROP POLICY IF EXISTS "Users can view categories" ON categories;
DROP POLICY IF EXISTS "Users can update categories" ON categories;
DROP POLICY IF EXISTS "Users can delete categories" ON categories;
DROP POLICY IF EXISTS "allow_all" ON categories;
DROP POLICY IF EXISTS "allow_authenticated_all" ON categories;

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_authenticated_all" ON categories
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- =============================================
-- 3. TABELA: onboarding_progress (está dando 406)
-- =============================================
DROP POLICY IF EXISTS "allow_all" ON onboarding_progress;
DROP POLICY IF EXISTS "allow_authenticated_all" ON onboarding_progress;

ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_authenticated_all" ON onboarding_progress
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- =============================================
-- VERIFICAÇÃO DAS POLÍTICAS CRIADAS
-- =============================================
SELECT tablename, policyname, cmd, permissive 
FROM pg_policies 
WHERE tablename IN ('recurring_expenses', 'categories', 'onboarding_progress')
ORDER BY tablename;
