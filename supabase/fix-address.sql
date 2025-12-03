-- =====================================================
-- ADICIONAR COLUNA ADDRESS
-- =====================================================

-- Adicionar coluna address em companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS address TEXT;

-- Verificar se foi adicionada
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'companies' AND column_name = 'address';

-- Se retornar 1 linha, funcionou!
SELECT 'Coluna address adicionada!' as status;
