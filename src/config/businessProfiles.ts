// Perfis de negócio com categorias e textos específicos

export type BusinessType = 
  | 'lanchonete_delivery'
  | 'doceria'
  | 'restaurante'
  | 'loja_produtos'
  | 'materiais_construcao'
  | 'mercado'
  | 'petshop'
  | 'vestuario'
  | 'joalheria_otica'
  | 'fornecedor_atacado'
  | 'equipamentos'
  | 'producao'
  | 'autocenter'
  | 'servicos_gerais'
  | 'servicos_profissionais'
  | 'profissional_autonomo'
  | 'outros';

export interface BusinessProfile {
  id: BusinessType;
  name: string;
  icon: string;
  description: string;
  incomeCategories: string[];
  expenseCategories: string[];
  routineTips: string[];
  onboardingMessage: string;
  dailyReminder: string;
  weeklyGoal: string;
}

export const BUSINESS_PROFILES: Record<BusinessType, BusinessProfile> = {
  lanchonete_delivery: {
    id: 'lanchonete_delivery',
    name: 'Lanchonete / Delivery',
    icon: '🍔',
    description: 'Hamburguerias, pizzarias, açaí, doces e delivery em geral',
    incomeCategories: [
      'Salgados',
      'Mini-salgados',
      'Lanches (Burgers)',
      'Porções',
      'Bolos (Vulcão/Mini)',
      'Mini Pizza',
      'Kit Festa (P/G)',
      'Refrigerantes (Lata/1L/2L)',
      'Sucos Naturais',
      'Outros',
    ],
    expenseCategories: [
      'Insumos (trigo, carnes, queijos)',
      'Óleo de Fritura',
      'Embalagens térmicas',
      'Descartáveis (guardanapos/canudos)',
      'Taxa app delivery',
      'Gás',
      'Funcionários',
      'Retirada Sócio',
      'Aluguel',
      'Energia',
      'Marketing',
      'Outros',
    ],
    routineTips: [
      '📝 Registre os pedidos do delivery todo fim de expediente',
      '💰 Confira o caixa antes de fechar a loja',
      '📦 Anote compras de ingredientes no dia da entrega',
    ],
    onboardingMessage: 'Lanchonetes e deliveries têm fluxo intenso de caixa. O segredo é registrar tudo diariamente para não perder o controle!',
    dailyReminder: 'Não esqueça de registrar as vendas do delivery de hoje!',
    weeklyGoal: 'Conferir caixa pelo menos 5 vezes na semana',
  },

  doceria: {
    id: 'doceria',
    name: 'Doceria',
    icon: '🧁',
    description: 'Doces, confeitaria, bolos e encomendas de festas',
    incomeCategories: [
      'Brigadeiros Gourmet',
      'Bolos de Pote',
      'Tortas Inteiras',
      'Doces Finos (Eventos)',
      'Café e Bebidas',
      'Rodízio de Doces',
      'Encomendas de Festas',
      'Outros',
    ],
    expenseCategories: [
      'Insumos (leite condensado, chocolate, farinha)',
      'Embalagens decorativas',
      'Gás de cozinha',
      'Utensílios de confeitaria',
      'Funcionários',
      'Aluguel',
      'Energia',
      'Marketing',
      'Outros',
    ],
    routineTips: [
      '🧾 Registre as encomendas e vendas do balcão no mesmo dia',
      '📦 Anote compras de insumos assim que chegarem',
      '📊 Revise quais produtos mais vendem toda semana',
    ],
    onboardingMessage: 'Docerias costumam ter muitas vendas pequenas e encomendas. Registrar diariamente ajuda a entender o que dá mais lucro.',
    dailyReminder: 'Teve vendas ou encomendas hoje? Registre antes de encerrar!',
    weeklyGoal: 'Separar custos de insumos e embalagens para entender sua margem',
  },
  
  restaurante: {
    id: 'restaurante',
    name: 'Restaurante',
    icon: '🍽️',
    description: 'Restaurantes, bares, cafeterias e similares',
    incomeCategories: [
      'Prato Feito (PF)',
      'Self-service (KG)',
      'Pratos à la Carte',
      'Bebidas',
      'Sobremesas',
      'Taxa de Serviço',
      'Taxa de Entrega (delivery)',
      'Outros',
    ],
    expenseCategories: [
      'Hortifruti e Carnes',
      'Gás Industrial',
      'Produtos de Limpeza (cozinha)',
      'Manutenção de Utensílios',
      'Funcionários',
      'Aluguel',
      'Energia',
      'Água',
      'Impostos',
      'Outros',
    ],
    routineTips: [
      '🍽️ Registre o faturamento de almoço e jantar separadamente',
      '📊 Compare vendas de dias úteis vs finais de semana',
      '📦 Controle o estoque de bebidas semanalmente',
    ],
    onboardingMessage: 'Restaurantes precisam controlar bem o CMV (Custo de Mercadoria Vendida). Registre compras e vendas para saber sua margem real!',
    dailyReminder: 'Como foram as vendas de hoje? Registre antes de fechar!',
    weeklyGoal: 'Analisar qual dia da semana vende mais',
  },
  
  loja_produtos: {
    id: 'loja_produtos',
    name: 'Loja de Produtos',
    icon: '🛍️',
    description: 'Lojas físicas ou online de produtos diversos',
    incomeCategories: [
      'Venda de Produtos Específicos',
      'Presentes',
      'Acessórios',
      'Venda de Mostruário',
      'Brindes/Kits',
      'Outros',
    ],
    expenseCategories: [
      'Reposição de Estoque',
      'Sacolas Personalizadas',
      'Etiquetas e Precificação',
      'Decoração de Vitrine',
      'Funcionários',
      'Aluguel',
      'Energia',
      'Marketing',
      'Impostos',
      'Outros',
    ],
    routineTips: [
      '🛒 Registre cada venda com o produto vendido',
      '📦 Anote reposições de estoque no dia da compra',
      '💳 Separe vendas à vista e parceladas',
    ],
    onboardingMessage: 'Em lojas, o controle de estoque e margem por produto é essencial. Use as categorias para saber quais produtos mais vendem!',
    dailyReminder: 'Registre as vendas do dia antes de fechar a loja!',
    weeklyGoal: 'Identificar os 3 produtos mais vendidos da semana',
  },

  materiais_construcao: {
    id: 'materiais_construcao',
    name: 'Materiais de Construção',
    icon: '🧱',
    description: 'Lojas de material de construção e ferragens',
    incomeCategories: [
      'Cimento e Areia',
      'Pisos e Revestimentos',
      'Ferramentas',
      'Material Elétrico',
      'Material Hidráulico',
      'Tintas e Vernizes',
      'Entrega (Frete)',
      'Outros',
    ],
    expenseCategories: [
      'Compra de Cargas',
      'Manutenção de Caminhão',
      'Paletes e Armazenamento',
      'Quebras de Estoque',
      'Funcionários',
      'Aluguel',
      'Energia',
      'Impostos',
      'Outros',
    ],
    routineTips: [
      '🧾 Registre vendas por linha (cimento, tinta, hidráulica) para entender o mix',
      '🚚 Lance o frete cobrado e custos de entrega separadamente',
      '📦 Anote reposições de estoque no dia da compra',
    ],
    onboardingMessage: 'Em materiais de construção, estoque e logística impactam muito o lucro. Categorize bem para saber o que mais vende.',
    dailyReminder: 'Registre as vendas e reposições de hoje para manter o controle!',
    weeklyGoal: 'Revisar estoque e perdas (quebras) toda semana',
  },

  mercado: {
    id: 'mercado',
    name: 'Mercado',
    icon: '🛒',
    description: 'Mercados, mercearias e pequenos supermercados',
    incomeCategories: [
      'Itens de Mercearia',
      'Hortifruti',
      'Açougue',
      'Padaria',
      'Higiene e Limpeza',
      'Bebidas alcoólicas e não-alcoólicas',
      'Outros',
    ],
    expenseCategories: [
      'Reposição Diária (perecíveis)',
      'Limpeza da Loja',
      'Manutenção de Câmaras Frias',
      'Sacolas Plásticas',
      'Funcionários',
      'Aluguel',
      'Energia',
      'Impostos',
      'Outros',
    ],
    routineTips: [
      '🧾 Registre vendas diariamente para acompanhar giro de caixa',
      '📦 Separe reposição de perecíveis para controlar perdas',
      '❄️ Acompanhe custos de energia e manutenção de câmaras frias',
    ],
    onboardingMessage: 'Mercados têm alta rotatividade. Registrar reposições e vendas ajuda a controlar margem e perdas.',
    dailyReminder: 'Não esqueça de registrar as vendas e reposições de hoje!',
    weeklyGoal: 'Revisar perdas e validade de perecíveis semanalmente',
  },

  petshop: {
    id: 'petshop',
    name: 'Petshop',
    icon: '🐾',
    description: 'Petshops, banho e tosa e serviços veterinários',
    incomeCategories: [
      'Banho e Tosa',
      'Consultas Veterinárias',
      'Rações (pacote/quilo)',
      'Medicamentos',
      'Brinquedos e Acessórios',
      'Hospedagem Pet',
      'Outros',
    ],
    expenseCategories: [
      'Insumos de Estética',
      'Compra de Rações para Revenda',
      'Vacinas e Medicamentos',
      'Manutenção de Canis',
      'Funcionários',
      'Aluguel',
      'Energia',
      'Outros',
    ],
    routineTips: [
      '🐶 Separe vendas de produtos e serviços para entender sua margem',
      '🧾 Registre medicamentos e vacinas para controlar custos',
      '📦 Lance reposição de ração no dia da compra',
    ],
    onboardingMessage: 'No petshop, separar serviços e produtos ajuda a entender onde está o lucro e controlar estoque.',
    dailyReminder: 'Teve atendimentos ou vendas hoje? Registre agora!',
    weeklyGoal: 'Controlar estoque de rações e medicamentos semanalmente',
  },

  vestuario: {
    id: 'vestuario',
    name: 'Vestuário',
    icon: '👗',
    description: 'Lojas de roupas, moda e acessórios',
    incomeCategories: [
      'Camisetas',
      'Calças',
      'Vestidos',
      'Roupas Íntimas',
      'Acessórios (cintos/bolsas)',
      'Ajustes/Reformas',
      'Outros',
    ],
    expenseCategories: [
      'Compra de Coleções',
      'Cabides e Araras',
      'Tecidos e Aviamentos (se houver confecção)',
      'Embalagens/Papel de Seda',
      'Funcionários',
      'Aluguel',
      'Energia',
      'Marketing',
      'Outros',
    ],
    routineTips: [
      '🧾 Registre vendas por tipo (camisetas, vestidos, acessórios)',
      '📦 Lance compras de coleções separadamente para acompanhar o giro',
      '🏷️ Controle gastos com vitrines e precificação',
    ],
    onboardingMessage: 'Em vestuário, mix de produtos e reposição de coleções impactam muito o caixa. Categorize para enxergar o que mais vende.',
    dailyReminder: 'Registre as vendas do dia antes de fechar!',
    weeklyGoal: 'Identificar as peças mais vendidas e as paradas no estoque',
  },

  joalheria_otica: {
    id: 'joalheria_otica',
    name: 'Joalheria / Ótica',
    icon: '💎',
    description: 'Joalherias, óticas e lojas de acessórios premium',
    incomeCategories: [
      'Óculos de Grau',
      'Óculos de Sol',
      'Joias em Ouro/Prata',
      'Relógios',
      'Conserto/Ajuste de Armações',
      'Limpeza de Joias',
      'Lentes de Contato',
      'Outros',
    ],
    expenseCategories: [
      'Compra de Armações e Lentes',
      'Metais Preciosos',
      'Estojos e Flanelas',
      'Equipamentos de Laboratório Ótico',
      'Funcionários',
      'Aluguel',
      'Energia',
      'Outros',
    ],
    routineTips: [
      '🧾 Separe vendas de produtos e serviços (conserto/ajuste)',
      '📦 Lance compras de armações e lentes no dia da reposição',
      '🔒 Controle custos com materiais valiosos e perdas',
    ],
    onboardingMessage: 'Em joalherias e óticas, controlar compras e margem por categoria é essencial para proteger o lucro.',
    dailyReminder: 'Registre as vendas e serviços realizados hoje!',
    weeklyGoal: 'Revisar margem por linha (óculos, joias, serviços)',
  },

  fornecedor_atacado: {
    id: 'fornecedor_atacado',
    name: 'Fornecedor / Atacado',
    icon: '📦',
    description: 'Atacado, distribuição e fornecimento recorrente',
    incomeCategories: [
      'Venda por Atacado',
      'Contratos de Fornecimento Recorrente',
      'Taxa de Entrega/Logística',
      'Representação Comercial',
      'Outros',
    ],
    expenseCategories: [
      'Compra de Grandes Lotes',
      'Logística e Combustível',
      'Armazenagem/Galpão',
      'Impostos de Circulação (ICMS/ST)',
      'Funcionários',
      'Outros',
    ],
    routineTips: [
      '🧾 Separe vendas avulsas de contratos recorrentes',
      '🚚 Lance custos logísticos para entender o impacto no lucro',
      '📦 Controle compras em lote e giro do estoque',
    ],
    onboardingMessage: 'No atacado, preço e logística definem a margem. Categorize receitas e custos para enxergar onde está o lucro.',
    dailyReminder: 'Registre as vendas e custos de logística do dia!',
    weeklyGoal: 'Revisar margem por contrato e por linha de produto',
  },

  equipamentos: {
    id: 'equipamentos',
    name: 'Equipamentos (Venda/Locação)',
    icon: '🧰',
    description: 'Venda e locação de equipamentos e manutenção',
    incomeCategories: [
      'Locação Diária/Mensal',
      'Venda de Equipamentos Novos',
      'Venda de Seminovos',
      'Manutenção de Equipamentos de Clientes',
      'Venda de Peças',
      'Outros',
    ],
    expenseCategories: [
      'Manutenção da Frota/Estoque',
      'Frete de Entrega',
      'Compra de Maquinário para Revenda',
      'Peças de Reposição Técnica',
      'Funcionários',
      'Outros',
    ],
    routineTips: [
      '🧾 Separe locação, venda e manutenção para ver a rentabilidade',
      '🚚 Lance fretes de entrega e retirada',
      '🔧 Registre custos de manutenção do estoque e frota',
    ],
    onboardingMessage: 'Em equipamentos, manutenção e logística pesam no resultado. Categorize para entender o que dá mais retorno.',
    dailyReminder: 'Teve locações, vendas ou manutenção hoje? Registre agora!',
    weeklyGoal: 'Revisar custos de manutenção e frete semanalmente',
  },

  producao: {
    id: 'producao',
    name: 'Produção / Fábrica',
    icon: '🏭',
    description: 'Indústria, fábrica e produção de itens',
    incomeCategories: [
      'Venda de Produtos Acabados',
      'Sobras de Matéria-prima (sucata)',
      'Venda para Distribuidores',
      'Projetos Especiais',
      'Outros',
    ],
    expenseCategories: [
      'Matéria-prima Bruta',
      'Manutenção de Máquinas Industriais',
      'Energia Elétrica (alta tensão)',
      'EPIs e Segurança do Trabalho',
      'Funcionários',
      'Impostos',
      'Outros',
    ],
    routineTips: [
      '🏭 Separe custos de matéria-prima e manutenção para entender o CMV',
      '⚡ Acompanhe energia e custos fixos semanalmente',
      '📦 Registre vendas por canal (distribuidor vs direto)',
    ],
    onboardingMessage: 'Na produção, controlar matéria-prima e custos fixos é essencial. Categorize para enxergar o custo real do produto.',
    dailyReminder: 'Registre produção, vendas e compras de matéria-prima do dia!',
    weeklyGoal: 'Revisar custos de matéria-prima e perdas semanalmente',
  },

  autocenter: {
    id: 'autocenter',
    name: 'AutoCenter',
    icon: '🚗',
    description: 'Auto center, oficina, mecânica e serviços automotivos',
    incomeCategories: [
      'Troca de Óleo',
      'Alinhamento e Balanceamento',
      'Revisão de Freios',
      'Venda de Pneus',
      'Mão de Obra Mecânica',
      'Peças de Reposição',
      'Lavagem Especializada',
      'Outros',
    ],
    expenseCategories: [
      'Compra de Peças',
      'Estoque de Óleo/Lubrificantes',
      'Descarte de Resíduos',
      'Ferramental',
      'Equipamentos de Proteção (EPI)',
      'Funcionários',
      'Aluguel',
      'Energia',
      'Impostos',
      'Outros',
    ],
    routineTips: [
      '🧾 Separe mão de obra e peças para entender o lucro por serviço',
      '🔧 Lance compras de peças assim que chegarem para controlar estoque',
      '🗓️ Registre revisões e serviços finalizados no mesmo dia',
    ],
    onboardingMessage: 'Em autocenters, separar mão de obra de peças e controlar compras é essencial para saber sua margem real.',
    dailyReminder: 'Finalizou serviços hoje? Registre as entradas e saídas!',
    weeklyGoal: 'Revisar gastos com peças e margem por serviço',
  },
  
  servicos_gerais: {
    id: 'servicos_gerais',
    name: 'Serviços em Geral',
    icon: '🔧',
    description: 'Prestação de serviços diversos (manutenção, limpeza, etc)',
    incomeCategories: [
      'Serviços prestados',
      'Mão de obra',
      'Materiais aplicados',
      'Visita técnica',
      'Contrato mensal',
      'Hora extra',
      'Outros',
    ],
    expenseCategories: [
      'Materiais',
      'Ferramentas',
      'Transporte/Combustível',
      'Funcionários',
      'Equipamentos',
      'Manutenção veículo',
      'Marketing',
      'Telefone/Internet',
      'Impostos',
      'Outros',
    ],
    routineTips: [
      '🔧 Registre cada serviço finalizado no mesmo dia',
      '🚗 Anote gastos com deslocamento por cliente',
      '📋 Separe mão de obra de materiais aplicados',
    ],
    onboardingMessage: 'Em serviços, o tempo é dinheiro! Registre cada atendimento para saber quanto você realmente ganha por hora.',
    dailyReminder: 'Finalizou algum serviço hoje? Registre agora!',
    weeklyGoal: 'Calcular quanto ganhou por hora trabalhada',
  },

  servicos_profissionais: {
    id: 'servicos_profissionais',
    name: 'Serviços Profissionais',
    icon: '🧑‍💼',
    description: 'Escritórios, consultorias e profissionais liberais',
    incomeCategories: [
      'Honorários Mensais',
      'Consultorias Avulsas',
      'Pareceres Técnicos',
      'Visitas Técnicas',
      'Taxa de Sucesso',
      'Projetos',
      'Outros',
    ],
    expenseCategories: [
      'Softwares de Gestão',
      'Deslocamento/Viagens',
      'Materiais de Escritório',
      'Certificação Digital',
      'Associações de Classe',
      'Contador',
      'Impostos',
      'Outros',
    ],
    routineTips: [
      '🧾 Registre recebimentos por cliente/contrato para ver a concentração de receita',
      '📅 Separe honorários mensais de consultorias avulsas',
      '🚗 Lance despesas de deslocamento para entender o custo por atendimento',
    ],
    onboardingMessage: 'Em serviços profissionais, acompanhar contratos e custos de operação ajuda a garantir previsibilidade e margem.',
    dailyReminder: 'Teve atendimento ou recebeu de algum cliente hoje? Registre!',
    weeklyGoal: 'Revisar receita por cliente e custos operacionais',
  },
  
  profissional_autonomo: {
    id: 'profissional_autonomo',
    name: 'Profissional Autônomo',
    icon: '💼',
    description: 'Freelancers, consultores, profissionais liberais',
    incomeCategories: [
      'Serviços prestados',
      'Consultas',
      'Projetos',
      'Aulas/Cursos',
      'Comissões',
      'Royalties',
      'Outros',
    ],
    expenseCategories: [
      'Home office',
      'Internet/Telefone',
      'Software/Assinaturas',
      'Equipamentos',
      'Transporte',
      'Alimentação trabalho',
      'Marketing pessoal',
      'Cursos/Capacitação',
      'Contador',
      'Impostos',
      'Outros',
    ],
    routineTips: [
      '💻 Registre cada projeto ou serviço entregue',
      '📅 Anote horas trabalhadas por cliente',
      '🧾 Guarde comprovantes de despesas dedutíveis',
    ],
    onboardingMessage: 'Como autônomo, você é o negócio! Separe bem o que é pessoal do profissional e saiba exatamente quanto ganha líquido.',
    dailyReminder: 'Trabalhou em algum projeto hoje? Registre o valor!',
    weeklyGoal: 'Revisar quanto cada cliente representa no faturamento',
  },
  
  outros: {
    id: 'outros',
    name: 'Outros',
    icon: '📊',
    description: 'Outros tipos de negócio',
    incomeCategories: [
      'Vendas',
      'Serviços',
      'Comissões',
      'Outros',
    ],
    expenseCategories: [
      'Fornecedores',
      'Funcionários',
      'Aluguel',
      'Energia',
      'Água',
      'Internet/Telefone',
      'Transporte',
      'Marketing',
      'Impostos',
      'Outros',
    ],
    routineTips: [
      '📝 Registre todas as entradas e saídas diariamente',
      '📊 Revise seus números semanalmente',
      '🎯 Defina uma meta mensal de faturamento',
    ],
    onboardingMessage: 'Independente do tipo de negócio, o controle financeiro é a base do sucesso. Comece registrando tudo!',
    dailyReminder: 'Não esqueça de registrar as movimentações de hoje!',
    weeklyGoal: 'Manter os registros em dia todos os dias',
  },
};

// Função para obter perfil pelo tipo
export function getBusinessProfile(type: BusinessType | string | null): BusinessProfile {
  if (type && type in BUSINESS_PROFILES) {
    return BUSINESS_PROFILES[type as BusinessType];
  }
  return BUSINESS_PROFILES.outros;
}

// Lista de opções para dropdown
export const BUSINESS_TYPE_OPTIONS = Object.values(BUSINESS_PROFILES).map(profile => ({
  value: profile.id,
  label: `${profile.icon} ${profile.name}`,
  description: profile.description,
}));
