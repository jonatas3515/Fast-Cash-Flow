# 📋 Instruções para Configuração do Supabase

## 🚀 Passos para Configurar o Banco de Dados

### 1. Acessar o Supabase SQL Editor

1. Acesse [https://supabase.com](https://supabase.com)
2. Faça login no seu projeto
3. No menu lateral, clique em **SQL Editor**

### 2. Executar o Script de Criação

1. Abra o arquivo `supabase/complete-schema.sql`
2. Copie **TODO** o conteúdo do arquivo
3. Cole no SQL Editor do Supabase
4. Clique em **Run** (ou pressione Ctrl+Enter)

⚠️ **IMPORTANTE**: Execute o script completo de uma vez. Ele criará:
- Todas as tabelas necessárias
- Políticas de segurança (RLS)
- Functions para operações administrativas
- Triggers automáticos
- Dados iniciais (seed)

### 3. Verificar se Tudo Foi Criado

Execute este comando no SQL Editor para verificar as tabelas:

```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

Você deve ver:
- ✅ companies
- ✅ company_requests
- ✅ transactions
- ✅ admin_users
- ✅ payments

Execute este comando para verificar as functions:

```sql
SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';
```

Você deve ver:
- ✅ delete_company_cascade
- ✅ approve_company_request
- ✅ check_trial_status
- ✅ update_expired_trials

### 4. Habilitar Email Provider

1. No menu lateral do Supabase, vá em **Authentication** → **Providers**
2. Certifique-se que **Email** está habilitado
3. Desabilite "Confirm email" se quiser login imediato (recomendado para testes)

### 5. Criar Usuário Admin no Supabase Auth

O script já criou o registro na tabela `admin_users`, mas você precisa criar o usuário no Supabase Auth:

1. Vá em **Authentication** → **Users**
2. Clique em **Add user** → **Create new user**
3. Preencha:
   - **Email**: `admin@fastcashflow.com`
   - **Password**: `fastcashflow` (ou a senha que você definiu no código)
   - **Auto Confirm User**: ✅ (marque esta opção)
4. Clique em **Create user**

### 6. Verificar Variáveis de Ambiente

No seu arquivo `.env` na raiz do projeto, certifique-se de ter:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

Para encontrar esses valores:
1. No Supabase, vá em **Settings** → **API**
2. Copie:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`

### 7. Testar a Configuração

#### Teste 1: Login Admin
1. Abra o app: `npm start` ou `npx expo start`
2. Faça login com:
   - **Usuário**: `jonatas`
   - **Senha**: `fastcashflow`
3. Você deve entrar no painel administrativo

#### Teste 2: Cadastro de Empresa
1. Na tela de login, clique em **Teste 30 dias grátis**
2. Preencha os dados de uma empresa teste
3. Envie o cadastro
4. Faça login como admin
5. Vá na aba **Solicitações**
6. Aprove a empresa criando um usuário e senha
7. Faça logout e tente logar com a nova empresa

#### Teste 3: Excluir Empresa
1. Como admin, vá em **Empresas cadastradas**
2. Clique em **Excluir** em uma empresa de teste
3. Confirme a exclusão
4. Verifique que a empresa sumiu da lista

## 🔧 Solução de Problemas Comuns

### Erro 400 no Login

**Causa**: Provider de Email não está habilitado ou usuário não existe no Auth

**Solução**:
1. Vá em Authentication → Providers → Email → Habilitar
2. Crie o usuário admin manualmente (passo 5 acima)

### Erro "RLS policy violation"

**Causa**: As políticas RLS não foram criadas corretamente

**Solução**:
1. Execute novamente o script `complete-schema.sql`
2. Verifique se você está logado com o email correto (`admin@fastcashflow.com`)

### Botão Excluir não funciona

**Causa**: A function RPC não foi criada ou não tem permissões

**Solução**:
1. Execute este comando no SQL Editor:
```sql
GRANT EXECUTE ON FUNCTION delete_company_cascade TO authenticated;
```

### Trial não expira automaticamente

**Causa**: A function `update_expired_trials()` precisa ser executada periodicamente

**Solução**: Configure um cron job no Supabase:
1. Vá em **Database** → **Cron Jobs** (se disponível)
2. Ou execute manualmente quando necessário:
```sql
SELECT update_expired_trials();
```

## 📊 Estrutura das Tabelas

### companies
- Armazena todas as empresas cadastradas
- Campos principais: `name`, `username`, `status`, `trial_start`, `trial_end`
- Status possíveis: `pending`, `trial`, `active`, `blocked`, `expired`

### company_requests
- Solicitações de cadastro pendentes
- Aprovadas pelo admin via função `approve_company_request()`

### transactions
- Lançamentos financeiros de cada empresa
- **ISOLADO POR EMPRESA** via `company_id`
- Soft delete via `deleted_at`

### payments
- Histórico de pagamentos das empresas
- Registra planos contratados e status

### admin_users
- Usuários administrativos do sistema
- Separado das empresas comuns

## 🔐 Segurança (RLS)

Todas as tabelas têm Row Level Security (RLS) habilitado:

- **Admin** (`admin@fastcashflow.com`): Acesso total a tudo
- **Empresas**: Acesso apenas aos próprios dados (filtrado por `company_id`)
- **Anon**: Pode apenas criar solicitações de cadastro

## 🎯 Próximos Passos

Após configurar o Supabase:

1. ✅ Testar login admin
2. ✅ Testar cadastro de empresa
3. ✅ Testar aprovação com trial de 30 dias
4. ✅ Testar login de empresa aprovada
5. ✅ Testar criação de lançamentos
6. ✅ Testar isolamento de dados entre empresas
7. ✅ Testar exclusão de empresa
8. ✅ Testar expiração de trial (alterar `trial_end` manualmente)

## 📞 Suporte

Se encontrar problemas:
1. Verifique o console do navegador (F12)
2. Verifique os logs do Supabase (Logs → Postgres Logs)
3. Confirme que todas as functions foram criadas
4. Confirme que o usuário admin existe no Auth

---

**Última atualização**: Novembro 2025
