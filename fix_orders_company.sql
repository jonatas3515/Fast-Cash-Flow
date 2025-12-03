-- Script para corrigir lançamentos de encomendas que foram criados com company_id errado
-- Execute este script no Supabase SQL Editor

-- 1. Primeiro, vamos identificar o company_id da FastSavory's
-- SELECT id, name FROM companies WHERE name ILIKE '%fastsavory%' OR name ILIKE '%fast savory%';

-- 2. Identificar o company_id do admin
-- SELECT id, name FROM companies WHERE name ILIKE '%admin%' OR name ILIKE '%fast cash flow%';

-- 3. Listar transações de encomendas que podem estar com company_id errado
-- SELECT t.id, t.description, t.company_id, c.name as company_name, t.amount_cents, t.date
-- FROM transactions t
-- LEFT JOIN companies c ON t.company_id = c.id
-- WHERE t.description LIKE '%Entrada de Encomenda%'
-- ORDER BY t.date DESC;

-- 4. Para corrigir, substitua os IDs abaixo pelos valores corretos:
-- UPDATE transactions 
-- SET company_id = 'ID_DA_FASTSAVORYS'
-- WHERE description LIKE '%Entrada de Encomenda%'
-- AND company_id = 'ID_DO_ADMIN';

-- Exemplo (substitua pelos IDs reais):
-- UPDATE transactions 
-- SET company_id = '123e4567-e89b-12d3-a456-426614174000'  -- ID da FastSavory's
-- WHERE description LIKE '%Entrada de Encomenda%'
-- AND company_id = '987fcdeb-51a2-3bc4-d567-890123456789';  -- ID do Admin
