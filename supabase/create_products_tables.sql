-- =====================================================
-- SISTEMA DE PRECIFICAÇÃO DE PRODUTOS
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- 1. Criar tabela de produtos
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    recipient_amount NUMERIC NOT NULL DEFAULT 1,
    recipient_unit TEXT NOT NULL DEFAULT 'unidades',
    production_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Custos
    total_ingredient_cost INTEGER NOT NULL DEFAULT 0,
    ingredient_cost_percent NUMERIC NOT NULL DEFAULT 25,
    labor_cost_percent NUMERIC NOT NULL DEFAULT 30,
    profit_margin_percent NUMERIC NOT NULL DEFAULT 100,
    
    -- Preços calculados (em centavos)
    cost_per_unit INTEGER NOT NULL DEFAULT 0,
    packaging_cost_per_unit INTEGER NOT NULL DEFAULT 0,
    final_sale_price INTEGER NOT NULL DEFAULT 0,
    ifood_basic_price INTEGER,
    ifood_partner_price INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar tabela de ingredientes dos produtos
CREATE TABLE IF NOT EXISTS product_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    package_weight NUMERIC NOT NULL DEFAULT 0,
    package_price INTEGER NOT NULL DEFAULT 0,
    used_amount NUMERIC NOT NULL DEFAULT 0,
    ingredient_cost INTEGER NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_production_date ON products(production_date);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_product_ingredients_product_id ON product_ingredients(product_id);

-- 4. DESABILITAR RLS (temporariamente, como as outras tabelas)
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_ingredients DISABLE ROW LEVEL SECURITY;

-- 5. Conceder permissões
GRANT ALL ON products TO authenticated;
GRANT ALL ON product_ingredients TO authenticated;

-- 6. Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Criar triggers para updated_at
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_ingredients_updated_at ON product_ingredients;
CREATE TRIGGER update_product_ingredients_updated_at
    BEFORE UPDATE ON product_ingredients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Verificar criação
SELECT 'Tabelas criadas com sucesso!' as status;

SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('products', 'product_ingredients')
    AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 9. Mostrar status RLS
SELECT 
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('products', 'product_ingredients', 'recurring_expenses', 'dashboard_settings');
