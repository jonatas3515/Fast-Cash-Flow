-- =====================================================
-- CONFIRMAR USUÁRIO ADMIN MANUALMENTE
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- Confirmar o email do usuário admin@fastcashflow.com
UPDATE auth.users
SET 
  email_confirmed_at = NOW()
WHERE email = 'admin@fastcashflow.com';

-- Verificar se foi confirmado
SELECT 
  id,
  email,
  email_confirmed_at,
  confirmed_at,
  created_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ CONFIRMADO'
    ELSE '❌ NÃO CONFIRMADO'
  END as status
FROM auth.users
WHERE email = 'admin@fastcashflow.com';

-- Resultado esperado: status = '✅ CONFIRMADO'
