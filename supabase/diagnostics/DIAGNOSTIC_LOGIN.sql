-- =====================================================
-- DIAGNÓSTICO DE LOGIN - NEVES & COSTA
-- =====================================================

-- 1. Verificar tabela COMPANIES
SELECT id, name, username, email, owner_id, status 
FROM public.companies 
WHERE name ILIKE '%Neves%' OR username ILIKE '%neves%';

-- 2. Verificar tabela COMPANY_REQUESTS (usada para login)
SELECT id, company_name, email, status, approved_username, temp_password, permanent_password, approved_company_id
FROM public.company_requests 
WHERE company_name ILIKE '%Neves%' OR approved_username ILIKE '%neves%';

-- 3. Verificar usuários do AUTH (apenas contagem e emails parecidos)
SELECT id, email, last_sign_in_at
FROM auth.users
WHERE email ILIKE '%neves%';
