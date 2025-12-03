# 🔄 Recuperação de Dados da FastSavorys

## Situação Atual

Os dados da empresa **FastSavorys** foram perdidos após atualizações no sistema. Este documento explica as opções de recuperação disponíveis.

## ⚠️ Importante

Os dados locais do SQLite são armazenados em:

### Web (Navegador)
- **LocalStorage**: `fastcashflow_transactions_local_v1`
- **SessionStorage**: Dados temporários da sessão

### Mobile (React Native)
- **SQLite**: `fastcashflow.db` no dispositivo
- **Expo SecureStore**: Credenciais e configurações

## 🔍 Opções de Recuperação

### Opção 1: Backup do Supabase (Recomendado)

Se você tem backups automáticos habilitados no Supabase:

1. Acesse o Supabase Dashboard
2. Vá em **Database** → **Backups**
3. Selecione um backup anterior à perda de dados
4. Restaure o backup

**Limitação**: Plano gratuito do Supabase não tem backups automáticos.

### Opção 2: Recuperar do LocalStorage do Navegador

Se você usou o sistema no navegador antes da perda:

1. Abra o DevTools (F12) no navegador onde usou o sistema
2. Vá na aba **Application** → **Local Storage**
3. Procure por `fastcashflow_transactions_local_v1`
4. Copie o conteúdo (é um JSON)
5. Envie para o desenvolvedor para importação manual

### Opção 3: Recuperar do Dispositivo Mobile

Se você usou no celular/tablet:

#### Android
```bash
# Conecte o dispositivo via USB
adb shell
cd /data/data/com.fastcashflow.app/databases/
cat fastcashflow.db
```

#### iOS
Use o Xcode ou iTunes para acessar os arquivos do app.

### Opção 4: Logs do Supabase

Verifique se há logs de transações antigas:

1. Acesse Supabase Dashboard
2. Vá em **Logs** → **Postgres Logs**
3. Filtre por `INSERT INTO transactions`
4. Copie os comandos SQL e execute novamente

### Opção 5: Reinserção Manual

Se não houver backup, você precisará reinserir os dados manualmente:

1. Faça login como FastSavorys
2. Vá em **Lançamentos**
3. Adicione cada transação novamente

## 🛡️ Prevenção Futura

Para evitar perda de dados no futuro:

### 1. Backup Automático

Configure um cron job para backup diário:

```sql
-- Criar tabela de backup
CREATE TABLE transactions_backup AS 
SELECT * FROM transactions WHERE company_id = 'fastsavorys-id';

-- Agendar backup diário (se disponível no seu plano)
```

### 2. Exportação Regular

Exporte os dados regularmente:

1. Acesse **Relatórios**
2. Escolha o período completo
3. Baixe o PDF
4. Ou use o botão de exportar dados (se implementado)

### 3. Sincronização Multi-Dispositivo

Use o sistema em múltiplos dispositivos:
- Notebook
- Celular
- Tablet

Assim, se um dispositivo falhar, os dados estão em outro.

### 4. Backup do Supabase

Considere upgrade para plano pago do Supabase:
- Backups automáticos diários
- Point-in-time recovery
- Maior segurança

## 📝 Script de Importação Manual

Se você tem os dados em formato JSON ou CSV, use este script SQL:

```sql
-- Exemplo de importação de transações
INSERT INTO transactions (
  id, company_id, type, date, time, datetime, 
  description, category, amount_cents, 
  source_device, version, updated_at, deleted_at
) VALUES 
  ('uuid-1', 'company-id', 'income', '2025-01-01', '10:00', '2025-01-01T10:00:00Z', 
   'Venda 1', 'Vendas', 10000, 'web', 1, '2025-01-01T10:00:00Z', NULL),
  ('uuid-2', 'company-id', 'expense', '2025-01-02', '14:30', '2025-01-02T14:30:00Z', 
   'Compra 1', 'Compras', 5000, 'web', 1, '2025-01-02T14:30:00Z', NULL);
-- ... adicione mais linhas conforme necessário
```

## 🔧 Ferramentas Úteis

### Exportar Dados do LocalStorage

Cole este código no Console do navegador (F12):

```javascript
// Exportar transações do LocalStorage
const data = localStorage.getItem('fastcashflow_transactions_local_v1');
if (data) {
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'fastsavorys_backup_' + new Date().toISOString() + '.json';
  a.click();
  console.log('Backup baixado!');
} else {
  console.log('Nenhum dado encontrado');
}
```

### Importar Dados para o LocalStorage

```javascript
// Cole o conteúdo do backup aqui
const backupData = '...seu JSON aqui...';
localStorage.setItem('fastcashflow_transactions_local_v1', backupData);
console.log('Dados restaurados! Recarregue a página.');
```

## 📞 Suporte

Se precisar de ajuda para recuperar os dados:

1. **WhatsApp**: +55 (73) 99934-8552
2. **Email**: contato@fastcashflow.com
3. Envie:
   - Print do erro (se houver)
   - Última data que os dados estavam corretos
   - Dispositivo usado (web/mobile)
   - Backup do LocalStorage (se disponível)

## ✅ Checklist de Recuperação

- [ ] Verificar backups do Supabase
- [ ] Verificar LocalStorage do navegador
- [ ] Verificar banco SQLite do mobile
- [ ] Verificar logs do Supabase
- [ ] Contatar suporte se necessário
- [ ] Configurar backups automáticos após recuperação

---

**Nota**: A melhor forma de evitar perda de dados é ter múltiplos backups e usar o sistema em vários dispositivos simultaneamente.
