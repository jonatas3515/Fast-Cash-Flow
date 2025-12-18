
-- Diagnóstico específico para Neves & Costa
SELECT 
    c.id, 
    c.name, 
    c.username, 
    c.email, 
    c.owner_id, 
    c.created_at,
    (SELECT COUNT(*) FROM transactions t WHERE t.company_id = c.id) as tx_count,
    (SELECT COUNT(*) FROM companies) as total_companies
FROM 
    companies c
WHERE 
    c.name ILIKE '%Neves%' OR c.username ILIKE '%neves%';
