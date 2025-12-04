-- Criar tabela de categorias personalizadas
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense', 'both')),
  icon VARCHAR(50) DEFAULT 'pricetag-outline',
  color VARCHAR(20) DEFAULT '#6366f1',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_categories_company_id ON categories(company_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);

-- RLS (Row Level Security)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Política de leitura
CREATE POLICY "Users can view their company categories"
  ON categories FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

-- Política de inserção
CREATE POLICY "Users can create categories for their company"
  ON categories FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

-- Política de atualização
CREATE POLICY "Users can update their company categories"
  ON categories FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

-- Política de deleção
CREATE POLICY "Users can delete their company categories"
  ON categories FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
    AND is_default = false
  );

-- Inserir categorias padrão (executar apenas uma vez para cada empresa)
-- Nota: Você pode executar isso manualmente para empresas existentes, 
-- ou adicionar lógica no app para criar essas categorias quando uma nova empresa é registrada

COMMENT ON TABLE categories IS 'Categorias personalizadas de receitas e despesas por empresa';
