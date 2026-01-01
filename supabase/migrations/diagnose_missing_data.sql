-- ============================================================================
-- DIAGNÓSTICO: Por que os dados não estão aparecendo?
-- Execute este script no Supabase SQL Editor
-- ============================================================================

-- 1. Verificar se existem registros em company_members
SELECT 'company_members' as tabela, COUNT(*) as total FROM company_members;

-- 2. Ver os registros de company_members
SELECT id, company_id, user_id, email, status, created_at 
FROM company_members 
ORDER BY created_at DESC 
LIMIT 20;

-- 3. Verificar se a função get_user_companies existe e funciona
-- (Isso vai falhar se a função não existir)
SELECT * FROM get_user_companies();

-- 4. Verificar transações existentes
SELECT 'transactions' as tabela, COUNT(*) as total FROM transactions;

-- 5. Verificar se existem dados nas tabelas principais
SELECT 'debts' as tabela, COUNT(*) as total FROM debts
UNION ALL
SELECT 'orders' as tabela, COUNT(*) as total FROM orders
UNION ALL
SELECT 'products' as tabela, COUNT(*) as total FROM products
UNION ALL
SELECT 'categories' as tabela, COUNT(*) as total FROM categories
UNION ALL
SELECT 'recurring_expenses' as tabela, COUNT(*) as total FROM recurring_expenses;

-- 6. Verificar companies existentes
SELECT id, name, username, email, status, created_at 
FROM companies 
ORDER BY created_at DESC 
LIMIT 10;

-- 7. POSSÍVEL PROBLEMA: Se auth.uid() não corresponder ao user_id em company_members
-- Vamos checar o mapeamento atual
SELECT 
  cm.id,
  cm.company_id,
  cm.user_id,
  cm.email,
  c.name as company_name,
  c.username as company_username
FROM company_members cm
JOIN companies c ON cm.company_id = c.id
WHERE cm.status = 'active';

-- ============================================================================
-- SE OS DADOS EXISTEM MAS NÃO APARECEM, O PROBLEMA É A FUNÇÃO get_user_companies()
-- ============================================================================

-- 8. Testar a função diretamente (execute logado como o usuário afetado)
-- Substitua 'SEU_USER_ID_AQUI' pelo user_id do auth.users
-- SELECT * FROM get_user_company_ids('SEU_USER_ID_AQUI');

-- ============================================================================
-- FIX ALTERNATIVO: Se o problema for que company_members não tem os registros certos
-- ============================================================================

-- 9. Verificar se há empresas sem membros ativos
SELECT c.id, c.name, c.username, c.owner_id
FROM companies c
LEFT JOIN company_members cm ON c.id = cm.company_id AND cm.status = 'active'
WHERE cm.id IS NULL
AND c.deleted_at IS NULL;

-- 10. Se houver empresas sem membros, podemos criar os registros automaticamente:
-- (Descomente e execute se necessário)
/*
INSERT INTO company_members (company_id, user_id, email, name, status, role_id)
SELECT 
  c.id as company_id,
  c.owner_id as user_id,
  c.email,
  c.name,
  'active' as status,
  (SELECT id FROM user_roles WHERE key = 'owner' LIMIT 1) as role_id
FROM companies c
LEFT JOIN company_members cm ON c.id = cm.company_id AND cm.status = 'active'
WHERE cm.id IS NULL
  AND c.deleted_at IS NULL
  AND c.owner_id IS NOT NULL
ON CONFLICT (company_id, email) DO NOTHING;
*/
