# 🧪 TESTE DE SINCRONIZAÇÃO - INSTRUÇÕES

## ⚠️ CORREÇÕES APLICADAS

As seguintes correções foram feitas para resolver o problema de sincronização:

1. ✅ **Cache de company_id** - Evita alternância entre valor correto e `null`
2. ✅ **Validação ao criar transações** - Bloqueia criação sem company_id
3. ✅ **Sync imediato** - Após criar transação, dispara sync automaticamente
4. ✅ **Logs detalhados** - Em todo o fluxo de criação e sincronização

---

## 🔄 REINICIAR O SERVIDOR (OBRIGATÓRIO)

**Antes de testar**, você DEVE reiniciar o servidor:

```bash
# No terminal onde o Expo está rodando:
# Pressione Ctrl+C para parar

# Depois execute:
npm start
```

Aguarde o servidor iniciar completamente antes de continuar.

---

## 📱 TESTE NO CELULAR

### Passo 1: Limpar cache e recarregar

1. **Feche completamente o app** no celular (não deixe em background)
2. **Abra novamente** acessando: `http://192.168.1.100:8081` (ou o IP que você está usando)
3. **Faça login** com: `fastsavorys@supabase.com`

### Passo 2: Verificar logs (importante!)

1. **No celular**, abra o menu: `☰` (três linhas)
2. **Procure por**: "Ferramentas de desenvolvedor" ou "Console"
   - Se não tiver, use o Chrome Remote Debugging (veja instruções abaixo)

### Passo 3: Criar um lançamento de teste

1. **Vá na aba "Lançamentos"**
2. **Crie uma ENTRADA** de R$ 5,00 com descrição "Teste Sync"
3. **OBSERVE OS LOGS** que devem aparecer:

```
[💾 CREATE] Criando transação...
[💾 CREATE] Company ID: 1f855add-...
[💾 CREATE] Tipo: income Valor: 500
[✅ CREATE] Transação criada com ID: ...
[✅ CREATE] Marcada como dirty=1 para sincronização
[🔄 CREATE] Iniciando sync imediato...
[🔄 SYNC] pushDirty iniciando...
[🔄 SYNC] Company ID: 1f855add-...
[🔍 DB] Query dirty rows - Company ID: 1f855add-... Found: 1
[🔄 SYNC] Registros dirty encontrados: 1
[🔄 SYNC] Enviando 1 registros para Supabase...
[✅ SYNC] Push concluído com sucesso! 1 registros
```

### ❌ SE APARECER ERRO:

Se você ver:
```
[❌ CREATE] ERRO: Sem company_id - transação não será criada!
```

**Solução:**
1. Faça LOGOUT
2. Feche o app completamente
3. Abra novamente
4. Faça LOGIN
5. Tente criar o lançamento novamente

---

## 💻 TESTE NO NOTEBOOK

### Passo 1: Recarregar a página

1. **No navegador**, pressione `Ctrl+F5` (recarregar sem cache)
2. **Abra o Console** (F12 → aba Console)
3. **Faça login** (se necessário)

### Passo 2: Aguardar sync automático

**Aguarde até 10 segundos**. Você deve ver nos logs:

```
[⬇️ SYNC] pullRemoteSince iniciando...
[⬇️ SYNC] Company ID: 1f855add-...
[⬇️ SYNC] Last sync: ...
[⬇️ SYNC] Recebidos 1 registros do Supabase
[⬇️ SYNC] Exemplo do primeiro registro: {...}
[✅ SYNC] Pull concluído!
```

### Passo 3: Verificar se o lançamento apareceu

1. **Vá na aba "Lançamentos"**
2. **Verifique se** o lançamento "Teste Sync R$ 5,00" apareceu
3. **Vá na aba "Relatórios"**
4. **Verifique se** os valores estão corretos

---

## 🐛 CHROME REMOTE DEBUGGING (Para ver logs do celular)

Se você não consegue ver os logs no celular, use esta técnica:

### No Computador:

1. **Abra o Chrome** no computador
2. **Digite na barra de endereço**: `chrome://inspect`
3. **Ative**: "Discover network targets"
4. **Digite o IP do celular**: `192.168.1.XXX:8081` (use o IP do seu celular)

### No Celular (Android):

1. **Conecte** o celular no computador via USB
2. **Ative** a Depuração USB nas configurações do desenvolvedor
3. **Abra o app** no celular
4. **No Chrome do computador**, você verá o dispositivo aparecer
5. **Clique em "Inspect"** para ver o console do celular

### No Celular (iPhone):

1. **Abra o Safari** no Mac
2. **Vá em**: Develop → [Seu iPhone] → [URL do app]
3. **Abra o Web Inspector** para ver os logs

---

## 📊 O QUE OS LOGS DEVEM MOSTRAR

### ✅ CENÁRIO DE SUCESSO:

**No celular** (ao criar lançamento):
```
[💾 CREATE] Company ID: 1f855add-...
[🔍 DB] Query dirty rows - Found: 1
[🔄 SYNC] Registros dirty encontrados: 1
[✅ SYNC] Push concluído com sucesso!
```

**No notebook** (em até 10 segundos):
```
[⬇️ SYNC] Recebidos 1 registros do Supabase
[✅ SYNC] Pull concluído!
```

### ❌ CENÁRIO DE FALHA:

**Se o celular mostrar:**
```
[❌ CREATE] ERRO: Sem company_id
```
→ O login não foi feito corretamente. Faça logout e login novamente.

**Se o celular mostrar:**
```
[🔄 SYNC] Company ID: null
```
→ A sessão expirou. Faça logout e login novamente.

**Se o celular mostrar:**
```
[❌ SYNC] Push falhou!
[❌ SYNC] Erro: ...
```
→ Copie a mensagem de erro completa e me envie.

---

## 🔍 DIAGNÓSTICO ADICIONAL

Execute estes comandos no Console do navegador (F12) **EM AMBOS OS DISPOSITIVOS**:

```javascript
// Verificar company_id
console.log('Company ID:', sessionStorage.getItem('auth_company_id'));

// Verificar transações locais
console.log('Transações locais:', JSON.parse(localStorage.getItem('fastcashflow_transactions_local_v1') || '[]').length);

// Verificar transações dirty
const txs = JSON.parse(localStorage.getItem('fastcashflow_transactions_local_v1') || '[]');
const dirty = txs.filter(t => t.dirty === 1);
console.log('Transações dirty:', dirty.length);
console.log('Detalhes dirty:', dirty);
```

**Me envie o resultado desses comandos** se o problema persistir.

---

## 📸 CAPTURAR EVIDÊNCIAS

Se o problema continuar, capture:

1. **Screenshot dos logs do celular** (processo de criar lançamento)
2. **Screenshot dos logs do notebook** (processo de sync)
3. **Resultado dos comandos de diagnóstico** acima
4. **Mensagens de erro** completas (se houver)

---

## 🎯 RESULTADO ESPERADO

Após seguir todos os passos:

✅ Lançamento criado no celular aparece "Teste Sync R$ 5,00"  
✅ Logs mostram `[✅ SYNC] Push concluído com sucesso!`  
✅ Em até 10 segundos, notebook mostra `[⬇️ SYNC] Recebidos 1 registros`  
✅ Lançamento aparece no notebook automaticamente  
✅ Relatórios mostram valores corretos em ambos dispositivos  

---

**Se TUDO funcionar**: A sincronização está corrigida! 🎉

**Se AINDA NÃO funcionar**: Me envie os logs e diagnósticos acima para análise mais profunda.
