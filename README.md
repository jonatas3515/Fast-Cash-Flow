# 💰 Fast Cash Flow

Sistema completo de gestão de fluxo de caixa empresarial com painel administrativo, sistema de assinaturas e trial gratuito de 30 dias.

![Fast Cash Flow](./Logo%20Black.png)

## 🎯 Visão Geral

O **Fast Cash Flow** é uma aplicação web/mobile (PWA) desenvolvida para empresas gerenciarem seu fluxo de caixa de forma simples e eficiente. Cada empresa tem acesso exclusivo aos seus próprios dados financeiros, com total isolamento e segurança.

### ✨ Principais Funcionalidades

#### Para Empresas (Usuários)
- 📊 **Lançamentos Diários**: Registre entradas e saídas com descrição, categoria e valor
- 📈 **Relatórios Completos**: Visualize resumos diários, semanais, mensais, trimestrais e semestrais
- 📱 **Gráficos Interativos**: Acompanhe médias, comparações e tendências
- 📄 **Exportação PDF**: Baixe relatórios em PDF ou envie direto pelo WhatsApp
- 💰 **Saldo em Tempo Real**: Veja entradas, saídas e saldo atualizado
- 🎨 **Tema Claro/Escuro**: Interface adaptável às suas preferências

#### Para Administradores
- 👥 **Gestão de Empresas**: Visualize, edite, bloqueie ou exclua empresas cadastradas
- 📋 **Aprovação de Solicitações**: Analise e aprove novos cadastros com trial automático de 30 dias
- 💳 **Controle de Assinaturas**: Gerencie planos mensais e anuais
- 📊 **Dashboard Administrativo**: Visualize totais de empresas, receitas e status
- 🔐 **Segurança Total**: Isolamento completo de dados entre empresas

## 🚀 Tecnologias Utilizadas

- **Frontend**: React Native + Expo (Web/iOS/Android)
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Sincronização**: SQLite local + Supabase (offline-first)
- **Estilo**: React Native StyleSheet
- **Navegação**: React Navigation
- **State Management**: TanStack Query (React Query)
- **Autenticação**: Supabase Auth + Custom Logic

## 📦 Instalação e Configuração

### Pré-requisitos

- Node.js 18+ instalado
- npm ou yarn
- Conta no Supabase (gratuita)

### 1. Clone o Repositório

```bash
git clone https://github.com/seu-usuario/fast-cash-flow.git
cd fast-cash-flow
```

### 2. Instale as Dependências

```bash
npm install
```

### 3. Configure o Supabase

1. Crie um projeto no [Supabase](https://supabase.com)
2. Copie o arquivo `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```
3. Preencha as variáveis no `.env`:
   ```env
   SUPABASE_URL=https://seu-projeto.supabase.co
   SUPABASE_ANON_KEY=sua-chave-anon-aqui
   ```
4. Execute o script SQL no Supabase:
   - Abra o arquivo `supabase/complete-schema.sql`
   - Copie todo o conteúdo
   - Cole no SQL Editor do Supabase e execute

📖 **Instruções detalhadas**: Veja o arquivo [INSTRUCOES_SUPABASE.md](./INSTRUCOES_SUPABASE.md)

### 4. Inicie o Projeto

```bash
npm start
```

Ou para web diretamente:

```bash
npm run web
```

## 🔐 Credenciais Padrão

### Administrador
- **Usuário**: `jonatas`
- **Senha**: `fastcashflow`

### Empresa Demo (FastSavorys)
- **Usuário**: `fastsavorys`
- **Senha**: `jerosafast`

## 📱 Como Usar

### Para Empresas

1. **Cadastro**:
   - Clique em "Teste 30 dias grátis" na tela de login
   - Preencha os dados da empresa
   - Aguarde aprovação do administrador (até 48h)

2. **Primeiro Acesso**:
   - Faça login com usuário e senha provisória fornecidos
   - Opcionalmente, altere a senha no primeiro acesso

3. **Lançamentos**:
   - Acesse a aba "Lançamentos"
   - Clique em "Entradas" ou "Saídas"
   - Preencha descrição, categoria e valor
   - Salve o lançamento

4. **Relatórios**:
   - Acesse a aba "Relatórios"
   - Escolha o período (dia, semana, mês, trimestre, semestre)
   - Visualize gráficos e totais
   - Baixe PDF ou envie por WhatsApp

### Para Administradores

1. **Aprovar Empresas**:
   - Faça login como admin
   - Acesse a aba "Solicitações"
   - Clique em "Aprovar" na empresa desejada
   - Defina um login e senha provisória
   - O sistema cria automaticamente trial de 30 dias

2. **Gerenciar Empresas**:
   - Acesse "Empresas cadastradas"
   - Edite informações, bloqueie ou exclua empresas
   - Visualize status (trial, ativo, bloqueado, expirado)

3. **Relatórios Admin**:
   - Veja totais de empresas, receitas e status
   - Filtre por data e empresa

## 💳 Planos e Preços

### Trial Gratuito
- ✅ 30 dias grátis
- ✅ Acesso completo a todas as funcionalidades
- ✅ Sem necessidade de cartão de crédito

### Plano Mensal
- 💰 R$ 9,99/mês
- ✅ Pagamento via cartão de crédito
- ✅ Cancele quando quiser

### Plano Anual
- 💰 R$ 99,99/ano
- 🎉 Economize 2 meses!
- ✅ Pagamento via cartão de crédito

## 🏗️ Estrutura do Projeto

```
fast-cash-flow/
├── src/
│   ├── auth/              # Telas de login e registro
│   ├── screens/           # Telas principais
│   │   ├── admin/         # Painel administrativo
│   │   └── ...            # Telas de usuário
│   ├── navigation/        # Configuração de rotas
│   ├── lib/               # Utilitários e configurações
│   │   ├── supabase.ts    # Cliente Supabase
│   │   ├── db.ts          # SQLite local
│   │   ├── sync.ts        # Sincronização
│   │   └── company.ts     # Lógica de empresa
│   ├── repositories/      # Camada de dados
│   ├── theme/             # Temas e estilos
│   └── i18n/              # Internacionalização
├── supabase/
│   ├── complete-schema.sql  # Script completo do banco
│   └── schema.sql           # Schema legado
├── assets/                # Imagens e ícones
├── .env                   # Variáveis de ambiente (criar)
├── app.config.ts          # Configuração Expo
└── package.json           # Dependências
```

## 🔒 Segurança e Isolamento

### Row Level Security (RLS)

Todas as tabelas do Supabase têm RLS habilitado:

- **Empresas**: Veem apenas seus próprios dados
- **Admin**: Acesso total ao sistema
- **Isolamento por `company_id`**: Cada transação é vinculada a uma empresa

### Autenticação

- Supabase Auth para sessões seguras
- Senhas criptografadas
- Tokens JWT com claims personalizados

### Sincronização Offline

- SQLite local para funcionamento offline
- Sincronização automática quando online
- Conflitos resolvidos por timestamp

## 🐛 Solução de Problemas

### Erro 400 no Login

**Causa**: Provider de Email não habilitado no Supabase

**Solução**:
1. Vá em Authentication → Providers → Email
2. Habilite o provider
3. Desabilite "Confirm email" para testes

### Dados não sincronizam

**Causa**: `company_id` não está sendo salvo

**Solução**:
1. Verifique se fez login corretamente
2. Limpe o cache: `npm start -- --clear`
3. Verifique o console para erros

### Botão Excluir não funciona

**Causa**: Function RPC não foi criada

**Solução**:
1. Execute o script `complete-schema.sql` novamente
2. Verifique se a function existe:
   ```sql
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_name = 'delete_company_cascade';
   ```

## 📝 Roadmap

- [ ] Integração com gateway de pagamento (Stripe/Mercado Pago)
- [ ] Notificações push para vencimentos
- [ ] Exportação para Excel
- [ ] Categorias personalizadas
- [ ] Múltiplos usuários por empresa
- [ ] API REST para integrações
- [ ] App nativo iOS/Android

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Suporte

- **WhatsApp**: +55 (73) 99934-8552
- **Email**: contato@fastcashflow.com
- **Issues**: [GitHub Issues](https://github.com/seu-usuario/fast-cash-flow/issues)

---

Desenvolvido com ❤️ por [Seu Nome]

**Fast Cash Flow** - Gestão de fluxo de caixa simples e eficiente para sua empresa.
