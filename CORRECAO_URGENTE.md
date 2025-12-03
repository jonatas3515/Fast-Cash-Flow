# 🚨 CORREÇÃO URGENTE - Fast Cash Flow

## Problemas Identificados

1. ❌ **Botão Excluir não funciona** - Empresas Neves & Costa e Império Burguer não podem ser excluídas
2. ❌ **Cadastro não funciona** - Erro 400 ao tentar cadastrar nova empresa
3. ❌ **Login com erro 400** - Provider de Email não está configurado

---

## 🔧 SOLUÇÃO RÁPIDA (5 minutos)

### Passo 1: Executar Script de Correção

1. Abra o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Abra o arquivo `supabase/fix-urgent.sql`
4. **Copie TODO o conteúdo**
5. **Cole no SQL Editor**
6. Clique em **Run** (ou Ctrl+Enter)

✅ Isso vai:
- Excluir as empresas Neves & Costa e Império Burguer
- Corrigir as políticas RLS do cadastro
- Deixar apenas a FastSavorys

### Passo 2: Habilitar Provider de Email

1. No Supabase, vá em **Authentication** → **Providers**
2. Procure por **Email**
3. Certifique-se que está **HABILITADO** (toggle verde)
4. **DESABILITE** a opção "Confirm email" (para testes)
5. Clique em **Save**

### Passo 3: Criar Usuário Admin no Auth

O admin precisa existir no Supabase Auth:

1. Vá em **Authentication** → **Users**
2. Clique em **Add user** → **Create new user**
3. Preencha:
   - **Email**: `admin@fastcashflow.com`
   - **Password**: `fastcashflow`
   - **Auto Confirm User**: ✅ **MARQUE ESTA OPÇÃO**
4. Clique em **Create user**

### Passo 4: Testar

1. **Recarregue a página** do app (F5)
2. **Teste o cadastro**:
   - Clique em "Teste 30 dias grátis"
   - Preencha os dados
   - Envie
   - Deve aparecer mensagem de sucesso
3. **Teste o login admin**:
   - Usuário: `jonatas`
   - Senha: `fastcashflow`
   - Deve entrar no painel admin

---

## 📋 Verificação Pós-Correção

Execute no SQL Editor para verificar:

```sql
-- Ver empresas restantes (deve ter apenas FastSavorys)
SELECT id, name, username, status FROM companies;

-- Ver políticas do company_requests
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'company_requests';

-- Testar insert (deve funcionar)
INSERT INTO company_requests (company_name, owner_name, phone, email)
VALUES ('Teste Insert', 'Owner Teste', '73999999999', 'teste@teste.com');

-- Se funcionou, delete o teste
DELETE FROM company_requests WHERE company_name = 'Teste Insert';
```

---

## 🐛 Se Ainda Não Funcionar

### Problema: Cadastro ainda dá erro 400

**Causa**: Tabela `company_requests` pode ter colunas obrigatórias faltando

**Solução**: Execute no SQL Editor:

```sql
-- Ver estrutura da tabela
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'company_requests'
ORDER BY ordinal_position;

-- Tornar colunas opcionais se necessário
ALTER TABLE company_requests ALTER COLUMN email DROP NOT NULL;
ALTER TABLE company_requests ALTER COLUMN address DROP NOT NULL;
ALTER TABLE company_requests ALTER COLUMN cnpj DROP NOT NULL;
```

### Problema: Login ainda dá erro 400

**Causa**: Usuário não existe no Supabase Auth

**Solução**:
1. Vá em Authentication → Users
2. Procure por `admin@fastcashflow.com`
3. Se não existir, crie conforme Passo 3 acima
4. Se existir mas não funciona, **delete** e crie novamente

### Problema: Botão Excluir ainda não funciona

**Causa**: Function RPC não tem permissão

**Solução**: Execute no SQL Editor:

```sql
-- Dar permissão para executar a function
GRANT EXECUTE ON FUNCTION delete_company_cascade(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_company_cascade(uuid) TO anon;

-- Verificar se a function existe
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'delete_company_cascade';
```

---

## 📊 Status Esperado Após Correção

### Empresas no Banco
```
✅ FastSavorys (username: fastsavorys) - ATIVA
❌ Neves & Costa - EXCLUÍDA
❌ Império Burguer - EXCLUÍDA
```

### Funcionalidades
```
✅ Cadastro de nova empresa funciona
✅ Login admin funciona
✅ Login empresa funciona
✅ Botão excluir funciona
✅ Aprovação de empresa funciona
```

---

## 🔍 Logs para Diagnóstico

Se o botão excluir ainda não funcionar, abra o Console (F12) e procure por:

```
🗑️ Iniciando exclusão da empresa: [id]
👤 Usuário autenticado: [email]
📡 Resposta do RPC: [resposta]
```

Se **NÃO aparecer** esses logs:
- O código não foi atualizado
- Recarregue a página com Ctrl+Shift+R (hard reload)

Se aparecer **❌ Erro**:
- Copie a mensagem completa
- Me envie para análise

---

## 📞 Suporte Rápido

Se após seguir todos os passos ainda não funcionar:

1. **Tire um print** da tela de erro
2. **Copie os logs** do console (F12)
3. **Execute** no SQL Editor:
   ```sql
   SELECT tablename FROM pg_tables WHERE schemaname = 'public';
   SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';
   SELECT policyname, tablename FROM pg_policies WHERE tablename IN ('companies', 'company_requests');
   ```
4. **Me envie** os resultados

---

## ✅ Checklist Final

- [ ] Script `fix-urgent.sql` executado sem erros
- [ ] Provider Email habilitado no Supabase
- [ ] Usuário `admin@fastcashflow.com` criado no Auth
- [ ] Apenas FastSavorys aparece na lista de empresas
- [ ] Cadastro de nova empresa funciona
- [ ] Login admin funciona
- [ ] Botão excluir funciona (se houver empresas para testar)

---

**Tempo estimado**: 5-10 minutos

**Última atualização**: Novembro 2025
