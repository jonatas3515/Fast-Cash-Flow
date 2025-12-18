
SELECT id, name, username, email, owner_id, created_at, status 
FROM companies 
WHERE name ILIKE '%Neve%' OR name ILIKE '%Costa%';
