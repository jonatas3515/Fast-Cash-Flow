-- =====================================================
-- TABELA TEAM_MEMBERS - Membros da Equipe
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- 1. Criar tabela team_members
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role_key TEXT NOT NULL DEFAULT 'viewer',
  role_name TEXT NOT NULL DEFAULT 'Visualizador',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended')),
  phone TEXT,
  notes TEXT,
  last_access_at TIMESTAMPTZ,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 2. Criar índices
CREATE INDEX IF NOT EXISTS idx_team_members_company_id ON team_members(company_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);

-- 3. Desabilitar RLS (como outras tabelas do sistema)
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;

-- 4. Conceder permissões
GRANT ALL ON team_members TO authenticated;
GRANT ALL ON team_members TO anon;

-- 5. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_team_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_team_members_updated_at ON team_members;
CREATE TRIGGER trigger_team_members_updated_at
  BEFORE UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_team_members_updated_at();

-- 6. Verificar criação
SELECT 'Tabela team_members criada com sucesso!' as status;

-- Mostrar estrutura
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'team_members'
ORDER BY ordinal_position;
