# 🔧 Correção do Erro SQL - ON CONFLICT

## ❌ Problema

```sql
ERROR: 42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification
```

Este erro ocorre porque o `ON CONFLICT` precisa de uma constraint UNIQUE na tabela.

## ✅ Solução

### Opção 1: Usar SQL_SETUP_SAFE.sql (Recomendado)

1. **Abra o arquivo `SQL_SETUP_SAFE.sql`**
2. **Copie todo o conteúdo**
3. **Cole no Supabase Console → SQL Editor**
4. **Clique em "Run"**

Este arquivo usa `DO $$` blocks para evitar problemas com ON CONFLICT.

### Opção 2: Corrigir o SQL original

Se preferir usar o SQL_SETUP.sql original, faça esta correção:

```sql
-- Troque esta linha:
INSERT INTO public.companies (name, username, deleted_at)
VALUES ('fastcashflow', 'fastcashflow', NULL)
ON CONFLICT (name) DO NOTHING;

-- Por esta:
INSERT INTO public.companies (name, username, deleted_at)
VALUES ('fastcashflow', 'fastcashflow', NULL)
ON CONFLICT (name, username) DO NOTHING;
```

### Opção 3: Versão mais simples (sem ON CONFLICT)

```sql
-- Primeiro verifica se já existe
INSERT INTO public.companies (name, username, deleted_at)
SELECT 'fastcashflow', 'fastcashflow', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.companies 
  WHERE name = 'fastcashflow' OR username = 'fastcashflow'
);
```

## 🧪 Testar se Funcionou

Depois de executar o SQL, use o arquivo `SQL_TEST.sql` para verificar:

1. **Copie o conteúdo de `SQL_TEST.sql`**
2. **Cole no Supabase Console**
3. **Execute para ver se tudo foi criado**

## 📁 Verificar Implementações

Os arquivos de implementação já existem:

✅ `src/screens/DashboardScreen.tsx` - Tela do dashboard  
✅ `src/repositories/financial_goals.ts` - Repositório de metas  
✅ `src/repositories/dashboard_settings.ts` - Configurações  
✅ `src/repositories/transactions.ts` - Transações (já existia)

## 🚀 Próximos Passos

1. **Execute o SQL corrigido** (use SQL_SETUP_SAFE.sql)
2. **Teste com SQL_TEST.sql** para verificar
3. **Integre na navegação**:
   ```typescript
   // Em src/navigation/Tabs.tsx e AdminTabs.tsx
   import DashboardScreen from '../screens/DashboardScreen';
   
   <Tab.Screen 
     name="Dashboard" 
     component={DashboardScreen} 
     options={{ tabBarLabel: 'Dashboard' }} 
   />
   ```
4. **Teste no app**: `npm start`

## 🔍 Verificação Manual

Depois de executar o SQL, verifique no Supabase:

```sql
-- Verificar empresa
SELECT * FROM public.companies WHERE name = 'fastcashflow';

-- Verificar tabelas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('transactions', 'financial_goals', 'dashboard_settings');

-- Verificar dados de teste
SELECT COUNT(*) FROM public.transactions WHERE deleted_at IS NULL;
```

## ⚠️ Se o erro persistir

1. **Verifique se você tem permissão** para criar tabelas
2. **Execute SQL por partes** (tabela por tabela)
3. **Use o SQL_SETUP_SAFE.sql** que é mais robusto

---

**Status**: ✅ Correção disponível  
**Tempo**: 5 minutos para aplicar  
**Risco**: Baixo
