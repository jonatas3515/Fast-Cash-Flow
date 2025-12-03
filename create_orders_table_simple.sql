-- Script simplificado para criar tabela orders se não existir
-- Execute este se precisar apenas criar a tabela sem erros de políticas/triggers

-- Criar tabela de encomendas (só se não existir)
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
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

-- Criar índices (só se não existirem)
CREATE INDEX IF NOT EXISTS idx_orders_company_id ON orders(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Habilitar RLS (só se não estiver habilitado)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'orders' AND rowsecurity = true
    ) THEN
        ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Confirmar que a tabela foi criada
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_name = 'orders';
