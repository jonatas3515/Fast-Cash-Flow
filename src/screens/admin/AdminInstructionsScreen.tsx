import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  Modal,
} from 'react-native';
import { useThemeCtx } from '../../theme/ThemeProvider';

interface InstructionCard {
  id: string;
  icon: string;
  title: string;
  shortDescription: string;
  fullContent: string;
  color: string;
}

interface Section {
  id: string;
  title: string;
  icon: string;
  cards: InstructionCard[];
}

export default function AdminInstructionsScreen() {
  const { theme } = useThemeCtx();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const isTwoColumns = width >= 600;
  const [selectedCard, setSelectedCard] = useState<InstructionCard | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const sections: Section[] = [
    {
      id: 'visao_geral',
      title: 'Visão Geral',
      icon: '🏠',
      cards: [
        {
          id: 'dashboard',
          icon: '📊',
          title: 'Dashboard Administrativo',
          shortDescription: 'Central de controle com estatísticas em tempo real de todas as empresas.',
          color: '#F3E8FF',
          fullContent: `O Dashboard Admin é sua central de controle do Fast Cash Flow.

📊 VISÃO GERAL
O Dashboard mostra em tempo real todas as estatísticas importantes do seu negócio SaaS.

🎯 CARDS PRINCIPAIS E NAVEGAÇÃO

📋 SEÇÃO: SOLICITAÇÕES
• Pendentes: Número de empresas aguardando aprovação
  - Clique no card para ir direto à aba "Solicitações"
  - Alerta amarelo se houver solicitações há mais de 3 dias
  
• Aprovadas este mês: Quantas empresas foram aprovadas no mês atual
  - Clique para ver histórico completo de aprovações
  - Meta sugerida: 10+ aprovações/mês

🏢 SEÇÃO: EMPRESAS
• Total de empresas: Número de empresas ativas (deleted_at = NULL)
  - Clique para ver lista completa de empresas
  - Inclui empresas em trial e pagas
  
• Empresas excluídas: Empresas marcadas como deletadas (soft delete)
  - Clique para ver empresas em processo de exclusão
  - Mostrado em dias restantes até exclusão permanente (90 dias)

💳 SEÇÃO: STATUS DE ASSINATURAS
• Em período trial: Empresas usando teste gratuito
• Assinaturas ativas: Empresas pagando mensalmente
• Expiradas/Bloqueadas: Empresas com problemas

📈 ATUALIZAÇÕES
• Estatísticas atualizadas automaticamente a cada 30 segundos
• Dados vêm direto do Supabase em tempo real`,
        },
        {
          id: 'reports_admin',
          icon: '📈',
          title: 'Relatórios Administrativos',
          shortDescription: 'Gere análises completas e exporte dados em CSV/PDF.',
          color: '#EDE9FE',
          fullContent: `A aba Relatórios gera análises completas do Fast Cash Flow.

📈 VISÃO GERAL DO SISTEMA

O relatório mostra:

1. TOTAL DE EMPRESAS
• Cadastradas (todas, incluindo excluídas)
• Ativas (podem acessar o sistema)
• Em trial (teste gratuito)
• Trials expirados (precisam renovar)

2. RECEITA MENSAL RECORRENTE (MRR)
• Empresas ativas × valor do plano
• Não inclui empresas em trial

3. CRESCIMENTO
• Novos cadastros este mês
• Taxa de conversão (trial → pago)
• Churn rate (cancelamentos)
• Crescimento % mês a mês

📊 EXPORTAR RELATÓRIO CSV

Ao clicar em "Exportar CSV", o sistema gera arquivo com:
• ID da empresa
• Nome da empresa
• Username (login)
• Email e Telefone
• Status (trial, active, expired, blocked)
• Data de cadastro
• Trial início e fim
• Dias de trial restantes
• Plano (preço mensal)
• Último acesso
• Total de lançamentos

USO DO CSV:
📱 Mobile: Compartilha via WhatsApp/Email
💻 Web: Download direto para o computador`,
        },
      ],
    },
    {
      id: 'gestao_clientes',
      title: 'Gestão de Clientes',
      icon: '🏢',
      cards: [
        {
          id: 'companies',
          icon: '🏢',
          title: 'Gerenciar Empresas',
          shortDescription: 'Visualize, edite e gerencie todas as contas cadastradas.',
          color: '#DBEAFE',
          fullContent: `A aba Empresas permite gerenciar todas as contas cadastradas no Fast Cash Flow.

📑 ABAS DISPONÍVEIS

1️⃣ ATIVAS
Empresas operacionais que podem acessar o sistema.

Informações exibidas:
• Nome da empresa
• Username (login único)
• Email e telefone de contato
• Logo da empresa (se configurado)
• Status: TRIAL, ACTIVE, EXPIRED ou BLOCKED
• Plano: Mensal ou Vitalício
• Trial: Dias restantes de teste gratuito

2️⃣ EXCLUÍDAS
Empresas marcadas como deletadas (soft delete de 90 dias).

✏️ EDITAR EMPRESA

Ao clicar em "Editar", você pode alterar:

1. DADOS BÁSICOS
• Nome de usuário (username) - deve ser único
• Email de contato
• Telefone
• Logo URL (link direto da imagem)

2. CONFIGURAÇÕES DE PLANO
• Preço do plano (R$)
• Desconto percentual (%)
• Valor final = Preço × (1 - Desconto/100)

3. ACESSO E CREDENCIAIS
• Senha provisória - deixe em branco para não alterar

4. LIBERAR PERÍODO GRÁTIS
Use para dar tempo extra de trial:
• Dias: ex: 7 = +7 dias
• Meses: ex: 1 = +30 dias
• Anos: ex: 1 = +365 dias`,
        },
        {
          id: 'requests',
          icon: '📋',
          title: 'Aprovar Solicitações',
          shortDescription: 'Gerencie pedidos de cadastro de novas empresas.',
          color: '#FEF3C7',
          fullContent: `A aba Solicitações gerencia pedidos de cadastro de novas empresas.

🆕 O QUE SÃO SOLICITAÇÕES?

Quando alguém se cadastra pela primeira vez:
1. Preenche dados da empresa (nome, responsável, email, telefone)
2. Solicitação fica com status 'pending'
3. Aguarda aprovação manual do administrador
4. Admin recebe notificação no Dashboard

📝 INFORMAÇÕES DA SOLICITAÇÃO

Cada solicitação mostra:
• Nome da empresa
• Nome do proprietário/responsável
• Email de contato
• Telefone (WhatsApp)
• Endereço completo
• CNPJ (se fornecido)
• Data da solicitação
• Status: PENDING, APPROVED ou REJECTED

✅ APROVAR SOLICITAÇÃO

Quando você clica em "Aprovar":

1. CRIAÇÃO AUTOMÁTICA DE EMPRESA
• Sistema cria registro na tabela 'companies'
• Define username único
• Gera senha provisória aleatória
• Configura trial_start = hoje
• Configura trial_end = hoje + dias configurados
• Status inicial = 'trial'

2. O QUE FAZER APÓS APROVAR
📧 Envie as credenciais por email ou WhatsApp

❌ REJEITAR SOLICITAÇÃO
• Status muda para 'rejected'
• Empresa NÃO é criada
• Envie mensagem manual explicando o motivo`,
        },
        {
          id: 'delinquency',
          icon: '🔴',
          title: 'Gestão de Inadimplência',
          shortDescription: 'Monitore empresas com problemas de pagamento.',
          color: '#FEE2E2',
          fullContent: `A aba Inadimplência monitora empresas com problemas de pagamento.

🚦 CLASSIFICAÇÃO POR DIAS

🟡 AMARELO (1-7 dias)
• Ação: Lembrete gentil por email/WhatsApp
• Mensagem: "Notamos que seu período gratuito terminou..."

🟠 LARANJA (8-15 dias)
• Ação: Bloqueio parcial (apenas visualização)
• Mensagem: "Seu acesso foi limitado..."

🔴 VERMELHO (16-30 dias)
• Ação: Bloqueio total
• Mensagem: "Sua conta foi suspensa..."

⚫ PRETO (30+ dias)
• Ação: Preparar para exclusão
• Mensagem: "Última chance antes da exclusão..."

⚡ AÇÕES DISPONÍVEIS

1. 📧 Enviar Lembrete: Template automático
2. 📱 WhatsApp: Mensagem direta
3. 🔒 Bloquear: Suspender acesso
4. 🗑️ Soft Delete: Marcar para exclusão

💡 FLUXO RECOMENDADO

Dia 3: Lembrete automático
Dia 7: Contato pessoal (WhatsApp)
Dia 15: Bloqueio parcial + oferta
Dia 30: Bloqueio total
Dia 90: Exclusão permanente`,
        },
      ],
    },
    {
      id: 'engajamento_saude',
      title: 'Engajamento & Saúde',
      icon: '💚',
      cards: [
        {
          id: 'health_score',
          icon: '💚',
          title: 'Score de Saúde do Cliente',
          shortDescription: 'Mede o engajamento e risco de churn de cada empresa.',
          color: '#ECFDF5',
          fullContent: `O Health Score mede a "saúde" de cada empresa cliente, indicando quem está engajado, quem está em risco de cancelar e quem precisa de atenção.

🎯 COMO FUNCIONA

O sistema calcula um score com base em:
• Frequência de login
• Número de lançamentos
• Uso de funcionalidades-chave (metas, A receber/A pagar, pricing, relatórios)
• Tickets de suporte abertos
• Inadimplência
• Cumprimento de metas

📊 FAIXAS DE SAÚDE

Cada componente recebe pontuação de 0 a 10, resultando em:

🟢 Verde (saudável): 70-100 pontos
Cliente engajado, usando o produto regularmente.

🟡 Amarelo (em risco): 40-69 pontos
Uso esporádico ou funcionalidades subutilizadas.

🔴 Vermelho (crítico): 0-39 pontos
Inativo, com problemas ou em risco de churn.

📱 COMO USAR

No Dashboard Admin e na tela Empresas:
• Veja o health score de cada cliente ao lado do nome
• Ordene e filtre por faixa de saúde
• Para clientes amarelos/vermelhos, use botões rápidos:
  - Enviar mensagem de orientação
  - Marcar para contato de suporte
  - Oferecer treinamento

💡 DICA
Acompanhe o health score semanalmente e aja proativamente em clientes amarelos antes que fiquem vermelhos.`,
        },
        {
          id: 'benchmarks_admin',
          icon: '📊',
          title: 'Benchmarks entre Empresas',
          shortDescription: 'Estatísticas agregadas e anônimas da base de clientes.',
          color: '#DBEAFE',
          fullContent: `Gera estatísticas agregadas e anônimas da base de clientes, ajudando a identificar padrões de sucesso e criar conteúdo educativo.

📈 COMO FUNCIONA

Em Analytics, você vê gráficos por tipo de negócio:
• Média de faturamento
• Ticket médio
• % de meses batendo meta
• Uso de recursos (quantos usam pricing, relatórios, etc.)

O sistema identifica correlações, como:
"Negócios de delivery que usam metas e A receber/A pagar têm taxa de ativação 30% maior"

🎯 COMO USAR

Use esses insights para:
• Melhorar comunicação com clientes
• Criar materiais educativos
• Broadcasts segmentados
• Orientações personalizadas

Identifique quais funcionalidades têm maior impacto em retenção e promova-as ativamente.

No futuro, esses dados alimentam mensagens dentro do app do cliente, como:
"Empresas como a sua que usam X costumam ter resultado Y% melhor"

💡 DICA
Compartilhe benchmarks anonimizados em newsletters e conteúdos; isso aumenta percepção de valor do produto.`,
        },
        {
          id: 'funnel',
          icon: '🎯',
          title: 'Funil de Trial e Engajamento',
          shortDescription: 'Acompanhe a jornada do cliente desde cadastro até retenção.',
          color: '#FEF3C7',
          fullContent: `Acompanha a jornada do cliente desde o cadastro até a conversão e retenção, identificando onde as pessoas travam e onde convertem melhor.

📈 EVENTOS-CHAVE DE ATIVAÇÃO

• Criar empresa
• Cadastrar produto/serviço
• Registrar X lançamentos
• Definir meta

Em Analytics/Conversão, você vê:
• Taxa de ativação (% que completou os passos-chave)
• Tempo médio até ativação
• Principais pontos de travamento

📊 PAINEL DE ENGAJAMENTO RECORRENTE

Mostra:
• Quantos dias no mês cada conta acessou o app
• Quantos lançamentos fez
• Se está usando metas, dívidas, produtos/pricing
• Se gerou relatórios

🏷️ SEGMENTOS AUTOMÁTICOS

• "Usuários em risco": ficaram X dias sem logar
• "Usuários altamente engajados": lançam quase todos os dias
• "Usuários só de consulta": acessam mas quase não lançam

🎯 COMO USAR

• Monitore a taxa de ativação semanalmente
• Se cair, investigue qual passo está gerando atrito
• Use os segmentos para criar ações direcionadas
• Integre com Broadcast e Suporte
• Meça resposta das ações

💡 DICA
O funil é seu "laboratório" contínuo de melhoria de produto. Teste hipóteses, meça impacto e ajuste estratégias com base em dados reais.`,
        },
      ],
    },
    {
      id: 'comunicacao',
      title: 'Comunicação',
      icon: '📢',
      cards: [
        {
          id: 'broadcast',
          icon: '📢',
          title: 'Comunicação Segmentada',
          shortDescription: 'Envie mensagens para grupos específicos de clientes.',
          color: '#D1FAE5',
          fullContent: `Permite enviar mensagens, orientações e materiais educativos para grupos específicos de clientes, com base em comportamento e health score.

📨 COMO FUNCIONA

Em Broadcast, você seleciona um segmento:
• "Usuários em risco"
• "Tipo de negócio: Lanchonete"
• "Não usam metas"

E cria a mensagem.

📱 TIPOS DE MENSAGEM

• In-app: aparece no dashboard do cliente
• Push notification
• E-mail (se integrado no futuro)

💬 EM SUPORTE

Você vê tickets abertos por empresa, com:
• Contexto de health score
• Histórico de uso
• Facilitando atendimento personalizado

🎯 COMO USAR

1. Crie campanhas educativas regulares:
   • "Como usar A receber/A pagar"
   • "Dicas para formar preço"
   • "Novidades do app"

2. Para clientes em risco (amarelos/vermelhos):
   • Envie mensagem proativa oferecendo ajuda

3. Após lançar nova funcionalidade:
   • Crie broadcast segmentado para quem ainda não usou

4. Meça efetividade:
   • Taxa de abertura
   • Engajamento pós-mensagem

💡 DICA
Não envie mensagens genéricas para toda a base; segmentação aumenta muito a relevância e reduz percepção de spam.`,
        },
        {
          id: 'support',
          icon: '💬',
          title: 'Suporte e Chat',
          shortDescription: 'Gerencie comunicação direta com empresas.',
          color: '#DBEAFE',
          fullContent: `A aba Suporte gerencia comunicação com empresas.

💬 CHAT INTERNO

Comunicação direta Admin ↔ Empresa:
• Mensagens em tempo real
• Histórico completo
• Notificações de novas mensagens
• Status: lido/não lido

📋 GERENCIAR CONVERSAS

• Todas: Lista completa de conversas
• Não lidas: Aguardando resposta
• Arquivadas: Conversas encerradas

🎯 BOAS PRÁTICAS

1. Responda em até 2 horas (horário comercial)
2. Use linguagem clara e amigável
3. Ofereça soluções, não apenas respostas
4. Escale problemas técnicos quando necessário
5. Documente problemas recorrentes

📚 FAQ E TUTORIAIS

Central de ajuda com:
• Perguntas frequentes
• Tutoriais em vídeo
• Guias passo a passo
• Dicas de uso`,
        },
      ],
    },
    {
      id: 'relatorios_dados',
      title: 'Relatórios & Dados',
      icon: '📊',
      cards: [
        {
          id: 'backup_central',
          icon: '☁️',
          title: 'Backup Central e Auditoria',
          shortDescription: 'Segurança dos dados e rastreamento de ações críticas.',
          color: '#DBEAFE',
          fullContent: `Garante segurança dos dados de todas as empresas e permite rastrear ações críticas no sistema.

💾 BACKUP CENTRAL

Rotina automática que salva snapshot completo do banco de dados em intervalos configuráveis (diário, semanal).

📜 AUDITORIA

Registra logs de ações importantes:
• Criação/exclusão de empresa
• Alteração de permissões
• Exportações de dados
• Envios de broadcast

📱 COMO USAR

Em Backup Central:
• Veja lista de backups realizados
• Data, tamanho e status (sucesso/falha)
• Você pode baixar, restaurar ou agendar novos backups

Em Auditoria:
• Filtre por empresa, usuário admin, tipo de ação e período
• Use para investigar problemas
• Auditorias de compliance

🔄 RESTAURAR BACKUP

1. Selecione a empresa
2. Escolha o backup desejado
3. Confirme a restauração
4. Sistema cria backup pré-restauração
5. Dados são restaurados

💡 DICA
Mantenha pelo menos 3 backups rotativos (diário, semanal, mensal) e teste restauração periodicamente.`,
        },
        {
          id: 'analytics',
          icon: '📈',
          title: 'Analytics e Métricas',
          shortDescription: 'Métricas detalhadas de uso e engajamento.',
          color: '#ECFDF5',
          fullContent: `A aba Analytics mostra métricas detalhadas de uso e engajamento.

📊 MÉTRICAS DE USO

• Empresas Ativas: Quantas acessaram nos últimos 7 dias
• Transações/Mês: Total de lançamentos de todas as empresas
• Health Score: Pontuação de saúde de cada empresa (0-100)

💵 MRR (Receita Mensal Recorrente)

• MRR Atual: Empresas ativas × valor do plano
• MRR Potencial: Trials que podem converter
• Churn Estimado: Previsão de cancelamentos

📈 PROJEÇÕES

• Próximo mês: MRR + novos - churn
• 3 meses: Tendência de crescimento
• 12 meses: Projeção anual

📊 HISTÓRICO

• Gráfico de evolução do MRR
• Comparativo mês a mês
• Sazonalidade identificada

💡 AÇÕES PARA AUMENTAR MRR

1. Converter mais trials
2. Reduzir churn
3. Upsell para plano anual
4. Programa de indicação
5. Expansão de funcionalidades`,
        },
      ],
    },
    {
      id: 'config_avancadas',
      title: 'Configurações Avançadas',
      icon: '⚙️',
      cards: [
        {
          id: 'settings_admin',
          icon: '⚙️',
          title: 'Configurações do Sistema',
          shortDescription: 'Ajuste parâmetros de trial, preços e contato.',
          color: '#FEF9C3',
          fullContent: `A aba Configurações permite ajustar parâmetros do sistema.

⏰ CONFIGURAÇÕES DE TRIAL

• Dias de Trial Padrão: Quantos dias de teste gratuito
• Valor padrão: 30 dias
• Aplicado automaticamente em novas aprovações

💰 PREÇOS

• Preço Mensal: R$ 9,99 (padrão)
• Preço Anual: R$ 99,99 (padrão)
• Desconto anual: ~17% automático

📱 CONTATO

• Número WhatsApp para suporte
• Usado no modal de upgrade
• Formato: +55 (XX) XXXXX-XXXX

💾 ONDE FICAM SALVAS

• localStorage do navegador/app
• Carregadas automaticamente no login
• Aplicadas em todas as telas

🔄 COMO ALTERAR

1. Acesse a aba "Configurações"
2. Modifique os valores desejados
3. Clique em "Salvar"
4. Alterações aplicadas imediatamente

⚠️ ATENÇÃO
• Alterações de preço NÃO afetam assinaturas existentes
• Novos trials usarão os novos valores`,
        },
        {
          id: 'coupons',
          icon: '🎟️',
          title: 'Cupons e Promoções',
          shortDescription: 'Gerencie descontos e campanhas promocionais.',
          color: '#FEF3C7',
          fullContent: `A aba Cupons gerencia descontos e promoções.

🎫 TIPOS DE CUPOM

1. PORCENTAGEM
• Ex: 20% de desconto
• Aplicado sobre o valor do plano

2. VALOR FIXO
• Ex: R$ 5,00 de desconto
• Deduzido do valor total

📋 CONFIGURAÇÕES

• Código: Ex: BEMVINDO20
• Tipo: Porcentagem ou Fixo
• Valor: Quantidade do desconto
• Duração: Meses de validade
• Limite: Máximo de usos
• Aplicável a: Todos, Novos, Renovações

📊 ESTATÍSTICAS

• Total de usos
• Receita gerada
• Desconto total concedido
• Taxa de conversão com cupom

💡 CUPONS SUGERIDOS

• BEMVINDO: 20% para novos
• ANUAL50: 50% no plano anual
• INDICACAO: 1 mês grátis
• FIDELIDADE: 15% para renovação

🎯 PREPARAÇÃO FUTURA
Mesmo sem planos pagos agora, estruture o sistema de cupons no código para ativar rapidamente quando monetizar.`,
        },
        {
          id: 'permissions',
          icon: '🔐',
          title: 'Permissões e Equipe Admin',
          shortDescription: 'Controle quem tem acesso ao painel admin.',
          color: '#EDE9FE',
          fullContent: `Controla quem tem acesso ao painel admin e quais ações cada membro pode realizar.

👥 PAPÉIS DISPONÍVEIS

• Super Admin: Acesso total
• Analista: Apenas leitura de Analytics/Empresas
• Suporte: Acesso a tickets e broadcast
• Desenvolvedor: Backup/Auditoria

📋 COMO FUNCIONA

Em Equipe/Permissões:
• Adicione membros
• Atribua papel
• Configure permissões granulares
  (ex.: pode ver empresas mas não deletar)

🎯 COMO USAR

1. Adicione apenas pessoas confiáveis como Super Admin
2. Para terceiros (analistas, estagiários), use papéis restritos
3. Revise permissões trimestralmente
4. Remova acessos de quem saiu da equipe

🔒 SEGURANÇA

Toda ação de permissão deve ficar logada em Auditoria para rastreabilidade.

💡 DICA
Mantenha o princípio do menor privilégio: cada pessoa deve ter apenas as permissões necessárias para seu trabalho.`,
        },
        {
          id: 'menu_organizado',
          icon: '📁',
          title: 'Menu Lateral Organizado',
          shortDescription: 'Navegação agrupada por objetivo no painel admin.',
          color: '#F3E8FF',
          fullContent: `Facilita a navegação no painel admin, agrupando funcionalidades por objetivo e reduzindo a sensação de "sistema gigante".

📂 ORGANIZAÇÃO DO MENU

• Visão Geral: Dashboard, Relatórios principais
• Clientes/Empresas: Empresas, Saúde dos clientes, Inadimplência
• Produto & Uso: Analytics, Conversão, Funil/Engajamento, Benchmarks
• Comunicação & Suporte: Broadcast, Suporte/Tickets, Pedidos/Requests
• Infra & Dados: Backup central, Auditoria, Importações
• Configurações: Configurações admin, Cupons, Equipe/Permissões

🎯 COMO USAR

• Seções são colapsáveis
• Clique no título para expandir/recolher
• Mantenha foco no que interessa
• Itens mais usados (Dashboard, Empresas, Analytics) ficam no topo
• Ícones visuais ajudam a identificar cada área

💡 DICA
Personalize o menu conforme seu workflow: mantenha expandidas apenas as seções que você usa diariamente.`,
        },
      ],
    },
  ];

  const renderCard = (card: InstructionCard) => (
    <TouchableOpacity
      key={card.id}
      style={[
        styles.card,
        { backgroundColor: theme.card, borderLeftColor: card.color, borderLeftWidth: 4 },
        isTwoColumns && styles.cardTwoColumns,
      ]}
      onPress={() => setSelectedCard(card)}
      activeOpacity={0.7}
    >
      <View style={[styles.cardHeader, { backgroundColor: card.color }]}>
        <Text style={styles.cardIcon}>{card.icon}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>
          {card.title}
        </Text>
        <Text style={[styles.cardDescription, { color: theme.textSecondary }]} numberOfLines={3}>
          {card.shortDescription}
        </Text>
        <View style={styles.cardFooter}>
          <Text style={[styles.cardButton, { color: '#3B82F6' }]}>Ver detalhes →</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>📖 Instruções do Admin</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Guia completo para gerenciar o Fast Cash Flow
          </Text>
        </View>

        <View style={[styles.content, isDesktop && styles.contentDesktop]}>
          {sections.map((section) => (
            <View key={section.id} style={styles.section}>
              <TouchableOpacity
                style={[styles.sectionHeader, { backgroundColor: theme.card }]}
                onPress={() => toggleSection(section.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.sectionIcon}>{section.icon}</Text>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{section.title}</Text>
                <Text style={[styles.sectionToggle, { color: theme.textSecondary }]}>
                  {collapsedSections.has(section.id) ? '▼' : '▲'}
                </Text>
              </TouchableOpacity>

              {!collapsedSections.has(section.id) && (
                <View style={[styles.cardsContainer, isTwoColumns && styles.cardsContainerTwoColumns]}>
                  {section.cards.map(renderCard)}
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            Fast Cash Flow - Painel Administrativo v2.0
          </Text>
          <Text style={[styles.footerText, { color: theme.textSecondary, marginTop: 4 }]}>
            Última atualização: Dezembro 2024
          </Text>
        </View>
      </ScrollView>

      {/* Modal de Detalhes */}
      <Modal
        visible={selectedCard !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedCard(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }, isDesktop && styles.modalContentDesktop]}>
            <View style={[styles.modalHeader, { backgroundColor: selectedCard?.color || '#F3E8FF' }]}>
              <Text style={styles.modalIcon}>{selectedCard?.icon}</Text>
              <Text style={styles.modalTitle}>{selectedCard?.title}</Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setSelectedCard(null)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={[styles.modalText, { color: theme.text }]}>
                {selectedCard?.fullContent}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  content: {
    padding: 16,
  },
  contentDesktop: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionIcon: {
    fontSize: 22,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionToggle: {
    fontSize: 14,
  },
  cardsContainer: {
    marginTop: 12,
    gap: 12,
  },
  cardsContainerTwoColumns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTwoColumns: {
    width: '48.5%',
    marginRight: '1.5%',
    marginBottom: 12,
  },
  cardHeader: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: {
    fontSize: 36,
  },
  cardBody: {
    padding: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  cardFooter: {
    alignItems: 'flex-end',
  },
  cardButton: {
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalContentDesktop: {
    maxWidth: 700,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  modalIcon: {
    fontSize: 32,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 18,
    color: '#1F2937',
    fontWeight: '600',
  },
  modalBody: {
    padding: 16,
    maxHeight: 500,
  },
  modalText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
