-- ============================================================================
-- FIX: Erro 406 em company_settings
-- Executar passo a passo no SQL Editor do Supabase
-- ============================================================================

-- PASSO 1: Verificar se a tabela existe
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'company_settings'
) as tabela_existe;

-- Se a tabela NÃO existir, execute o PASSO 2. Se existir, pule para PASSO 3.

-- ============================================================================
-- PASSO 2: Criar a tabela company_settings (somente se não existir)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id)
);

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_company_settings_company_id ON public.company_settings(company_id);

-- ============================================================================
-- PASSO 3: Habilitar RLS e verificar policies
-- ============================================================================
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Listar policies existentes
SELECT policyname, cmd FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'company_settings';

-- ============================================================================
-- PASSO 4: Se não houver policies ou estiverem com problema, criar nova
-- Primeiro remova a policy existente se houver conflito
-- ============================================================================

-- Opção A: Remover policy específica (substitua 'nome_da_policy' pelo nome real)
-- DROP POLICY IF EXISTS "company_settings_access" ON company_settings;

-- Opção B: Policy simples para todos os membros autenticados verem suas empresas
-- Primeiro tenta dropar se existir, depois cria
DROP POLICY IF EXISTS "company_settings_select_policy" ON public.company_settings;

CREATE POLICY "company_settings_select_policy"
ON public.company_settings
FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT cm.company_id 
    FROM public.company_members cm 
    WHERE cm.user_id = auth.uid() AND cm.status = 'active'
  )
);

-- ============================================================================
-- PASSO 5: Inserir registro para Neves & Costa
-- ============================================================================
INSERT INTO public.company_settings (company_id, logo_url)
VALUES ('a3723c3c-3378-4f07-9153-bab3c9dc9dc5', NULL)
ON CONFLICT (company_id) DO NOTHING;

-- ============================================================================
-- PASSO 6: Verificar resultado
-- ============================================================================
SELECT * FROM public.company_settings 
WHERE company_id = 'a3723c3c-3378-4f07-9153-bab3c9dc9dc5';

-- Verificar se há transações para esta empresa
SELECT COUNT(*) as total_transactions 
FROM public.transactions 
WHERE company_id = 'a3723c3c-3378-4f07-9153-bab3c9dc9dc5';
