# 🚀 Quick Start - Dashboard de Fluxo de Caixa

## Passo 1: Banco de Dados (5 minutos)

1. Abra o Supabase Console
2. Vá para SQL Editor
3. Copie todo o conteúdo de `SQL_SETUP.sql`
4. Cole no editor
5. Clique em "Run"
6. Pronto! ✅

## Passo 2: Código (2 minutos)

Os arquivos já foram criados:
- ✅ `src/repositories/financial_goals.ts`
- ✅ `src/repositories/dashboard_settings.ts`
- ✅ `src/screens/DashboardScreen.tsx`

Nenhuma alteração necessária!

## Passo 3: Integração na Navegação (3 minutos)

### Para usuários comuns - Abra `src/navigation/Tabs.tsx`:

```typescript
// No topo, adicione:
import DashboardScreen from '../screens/DashboardScreen';

// Dentro do Tab.Navigator, adicione:
<Tab.Screen 
  name="Dashboard" 
  component={DashboardScreen} 
  options={{ tabBarLabel: 'Dashboard' }} 
/>
```

### Para admin - Abra `src/navigation/AdminTabs.tsx`:

```typescript
// No topo, adicione:
import DashboardScreen from '../screens/DashboardScreen';

// Dentro do Tab.Navigator, adicione:
<Tab.Screen 
  name="Dashboard" 
  component={DashboardScreen} 
  options={{ tabBarLabel: 'Dashboard' }} 
/>
```

## Passo 4: Dados de Teste (2 minutos)

Abra o Supabase Console e execute:

```sql
-- Inserir transações de teste
INSERT INTO public.transactions (company_id, type, description, amount_cents, category, date)
SELECT 
  (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1),
  'entrada',
  'Venda de produto',
  500000,
  'vendas',
  CURRENT_DATE - INTERVAL '5 days'
UNION ALL
SELECT 
  (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1),
  'saída',
  'Pagamento de fornecedor',
  200000,
  'fornecedor',
  CURRENT_DATE - INTERVAL '3 days'
UNION ALL
SELECT 
  (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1),
  'entrada',
  'Consultoria',
  300000,
  'serviços',
  CURRENT_DATE - INTERVAL '1 day';

-- Inserir meta
INSERT INTO public.financial_goals (company_id, month, target_amount_cents, description)
SELECT 
  (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1),
  DATE_TRUNC('month', CURRENT_DATE)::DATE,
  1000000,
  'Meta de vendas'
ON CONFLICT DO NOTHING;
```

## Passo 5: Testar (2 minutos)

1. Inicie o app: `npm start`
2. Acesse como usuário comum
3. Clique na aba "Dashboard"
4. Veja os dados aparecerem! 🎉

## ✨ Pronto!

Seu Dashboard está funcionando com:
- ✅ Saldo atual
- ✅ Entradas e saídas
- ✅ Dívidas em aberto
- ✅ Meta financeira
- ✅ Gráfico diário
- ✅ Navegação por período
- ✅ Alertas visuais

## 📚 Documentação Completa

Para mais detalhes, veja:
- `DASHBOARD_SETUP.md` - Documentação completa
- `SQL_SETUP.sql` - Script SQL completo
- `SQL_EXAMPLES.sql` - Exemplos de queries
- `IMPLEMENTATION_CHECKLIST.md` - Checklist detalhado

## 🆘 Problemas?

**Dashboard não carrega?**
- Verifique se a empresa "fastcashflow" existe
- Verifique se há transações no banco

**Dados não aparecem?**
- Execute `SQL_SETUP.sql` novamente
- Verifique se as tabelas foram criadas

**Erro de permissão?**
- Verifique se o usuário pertence à empresa
- Verifique RLS policies

---

**Tempo total: ~15 minutos** ⏱️
