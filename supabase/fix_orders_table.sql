-- =====================================================
-- FIX ORDERS TABLE - Adicionar coluna deleted_at
-- =====================================================
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se a tabela orders existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                 WHERE table_schema = 'public' 
                 AND table_name = 'orders') THEN
    -- Criar tabela orders se não existir
    CREATE TABLE public.orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
      
      -- Dados do pedido
      client_name TEXT NOT NULL,
      order_type TEXT NOT NULL,
      delivery_date TEXT NOT NULL, -- YYYY-MM-DD
      delivery_time TEXT, -- HH:MM
      
      -- Valores
      order_value_cents INTEGER NOT NULL DEFAULT 0,
      down_payment_cents INTEGER NOT NULL DEFAULT 0,
      remaining_value_cents INTEGER NOT NULL DEFAULT 0,
      
      -- Status
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
      
      -- Notas
      notes TEXT,
      
      -- Soft delete
      deleted_at TIMESTAMPTZ,
      
      -- Auditoria
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    RAISE NOTICE 'Tabela orders criada com sucesso!';
  ELSE
    RAISE NOTICE 'Tabela orders já existe.';
  END IF;
END $$;

-- 2. Adicionar coluna deleted_at se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'orders' 
                 AND column_name = 'deleted_at') THEN
    ALTER TABLE public.orders ADD COLUMN deleted_at TIMESTAMPTZ;
    RAISE NOTICE 'Coluna deleted_at adicionada à tabela orders!';
  ELSE
    RAISE NOTICE 'Coluna deleted_at já existe na tabela orders.';
  END IF;
END $$;

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_orders_company ON public.orders(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON public.orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_deleted ON public.orders(deleted_at);

-- 4. Habilitar RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 5. Remover políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "orders_select_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_update_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_delete_policy" ON public.orders;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.orders;
DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.orders;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.orders;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.orders;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON public.orders;

-- 6. Criar políticas RLS
CREATE POLICY "orders_select_policy" ON public.orders
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "orders_insert_policy" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "orders_update_policy" ON public.orders
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "orders_delete_policy" ON public.orders
  FOR DELETE TO authenticated
  USING (true);

-- 7. Criar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_updated_at_trigger ON public.orders;
CREATE TRIGGER orders_updated_at_trigger
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

-- 8. Verificar estrutura final
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'orders'
ORDER BY ordinal_position;
