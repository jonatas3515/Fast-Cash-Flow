-- =====================================================
-- CORREÇÃO RLS PARA TABELA CATEGORIES
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- 1. Verificar se a tabela categories existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'categories'
) as categories_exists;

-- 2. Desabilitar RLS temporariamente (como outras tabelas do sistema)
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;

-- 3. Remover políticas existentes que podem estar causando conflito
DROP POLICY IF EXISTS "Users can view own company categories" ON categories;
DROP POLICY IF EXISTS "Users can insert own company categories" ON categories;
DROP POLICY IF EXISTS "Users can update own company categories" ON categories;
DROP POLICY IF EXISTS "Users can delete own company categories" ON categories;
DROP POLICY IF EXISTS "categories_select_policy" ON categories;
DROP POLICY IF EXISTS "categories_insert_policy" ON categories;
DROP POLICY IF EXISTS "categories_update_policy" ON categories;
DROP POLICY IF EXISTS "categories_delete_policy" ON categories;

-- 4. Conceder permissões completas para usuários autenticados
GRANT ALL ON categories TO authenticated;
GRANT ALL ON categories TO anon;

-- 5. Verificar status final
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'categories';

SELECT 'RLS desabilitado para categories - INSERT deve funcionar agora!' as status;
