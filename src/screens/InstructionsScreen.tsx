import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, useWindowDimensions, Linking } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useThemeCtx } from '../theme/ThemeProvider';
import ScreenTitle from '../components/ScreenTitle';
import { useI18n } from '../i18n/I18nProvider';

interface Topic {
  id: string;
  icon: string;
  title: string;
  content: string;
  color: string;
}

export default function InstructionsScreen() {
  const { theme } = useThemeCtx();
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const topics: Topic[] = [
    {
      id: 'dashboard',
      icon: '📊',
      title: 'Como interpretar o Dashboard',
      content: `O Dashboard é sua visão geral do negócio. Aqui você encontra:

**CARDS PRINCIPAIS (4 indicadores):**
• Saldo Atual: Diferença entre entradas e saídas do mês atual. Verde = positivo, Vermelho = negativo.
• Entradas: Total de dinheiro que entrou no mês (vendas, recebimentos, etc.).
• Saídas: Total de despesas e custos do mês.
• Saldo Projetado: Estimativa do saldo considerando despesas recorrentes futuras.

**GRÁFICO DE FLUXO:**
• Diário: Mostra entradas (verde) e saídas (vermelho) dia a dia do mês.
• Semanal: Agrupa por semanas do mês.
• Mensal: Mostra todos os meses do ano.
• Toque nas barras para ver detalhes (valores exatos de cada dia/semana/mês).

**META FINANCEIRA:**
• Configure uma meta mensal de entradas (ex: R$ 10.000,00).
• O card mostra o progresso em % e muda de cor conforme você avança:
  - Vermelho: abaixo de 50%
  - Laranja: 50% a 74%
  - Azul: 75% a 99%
  - Verde: 100% ou mais (meta atingida!)

**ALERTAS AUTOMÁTICOS:**
• Se seu saldo mensal estiver negativo, verá um alerta vermelho no topo.
• Se suas dívidas ultrapassarem o limite configurado, verá um alerta laranja.

**BOTÃO DE LANÇAMENTO RÁPIDO (⚡):**
• Clique no botão flutuante no canto inferior direito para:
  - Registrar entrada rápida (venda, recebimento)
  - Registrar saída rápida (despesa, compra)
  - Adicionar dívida simples (cartão, empréstimo)
• Campos mínimos para agilizar seu dia a dia!

**RECOMENDAÇÕES PERSONALIZADAS:**
• Com base no seu perfil de negócio (configurado em Configurações), o app mostra dicas úteis.`,
      color: '#F3E8FF',
    },
    {
      id: 'transaction',
      icon: '💰',
      title: 'Como adicionar uma transação (entrada/saída)',
      content: `**ONDE ADICIONAR:**
• Aba Lançamentos → Escolha a visualização: Dia, Semana, Mês ou Intervalo.
• No Dashboard → Use o botão de lançamento rápido (⚡) para entradas/saídas simples.

**CAMPOS OBRIGATÓRIOS:**
1. Tipo: Entrada (dinheiro que entra) ou Saída (dinheiro que sai).
2. Valor: Digite o valor em reais (ex: 150,00 ou 1500).
3. Descrição: O que foi (ex: "Venda de bolo", "Conta de luz").
4. Categoria: Classifique (ex: Vendas, Aluguel, Reposição, etc.).
5. Data: Dia da transação (padrão: hoje).
6. Hora: Hora da transação (padrão: hora atual).

**DICAS:**
• Use categorias consistentes para facilitar relatórios futuros.
• Entradas são sempre valores positivos (verde).
• Saídas são sempre valores negativos (vermelho).
• Você pode editar ou excluir transações clicando nelas.

**VISUALIZAÇÃO POR PERÍODO:**
• Dia: Veja todas as transações de um dia específico.
• Semana: Veja o resumo semanal (entradas, saídas e saldo).
• Mês: Veja o resumo mensal completo.
• Intervalo: Escolha duas datas para ver um período personalizado.`,
      color: '#DBEAFE',
    },
    {
      id: 'debts',
      icon: '💳',
      title: 'Como cadastrar e acompanhar dívidas',
      content: `**O QUE SÃO DÍVIDAS NO APP:**
Dívidas são valores parcelados que você deve pagar ao longo do tempo (cartão de crédito, empréstimos, financiamentos, compras parceladas, etc.).

**COMO CADASTRAR UMA DÍVIDA:**
1. Vá na aba Débitos.
2. Clique em + Nova Dívida (ou use o lançamento rápido no Dashboard).
3. Preencha:
   • Descrição: Nome da dívida (ex: "Cartão Nubank", "Empréstimo João").
   • Valor Total: Valor total da dívida (ex: R$ 3.000,00).
   • Número de Parcelas: Quantas vezes vai pagar (ex: 12).
   • Data da Compra: Quando foi feita a compra/dívida.
   • Dia de Vencimento da Fatura: Dia do mês que vence (ex: dia 10).
   • Mês de Vencimento: Mês da primeira cobrança (ex: 12 para dezembro).

**COMO FUNCIONA:**
• O app calcula automaticamente o valor de cada parcela (Total ÷ Número de Parcelas).
• Mostra uma barra de progresso visual: parcelas pagas (verde), próxima parcela (amarelo), vencidas (vermelho).
• Você pode marcar parcelas como pagas clicando nos quadradinhos numerados.

**ALERTAS DE DÍVIDA:**
• Se o total de dívidas em aberto ultrapassar o limite configurado (em Configurações > Alertas), você verá um alerta laranja no Dashboard e na aba Débitos.

**EDITAR OU EXCLUIR:**
• Clique em "Editar" para alterar valores ou parcelas.
• Clique em "Excluir" para remover a dívida completamente.

**DICA IMPORTANTE:**
• Sempre atualize as parcelas pagas para manter o controle correto do quanto ainda deve!`,
      color: '#FEE2E2',
    },
    {
      id: 'orders',
      icon: '📦',
      title: 'Como cadastrar e acompanhar encomendas',
      content: `**O QUE SÃO ENCOMENDAS:**
Encomendas são pedidos que você recebe de clientes, com data de entrega futura e possibilidade de registrar um sinal (entrada antecipada).

**COMO CADASTRAR UMA ENCOMENDA:**
1. Vá na aba Encomendas.
2. Clique em + Nova Encomenda.
3. Preencha os campos:
   • Nome do Cliente: Quem fez o pedido (ex: "Maria Silva").
   • Tipo de Encomenda: O que foi encomendado (ex: "Bolo de Chocolate 3kg").
   • Data de Entrega: Quando deve ser entregue (deve ser data futura).
   • Hora da Entrega: Horário combinado (ex: 14:00).
   • Valor da Encomenda: Valor total do pedido.
   • Sinal Pago/Entrada: Valor já recebido como adiantamento (pode ser R$ 0,00).
   • Status: Selecione o status atual:
     - 🟡 A receber: Encomenda confirmada, aguardando pagamento.
     - 🔵 Em Andamento: Você está preparando/produzindo.
     - 🟢 Recebidos: Encomenda entregue e pago completamente.
     - 🔴 Cancelados: Cliente cancelou.
   • Observações: Detalhes extras (sabor, decoração, endereço, etc.).

**REGISTRO AUTOMÁTICO DE ENTRADA:**
• Quando você cadastra uma encomenda com sinal maior que R$ 0,00, o sistema cria automaticamente um lançamento de ENTRADA na aba Lançamentos.
• Isso ajuda a controlar seu fluxo de caixa sem duplicar trabalho!

**VALOR RESTANTE:**
• O app calcula automaticamente: Valor Total - Sinal Pago = Restante.
• Esse valor aparece destacado em cada encomenda.

**FILTROS E BUSCA:**
• Use a barra de busca para encontrar encomendas por nome de cliente, tipo ou observações.
• Filtre por status: "Todos", "A receber", "Em Andamento", "Recebidos", "Cancelados".

**NOTIFICAÇÃO DE ENCOMENDAS DO DIA SEGUINTE:**
• Após as 12h (meio-dia), o app mostra um alerta automático se você tiver encomendas para o dia seguinte.
• Assim você não esquece de preparar os pedidos!

**EDITAR OU EXCLUIR:**
• Clique em "Editar" para alterar dados da encomenda.
• Clique em "Excluir" para remover (o lançamento de entrada relacionado também será excluído automaticamente).

**DICA IMPORTANTE:**
• Quando mudar o status para "Cancelados", o lançamento de entrada do sinal será cancelado automaticamente no fluxo de caixa.`,
      color: '#FEF3C7',
    },
    {
      id: 'recurring',
      icon: '🔁',
      title: 'Como cadastrar despesas recorrentes',
      content: `**O QUE SÃO DESPESAS RECORRENTES:**
São contas fixas que se repetem todo mês (aluguel, água, luz, telefone, internet, salários, etc.). O app ajuda você a lembrar e controlar esses gastos.

**COMO CADASTRAR:**
1. Vá na aba Recorrentes.
2. Clique em + Nova Despesa Recorrente.
3. Preencha:
   • Descrição: Nome da despesa (ex: "Aluguel", "Conta de Luz").
   • Valor: Quanto custa por mês (ex: R$ 800,00).
   • Categoria: Classifique (ex: "Aluguel", "Conta de Energia").
   • Dia de Vencimento: Dia do mês que vence (ex: 10).
   • Data de Início: Quando começou essa despesa recorrente.
   • Data de Fim (opcional): Se tem data para terminar, preencha. Deixe vazio para despesas contínuas.

**COMO FUNCIONA:**
• O app NÃO registra automaticamente as despesas no fluxo de caixa.
• Ele serve como lembrete visual e aparece na tela de Recorrentes.
• Você mesmo deve registrar a despesa na aba Lançamentos quando pagar.

**INDICADOR VISUAL:**
• ✅ Verde "Pago": Se você já registrou um lançamento no mês atual com descrição e valor iguais.
• ⏳ Cinza "Pendente": Se ainda não foi pago neste mês.
• 🔴 Vermelho "Vencido": Se o dia de vencimento já passou e ainda não foi pago.

**FILTROS:**
• "Todas", "Pagas", "Pendentes", "Vencidas".
• Barra de busca por descrição.

**RELATÓRIOS:**
• Na aba Relatórios (Intervalo), o sistema separa automaticamente:
  - Despesas Fixas (recorrentes): Detecta quais saídas correspondem às suas recorrentes cadastradas.
  - Despesas Variáveis: O restante das saídas.

**DICA:**
• Configure todas as suas contas fixas aqui para ter controle total do que é gasto obrigatório todo mês!`,
      color: '#FEF3C7',
    },
    {
      id: 'goals',
      icon: '🎯',
      title: 'Como definir e acompanhar metas financeiras',
      content: `**O QUE SÃO METAS FINANCEIRAS:**
São objetivos de entradas (receita) que você quer atingir por mês. Exemplo: "Quero faturar R$ 10.000,00 em dezembro".

**COMO CONFIGURAR UMA META:**
1. No Dashboard, clique no card 🎯 Meta (ou no botão "Add/Editar").
2. Digite o valor da meta mensal (ex: 10000).
3. Clique em "Salvar".

**O QUE ACONTECE:**
• O app calcula automaticamente o progresso baseado nas suas entradas do mês.
• O card de meta mostra:
  - Valor da meta.
  - Progresso em % (ex: 75%).
  - Barra de progresso colorida:
    - 🔴 Vermelho: Abaixo de 50% (alerta).
    - 🟠 Laranja: 50% a 74% (atenção).
    - 🔵 Azul: 75% a 99% (quase lá).
    - 🟢 Verde: 100% ou mais (meta atingida! 🎉).

**MENSAGENS MOTIVACIONAIS:**
• O app mostra mensagens automáticas conforme seu progresso:
  - "Meta definida, ainda sem progresso."
  - "Você atingiu 45% da meta. Mantenha o foco!"
  - "Ótimo! Você já alcançou 82% da meta deste mês."
  - "Parabéns! Meta deste mês atingida ✅."

**ALERTAS DE PROGRESSO BAIXO:**
• Se você estiver com menos de 50% da meta no mês atual, verá um alerta amarelo/laranja no Dashboard sugerindo revisar suas entradas.

**HISTÓRICO DE METAS (se implementado):**
• Veja metas de meses anteriores.
• Compare se atingiu ou não cada mês.
• Analise sua evolução ao longo do tempo.

**DICA:**
• Configure metas realistas baseadas no seu histórico!
• Revise semanalmente seu progresso para ajustar estratégias.`,
      color: '#D1FAE5',
    },
    {
      id: 'reports',
      icon: '📊',
      title: 'Como gerar relatórios em PDF ou enviar por WhatsApp',
      content: `**ONDE GERAR RELATÓRIOS:**
Aba Relatórios → Escolha a visualização:
• Mês: Relatório mensal completo.
• Intervalo: Escolha duas datas para período personalizado.

**TIPOS DE RELATÓRIOS DISPONÍVEIS:**

**1) RELATÓRIO MENSAL:**
• Total de entradas, saídas e saldo do mês.
• Lista completa de todas as transações.
• Gráficos visuais de barras (diário, semanal ou mensal).
• Opções:
  - 📄 Baixar PDF: Gera um arquivo PDF para salvar ou imprimir.
  - 📲 Enviar WhatsApp: Compartilha o PDF direto pelo WhatsApp.

**2) RELATÓRIO POR INTERVALO (PERÍODO PERSONALIZADO):**
• Escolha data de Início e Fim.
• O app gera relatório com:
  - Total de entradas, saídas e saldo do período.
  - Média diária (quanto entra/sai por dia em média).
  - Classificação de despesas:
    - Fixas (recorrentes): Despesas que você cadastrou em Recorrentes.
    - Variáveis: Todas as outras despesas.
  - Lista detalhada de transações.
  - Gráfico de barras com entradas (verde) e saídas (vermelho) por dia.

**COMO USAR:**
1. Escolha o período (mês atual ou intervalo personalizado).
2. Clique em "Baixar PDF" para salvar no celular/computador.
3. Ou clique em "Enviar WhatsApp" para compartilhar com contador, sócio ou cliente.

**INFORMAÇÕES NO PDF:**
• Logo da sua empresa (se configurado em Configurações).
• Data do relatório.
• Cards resumidos: Total de entradas, saídas, saldo e média diária.
• Tabela completa: Data/Hora, Tipo (Entrada/Saída), Descrição, Categoria e Valor.

**DICA:**
• Envie relatórios mensais para seu contador facilitar a contabilidade!
• Use relatórios por intervalo para analisar períodos específicos (ex: semana de promoção, feriados).`,
      color: '#EDE9FE',
    },
    {
      id: 'settings',
      icon: '⚙️',
      title: 'Como personalizar configurações e alertas',
      content: `A aba Configurações permite ajustar o app conforme suas necessidades.

**1) PREFERÊNCIAS GERAIS:**
• Tema: Escolha entre Claro, Escuro ou Automático.
• Idioma: Português (padrão).
• Moeda: Real brasileiro (R$).
• Logo da Empresa: Faça upload do logo para aparecer nos relatórios PDF.

**2) ALERTAS AUTOMÁTICOS:**
Ative alertas visuais no Dashboard para te avisar sobre:
• ⚠️ Saldo Negativo: Se o saldo mensal ficar negativo, mostra um alerta vermelho.
• 💳 Limite de Dívidas: Configure um valor máximo de dívidas em aberto (ex: R$ 5.000,00). Se ultrapassar, mostra alerta laranja.

**COMO CONFIGURAR:**
• Vá em Configurações → Alertas.
• Ative/desative cada tipo de alerta.
• Defina o limite de dívidas em reais.

**3) PERFIL DO NEGÓCIO (RECOMENDAÇÕES PERSONALIZADAS):**
Configure informações sobre sua empresa para receber dicas personalizadas no Dashboard:
• Tipo de Negócio: Comércio, Serviços, Alimentação, Autônomo, MEI, Indústria, etc.
• Faturamento Médio Mensal: Faixas (até R$ 5 mil, R$ 5-20 mil, acima de R$ 20 mil).
• Objetivo Principal: Escolha o que é mais importante para você:
  - 💰 Controlar dívidas: Foco em manter dívidas organizadas.
  - 📊 Organizar fluxo de caixa diário: Controle detalhado de entradas e saídas.
  - 💹 Guardar para investimentos: Economizar e investir sobras.
  - ⏰ Evitar atrasos em contas: Não esquecer vencimentos.

**O QUE ACONTECE:**
Com base no seu perfil, o app mostra recomendações automáticas no Dashboard, como:
• "Dica: Acompanhe a aba 'Dívidas' toda semana e use alertas de limite para não ultrapassar seu orçamento." (para quem escolheu "Controlar dívidas").
• "Dica: Use a visão 'Dia'/'Semana' e os filtros para revisar entradas e saídas todo fim de dia." (para "Organizar fluxo de caixa diário").

**4) SINCRONIZAÇÃO:**
• O app sincroniza automaticamente com o servidor (Supabase).
• Funciona offline: dados são salvos localmente e sincronizados quando voltar a conexão.

**DICA:**
• Configure seu perfil logo no início para receber dicas relevantes ao seu tipo de negócio!
• Ative alertas para não perder controle do seu fluxo financeiro.`,
      color: '#F0FDF4',
    },
    {
      id: 'categories',
      icon: '🏷️',
      title: 'Categorias Personalizadas',
      content: `As categorias personalizadas permitem que você organize suas receitas e despesas do jeito que faz sentido para o SEU negócio.

📋 PARA QUE SERVE:
• Organizar lançamentos por tipo de gasto/receita
• Facilitar a visualização nos relatórios e gráficos
• Identificar rapidamente onde seu dinheiro está indo
• Adaptar o app ao seu tipo de negócio específico

🎨 COMO USAR:
1. Acesse o menu e toque em "Categorias"
2. Toque no botão "+" para criar nova categoria
3. Escolha o nome (ex: "Fornecedores", "Projetos", "Manutenção")
4. Selecione se é Receita, Despesa ou Ambos
5. Escolha um ícone e uma cor para identificação visual
6. Salve a categoria

💡 DICAS:
• Crie categorias específicas do seu negócio (restaurante: "Alimentos", "Bebidas"; oficina: "Peças", "Mão de obra")
• Use cores diferentes para identificar rapidamente nos gráficos
• Categorias padrão não podem ser deletadas, mas você pode criar quantas quiser
• Ao criar lançamentos, suas categorias personalizadas aparecem automaticamente

⚙️ EDITAR/EXCLUIR:
• Toque em uma categoria existente para editar
• Use o ícone de lixeira para excluir categorias que você criou
• Categorias padrão do sistema têm o marcador "Padrão"

📊 BENEFÍCIOS:
• Relatórios mais precisos e relevantes
• Gráficos personalizados para seu negócio
• Melhor controle e organização financeira
• Decisões baseadas em dados reais do SEU negócio`,
      color: '#F3E8FF',
    },
    {
      id: 'backup',
      icon: '💾',
      title: 'Backup de Dados',
      content: `O sistema de backup garante que seus dados financeiros estejam sempre seguros, permitindo salvar cópias locais ou compartilhar com seu contador.

📋 PARA QUE SERVE:
• Segurança: ter cópia dos seus dados fora da nuvem
• Tranquilidade: nunca perder informações importantes
• Contabilidade: enviar dados facilmente para seu contador
• Comprovação: guardar registros para consultas futuras
• Restauração: recuperar dados se necessário

💾 TIPOS DE BACKUP:

1️⃣ BACKUP COMPLETO (JSON):
• Contém TODOS os seus dados (transações, dívidas, encomendas, metas, etc.)
• Formato técnico que preserva tudo
• Ideal para restauração completa
• Use antes de atualizações importantes

2️⃣ BACKUP SIMPLIFICADO (CSV):
• Apenas lançamentos (receitas e despesas)
• Formato de planilha (abre no Excel/Google Sheets)
• Ideal para enviar ao contador
• Fácil de ler e analisar

🔄 BACKUP MANUAL:
1. Acesse "Backup de Dados" no menu
2. Escolha o tipo: Completo (JSON) ou Simplificado (CSV)
3. Toque no botão correspondente
4. O arquivo será gerado e você pode:
   • Salvar no seu dispositivo
   • Compartilhar via WhatsApp/Email
   • Enviar para Google Drive/Dropbox

⏰ BACKUP AUTOMÁTICO:
1. Na tela de Backup, ative "Backup Automático"
2. Escolha a frequência: Semanal ou Mensal
3. O app criará backups automaticamente
4. Você receberá notificação quando estiver pronto
5. A data do último backup fica registrada

💡 DICAS IMPORTANTES:
• Faça backup ANTES de deletar dados importantes
• Guarde backups em local seguro (nuvem)
• Backup mensal é ideal para pequenos negócios
• Backup semanal para quem tem muito movimento
• O backup CSV é perfeito para análises no Excel

📤 COMPARTILHAMENTO:
• Envie backup CSV para seu contador mensalmente
• Guarde backups JSON para emergências
• Use WhatsApp Business para enviar rapidamente
• Organize backups por data em pastas

🔒 SEGURANÇA:
• Seus backups contêm dados sensíveis
• Não compartilhe com pessoas não autorizadas
• Use senhas fortes nas nuvens onde guardar
• Backups locais ficam apenas no seu dispositivo`,
      color: '#DBEAFE',
    },
    {
      id: 'customize_dashboard',
      icon: '⚙️',
      title: 'Personalizar Dashboard',
      content: `O Dashboard personalizável permite que você decida quais informações quer ver primeiro e organize tudo do jeito que preferir.

📋 PARA QUE SERVE:
• Ver PRIMEIRO o que é importante para VOCÊ
• Reduzir poluição visual
• Aumentar produtividade e agilidade
• Adaptar o app ao seu estilo de trabalho
• Melhorar performance (não carrega widgets desnecessários)

🎯 WIDGETS DISPONÍVEIS:

💰 Saldo Disponível - Seu dinheiro atual em tempo real
📅 Resumo Mensal - Receitas, despesas e saldo do mês
📊 Gráficos - Visualização gráfica do fluxo de caixa
🔔 Alertas - Avisos sobre dívidas e metas
🏆 Metas Financeiras - Progresso das suas metas
💳 Dívidas Pendentes - Parcelas e contas a pagar
📝 Últimos Lançamentos - Transações recentes
➕ Ações Rápidas - Botões para adicionar lançamentos

⚙️ COMO PERSONALIZAR:
1. Acesse "Configurações" no menu
2. Toque em "Personalizar Dashboard"
3. Você verá todos os widgets disponíveis

🔧 OPÇÕES DE PERSONALIZAÇÃO:

✅ ATIVAR/DESATIVAR:
• Use o botão ao lado de cada widget
• Widgets desativados não aparecem no dashboard
• Ative apenas o que você realmente usa

⬆️⬇️ REORDENAR:
• Toque em "Subir" para mover widget para cima
• Toque em "Descer" para mover widget para baixo
• O primeiro widget fica no topo do dashboard
• Coloque as informações mais importantes no topo

💡 EXEMPLOS DE USO:

🍕 Restaurante/Bar:
1. Saldo Disponível (topo)
2. Resumo Mensal
3. Dívidas Pendentes (fornecedores)
4. Ações Rápidas
5. Desativar: Metas, Gráficos detalhados

🔧 Mecânico/Oficina:
1. Alertas (não esquecer pagamentos)
2. Dívidas Pendentes
3. Saldo Disponível
4. Últimos Lançamentos
5. Desativar: Metas

💼 Freelancer/Autônomo:
1. Metas Financeiras (foco em objetivos)
2. Resumo Mensal
3. Gráficos (análise de desempenho)
4. Saldo Disponível
5. Desativar: Dívidas (se não usar)

🏪 Comércio:
1. Resumo Mensal (controle diário)
2. Últimos Lançamentos
3. Ações Rápidas (agilidade)
4. Saldo Disponível
5. Alertas

✅ SALVAR ALTERAÇÕES:
• Depois de personalizar, toque em "Salvar Alterações"
• O dashboard será atualizado imediatamente
• Suas preferências ficam salvas permanentemente

🔄 RESTAURAR PADRÃO:
• Se quiser voltar à configuração original
• Toque em "Restaurar Padrão"
• Confirme a ação
• Todos os widgets voltam à posição e estado inicial

💡 DICAS:
• Comece desativando o que você NÃO usa
• Coloque no topo o que você consulta várias vezes ao dia
• Teste configurações diferentes até achar a ideal
• Widgets desativados não consomem recursos
• Você pode mudar a qualquer momento

🎨 BENEFÍCIOS:
• Dashboard mais limpo e organizado
• Acesso rápido às informações importantes
• App mais rápido (menos widgets = menos carregamento)
• Experiência única para cada tipo de negócio
• Mais produtividade no dia a dia`,
      color: '#FEE2E2',
    },
  ];

  const toggleExpand = (id: string) => {
    const isExpanded = expandedId === id;
    setExpandedId(isExpanded ? null : id);
  };

  const handleSupportPress = async () => {
    try {
      // Get WhatsApp number from SecureStore (AdminSettings)
      const whatsappNumber = await SecureStore.getItemAsync('whatsappNumber') || '5573999348552';
      const message = encodeURIComponent('Olá! Preciso de ajuda com o Fast Cash Flow.');
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
      Linking.openURL(whatsappUrl).catch(err => console.error('Erro ao abrir WhatsApp:', err));
    } catch (error) {
      console.error('Erro ao buscar número do WhatsApp:', error);
      // Fallback para número padrão
      const message = encodeURIComponent('Olá! Preciso de ajuda com o Fast Cash Flow.');
      const whatsappUrl = `https://wa.me/5573999348552?text=${message}`;
      Linking.openURL(whatsappUrl).catch(err => console.error('Erro ao abrir WhatsApp:', err));
    }
  };

  const formatContent = (content: string) => {
    return content.split('\n').map((paragraph, index) => {
      if (paragraph.includes('**')) {
        // Handle bold text
        const parts = paragraph.split('**');
        return (
          <Text key={index} style={styles.content}>
            {parts.map((part, partIndex) =>
              partIndex % 2 === 1 ? (
                <Text key={partIndex} style={styles.boldText}>
                  {part}
                </Text>
              ) : (
                part
              )
            )}
          </Text>
        );
      }
      return (
        <Text key={index} style={styles.content}>
          {paragraph}
        </Text>
      );
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 80,
          flexGrow: 1, // ADICIONAR ESTA LINHA
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true} // ADICIONAR ESTA LINHA
      >
        <ScreenTitle 
          title="Instruções" 
          subtitle="Aprenda a usar o sistema" 
        />

        <View style={styles.grid}>
          {topics.map((topic) => {
            return (
              <View key={topic.id} style={[styles.cardContainer, { width: isDesktop ? '48%' : '100%' }]}>
                <TouchableOpacity
                  style={[
                    styles.card, 
                    { 
                      backgroundColor: topic.color, 
                      borderColor: theme.card,
                    }
                  ]}
                  onPress={() => toggleExpand(topic.id)}
                  activeOpacity={0.7}
                  accessible={true}
                  accessibilityLabel={`${topic.title}, ${expandedId === topic.id ? 'expandido' : 'contraído'}`}
                  accessibilityRole="button"
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.icon}>{topic.icon}</Text>
                    <Text style={[styles.cardTitle, { color: '#111111' }]}>{topic.title}</Text>
                    <Text style={styles.expandIcon}>
                      {expandedId === topic.id ? '−' : '+'}
                    </Text>
                  </View>

                  {expandedId === topic.id && (
                    <View style={styles.expandedContent}>
                      {formatContent(topic.content)}
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        <View style={styles.supportSection}>
          <Text style={[styles.supportTitle, { color: theme.text }]}>Precisa de ajuda?</Text>
          <Text style={[styles.supportSubtitle, { color: theme.text }]}>
            Nossa equipe está pronta para ajudar você a dominar o Fast Cash Flow!
          </Text>
          <TouchableOpacity
            style={[styles.supportButton, { backgroundColor: '#16A34A' }]}
            onPress={handleSupportPress}
            activeOpacity={0.8}
            accessible={true}
            accessibilityLabel="Entrar em contato com suporte pelo WhatsApp"
            accessibilityRole="button"
          >
            <Text style={styles.supportButtonText}>💬 Entrar em contato com suporte</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
    width: '100%',
  },
  cardContainer: {
    // IMPORTANTE: Sempre 100% em mobile, 48% apenas em desktop grande (>=768px)
    width: '100%', // Forçar 1 coluna em mobile
    marginBottom: 0,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    minHeight: 80,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    width: '100%',
    overflow: 'visible', // IMPORTANTE: permitir expansão vertical
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    fontSize: 24,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  expandIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#666',
    width: 24,
    textAlign: 'center',
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    width: '100%', // IMPORTANTE: respeitar largura do card
  },
  content: {
    fontSize: 13,
    lineHeight: 20, // IMPORTANTE: aumentado de 18 para 20
    color: '#374151',
    marginBottom: 8,
    width: '100%',
    flexWrap: 'wrap', // IMPORTANTE: permitir quebra de linha
  },
  boldText: {
    fontWeight: '700',
    color: '#111827',
  },
  supportSection: {
    alignItems: 'center',
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  supportTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  supportSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
    opacity: 0.8,
  },
  supportButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  supportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
