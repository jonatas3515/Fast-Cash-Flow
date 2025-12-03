# 🔧 Solução dos 3 Problemas

## Problema 1: ❌ Cadastro Não Funciona

**Erro**: "Falha ao enviar solicitação"

### Solução:

Execute o script `supabase/fix-cadastro.sql` no SQL Editor:

```sql
-- Desabilitar RLS temporariamente (OPÇÃO RÁPIDA)
ALTER TABLE public.company_requests DISABLE ROW LEVEL SECURITY;
```

**OU** manter RLS com política correta:

```sql
-- Remover políticas antigas
DROP POLICY IF EXISTS "Anyone can submit company request" ON public.company_requests;
DROP POLICY IF EXISTS "Public can create requests" ON public.company_requests;
DROP POLICY IF EXISTS "Public can insert requests" ON public.company_requests;

-- Criar política que permite INSERT público
CREATE POLICY "allow_public_insert"
  ON public.company_requests
  FOR INSERT
  TO public
  WITH CHECK (true);
```

### Testar:

1. Execute o script acima
2. Recarregue o app (F5)
3. Tente cadastrar novamente
4. Deve aparecer: **"Sua solicitação foi enviada com sucesso. Responderemos em até 48h úteis."**

---

## Problema 2: 🔄 Lançamentos Não Sincronizam Entre Dispositivos

**Sintoma**: Lançamento feito no notebook não aparece no celular

### Causa:

O Supabase Realtime não está habilitado para a tabela `transactions`.

### Solução:

#### Passo 1: Habilitar Realtime no Supabase

1. Vá no **Supabase Dashboard**
2. Clique em **Database** → **Replication**
3. Procure a tabela **`transactions`**
4. **Habilite** o toggle ao lado (deve ficar verde)
5. Salve

#### Passo 2: Verificar no SQL Editor

Execute este comando para confirmar:

```sql
-- Ver tabelas com realtime habilitado
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- Deve aparecer: public | transactions
```

#### Passo 3: Habilitar Manualmente (se necessário)

Se não aparecer, execute:

```sql
-- Habilitar realtime para transactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;

-- Verificar
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

### Testar:

1. **Notebook**: Faça um lançamento
2. **Celular**: Aguarde 5 segundos
3. **Celular**: Puxe para baixo para atualizar
4. Deve aparecer o lançamento automaticamente

---

## Problema 3: 📊 Lançamentos Estão no Supabase Mas Não Aparecem no App

**Sintoma**: Dados existem no Supabase mas não aparecem no app

### Causa:

O `company_id` pode estar NULL ou incorreto nos lançamentos.

### Solução:

#### Verificar company_id:

```sql
-- Ver lançamentos sem company_id
SELECT id, description, amount_cents, company_id, source_device
FROM transactions
WHERE company_id IS NULL
ORDER BY created_at DESC
LIMIT 10;
```

#### Corrigir company_id:

```sql
-- Pegar o ID da FastSavorys
SELECT id, name, username FROM companies WHERE username = 'fastsavorys';

-- Copie o ID e use abaixo (substitua 'ID-AQUI')
UPDATE transactions
SET company_id = 'ID-DA-FASTSAVORYS-AQUI'
WHERE company_id IS NULL
  AND source_device = 'web';

-- Verificar
SELECT COUNT(*) as total_corrigidos
FROM transactions
WHERE company_id IS NOT NULL;
```

### Forçar Sincronização no App:

1. **Feche o app completamente**
2. **Abra novamente**
3. **Faça login**
4. **Aguarde 5 segundos**
5. **Puxe para baixo** na tela de lançamentos

---

## 🚀 Script Completo de Correção

Execute tudo de uma vez no SQL Editor:

```sql
-- 1. CORRIGIR CADASTRO
ALTER TABLE public.company_requests DISABLE ROW LEVEL SECURITY;

-- 2. HABILITAR REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;

-- 3. CORRIGIR COMPANY_ID (substitua o ID)
-- Primeiro, pegue o ID da FastSavorys:
SELECT id FROM companies WHERE username = 'fastsavorys';

-- Depois, atualize (SUBSTITUA o ID abaixo):
-- UPDATE transactions SET company_id = 'SEU-ID-AQUI' WHERE company_id IS NULL;

-- 4. VERIFICAR
SELECT 
  'Cadastro: RLS desabilitado' as status_cadastro,
  (SELECT COUNT(*) FROM pg_publication_tables WHERE tablename = 'transactions') as realtime_habilitado,
  (SELECT COUNT(*) FROM transactions WHERE company_id IS NOT NULL) as lancamentos_com_company_id;
```

---

## ✅ Checklist Final

- [ ] Cadastro funciona (mensagem de sucesso aparece)
- [ ] Realtime habilitado no Supabase
- [ ] Lançamentos têm `company_id` preenchido
- [ ] Sincronização funciona entre dispositivos
- [ ] Admin consegue ver solicitações na aba "Solicitações"

---

## 🔍 Diagnóstico Adicional

Se ainda não funcionar, execute e me envie o resultado:

```sql
-- Diagnóstico completo
SELECT 
  'CADASTRO' as tipo,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'company_requests') as total_policies,
  (SELECT pg_table_is_visible('company_requests'::regclass)) as tabela_visivel;

SELECT 
  'REALTIME' as tipo,
  (SELECT COUNT(*) FROM pg_publication_tables WHERE tablename = 'transactions') as realtime_habilitado;

SELECT 
  'DADOS' as tipo,
  (SELECT COUNT(*) FROM transactions) as total_lancamentos,
  (SELECT COUNT(*) FROM transactions WHERE company_id IS NOT NULL) as com_company_id,
  (SELECT COUNT(*) FROM transactions WHERE company_id IS NULL) as sem_company_id;

SELECT 
  'EMPRESAS' as tipo,
  (SELECT COUNT(*) FROM companies) as total_empresas,
  (SELECT name FROM companies LIMIT 1) as primeira_empresa;
```

---

## 📞 Se Precisar de Ajuda

Me envie:
1. Print do erro de cadastro (se houver)
2. Resultado do diagnóstico SQL acima
3. Console do navegador (F12) ao tentar cadastrar

---

**Última atualização**: Novembro 2025
