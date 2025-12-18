-- =====================================================
-- TABELA DE CUPONS FISCAIS - Fast Cash Flow
-- =====================================================
-- Execute este script no Supabase SQL Editor

-- 1. Criar tabela de cupons fiscais
CREATE TABLE IF NOT EXISTS public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Identificação
  receipt_number SERIAL, -- Número sequencial do cupom
  
  -- Cliente (opcional)
  client_id UUID REFERENCES public.clients(id),
  client_name TEXT,
  client_cpf_cnpj TEXT,
  
  -- Valores
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  discount_cents INTEGER DEFAULT 0,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  addition_cents INTEGER DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  
  -- Pagamento
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'debit', 'credit', 'pix', 'other')),
  payment_details TEXT, -- Detalhes adicionais do pagamento
  amount_received_cents INTEGER DEFAULT 0, -- Valor recebido (para calcular troco)
  change_cents INTEGER DEFAULT 0, -- Troco
  
  -- Status
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('draft', 'issued', 'cancelled')),
  cancelled_at TIMESTAMPTZ,
  cancelled_reason TEXT,
  
  -- Observações
  notes TEXT,
  footer_message TEXT,
  
  -- Soft delete
  deleted_at TIMESTAMPTZ,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar tabela de itens do cupom
CREATE TABLE IF NOT EXISTS public.receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,
  
  -- Produto (opcional - pode ser item avulso)
  product_id UUID REFERENCES public.products(id),
  
  -- Dados do item
  item_number INTEGER NOT NULL, -- Número sequencial do item no cupom
  code TEXT, -- Código do produto
  description TEXT NOT NULL,
  quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'UN',
  unit_price_cents INTEGER NOT NULL DEFAULT 0,
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Criar índices para receipts
CREATE INDEX IF NOT EXISTS idx_receipts_company ON public.receipts(company_id);
CREATE INDEX IF NOT EXISTS idx_receipts_number ON public.receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_receipts_client ON public.receipts(client_id);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON public.receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipts_created ON public.receipts(created_at);
CREATE INDEX IF NOT EXISTS idx_receipts_deleted ON public.receipts(deleted_at);

-- 4. Criar índices para receipt_items
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt ON public.receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_product ON public.receipt_items(product_id);

-- 5. Habilitar RLS
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_items ENABLE ROW LEVEL SECURITY;

-- 6. Remover políticas existentes
DROP POLICY IF EXISTS "receipts_select_policy" ON public.receipts;
DROP POLICY IF EXISTS "receipts_insert_policy" ON public.receipts;
DROP POLICY IF EXISTS "receipts_update_policy" ON public.receipts;
DROP POLICY IF EXISTS "receipts_delete_policy" ON public.receipts;

DROP POLICY IF EXISTS "receipt_items_select_policy" ON public.receipt_items;
DROP POLICY IF EXISTS "receipt_items_insert_policy" ON public.receipt_items;
DROP POLICY IF EXISTS "receipt_items_update_policy" ON public.receipt_items;
DROP POLICY IF EXISTS "receipt_items_delete_policy" ON public.receipt_items;

-- 7. Criar políticas RLS para receipts
CREATE POLICY "receipts_select_policy" ON public.receipts
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "receipts_insert_policy" ON public.receipts
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "receipts_update_policy" ON public.receipts
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "receipts_delete_policy" ON public.receipts
  FOR DELETE TO authenticated
  USING (true);

-- 8. Criar políticas RLS para receipt_items
CREATE POLICY "receipt_items_select_policy" ON public.receipt_items
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "receipt_items_insert_policy" ON public.receipt_items
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "receipt_items_update_policy" ON public.receipt_items
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "receipt_items_delete_policy" ON public.receipt_items
  FOR DELETE TO authenticated
  USING (true);

-- 9. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_receipts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS receipts_updated_at_trigger ON public.receipts;
CREATE TRIGGER receipts_updated_at_trigger
  BEFORE UPDATE ON public.receipts
  FOR EACH ROW
  EXECUTE FUNCTION update_receipts_updated_at();

-- 10. Verificar estrutura
SELECT 'receipts' as table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'receipts'
UNION ALL
SELECT 'receipt_items' as table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'receipt_items'
ORDER BY table_name, column_name;
