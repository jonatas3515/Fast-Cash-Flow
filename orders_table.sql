-- Criar tabela de encomendas
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

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_orders_company_id ON orders(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Criar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger para atualizar updated_at automaticamente
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_orders_updated_at'
    ) THEN
        CREATE TRIGGER update_orders_updated_at
            BEFORE UPDATE ON orders
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Habilitar RLS (Row Level Security)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Criar política para que usuários autenticados só vejam encomendas da própria empresa
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'orders' AND policyname = 'Users can view orders from their company'
    ) THEN
        CREATE POLICY "Users can view orders from their company" ON orders
            FOR SELECT USING (
                company_id IN (
                    SELECT id FROM companies WHERE username = auth.jwt() ->> 'email' OR email = auth.jwt() ->> 'email'
                )
            );
    END IF;
END $$;

-- Criar política para que usuários autenticados só possam inserir encomendas na própria empresa
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'orders' AND policyname = 'Users can insert orders in their company'
    ) THEN
        CREATE POLICY "Users can insert orders in their company" ON orders
            FOR INSERT WITH CHECK (
                company_id IN (
                    SELECT id FROM companies WHERE username = auth.jwt() ->> 'email' OR email = auth.jwt() ->> 'email'
                )
            );
    END IF;
END $$;

-- Criar política para que usuários autenticados só possam atualizar encomendas da própria empresa
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'orders' AND policyname = 'Users can update orders from their company'
    ) THEN
        CREATE POLICY "Users can update orders from their company" ON orders
            FOR UPDATE USING (
                company_id IN (
                    SELECT id FROM companies WHERE username = auth.jwt() ->> 'email' OR email = auth.jwt() ->> 'email'
                )
            );
    END IF;
END $$;

-- Criar política para que usuários autenticados só possam excluir encomendas da própria empresa
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'orders' AND policyname = 'Users can delete orders from their company'
    ) THEN
        CREATE POLICY "Users can delete orders from their company" ON orders
            FOR DELETE USING (
                company_id IN (
                    SELECT id FROM companies WHERE username = auth.jwt() ->> 'email' OR email = auth.jwt() ->> 'email'
                )
            );
    END IF;
END $$;

-- Política para administradores (acesso total)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'orders' AND policyname = 'Admins have full access to orders'
    ) THEN
        CREATE POLICY "Admins have full access to orders" ON orders
            FOR ALL USING (
                auth.jwt() ->> 'email' = 'admin@fastcashflow.com'
            );
    END IF;
END $$;
