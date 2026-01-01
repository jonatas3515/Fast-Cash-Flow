-- ============================================================================
-- FIX: company_settings 406 Error + Transactions RLS for Neves & Costa
-- Data: 2026-01-01
-- Empresa: Neves & Costa (a3723c3c-3378-4f07-9153-bab3c9dc9dc5)
-- ============================================================================

-- DIAGNÓSTICO: Verificar se tabela existe
SELECT 
  'company_settings existe?' as check_type,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_settings') as result;

-- Verificar transações para Neves & Costa
SELECT 
  'Transações Neves & Costa' as query,
  COUNT(*) as total
FROM transactions 
WHERE company_id = 'a3723c3c-3378-4f07-9153-bab3c9dc9dc5';

-- ============================================================================
-- PARTE 1: Criar ou corrigir tabela company_settings
-- ============================================================================

-- Criar tabela SE NÃO EXISTIR
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id)
);

-- Habilitar RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_company_settings_company_id ON company_settings(company_id);

-- ============================================================================
-- PARTE 2: Corrigir RLS para company_settings (usando função SECURITY DEFINER)
-- ============================================================================

-- Remover políticas antigas
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'company_settings' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON company_settings', policy_record.policyname);
  END LOOP;
END $$;

-- Criar política simples usando função SECURITY DEFINER
CREATE POLICY company_settings_access ON company_settings
  FOR ALL
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM get_user_company_ids((SELECT auth.uid())))
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM get_user_company_ids((SELECT auth.uid())))
  );

-- ============================================================================
-- PARTE 3: Inserir registro de company_settings para Neves & Costa (se não existir)
-- ============================================================================

INSERT INTO company_settings (company_id, logo_url)
VALUES ('a3723c3c-3378-4f07-9153-bab3c9dc9dc5', NULL)
ON CONFLICT (company_id) DO NOTHING;

-- ============================================================================
-- PARTE 4: Verificar e corrigir RLS para transactions
-- ============================================================================

-- Verificar se função get_user_company_ids existe
SELECT 
  'Função get_user_company_ids existe?' as check_type,
  EXISTS (
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE p.proname = 'get_user_company_ids' AND n.nspname = 'public'
  ) as result;

-- Verificar policies da tabela transactions
SELECT 
  'Policies da tabela transactions' as info,
  policyname, 
  cmd
FROM pg_policies 
WHERE tablename = 'transactions' AND schemaname = 'public';

-- Função get_user_company_ids já existe e está sendo usada pelas policies
-- Verificação apenas (sem recriar)

-- ============================================================================
-- PARTE 5: Verificar se usuário está vinculado à empresa
-- ============================================================================

-- Verificar company_members para a empresa Neves & Costa
SELECT 
  'Membros da empresa Neves & Costa' as info,
  cm.id, 
  cm.user_id, 
  cm.company_id, 
  cm.status,
  u.email
FROM company_members cm
LEFT JOIN auth.users u ON u.id = cm.user_id
WHERE cm.company_id = 'a3723c3c-3378-4f07-9153-bab3c9dc9dc5';

-- Verificar se há dados na tabela companies para Neves & Costa
SELECT 
  'Dados da empresa Neves & Costa' as info,
  id, 
  name, 
  created_at
FROM companies 
WHERE id = 'a3723c3c-3378-4f07-9153-bab3c9dc9dc5';

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

SELECT 
  'Company Settings para Neves & Costa' as status,
  id,
  company_id,
  logo_url
FROM company_settings 
WHERE company_id = 'a3723c3c-3378-4f07-9153-bab3c9dc9dc5';

SELECT 
  'Total de transações por empresa' as info,
  company_id,
  COUNT(*) as total
FROM transactions 
GROUP BY company_id
ORDER BY total DESC;
