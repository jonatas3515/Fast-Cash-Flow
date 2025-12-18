-- =====================================================
-- TABELA DE PRODUTOS - Fast Cash Flow
-- =====================================================
-- Execute este script no Supabase SQL Editor

-- 1. Criar tabela de produtos (se não existir)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Adicionar colunas que podem não existir
DO $$ 
BEGIN
  -- Identificação
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'code') THEN
    ALTER TABLE public.products ADD COLUMN code TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'barcode') THEN
    ALTER TABLE public.products ADD COLUMN barcode TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'description') THEN
    ALTER TABLE public.products ADD COLUMN description TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'category') THEN
    ALTER TABLE public.products ADD COLUMN category TEXT;
  END IF;
  
  -- Precificação
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'cost_cents') THEN
    ALTER TABLE public.products ADD COLUMN cost_cents INTEGER NOT NULL DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'price_cents') THEN
    ALTER TABLE public.products ADD COLUMN price_cents INTEGER NOT NULL DEFAULT 0;
  END IF;
  
  -- Estoque
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'stock_quantity') THEN
    ALTER TABLE public.products ADD COLUMN stock_quantity INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'min_stock') THEN
    ALTER TABLE public.products ADD COLUMN min_stock INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'unit') THEN
    ALTER TABLE public.products ADD COLUMN unit TEXT DEFAULT 'UN';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'track_stock') THEN
    ALTER TABLE public.products ADD COLUMN track_stock BOOLEAN DEFAULT true;
  END IF;
  
  -- Detalhes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'weight_kg') THEN
    ALTER TABLE public.products ADD COLUMN weight_kg DECIMAL(10,3);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'height_cm') THEN
    ALTER TABLE public.products ADD COLUMN height_cm DECIMAL(10,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'width_cm') THEN
    ALTER TABLE public.products ADD COLUMN width_cm DECIMAL(10,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'length_cm') THEN
    ALTER TABLE public.products ADD COLUMN length_cm DECIMAL(10,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'image_url') THEN
    ALTER TABLE public.products ADD COLUMN image_url TEXT;
  END IF;
  
  -- Fornecedor
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'supplier_name') THEN
    ALTER TABLE public.products ADD COLUMN supplier_name TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'supplier_phone') THEN
    ALTER TABLE public.products ADD COLUMN supplier_phone TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'last_purchase_date') THEN
    ALTER TABLE public.products ADD COLUMN last_purchase_date TIMESTAMPTZ;
  END IF;
  
  -- Status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'status') THEN
    ALTER TABLE public.products ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'featured') THEN
    ALTER TABLE public.products ADD COLUMN featured BOOLEAN DEFAULT false;
  END IF;
  
  -- Estatísticas
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'total_sold') THEN
    ALTER TABLE public.products ADD COLUMN total_sold INTEGER DEFAULT 0;
  END IF;
  
  -- Soft delete
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'deleted_at') THEN
    ALTER TABLE public.products ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
END $$;

-- 3. Criar índices (apenas se as colunas existirem)
CREATE INDEX IF NOT EXISTS idx_products_company ON public.products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);
CREATE INDEX IF NOT EXISTS idx_products_code ON public.products(code);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_deleted ON public.products(deleted_at);

-- 3. Habilitar RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 4. Remover políticas existentes
DROP POLICY IF EXISTS "products_select_policy" ON public.products;
DROP POLICY IF EXISTS "products_insert_policy" ON public.products;
DROP POLICY IF EXISTS "products_update_policy" ON public.products;
DROP POLICY IF EXISTS "products_delete_policy" ON public.products;

-- 5. Criar políticas RLS
CREATE POLICY "products_select_policy" ON public.products
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "products_insert_policy" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "products_update_policy" ON public.products
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "products_delete_policy" ON public.products
  FOR DELETE TO authenticated
  USING (true);

-- 6. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_updated_at_trigger ON public.products;
CREATE TRIGGER products_updated_at_trigger
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION update_products_updated_at();

-- 7. Verificar estrutura
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'products'
ORDER BY ordinal_position;
