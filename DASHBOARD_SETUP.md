# Dashboard de Fluxo de Caixa - Guia de Implementação

## 📋 Resumo

Este documento descreve como implementar o novo Dashboard Interativo de Fluxo de Caixa para empresas clientes.

## 🗄️ Banco de Dados - SQL Setup

### 1. Criar Empresa Administradora

Execute o SQL em `SQL_SETUP.sql` no Supabase:

```sql
INSERT INTO public.companies (name, username, deleted_at)
VALUES ('fastcashflow', 'fastcashflow', NULL)
ON CONFLICT (name) DO NOTHING;
```

### 2. Criar Tabelas Necessárias

As seguintes tabelas foram criadas no SQL_SETUP.sql:

- **transactions**: Armazena entradas e saídas
- **financial_goals**: Armazena metas financeiras por mês
- **dashboard_settings**: Configurações do dashboard por empresa

### 3. Políticas de Segurança (RLS)

Todas as tabelas têm Row Level Security habilitado para garantir que cada empresa veja apenas seus dados.

## 📁 Arquivos Criados

### Repositórios (Camada de Dados)

1. **`src/repositories/transactions.ts`** (já existia)
   - `getTransactionsByRange()`: Obter transações por intervalo
   - `getMonthlyTotals()`: Totais do mês
   - `getMonthlyDailySeries()`: Série diária

2. **`src/repositories/financial_goals.ts`** (novo)
   - `getGoalByMonth()`: Obter meta do mês
   - `createGoal()`: Criar nova meta
   - `calculateGoalProgress()`: Calcular progresso

3. **`src/repositories/dashboard_settings.ts`** (novo)
   - `getSettingsByCompany()`: Obter configurações
   - `getOrCreateSettings()`: Obter ou criar padrão

### Telas

1. **`src/screens/DashboardScreen.tsx`** (novo)
   - Dashboard principal com cards de saldo, entradas, saídas
   - Indicador de meta financeira
   - Gráfico simplificado com resumo diário
   - Navegação por período (mês anterior/próximo)
   - Alertas visuais para situações críticas

## 🎨 Funcionalidades do Dashboard

### Cards Principais

1. **Saldo Atual**
   - Mostra saldo do período
   - Alerta visual (vermelho) se negativo
   - Cálculo: Entradas - Saídas

2. **Entradas e Saídas**
   - Dois cards lado a lado
   - Cores diferenciadas (verde/vermelho)
   - Totais do período

3. **Dívidas em Aberto**
   - Total de dívidas não pagas
   - Alerta se acima de R$ 500.000
   - Integração com tabela de débitos

4. **Meta Financeira**
   - Barra de progresso visual
   - Percentual alcançado
   - Comparação: Alcançado vs Meta
   - Alerta se abaixo de 50%

### Recursos Interativos

- **Seletor de Período**: Navegar entre meses
- **Botão Adicionar Transação**: Atalho rápido
- **Gráfico Diário**: Resumo das últimas transações
- **Responsividade**: Funciona em web e mobile

### Alertas Visuais

- 🔴 **Saldo Negativo**: Fundo vermelho claro
- 🟡 **Dívidas Altas**: Fundo amarelo claro
- 🔴 **Meta Baixa**: Barra de progresso vermelha

## 🔧 Configuração

### Limites Padrão (em `dashboard_settings.ts`)

```typescript
{
  default_period: 'month',
  alert_debt_threshold_cents: 50000000,    // R$ 500.000
  alert_negative_balance: true,
  goal_alert_threshold_percent: 50,        // 50%
  currency: 'BRL'
}
```

### Como Modificar Limites

No Supabase, atualize a tabela `dashboard_settings`:

```sql
UPDATE public.dashboard_settings
SET alert_debt_threshold_cents = 100000000  -- R$ 1.000.000
WHERE company_id = 'seu-company-id';
```

## 📊 Dados Necessários

Para o dashboard funcionar corretamente, você precisa de:

1. **Transações** na tabela `transactions`
   - Tipo: 'entrada' ou 'saída'
   - Data, descrição, valor em centavos

2. **Metas Financeiras** (opcional)
   - Mês (YYYY-MM-01)
   - Valor alvo em centavos

3. **Débitos** na tabela `debts`
   - Para cálculo de dívidas em aberto

## 🚀 Como Integrar na Navegação

### Para Usuários Comuns (Tabs.tsx)

```typescript
import DashboardScreen from '../screens/DashboardScreen';

<Tab.Screen 
  name="Dashboard" 
  component={DashboardScreen} 
  options={{ tabBarLabel: 'Dashboard' }} 
/>
```

### Para Admin (AdminTabs.tsx)

```typescript
import DashboardScreen from '../screens/DashboardScreen';

<Tab.Screen 
  name="Dashboard" 
  component={DashboardScreen} 
  options={{ tabBarLabel: 'Dashboard' }} 
/>
```

## 📱 Exemplo de Uso

1. Usuário acessa o app
2. Vê o Dashboard com dados do mês atual
3. Visualiza saldo, entradas, saídas
4. Vê progresso da meta (se houver)
5. Clica em "Adicionar Transação" para lançar novo movimento
6. Navega entre meses com setas

## 🔍 Queries Úteis para Testes

### Verificar Transações

```sql
SELECT * FROM public.transactions 
WHERE company_id = 'seu-company-id'
ORDER BY date DESC;
```

### Verificar Metas

```sql
SELECT * FROM public.financial_goals 
WHERE company_id = 'seu-company-id'
ORDER BY month DESC;
```

### Verificar Configurações

```sql
SELECT * FROM public.dashboard_settings 
WHERE company_id = 'seu-company-id';
```

## 🎯 Próximas Melhorias

1. Gráficos mais avançados (usando biblioteca como `react-native-chart-kit`)
2. Filtros por categoria
3. Exportação de relatórios
4. Previsão de fluxo de caixa
5. Comparação com períodos anteriores
6. Notificações de alertas

## ⚠️ Considerações de Performance

- Dashboard usa React Query para cache automático
- Dados são invalidados ao adicionar/editar transações
- Índices no banco de dados otimizam queries
- Limite de 31 dias no gráfico diário para performance

## 🔐 Segurança

- RLS garante que cada empresa vê apenas seus dados
- Todas as queries filtram por `company_id`
- Admin pode ver dados de qualquer empresa ao selecionar no filtro
