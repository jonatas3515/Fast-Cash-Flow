import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import ScreenTitle from '../components/ScreenTitle';

interface InstructionCard {
  id: string;
  icon: string;
  title: string;
  shortDescription?: string;
  fullContent: string;
  color: string;
}

interface Section {
  id: string;
  title: string;
  icon: string;
  description: string;
  cards: InstructionCard[];
}

export default function InstructionsScreen() {
  const { theme } = useThemeCtx();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const isTwoColumns = width >= 600;
  const [selectedCard, setSelectedCard] = useState<InstructionCard | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Quick action cards for common topics
  const quickActions = [
    { id: 'qa1', icon: '🚀', title: 'Começar', filter: 'primeiros' },
    { id: 'qa2', icon: '💰', title: 'Transações', filter: 'transação' },
    { id: 'qa3', icon: '📊', title: 'Relatórios', filter: 'relatório' },
    { id: 'qa4', icon: '🎯', title: 'Metas', filter: 'meta' },
  ];

  // Controle de seções colapsáveis
  // Por padrão, deixamos o "Guia Rápido" (faq) expandido
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['faq']));

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // --- 1. AS 15 INSTRUÇÕES CLÁSSICAS ---
  const classicCards: InstructionCard[] = [
    {
      id: 'dashboard',
      icon: '📊',
      title: 'Como interpretar o Dashboard',
      color: '#F3E8FF',
      fullContent: `📊 COMO INTERPRETAR O DASHBOARD

O Dashboard é a tela principal onde você tem uma visão geral da saúde do seu negócio.

1. Resumo Financeiro:
   • Entradas: Total de vendas e recebimentos.
   • Saídas: Total de despesas e custos.
   • Saldo: O valor líquido (Entradas - Saídas).

2. Gráficos:
   • Gráfico de Barras/Linha: Mostra a evolução das suas finanças ao longo dos dias do mês.
   • Gráfico de Pizza: Mostra a distribuição das suas despesas por categoria.

3. Atalhos Rápidos:
   Botões no topo para adicionar rapidamente novas transações.

💡 Dica: Use os filtros de data no topo para ver períodos específicos (Dia, Semana, Mês).`,
    },
    {
      id: 'transaction',
      icon: '💰',
      title: 'Como adicionar uma transação (entrada/saída)',
      color: '#DBEAFE',
      fullContent: `💰 COMO ADICIONAR TRANSAÇÕES

Registrar suas movimentações é essencial para o controle.

1. Toque no botão "+" (flutuante ou no menu).
2. Escolha o tipo:
   • Receita (Verde): Vendas, recebimentos.
   • Despesa (Vermelho): Contas, compras, pagamentos.
3. Digite o valor.
4. Digite uma descrição (ex: "Venda de Bolo").
5. Selecione a Categoria.
6. Ajuste a data se não for hoje.
7. Clique em Salvar.

💡 Dica: Seja consistente! Registre tudo, até os pequenos gastos.`,
    },
    {
      id: 'debts',
      icon: '💳',
      title: 'Como cadastrar e acompanhar dívidas',
      color: '#FEE2E2',
      fullContent: `💳 GERENCIANDO DÍVIDAS E CONTAS A PAGAR

Não perca prazos de pagamento.

1. Acesse o menu "Dívidas" ou "A Pagar".
2. Clique em "Adicionar Dívida".
3. Preencha:
   • Descrição (ex: Fornecedor X)
   • Valor total
   • Data de vencimento
4. Acompanhamento:
   • O app mostrará dias restantes para o vencimento.
   • Quando pagar, marque como "Paga" para dar baixa.

⚠️ O ícone ficará vermelho se a dívida estiver vencida!`,
    },
    {
      id: 'credit_card',
      icon: '💳',
      title: 'Como lançar compras no cartão de crédito',
      color: '#FEF3C7',
      fullContent: `💳 COMPRAS NO CARTÃO DE CRÉDITO

Para controlar gastos parcelados ou fatura.

1. Ao adicionar uma DESPESA.
2. No campo "Forma de Pagamento" ou "Conta", selecione "Cartão de Crédito".
3. Se for parcelado, informe o número de parcelas.
   • O app pode dividir o valor automaticamente nos meses seguintes.
4. Essas despesas aparecerão na data de compra, mas você pode controlar o pagamento da fatura separadamente.`,
    },
    {
      id: 'orders',
      icon: '📦',
      title: 'Como cadastrar e acompanhar encomendas',
      color: '#FEF3C7',
      fullContent: `📦 GESTÃO DE ENCOMENDAS

Ideal para quem trabalha com entregas ou delivery.

1. Acesse o módulo "Encomendas".
2. Clique em "Nova Encomenda".
3. Informe:
   • Nome do Cliente
   • Produto/Pedido
   • Data de Entrega
   • Valor Combinado
4. Atualize o status:
   • Pendente -> Em Preparo -> Pronto -> Entregue.

✅ Isso ajuda a organizar sua produção diária e não atrasar entregas.`,
    },
    {
      id: 'recurring',
      icon: '🔄',
      title: 'Como cadastrar despesas recorrentes',
      color: '#FEF3C7',
      fullContent: `🔄 DESPESAS RECORRENTES (FIXAS)

Para contas que se repetem todo mês (Aluguel, Internet, Luz).

1. Adicione uma despesa normalmente.
2. Ative a opção "Repetir" ou "Recorrente".
3. Escolha a frequência (Mensal, Semanal, etc.).
4. O app lançará automaticamente essa despesa nos períodos futuros.

💡 Isso economiza tempo e já deixa seu fluxo de caixa futuro previsto.`,
    },
    {
      id: 'goals',
      icon: '🎯',
      title: 'Como definir e acompanhar metas financeiras',
      color: '#ECFDF5',
      fullContent: `🎯 METAS FINANCEIRAS

Defina objetivos para motivar seu crescimento.

1. Vá em "Metas" ou no card de Metas do Dashboard.
2. Defina um valor alvo para o mês (ex: Faturar R$ 5.000).
3. O app mostrará uma barra de progresso.
4. Acompanhe a % atingida dia a dia.

🏆 Atingir metas ajuda a manter o foco no crescimento do negócio.`,
    },
    {
      id: 'reports',
      icon: '📄',
      title: 'Como gerar relatórios em PDF ou enviar por WhatsApp',
      color: '#F3E8FF',
      fullContent: `📄 RELATÓRIOS E COMPARTILHAMENTO

Envie dados para seu contador ou sócio.

1. Acesse a aba "Relatórios".
2. Escolha o período desejado (Mês atual, Ano, Personalizado).
3. Clique em "Exportar" ou ícone de compartilhar.
4. Escolha o formato (PDF para visualização, CSV/Excel para planilhas).
5. Selecione o WhatsApp ou E-mail para enviar o arquivo gerado.`,
    },
    {
      id: 'settings',
      icon: '⚙️',
      title: 'Como personalizar configurações e alertas',
      color: '#ECFDF5',
      fullContent: `⚙️ CONFIGURAÇÕES E ALERTAS

Ajuste o app ao seu gosto.

1. Acesse o menu "Configurações".
2. Em "Alertas":
   • Ative lembretes diários para não esquecer de registrar.
   • Ative avisos de contas a pagar.
3. Em "Geral":
   • Altere moeda, idioma ou tema (Claro/Escuro).`,
    },
    {
      id: 'categories',
      icon: '🏷️',
      title: 'Categorias Personalizadas',
      color: '#F3E8FF',
      fullContent: `🏷️ CATEGORIAS PERSONALIZADAS

Organize seus lançamentos do seu jeito.

1. Vá em Configurações > Categorias.
2. Você verá a lista padrão.
3. Clique em "+" para criar nova.
4. Escolha um ícone e uma cor.
5. Dê um nome (ex: "Embalagens", "Ingredientes Especiais").

Agora essa categoria aparecerá na hora de lançar uma transação.`,
    },
    {
      id: 'backup',
      icon: '☁️',
      title: 'Backup de Dados',
      color: '#DBEAFE',
      fullContent: `☁️ BACKUP E SEGURANÇA

Seus dados seguros na nuvem.

• O app sincroniza automaticamente seus dados com o servidor seguro (Supabase).
• Se você trocar de celular, basta fazer login com seu e-mail e senha que tudo estará lá.
• Não é necessário salvar arquivos manualmente, a sincronização é automática quando há internet.`,
    },
    {
      id: 'custom_dashboard',
      icon: '🎨',
      title: 'Dashboard Personalizável',
      color: '#FEE2E2',
      fullContent: `🎨 PERSONALIZAR DASHBOARD

Deixe a tela inicial com a sua cara.

• Você pode ocultar valores (ícone de olho) para privacidade.
• Algumas versões permitem reordenar os cards.
• Use o filtro de período no topo para ver apenas o que interessa no momento.`,
    },
    {
      id: 'notifications',
      icon: '🔔',
      title: 'Notificações Personalizadas',
      color: '#FEF3C7',
      fullContent: `🔔 CENTRAL DE NOTIFICAÇÕES

Fique por dentro de tudo.

O app envia notificações sobre:
• Contas vencendo hoje ou amanhã.
• Dicas de economia.
• Lembretes para registrar o fechamento do caixa.
• Avisos de metas atingidas.

Você pode gerenciar quais notificações quer receber nas Configurações.`,
    },
    {
      id: 'advanced_goals',
      icon: '🏆',
      title: 'Metas Financeiras Avançadas',
      color: '#ECFDF5',
      fullContent: `🏆 METAS AVANÇADAS

Vá além do básico.

Além da meta de faturamento mensal, você pode definir:
• Teto de Gastos: Limite máximo para despesas (ex: Gastar max R$ 2.000).
• Metas por Categoria: Ex: Gastar menos de R$ 500 com Transporte.

Acompanhe cada uma individualmente para identificar onde economizar.`,
    },
    {
      id: 'sync',
      icon: '🔄',
      title: 'Sincronização em Tempo Real',
      color: '#F3E8FF',
      fullContent: `🔄 SINCRONIZAÇÃO EM TEMPO REAL

Use em múltiplos dispositivos.

• Você pode usar o app no celular e no computador (via Web).
• Tudo o que fizer em um, aparece no outro instantaneamente (necessário internet).
• Ideal para sócios ou casais que gerenciam o negócio juntos.`,
    },
  ];

  // --- 2. AS INSTRUÇÕES DETALHADAS (NOVAS) ---
  const sections: Section[] = [
    {
      id: 'faq',
      title: 'Guia Rápido (Perguntas Frequentes)',
      icon: '❓',
      description: 'Respostas rápidas para as principais dúvidas de uso.',
      cards: classicCards,
    },
    {
      id: 'primeiros_passos',
      title: 'Primeiros Passos e Configuração',
      icon: '🚀',
      description: 'Comece com o pé direito configurando o app para seu negócio.',
      cards: [
        {
          id: 'modo_iniciante',
          icon: '🎓',
          title: 'Modo Iniciante Guiado',
          shortDescription: 'Passo a passo inicial para configurar sua conta.',
          color: '#DBEAFE',
          fullContent: `🎓 MODO INICIANTE GUIADO

Para que serve:
Ajuda você a dar os primeiros passos no app de forma simples e rápida, sem ficar perdido.

📱 Como usar:

1. Logo após cadastrar sua empresa, siga a lista de tarefas "Primeiros Passos".

2. Ações recomendadas:
   • Registrar primeira entrada
   • Registrar primeira saída
   • Definir meta mensal
   • Cadastrar pelo menos um produto ou serviço

3. O app vai liberando funcionalidades mais avançadas conforme você completa esses passos.

💡 DICA: Não pule o modo iniciante! Ele garante que sua base de dados fique correta desde o dia 1.`,
        },
        {
          id: 'perfis_uso',
          icon: '🏪',
          title: 'Perfis de Uso (Segmentos)',
          shortDescription: 'Adaptação do app para Lanchonetes, Serviços, Lojas, etc.',
          color: '#FEF3C7',
          fullContent: `🏪 PERFIS DE USO (SEGMENTOS DE NEGÓCIO)

Para que serve:
Adapta o app para falar a língua do seu tipo de negócio.

⚙️ Como configurar:
1. Vá em "Configurações" > "Dados da Empresa"
2. Escolha seu tipo de negócio (Lanchonete, Loja, Serviços, Autônomo).

O que muda:
• Categorias sugeridas (ex: "Ingredientes" para comida, "Peças" para lojas).
• Dicas personalizadas.
• Terminologias nos relatórios.

💡 DICA: Escolher o perfil certo economiza tempo criando categorias manualmente.`,
        },
      ],
    },
    {
      id: 'gestao_financeira',
      title: 'Gestão Financeira Avançada',
      icon: '📈',
      description: 'Domine o fluxo de caixa, diagnósticos e rotinas.',
      cards: [
        {
          id: 'semaforo_saude',
          icon: '🚦',
          title: 'Semáforo de Saúde Financeira',
          shortDescription: 'Entenda se sua empresa está no Verde, Amarelo ou Vermelho.',
          color: '#ECFDF5',
          fullContent: `🚦 SEMÁFORO DE SAÚDE FINANCEIRA

Para que serve:
Diagnóstico visual instantâneo da sua situação.

🟢 VERDE (Saudável):
• Lucro positivo.
• Contas em dia.
• Despesas controladas (até 70% das receitas).

🟡 AMARELO (Atenção):
• Lucro baixo.
• Despesas altas (70-90% das receitas).
• Contas próximas do vencimento.

🔴 VERMELHO (Risco):
• Prejuízo.
• Despesas maiores que receitas.
• Dívidas vencidas.

🎯 O que fazer:
Se estiver amarelo/vermelho, clique em "Ver Diagnóstico" para receber sugestões automáticas de onde cortar gastos.`,
        },
        {
          id: 'rotina_diaria',
          icon: '📅',
          title: 'Rotina Diária de Caixa',
          shortDescription: 'Como fazer o fechamento de caixa diário e semanal.',
          color: '#F3E8FF',
          fullContent: `📅 ROTINA DIÁRIA/SEMANAL

Para manter o controle, crie o hábito:

🌅 TELA DIA (Fechamento Diário):
• Use o botão "Conferir Caixa" ao fim do expediente.
• Verifique se o dinheiro na gaveta/conta bate com o app.
• Registre qualquer diferença como "Quebra de Caixa" ou "Sobra".

📆 TELA SEMANA:
• Analise qual foi o melhor dia de vendas.
• Identifique dias com zero movimento (esqueceu de lançar?).

💡 DICA: Um fechamento de caixa correto impede furos e furtos.`,
        },
        {
          id: 'a_receber_pagar',
          icon: '💳',
          title: 'Fluxo A Receber / A Pagar',
          shortDescription: 'Visualização de calendário para contas futuras.',
          color: '#FEE2E2',
          fullContent: `💳 FLUXO DE A RECEBER / A PAGAR

Para que serve:
Previsibilidade. Saber se vai ter dinheiro para pagar as contas semana que vem.

Como usar:
No Dashboard, observe os blocos:
• A receber (Verde): Vendas a prazo, boletos emitidos.
• A pagar (Vermelho): Fornecedores, contas fixas futuras.

Funcionalidades:
• Clique para ver a lista por data.
• Marque como "Pago" ou "Recebido" direto nessa tela.
• Filtre por "Vence essa semana" para priorizar pagamentos.`,
        },
      ],
    },
    {
      id: 'inteligencia',
      title: 'Inteligência e Relatórios',
      icon: '📊',
      description: 'Alertas automáticos, precificação e relatórios para contador.',
      cards: [
        {
          id: 'alertas_automaticos',
          icon: '🚨',
          title: 'Alertas Inteligentes',
          shortDescription: 'O app avisa sobre gastos anormais e esquecimentos.',
          color: '#FEF3C7',
          fullContent: `🚨 ALERTAS E RECOMENDAÇÕES

O app trabalha por você monitorando:

1. Dias sem lançamentos:
   "Você não registra nada há 3 dias. Aconteceu algo?"

2. Gastos anormais:
   "Sua despesa com Energia veio 30% acima da média."

3. Contas a vencer:
   "Boleto do Aluguel vence amanhã!"

💡 DICA: Não ignore os alertas. Eles são seus assistentes financeiros pessoais.`,
        },
        {
          id: 'relatorio_contador',
          icon: '📄',
          title: 'Relatório Completo para Contador',
          shortDescription: 'Gere um DRE simples para enviar para contabilidade.',
          color: '#EDE9FE',
          fullContent: `📄 RELATÓRIO PARA CONTADOR

Para que serve:
Facilitar a vida fiscal e evitar multas.

Como gerar:
1. Vá em Relatórios > Relatório para Contador.
2. Escolha o mês.
3. Gere o PDF ou Excel.

O que contém:
• Faturamento bruto.
• Despesas categorizadas.
• Resultado operacional.
• Posição de caixa.

Envie todo dia 05 para seu contador e mantenha sua empresa regularizada!`,
        },
        {
          id: 'precificacao',
          icon: '🏷️',
          title: 'Calculadora de Preços',
          shortDescription: 'Como formar o preço de venda ideal.',
          color: '#ECFDF5',
          fullContent: `🏷️ FORMAÇÃO DE PREÇO (PRODUTOS)

Para que serve:
Saber se você está tendo lucro real em cada venda.

Como usar (Menu Produtos > Precificação):
1. Insira o Custo do Produto (ingredientes, compra).
2. Defina os Custos Fixos rateados (água, luz, aluguel).
3. Defina sua Margem de Lucro desejada (ex: 30%).
4. O app sugere o Preço de Venda ideal.

⚠️ ALERTA: O app avisa se seu preço atual estiver dando prejuízo!`,
        },
        {
          id: 'benchmarks',
          icon: '🏆',
          title: 'Benchmarks de Mercado',
          shortDescription: 'Compare seu desempenho com empresas parecidas.',
          color: '#DBEAFE',
          fullContent: `📊 BENCHMARKS (COMPARAÇÃO)

Para que serve:
Saber se sua empresa está indo bem comparada ao mercado.

Como funciona:
O sistema compara seus indicadores (anonimamente) com outras empresas do mesmo ramo e tamanho.

Exemplos de insights:
"Seu gasto com estoque está 10% maior que a média do setor."
"Sua margem de lucro está excelente, acima de 80% das empresas parecidas."

Use isso para ajustar suas estratégias e metas!`,
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
        <View style={styles.cardTexts}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            {card.title}
          </Text>
          {card.shortDescription && (
            <Text style={[styles.cardDescription, { color: theme.textSecondary }]} numberOfLines={2}>
              {card.shortDescription}
            </Text>
          )}
        </View>
        <View style={styles.cardFooter}>
          <Text style={[styles.cardButton, { color: '#3B82F6' }]}>+</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ScreenTitle
          title="📖 Instruções Completas"
          subtitle="Manuais, guias rápidos e dicas avançadas"
        />

        {/* Search Bar */}
        <View style={[styles.searchContainer, { paddingHorizontal: 16 }]}>
          <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Buscar instruções..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={[styles.searchClear, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        {searchQuery.length === 0 && (
          <View style={styles.quickActionsContainer}>
            <Text style={[styles.quickActionsTitle, { color: theme.textSecondary, paddingHorizontal: 16 }]}>
              Acesso Rápido
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickActionsScroll}
            >
              {quickActions.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={[styles.quickActionCard, { backgroundColor: theme.card }]}
                  onPress={() => setSearchQuery(action.filter)}
                >
                  <Text style={styles.quickActionIcon}>{action.icon}</Text>
                  <Text style={[styles.quickActionTitle, { color: theme.text }]}>{action.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={[styles.content, isDesktop && styles.contentDesktop]}>
          {sections.map((section) => (
            <View key={section.id} style={styles.sectionContainer}>
              <TouchableOpacity
                style={[styles.sectionHeader, { backgroundColor: theme.card }]}
                onPress={() => toggleSection(section.id)}
                activeOpacity={0.8}
              >
                <View style={styles.sectionHeaderInfo}>
                  <Text style={styles.sectionIcon}>{section.icon}</Text>
                  <View>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>{section.title}</Text>
                    <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
                      {section.description}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.sectionArrow, { color: theme.textSecondary }]}>
                  {expandedSections.has(section.id) ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {expandedSections.has(section.id) && (
                <View style={[styles.cardsContainer, isTwoColumns && styles.cardsContainerTwoColumns]}>
                  {section.cards.map(renderCard)}
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <View style={styles.helpSection}>
            <Text style={[styles.helpTitle, { color: theme.text }]}>Precisa de ajuda?</Text>
            <Text style={[styles.helpText, { color: theme.textSecondary }]}>
              Nossa equipe está pronta para ajudar você a dominar o Fast Cash Flow!
            </Text>
          </View>
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
  content: {
    padding: 16,
  },
  contentDesktop: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  sectionIcon: {
    fontSize: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionArrow: {
    fontSize: 16,
    marginLeft: 12,
  },
  cardsContainer: {
    marginTop: 4,
    gap: 12,
  },
  cardsContainerTwoColumns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 8,
    alignItems: 'center',
    minHeight: 80,
  },
  cardTwoColumns: {
    width: '48%',
    marginBottom: 12,
  },
  cardHeader: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
    height: '100%',
  },
  cardIcon: {
    fontSize: 28,
  },
  cardBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    paddingLeft: 0,
  },
  cardTexts: {
    flex: 1,
    marginLeft: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardDescription: {
    fontSize: 12,
    marginTop: 4,
  },
  cardFooter: {
    paddingHorizontal: 16,
  },
  cardButton: {
    fontSize: 24,
    fontWeight: '400',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  helpSection: {
    alignItems: 'center',
    padding: 20,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    textAlign: 'center',
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
  // Search bar styles
  searchContainer: {
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  searchClear: {
    fontSize: 16,
    padding: 4,
  },
  // Quick actions styles
  quickActionsContainer: {
    marginBottom: 16,
  },
  quickActionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  quickActionsScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  quickActionCard: {
    width: 80,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  quickActionTitle: {
    fontSize: 11,
    fontWeight: '600',
  },
});
