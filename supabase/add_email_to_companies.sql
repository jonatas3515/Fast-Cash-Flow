-- Adicionar coluna email na tabela companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email TEXT;

-- Atualizar email da FastSavory's se existir
UPDATE companies 
SET email = 'contato@fastsavorys.com.br'
WHERE LOWER(name) = 'fastsavory''s' OR LOWER(name) = 'fastsavorys';

-- Criar índice para busca por email
CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email) WHERE email IS NOT NULL;
