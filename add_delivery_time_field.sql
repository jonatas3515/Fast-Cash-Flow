-- Script para adicionar campo delivery_time à tabela orders existente
-- Execute este script APENAS se a tabela orders já existir e só precisar adicionar o campo delivery_time

-- Adicionar campo delivery_time se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'delivery_time'
    ) THEN
        ALTER TABLE orders ADD COLUMN delivery_time TEXT NOT NULL DEFAULT '14:00';
    END IF;
END $$;

-- Atualizar encomendas existentes com hora padrão se necessário
UPDATE orders SET delivery_time = '14:00' WHERE delivery_time IS NULL;

-- Confirmar que o campo foi adicionado
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'delivery_time';
