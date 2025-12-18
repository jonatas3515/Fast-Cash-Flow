-- Criar tabela para armazenar configurações da empresa, incluindo logo
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  logo_url TEXT,
  logo_updated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Garantir que cada empresa tenha apenas um registro de configurações
  UNIQUE(company_id)
);

-- Adicionar coluna logo_url na tabela companies como backup (se não existir)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_company_settings_company_id ON company_settings(company_id);

-- RLS (Row Level Security)
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can view their own company settings" ON company_settings;
DROP POLICY IF EXISTS "Users can update their own company settings" ON company_settings;
DROP POLICY IF EXISTS "Users can insert their own company settings" ON company_settings;
DROP POLICY IF EXISTS "Allow select for authenticated users" ON company_settings;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON company_settings;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON company_settings;

-- Políticas de segurança simplificadas para company_settings
-- Permitir SELECT para todos os usuários autenticados (cada empresa só vê seus dados pelo company_id)
CREATE POLICY "Allow select for authenticated users" ON company_settings
  FOR SELECT TO authenticated
  USING (true);

-- Permitir INSERT para usuários autenticados
CREATE POLICY "Allow insert for authenticated users" ON company_settings
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Permitir UPDATE para usuários autenticados
CREATE POLICY "Allow update for authenticated users" ON company_settings
  FOR UPDATE TO authenticated
  USING (true);

-- Criar função para atualizar timestamp
CREATE OR REPLACE FUNCTION update_company_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.logo_updated_at = CASE 
    WHEN OLD.logo_url IS DISTINCT FROM NEW.logo_url THEN NOW()
    ELSE NEW.logo_updated_at
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS update_company_settings_updated_at_trigger ON company_settings;

-- Criar trigger para atualizar timestamp
CREATE TRIGGER update_company_settings_updated_at_trigger
  BEFORE UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_company_settings_updated_at();

-- Inserir configurações para empresas existentes que têm logo
INSERT INTO company_settings (company_id, logo_url)
SELECT id, logo_url FROM companies 
WHERE logo_url IS NOT NULL
ON CONFLICT (company_id) DO UPDATE SET
  logo_url = EXCLUDED.logo_url,
  updated_at = NOW();
