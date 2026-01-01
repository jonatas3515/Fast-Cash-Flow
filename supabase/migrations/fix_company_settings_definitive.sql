-- ============================================================================
-- FIX DEFINITIVO: Limpar todas as policies de company_settings e criar uma única
-- Execute no SQL Editor do Supabase
-- ============================================================================

-- PASSO 1: Ver todas as policies existentes
SELECT policyname, cmd, roles FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'company_settings';

-- PASSO 2: Dropar TODAS as policies existentes
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'company_settings'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.company_settings', policy_record.policyname);
    RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
  END LOOP;
END $$;

-- PASSO 3: Garantir que RLS está habilitado
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- PASSO 4: Criar UMA ÚNICA policy simples para ALL (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "company_settings_all_access"
ON public.company_settings
FOR ALL
TO authenticated
USING (
  company_id IN (
    SELECT cm.company_id 
    FROM public.company_members cm 
    WHERE cm.user_id = auth.uid() AND cm.status = 'active'
  )
)
WITH CHECK (
  company_id IN (
    SELECT cm.company_id 
    FROM public.company_members cm 
    WHERE cm.user_id = auth.uid() AND cm.status = 'active'
  )
);

-- PASSO 5: Verificar que só existe UMA policy agora
SELECT policyname, cmd, roles FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'company_settings';

-- PASSO 6: Inserir registro para Neves & Costa (se não existir)
INSERT INTO public.company_settings (company_id, logo_url)
VALUES ('a3723c3c-3378-4f07-9153-bab3c9dc9dc5', NULL)
ON CONFLICT (company_id) DO NOTHING;

-- PASSO 7: Testar acesso direto (bypass RLS para verificar dados)
SELECT * FROM public.company_settings;
