-- Criar tabela company_profile para armazenar perfil do negócio
CREATE TABLE IF NOT EXISTS company_profile (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  business_type TEXT NOT NULL CHECK (business_type IN ('commerce', 'services', 'food', 'freelancer', 'mei', 'other')),
  monthly_revenue_range TEXT NOT NULL CHECK (monthly_revenue_range IN ('up_to_5k', '5k_to_20k', 'above_20k')),
  main_goal TEXT NOT NULL CHECK (main_goal IN ('control_debts', 'organize_cash_flow', 'save_investments', 'avoid_delays')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id)
);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_company_profile_company_id ON company_profile(company_id);

-- Habilitar RLS (Row Level Security)
ALTER TABLE company_profile ENABLE ROW LEVEL SECURITY;

-- Políticas RLS seguindo o mesmo padrão das outras tabelas

-- Admin pode ver todos os perfis
CREATE POLICY "Admin can view all company profiles"
  ON company_profile FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'admin@fastcashflow.com'
  );

-- Admin pode inserir perfis
CREATE POLICY "Admin can insert company profiles"
  ON company_profile FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'email' = 'admin@fastcashflow.com'
  );

-- Admin pode atualizar perfis
CREATE POLICY "Admin can update company profiles"
  ON company_profile FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'admin@fastcashflow.com'
  );

-- Admin pode deletar perfis
CREATE POLICY "Admin can delete company profiles"
  ON company_profile FOR DELETE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'admin@fastcashflow.com'
  );

-- Empresas podem ver apenas seu próprio perfil
CREATE POLICY "Companies can view own profile"
  ON company_profile FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies 
      WHERE username = (auth.jwt() ->> 'email')::text
      OR email = (auth.jwt() ->> 'email')::text
    )
  );

-- Empresas podem inserir seu próprio perfil
CREATE POLICY "Companies can insert own profile"
  ON company_profile FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies 
      WHERE username = (auth.jwt() ->> 'email')::text
      OR email = (auth.jwt() ->> 'email')::text
    )
  );

-- Empresas podem atualizar seu próprio perfil
CREATE POLICY "Companies can update own profile"
  ON company_profile FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies 
      WHERE username = (auth.jwt() ->> 'email')::text
      OR email = (auth.jwt() ->> 'email')::text
    )
  );

-- Empresas podem deletar seu próprio perfil
CREATE POLICY "Companies can delete own profile"
  ON company_profile FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies 
      WHERE username = (auth.jwt() ->> 'email')::text
      OR email = (auth.jwt() ->> 'email')::text
    )
  );

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_company_profile_updated_at 
    BEFORE UPDATE ON company_profile 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
