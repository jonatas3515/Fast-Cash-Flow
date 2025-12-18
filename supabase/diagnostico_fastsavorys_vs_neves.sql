-- =====================================================
-- DIAGNÓSTICO: FastSavorys vs Neves & Costa
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- 1. COMPARAR ESTRUTURA DAS EMPRESAS
SELECT 
  id,
  name,
  username,
  email,
  status,
  trial_end,
  created_at,
  logo_url,
  phone
FROM companies 
WHERE name IN ('FastSavorys', 'Neves & Costa')
ORDER BY name;

-- 2. VERIFICAR USUÁRIOS ASSOCIADOS
SELECT 
  u.id as user_id,
  u.email as user_email,
  u.created_at as user_created,
  c.name as company_name,
  c.id as company_id
FROM auth.users u
LEFT JOIN companies c ON c.email = u.email OR c.username = LOWER(SPLIT_PART(u.email, '@', 1))
WHERE c.name IN ('FastSavorys', 'Neves & Costa')
ORDER BY c.name;

-- 3. CONTAR TRANSAÇÕES DE CADA EMPRESA
SELECT 
  c.name as company_name,
  COUNT(t.id) as total_transactions,
  COUNT(CASE WHEN t.type = 'income' THEN 1 END) as income_count,
  COUNT(CASE WHEN t.type = 'expense' THEN 1 END) as expense_count,
  MAX(t.created_at) as last_transaction,
  MAX(t.updated_at) as last_updated
FROM companies c
LEFT JOIN transactions t ON t.company_id = c.id
WHERE c.name IN ('FastSavorys', 'Neves & Costa')
GROUP BY c.name
ORDER BY c.name;

-- 4. VERIFICAR POLÍTICAS RLS NA TABELA TRANSACTIONS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'transactions'
ORDER BY policyname;

-- 5. VERIFICAR SE HÁ DIFERENÇA NOS IDs DAS EMPRESAS
SELECT 
  name,
  id,
  LENGTH(id) as id_length,
  id::text LIKE '%-%' as has_dashes
FROM companies 
WHERE name IN ('FastSavorys', 'Neves & Costa')
ORDER BY name;

-- 6. VERIFICAR TRANSAÇÕES RECENTES DE CADA EMPRESA (últimas 5)
SELECT 
  c.name as company_name,
  t.id,
  t.type,
  t.date,
  t.amount_cents,
  t.description,
  t.created_at,
  t.updated_at,
  t.source_device
FROM transactions t
JOIN companies c ON c.id = t.company_id
WHERE c.name IN ('FastSavorys', 'Neves & Costa')
ORDER BY c.name, t.created_at DESC
LIMIT 10;

-- 7. VERIFICAR SE HÁ CONSTRAINTS DIFERENTES
SELECT 
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'transactions'
ORDER BY tc.constraint_type, tc.constraint_name;

-- 8. VERIFICAR PERMISSÕES DO USUÁRIO AUTENTICADO
-- (Execute isso logado como cada usuário)
SELECT 
  current_user as postgres_user,
  auth.uid() as supabase_user_id,
  auth.email() as supabase_email;

-- 9. TESTAR INSERT MANUAL (para ver se há erro de permissão)
-- IMPORTANTE: Substitua os valores antes de executar
/*
INSERT INTO transactions (
  id,
  company_id,
  type,
  date,
  datetime,
  amount_cents,
  description,
  version,
  updated_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name = 'FastSavorys'),
  'income',
  CURRENT_DATE,
  NOW(),
  10000,
  'Teste manual Android',
  1,
  NOW()
);
*/

-- 10. VERIFICAR SE HÁ TRIGGERS DIFERENTES
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'transactions'
ORDER BY trigger_name;
