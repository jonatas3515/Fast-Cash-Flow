-- =====================================================
-- TABELA DE CLIENTES - Fast Cash Flow
-- =====================================================
-- Execute este script no Supabase SQL Editor

-- 1. Criar tabela de clientes
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Dados básicos
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'pf' CHECK (type IN ('pf', 'pj')), -- Pessoa Física ou Jurídica
  cpf_cnpj TEXT,
  rg_ie TEXT,
  
  -- Contato
  phone TEXT,
  email TEXT,
  whatsapp TEXT,
  
  -- Endereço
  cep TEXT,
  street TEXT,
  number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  
  -- Informações comerciais
  credit_limit_cents INTEGER DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  
  -- Estatísticas (calculadas)
  total_purchases INTEGER DEFAULT 0,
  total_spent_cents BIGINT DEFAULT 0,
  last_purchase_date TIMESTAMPTZ,
  
  -- Soft delete
  deleted_at TIMESTAMPTZ,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar índices
CREATE INDEX IF NOT EXISTS idx_clients_company ON public.clients(company_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_cpf_cnpj ON public.clients(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_deleted ON public.clients(deleted_at);

-- 3. Habilitar RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 4. Remover políticas existentes
DROP POLICY IF EXISTS "clients_select_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_insert_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_update_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_delete_policy" ON public.clients;

-- 5. Criar políticas RLS
CREATE POLICY "clients_select_policy" ON public.clients
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "clients_insert_policy" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "clients_update_policy" ON public.clients
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "clients_delete_policy" ON public.clients
  FOR DELETE TO authenticated
  USING (true);

-- 6. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clients_updated_at_trigger ON public.clients;
CREATE TRIGGER clients_updated_at_trigger
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION update_clients_updated_at();

-- 7. Verificar estrutura
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'clients'
ORDER BY ordinal_position;
