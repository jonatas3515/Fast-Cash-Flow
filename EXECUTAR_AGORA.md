# 🚨 EXECUTAR SQL AGORA - OBRIGATÓRIO

## ⚠️ Problema Atual

O botão "Excluir" não funciona porque as funções SQL ainda não existem no banco de dados.

## ✅ Solução (5 minutos)

### Passo 1: Abrir Supabase Dashboard

1. Acesse: https://app.supabase.com/
2. Faça login
3. Selecione seu projeto **Fast Cash Flow**

### Passo 2: Abrir SQL Editor

1. No menu lateral esquerdo, clique em **SQL Editor**
2. Clique em **New Query** (ou pressione Ctrl+Enter)

### Passo 3: Copiar e Colar o SQL

Copie TODO o conteúdo do arquivo:
```
supabase/add-soft-delete-companies.sql
```

**OU copie direto daqui:**

```sql
-- =====================================================
-- ADICIONAR SOFT DELETE PARA EMPRESAS
-- =====================================================

-- 1. Adicionar colunas para soft delete
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

-- 6. Verificar estrutura
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'companies'
  AND column_name IN ('deleted_at', 'deleted_by')
ORDER BY ordinal_position;
```

### Passo 4: Executar

1. Cole o SQL no editor
2. Clique em **RUN** (ou pressione F5)
3. Aguarde alguns segundos
4. Deve aparecer **"Success. No rows returned"** ou mostrar as colunas criadas

### Passo 5: Testar

1. Volte para a aplicação Fast Cash Flow
2. Recarregue a página (Ctrl+R ou F5)
3. Vá para Admin → Empresas
4. Clique em **Excluir** na empresa "Império Burguer"
5. Deve aparecer o modal de confirmação
6. Ao confirmar, empresa vai para aba "Excluídas"

---

## 🎯 Resultado Esperado

Após executar o SQL:

✅ Botão "Excluir" funcionará
✅ Modal de confirmação aparecerá
✅ Empresa será movida para aba "Excluídas"
✅ Botão "Reativar" estará disponível
✅ Contador de 90 dias aparecerá

---

## 🆘 Se Não Funcionar

1. **Verifique o console do navegador** (F12)
2. **Verifique se o SQL foi executado com sucesso**
3. **Recarregue a aplicação completamente** (Ctrl+Shift+R)
4. **Verifique se está logado como admin**

---

## 📝 Notas

- O SQL usa `IF NOT EXISTS` então é seguro executar múltiplas vezes
- As funções usam `SECURITY DEFINER` para funcionar corretamente
- Nenhum dado será perdido ao executar este SQL
- É apenas adicionar colunas e funções novas

---

**⏱️ Tempo estimado: 5 minutos**

**🚀 Execute agora para o botão funcionar!**
