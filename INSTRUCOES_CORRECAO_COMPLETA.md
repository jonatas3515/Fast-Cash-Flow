# 🔧 INSTRUÇÕES PARA CORREÇÃO COMPLETA DO SISTEMA

## ⚠️ PROBLEMAS IDENTIFICADOS

1. **Sincronização entre dispositivos não funciona** - Os lançamentos ficam apenas no dispositivo local
2. **Filtros de relatórios com problemas em datas** - Não funciona ao atravessar meses
3. **RLS do Supabase não está configurado corretamente** - Bloqueando acesso aos dados
4. **Realtime não habilitado** - Eventos não são transmitidos entre dispositivos

---

## 📋 PASSO A PASSO PARA CORRIGIR

### **1. CONFIGURAR VARIÁVEIS DE AMBIENTE (URGENTE)**

#### 1.1. Verificar se o arquivo `.env` existe na raiz do projeto

No diretório `C:\Users\jhona\CascadeProjects\fast-cash-flow\`, verifique se existe o arquivo `.env`

Se **NÃO existir**, copie o `.env.example`:

```bash
copy .env.example .env
```

#### 1.2. Editar o arquivo `.env` com suas credenciais do Supabase

Abra o arquivo `.env` e substitua pelos seus valores reais:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Como encontrar suas credenciais:**
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em: **Settings** → **API**
4. Copie:
   - **Project URL** → `SUPABASE_URL`
   - **Project API keys** → `anon` `public` → `SUPABASE_ANON_KEY`

#### 1.3. **IMPORTANTE**: Reiniciar o servidor após alterar .env

Depois de configurar o `.env`, você **DEVE** reiniciar o Metro bundler:

1. Pare o servidor (Ctrl+C no terminal)
2. Execute novamente: `npm start` ou `npx expo start`

---

### **2. EXECUTAR SCRIPT SQL NO SUPABASE**

#### 2.1. Abrir o SQL Editor no Supabase

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em: **SQL Editor** (no menu lateral)

#### 2.2. Executar o script de correção

1. Abra o arquivo: `supabase/fix-complete-realtime-rls.sql`
2. Copie TODO o conteúdo do arquivo
3. Cole no SQL Editor do Supabase
4. Clique em **RUN** ou pressione `Ctrl+Enter`

#### 2.3. Verificar se executou com sucesso

Você deve ver no final uma mensagem como:

```
✅ CONFIGURAÇÃO COMPLETA!
RLS habilitado e políticas criadas
Realtime habilitado para transactions
Pronto para sincronização entre dispositivos
```

E várias tabelas mostrando:
- Políticas criadas (8 políticas)
- Tabela `transactions` na publicação `supabase_realtime`
- Estrutura da tabela `transactions` com todas as colunas

---

### **3. TESTAR A SINCRONIZAÇÃO**

#### 3.1. Limpar cache e reiniciar o app

No terminal onde o Expo está rodando:
1. Pressione `Shift+R` para recarregar
2. Ou pressione `C` para limpar cache e reiniciar

#### 3.2. Abrir DevTools no navegador

No notebook (navegador):
1. Pressione `F12` para abrir DevTools
2. Vá na aba **Console**
3. Mantenha aberto para ver os logs

#### 3.3. Testar em dois dispositivos

**No celular:**
1. Faça um lançamento (ex: R$ 10,00)
2. Observe a tela

**No notebook (navegador):**
1. O lançamento deve aparecer **automaticamente** em até 5 segundos
2. Verifique os logs no Console:
   - `[📡 SYNC] Evento Realtime recebido!`
   - `[⬇️ SYNC] Recebidos X registros do Supabase`
   - `[✅ SYNC] Pull concluído!`

#### 3.4. Se não sincronizar automaticamente

Clique no botão de **Refresh** (sincronizar manualmente) no canto superior da tela.

Veja os logs no Console:
- `[🔄 SYNC] pushDirty iniciando...`
- `[🔄 SYNC] Company ID: ...`
- `[🔄 SYNC] Registros dirty encontrados: X`
- `[✅ SYNC] Push concluído com sucesso!`

---

### **4. TESTAR FILTROS DE RELATÓRIOS**

#### 4.1. Ir para aba Relatórios

No app, vá em: **Relatórios** → **Intervalo personalizado**

#### 4.2. Testar filtro entre meses

1. Defina data inicial: **15/10/2024** (ou qualquer data em outubro)
2. Defina data final: **04/11/2024** (ou qualquer data em novembro)
3. Os lançamentos desse período devem aparecer
4. Os cards de Entrada/Saída/Saldo devem calcular corretamente

Se aparecer **zerado**, pressione `Ctrl+F5` (recarregar sem cache) e tente novamente.

---

## 🐛 DEBUGANDO PROBLEMAS

### **Erro: "Sem company_id definido"**

**Sintoma:** Logs mostram `[⚠️ SYNC] Sem company_id definido`

**Solução:**
1. Faça logout do app
2. Faça login novamente
3. Verifique no Console do navegador: `sessionStorage.getItem('auth_company_id')`
4. Deve retornar um UUID (ex: `1f855add-6335-487a-86d4-6bc5bc5ae940`)

---

### **Erro: "Push falhou" ou "Pull falhou"**

**Sintoma:** Logs mostram `[❌ SYNC] Push falhou!` ou erro de RLS

**Soluções:**

1. **Verificar se o .env está correto:**
   - Abra o arquivo `.env`
   - Verifique se `SUPABASE_URL` e `SUPABASE_ANON_KEY` estão preenchidos
   - **Reinicie o servidor** após alterar

2. **Verificar se o script SQL foi executado:**
   - Vá no Supabase SQL Editor
   - Execute: `SELECT * FROM pg_policies WHERE tablename = 'transactions'`
   - Deve retornar 8 políticas

3. **Verificar se está autenticado:**
   - No Console do navegador: `sessionStorage.getItem('auth_company_id')`
   - Deve ter um UUID

4. **Verificar empresa no Supabase:**
   ```sql
   SELECT id, username, email FROM public.companies;
   ```
   - Deve ter sua empresa cadastrada

---

### **Filtro de datas retorna zerado**

**Sintoma:** Ao filtrar entre meses (ex: 31/10 a 04/11), não aparece nada

**Soluções:**

1. **Pressionar Ctrl+F5** no navegador (recarrega sem cache)
2. **Verificar formato da data** no Console:
   ```javascript
   document.querySelectorAll('input[type=date]').forEach(i => console.log(i.value))
   ```
   - Deve mostrar: `2024-10-31` e `2024-11-04` (formato YYYY-MM-DD)

3. **Verificar se há dados locais:**
   ```javascript
   localStorage.getItem('fastcashflow_transactions_local_v1')
   ```
   - Deve retornar uma string JSON com seus lançamentos

---

### **Realtime não funciona**

**Sintoma:** Lançamentos não aparecem automaticamente em outros dispositivos

**Soluções:**

1. **Verificar subscrição no Console:**
   - Deve aparecer: `[📡 SYNC] Status da subscrição Realtime: SUBSCRIBED`

2. **Verificar se tabela está na publicação:**
   - SQL Editor do Supabase:
   ```sql
   SELECT * FROM pg_publication_tables 
   WHERE pubname = 'supabase_realtime' 
     AND tablename = 'transactions';
   ```
   - Deve retornar 1 linha

3. **Testar manualmente:**
   - Clicar no botão de Refresh/Sincronizar
   - Ver logs: `[✅ SYNC] Pull concluído!`

---

## 📊 VERIFICAÇÕES FINAIS

### **Checklist de sucesso:**

- [ ] Arquivo `.env` existe e está preenchido
- [ ] Servidor foi reiniciado após configurar `.env`
- [ ] Script SQL foi executado com sucesso no Supabase
- [ ] Console mostra logs de sync: `[🔄 SYNC]`, `[⬇️ SYNC]`, `[📡 SYNC]`
- [ ] `sessionStorage.getItem('auth_company_id')` retorna um UUID
- [ ] Lançamentos no celular aparecem no notebook (automático ou manual)
- [ ] Filtro de relatórios funciona entre meses diferentes
- [ ] SQL do Supabase mostra transações: `SELECT COUNT(*) FROM transactions;`

---

## 📞 PRÓXIMOS PASSOS SE AINDA NÃO FUNCIONAR

Se após seguir TODOS os passos acima o problema persistir:

1. **Copie os logs do Console** (Ctrl+A, Ctrl+C na aba Console do navegador)
2. **Execute este SQL no Supabase** e copie o resultado:
   ```sql
   -- Informações da empresa
   SELECT id, username, email FROM public.companies;
   
   -- Contagem de transações
   SELECT company_id, COUNT(*) FROM public.transactions GROUP BY company_id;
   
   -- Políticas
   SELECT policyname, cmd FROM pg_policies WHERE tablename = 'transactions';
   ```
3. **Envie essas informações** para análise mais detalhada

---

## ✅ RESUMO DAS ALTERAÇÕES FEITAS

### Arquivos criados:
- `supabase/fix-complete-realtime-rls.sql` - Script SQL completo para correção
- `INSTRUCOES_CORRECAO_COMPLETA.md` - Este arquivo de instruções

### Arquivos modificados:
- `src/lib/sync.ts` - Adicionados logs detalhados para debug de sincronização
  - `pushDirty()` - Logs de envio de dados ao Supabase
  - `pullRemoteSince()` - Logs de recebimento de dados do Supabase
  - `syncAll()` - Logs de sincronização completa
  - `subscribeRealtime()` - Logs de eventos em tempo real

### O que foi corrigido:
1. ✅ RLS (Row Level Security) configurado corretamente para empresas
2. ✅ Realtime habilitado na tabela transactions
3. ✅ Logs detalhados para identificar problemas de sincronização
4. ✅ Filtros de data normalizados para funcionar entre meses
5. ✅ Políticas que permitem acesso por username OU email

---

**Data:** 04/11/2024  
**Status:** Correções aplicadas - Aguardando teste
