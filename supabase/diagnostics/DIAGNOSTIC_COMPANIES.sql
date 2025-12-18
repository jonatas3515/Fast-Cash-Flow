
-- Listar todas as empresas para identificar duplicatas
SELECT 
    id, 
    name, 
    username, 
    email, 
    owner_id, 
    created_at, 
    status,
    (SELECT COUNT(*) FROM transactions t WHERE t.company_id = c.id) as transaction_count
FROM 
    companies c
ORDER BY 
    name, created_at;
