-- ============================================================================
-- ADD: Coluna footer_logo_url na tabela landing_settings
-- Execute no SQL Editor do Supabase
-- ============================================================================

-- Adicionar coluna footer_logo_url se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'landing_settings' 
        AND column_name = 'footer_logo_url'
    ) THEN
        ALTER TABLE public.landing_settings 
        ADD COLUMN footer_logo_url TEXT DEFAULT 'https://i.im.ge/2025/12/20/BSwhSJ.JNC.png';
        
        RAISE NOTICE 'Coluna footer_logo_url adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna footer_logo_url já existe.';
    END IF;
END;
$$;

-- Verificação
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'landing_settings' 
AND column_name IN ('footer_year', 'footer_company_text', 'footer_logo_url');
