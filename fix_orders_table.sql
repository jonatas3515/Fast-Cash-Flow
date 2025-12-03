-- Script para corrigir e criar tabela orders
-- Execute este script no Supabase SQL Editor

-- 1. Criar tabela orders se não existir
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    client_name TEXT NOT NULL,
    order_type TEXT NOT NULL,
    delivery_date DATE NOT NULL,
    delivery_time TEXT NOT NULL DEFAULT '14:00',
    order_value_cents INTEGER NOT NULL CHECK (order_value_cents >= 0),
    down_payment_cents INTEGER NOT NULL DEFAULT 0 CHECK (down_payment_cents >= 0),
    remaining_value_cents INTEGER GENERATED ALWAYS AS (order_value_cents - down_payment_cents) STORED,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_orders_company_id ON orders(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- 3. Habilitar RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 4. Criar função para atualizar updated_at se não existir
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. Criar trigger se não existir
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Criar políticas RLS se não existirem
DROP POLICY IF EXISTS "Users can view orders from their company" ON orders;
CREATE POLICY "Users can view orders from their company" ON orders
    FOR SELECT USING (
        company_id IN (
            SELECT id FROM companies WHERE username = auth.jwt() ->> 'email' OR email = auth.jwt() ->> 'email'
        )
    );

DROP POLICY IF EXISTS "Users can insert orders in their company" ON orders;
CREATE POLICY "Users can insert orders in their company" ON orders
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT id FROM companies WHERE username = auth.jwt() ->> 'email' OR email = auth.jwt() ->> 'email'
        )
    );

DROP POLICY IF EXISTS "Users can update orders from their company" ON orders;
CREATE POLICY "Users can update orders from their company" ON orders
    FOR UPDATE USING (
        company_id IN (
            SELECT id FROM companies WHERE username = auth.jwt() ->> 'email' OR email = auth.jwt() ->> 'email'
        )
    );

DROP POLICY IF EXISTS "Users can delete orders from their company" ON orders;
CREATE POLICY "Users can delete orders from their company" ON orders
    FOR DELETE USING (
        company_id IN (
            SELECT id FROM companies WHERE username = auth.jwt() ->> 'email' OR email = auth.jwt() ->> 'email'
        )
    );

DROP POLICY IF EXISTS "Admins have full access to orders" ON orders;
CREATE POLICY "Admins have full access to orders" ON orders
    FOR ALL USING (
        auth.jwt() ->> 'email' = 'admin@fastcashflow.com'
    );

-- 7. Verificar se a tabela foi criada corretamente
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;
