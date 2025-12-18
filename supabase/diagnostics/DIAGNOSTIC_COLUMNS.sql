
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_name IN ('transactions', 'companies') 
    AND column_name LIKE 'company%'
ORDER BY 
    table_name, column_name;
