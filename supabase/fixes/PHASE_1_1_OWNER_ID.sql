-- ==============================================================
-- FASE 1.1: GARANTIR OWNER_ID (USERID) NA TABELA COMPANIES
-- Adaptação: Usando 'owner_id' pois já existe no banco (equivale ao userid do plano)
-- ==============================================================

-- 1. Garantir que a coluna existe
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'owner_id') THEN
    ALTER TABLE public.companies ADD COLUMN owner_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- 2. Popular owner_id para empresas existentes (Recuperação de vínculo)
UPDATE public.companies c
SET owner_id = u.id
FROM auth.users u
WHERE (c.email = u.email OR c.username = u.email OR c.username = split_part(u.email, '@', 1))
AND c.owner_id IS NULL;

-- 3. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_companies_owner_id ON public.companies(owner_id);

-- 4. Verificar resultado
SELECT 
  name, 
  username, 
  email, 
  owner_id,
  CASE 
    WHEN owner_id IS NULL THEN '❌ SEM VÍNCULO'
    ELSE '✅ VINCULADO'
  END AS status
FROM public.companies
ORDER BY name;
