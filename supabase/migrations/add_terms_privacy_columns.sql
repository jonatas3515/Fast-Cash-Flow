-- ============================================================================
-- ADD: Colunas terms_of_use e privacy_policy na tabela landing_settings
-- Execute no SQL Editor do Supabase
-- ============================================================================

-- Adicionar coluna terms_of_use se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'landing_settings' 
        AND column_name = 'terms_of_use'
    ) THEN
        ALTER TABLE public.landing_settings 
        ADD COLUMN terms_of_use TEXT DEFAULT '';
        
        RAISE NOTICE 'Coluna terms_of_use adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna terms_of_use já existe.';
    END IF;
END;
$$;

-- Adicionar coluna privacy_policy se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'landing_settings' 
        AND column_name = 'privacy_policy'
    ) THEN
        ALTER TABLE public.landing_settings 
        ADD COLUMN privacy_policy TEXT DEFAULT '';
        
        RAISE NOTICE 'Coluna privacy_policy adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna privacy_policy já existe.';
    END IF;
END;
$$;

-- Verificação
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'landing_settings' 
AND column_name IN ('terms_of_use', 'privacy_policy', 'footer_logo_url');
