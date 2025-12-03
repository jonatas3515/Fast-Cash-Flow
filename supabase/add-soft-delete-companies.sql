-- =====================================================
-- ADICIONAR SOFT DELETE PARA EMPRESAS
-- =====================================================
-- Este script adiciona suporte para exclusão lógica (soft delete)
-- com período de retenção de 90 dias antes da exclusão definitiva
-- =====================================================

-- 1. Remover constraint antigo e adicionar novo com 'deleted'
ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_status_check;
ALTER TABLE public.companies ADD CONSTRAINT companies_status_check 
  CHECK (status IN ('active', 'trial', 'blocked', 'expired', 'deleted'));

-- 2. Adicionar colunas para soft delete
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS deleted_by TEXT NULL;

-- 2. Criar índice para consultas de empresas excluídas
CREATE INDEX IF NOT EXISTS idx_companies_deleted_at ON public.companies(deleted_at);

-- 3. Criar função para soft delete
CREATE OR REPLACE FUNCTION soft_delete_company(target_company_id UUID, admin_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.companies
  SET 
    deleted_at = NOW(),
    deleted_by = admin_email,
    status = 'deleted'
  WHERE id = target_company_id;
END;
$$;

-- 4. Criar função para reativar empresa
CREATE OR REPLACE FUNCTION reactivate_company(target_company_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.companies
  SET 
    deleted_at = NULL,
    deleted_by = NULL,
    status = 'active'
  WHERE id = target_company_id;
END;
$$;

-- 5. Criar função para limpar empresas excluídas há mais de 90 dias
CREATE OR REPLACE FUNCTION cleanup_old_deleted_companies()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Deletar empresas que foram excluídas há mais de 90 dias
  WITH deleted_companies AS (
    DELETE FROM public.companies
    WHERE deleted_at IS NOT NULL
      AND deleted_at < NOW() - INTERVAL '90 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted_companies;
  
  RETURN deleted_count;
END;
$$;

-- 6. Comentários nas funções
COMMENT ON FUNCTION soft_delete_company IS 'Marca uma empresa como excluída (soft delete) com timestamp e usuário que excluiu';
COMMENT ON FUNCTION reactivate_company IS 'Reativa uma empresa que foi excluída (remove soft delete)';
COMMENT ON FUNCTION cleanup_old_deleted_companies IS 'Remove permanentemente empresas excluídas há mais de 90 dias';

-- 7. Verificar estrutura
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'companies'
  AND column_name IN ('deleted_at', 'deleted_by')
ORDER BY ordinal_position;
