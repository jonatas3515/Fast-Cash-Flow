-- Script simples para criar tabela orders sem dependências
-- Execute este script primeiro no Supabase SQL Editor

-- 1. Criar tabela orders básica
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    client_name TEXT NOT NULL,
    order_type TEXT NOT NULL,
    delivery_date DATE NOT NULL,
    delivery_time TEXT NOT NULL DEFAULT '14:00',
    order_value_cents INTEGER NOT NULL CHECK (order_value_cents >= 0),
    down_payment_cents INTEGER NOT NULL DEFAULT 0 CHECK (down_payment_cents >= 0),
    remaining_value_cents INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Criar índices
CREATE INDEX IF NOT EXISTS idx_orders_company_id ON orders(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- 3. Habilitar RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 4. Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4b. Criar função para calcular remaining_value_cents
CREATE OR REPLACE FUNCTION calculate_remaining_value()
RETURNS TRIGGER AS $$
BEGIN
    NEW.remaining_value_cents = NEW.order_value_cents - NEW.down_payment_cents;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. Criar triggers
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS calculate_orders_remaining_value ON orders;
CREATE TRIGGER calculate_orders_remaining_value
    BEFORE INSERT OR UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION calculate_remaining_value();

-- 6. Política RLS básica - permitir tudo para usuários autenticados (temporário)
DROP POLICY IF EXISTS "Allow authenticated users full access" ON orders;
CREATE POLICY "Allow authenticated users full access" ON orders
    FOR ALL USING (auth.role() = 'authenticated');

-- 7. Verificar se funcionou
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;
