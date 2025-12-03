# 🔧 CORREÇÃO URGENTE - Problema de user_id

## ❌ Problema Identificado

O erro no console mostra:
```
[❌ SYNC] Erro: null value in column "user_id" of relation "transactions" violates not-null constraint
```

**Causa Raiz:** A tabela `transactions` no Supabase tem uma coluna `user_id` com restrição `NOT NULL`, mas o aplicativo não envia esse valor durante a sincronização. O app foi projetado para usar `company_id` para segregação de dados, não `user_id`.

## ✅ Solução

Execute o script SQL abaixo no **SQL Editor do Supabase** para remover a coluna `user_id`:

### Passo 1: Acessar SQL Editor

1. Acesse [Supabase Dashboard](https://app.supabase.com/)
2. Selecione seu projeto
3. No menu lateral, clique em **SQL Editor**

### Passo 2: Executar o Script

Cole e execute o seguinte SQL:

```sql
-- Remover coluna user_id da tabela transactions
ALTER TABLE public.transactions DROP COLUMN IF EXISTS user_id;

-- Verificar estrutura
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'transactions'
ORDER BY ordinal_position;
```

### Passo 3: Verificar o Resultado

Após executar, você deve ver a lista de colunas da tabela `transactions` **SEM** a coluna `user_id`. As colunas devem ser:

- ✅ `id` (TEXT)
- ✅ `company_id` (UUID)
- ✅ `type` (TEXT)
- ✅ `date` (TEXT)
- ✅ `time` (TEXT)
- ✅ `datetime` (TEXT)
- ✅ `description` (TEXT)
- ✅ `category` (TEXT)
- ✅ `amount_cents` (INTEGER)
- ✅ `source_device` (TEXT)
- ✅ `version` (INTEGER)
- ✅ `updated_at` (TEXT)
- ✅ `deleted_at` (TEXT)
- ✅ `created_at` (TIMESTAMPTZ)

## 🧪 Teste Após Correção

1. **Recarregue a aplicação** (Ctrl+R no navegador ou reabra o app mobile)
2. **Crie uma nova transação** no dispositivo móvel
3. **Verifique os logs** - você deve ver:
   ```
   [🔄 SYNC] Push concluído com sucesso!
   ```
4. **Abra o desktop** - a transação deve aparecer automaticamente

## 📊 RLS Policies

As políticas de RLS (Row Level Security) devem usar `company_id` para controle de acesso. Se você ainda tem políticas baseadas em `user_id`, elas serão automaticamente desativadas ao remover a coluna.

As políticas corretas já estão no arquivo `fix-complete-realtime-rls.sql` e usam `company_id`.

## 🆘 Problemas?

Se após executar o script você ainda tiver erros:

1. **Verifique se o script foi executado com sucesso** (deve mostrar "Success. No rows returned")
2. **Recarregue a aplicação completamente**
3. **Limpe os registros dirty** antigos se necessário:
   ```sql
   -- Apenas se necessário: limpar registros que falharam
   DELETE FROM public.transactions WHERE created_at < NOW() - INTERVAL '1 day';
   ```

## 📝 Notas Técnicas

- O app usa `company_id` para multi-tenancy, não `user_id`
- Cada empresa tem seu próprio conjunto de transações
- A autenticação é por empresa, não por usuário individual
- O `user_id` era um resíduo de um esquema anterior incompatível
