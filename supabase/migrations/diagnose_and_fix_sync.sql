-- ============================================================================
-- DIAGNÓSTICO E CORREÇÃO: Sync de Dados e Financial Goals
-- Execute este SQL no Supabase SQL Editor
-- Data: 2025-12-31
-- ============================================================================

-- 1. DIAGNÓSTICO: Verificar últimas transações no Supabase
SELECT 'Últimas 10 transações' as info;
SELECT id, date, type, amount_cents, description, updated_at 
FROM transactions 
WHERE company_id = '1f855ad8-6335-487a-868d-6b05cb5ae940'
ORDER BY date DESC, updated_at DESC 
LIMIT 10;

-- 2. DIAGNÓSTICO: Contar transações por dia (dezembro)
SELECT 'Transações por dia em dezembro' as info;
SELECT date, COUNT(*) as total, SUM(CASE WHEN type='income' THEN amount_cents ELSE 0 END)/100 as entradas_reais
FROM transactions 
WHERE company_id = '1f855ad8-6335-487a-868d-6b05cb5ae940'
  AND date >= '2025-12-01'
GROUP BY date
ORDER BY date DESC;

-- 3. DIAGNÓSTICO: Verificar se tabela financial_goals existe e seu schema
SELECT 'Schema da tabela financial_goals' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'financial_goals'
ORDER BY ordinal_position;

-- 4. DIAGNÓSTICO: Ver metas existentes
SELECT 'Metas existentes' as info;
SELECT * FROM financial_goals 
WHERE company_id = '1f855ad8-6335-487a-868d-6b05cb5ae940';

-- ============================================================================
-- SE A TABELA financial_goals NÃO EXISTE OU TEM SCHEMA ERRADO, EXECUTE ABAIXO:
-- ============================================================================

-- 5. RECRIAR financial_goals com schema correto (year/month INTEGER)
DROP TABLE IF EXISTS financial_goals CASCADE;

CREATE TABLE financial_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  target_amount_cents BIGINT NOT NULL DEFAULT 0,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,  -- 1-12
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, year, month)
);

-- Enable RLS
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;

-- Create simple permissive policy
DROP POLICY IF EXISTS "financial_goals_full_access" ON financial_goals;
CREATE POLICY "financial_goals_full_access" ON financial_goals
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON financial_goals TO authenticated;
GRANT ALL ON financial_goals TO anon;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP TRIGGER IF EXISTS update_financial_goals_updated_at ON financial_goals;
CREATE TRIGGER update_financial_goals_updated_at
  BEFORE UPDATE ON financial_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. INSERIR METAS DE TESTE (outubro, novembro, dezembro)
INSERT INTO financial_goals (company_id, year, month, target_amount_cents, description)
VALUES 
  ('1f855ad8-6335-487a-868d-6b05cb5ae940', 2025, 10, 700000, 'Meta Outubro 2025'),
  ('1f855ad8-6335-487a-868d-6b05cb5ae940', 2025, 11, 700000, 'Meta Novembro 2025'),
  ('1f855ad8-6335-487a-868d-6b05cb5ae940', 2025, 12, 700000, 'Meta Dezembro 2025')
ON CONFLICT (company_id, year, month) DO UPDATE SET
  target_amount_cents = EXCLUDED.target_amount_cents,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 7. VERIFICAÇÃO FINAL
SELECT '✅ Metas criadas/atualizadas:' as status;
SELECT year, month, target_amount_cents/100 as meta_reais, description
FROM financial_goals 
WHERE company_id = '1f855ad8-6335-487a-868d-6b05cb5ae940'
ORDER BY year, month;

SELECT '✅ Schema de financial_goals:' as status;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'financial_goals'
ORDER BY ordinal_position;
