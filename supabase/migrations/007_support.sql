-- =====================================================
-- SUPPORT & ENGAGEMENT SYSTEM
-- =====================================================
-- Sistema de suporte e engajamento para empresas
-- Inclui: Chat Admin→Empresa, FAQ, Tutoriais

-- =====================================================
-- 1. TABELA DE MENSAGENS (CHAT ADMIN ↔ EMPRESA)
-- =====================================================
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Direção da mensagem
  direction TEXT NOT NULL CHECK (direction IN ('admin_to_company', 'company_to_admin')),
  
  -- Conteúdo
  message TEXT NOT NULL,
  
  -- Status
  read_at TIMESTAMPTZ,
  
  -- Metadados
  sender_name TEXT, -- Nome do admin ou empresa
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_support_messages_company ON support_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_direction ON support_messages(direction);
CREATE INDEX IF NOT EXISTS idx_support_messages_read ON support_messages(read_at);
CREATE INDEX IF NOT EXISTS idx_support_messages_created ON support_messages(created_at DESC);

-- =====================================================
-- 2. TABELA DE CONVERSAS (RESUMO)
-- =====================================================
CREATE TABLE IF NOT EXISTS support_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  
  -- Contadores
  total_messages INTEGER DEFAULT 0,
  unread_by_company INTEGER DEFAULT 0,
  unread_by_admin INTEGER DEFAULT 0,
  
  -- Última atividade
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  last_message_direction TEXT,
  
  -- Status
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'pending')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_support_conv_company ON support_conversations(company_id);
CREATE INDEX IF NOT EXISTS idx_support_conv_unread ON support_conversations(unread_by_admin DESC);
CREATE INDEX IF NOT EXISTS idx_support_conv_last ON support_conversations(last_message_at DESC);

-- =====================================================
-- 3. TABELA DE FAQ (PERGUNTAS FREQUENTES)
-- =====================================================
CREATE TABLE IF NOT EXISTS faq_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Categorização
  category TEXT NOT NULL CHECK (category IN (
    'getting_started',    -- Primeiros passos
    'transactions',       -- Lançamentos
    'goals',              -- Metas
    'reports',            -- Relatórios
    'sync',               -- Sincronização
    'payment',            -- Pagamento
    'account',            -- Conta
    'other'               -- Outros
  )),
  
  -- Conteúdo
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  
  -- Busca
  keywords TEXT[], -- Palavras-chave para busca
  
  -- Ordenação e visibilidade
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  -- Métricas
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_faq_category ON faq_articles(category);
CREATE INDEX IF NOT EXISTS idx_faq_active ON faq_articles(is_active);
CREATE INDEX IF NOT EXISTS idx_faq_keywords ON faq_articles USING GIN(keywords);

-- =====================================================
-- 4. TABELA DE TUTORIAIS EM VÍDEO
-- =====================================================
CREATE TABLE IF NOT EXISTS video_tutorials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  tutorial_key TEXT UNIQUE NOT NULL, -- Ex: 'quick_transaction', 'dashboard_overview'
  
  -- Conteúdo
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL, -- URL do YouTube (unlisted)
  thumbnail_url TEXT,
  duration_seconds INTEGER, -- Duração em segundos
  
  -- Contexto
  screen_context TEXT, -- Tela onde deve aparecer (ex: 'Dashboard', 'Goals')
  feature_context TEXT, -- Funcionalidade específica
  
  -- Ordenação e visibilidade
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  -- Métricas
  view_count INTEGER DEFAULT 0,
  completion_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_tutorials_key ON video_tutorials(tutorial_key);
CREATE INDEX IF NOT EXISTS idx_tutorials_screen ON video_tutorials(screen_context);
CREATE INDEX IF NOT EXISTS idx_tutorials_active ON video_tutorials(is_active);

-- =====================================================
-- 5. TABELA DE AJUDA CONTEXTUAL
-- =====================================================
CREATE TABLE IF NOT EXISTS contextual_help (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Contexto
  screen_name TEXT NOT NULL, -- Nome da tela
  element_id TEXT, -- ID do elemento específico (opcional)
  
  -- Conteúdo
  tooltip_text TEXT NOT NULL,
  help_title TEXT,
  help_content TEXT,
  
  -- Referências
  faq_article_id UUID REFERENCES faq_articles(id),
  video_tutorial_id UUID REFERENCES video_tutorials(id),
  
  -- Visibilidade
  is_active BOOLEAN DEFAULT true,
  show_on_first_visit BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_contextual_screen ON contextual_help(screen_name);
CREATE INDEX IF NOT EXISTS idx_contextual_active ON contextual_help(is_active);

-- =====================================================
-- 6. FUNÇÕES DE SUPORTE
-- =====================================================

-- Função para enviar mensagem
CREATE OR REPLACE FUNCTION send_support_message(
  p_company_id UUID,
  p_direction TEXT,
  p_message TEXT,
  p_sender_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
BEGIN
  -- Inserir mensagem
  INSERT INTO support_messages (company_id, direction, message, sender_name)
  VALUES (p_company_id, p_direction, p_message, p_sender_name)
  RETURNING id INTO v_message_id;
  
  -- Atualizar ou criar conversa
  INSERT INTO support_conversations (
    company_id,
    total_messages,
    unread_by_company,
    unread_by_admin,
    last_message_at,
    last_message_preview,
    last_message_direction,
    status
  ) VALUES (
    p_company_id,
    1,
    CASE WHEN p_direction = 'admin_to_company' THEN 1 ELSE 0 END,
    CASE WHEN p_direction = 'company_to_admin' THEN 1 ELSE 0 END,
    NOW(),
    LEFT(p_message, 100),
    p_direction,
    'open'
  )
  ON CONFLICT (company_id) DO UPDATE SET
    total_messages = support_conversations.total_messages + 1,
    unread_by_company = CASE 
      WHEN p_direction = 'admin_to_company' 
      THEN support_conversations.unread_by_company + 1 
      ELSE support_conversations.unread_by_company 
    END,
    unread_by_admin = CASE 
      WHEN p_direction = 'company_to_admin' 
      THEN support_conversations.unread_by_admin + 1 
      ELSE support_conversations.unread_by_admin 
    END,
    last_message_at = NOW(),
    last_message_preview = LEFT(p_message, 100),
    last_message_direction = p_direction,
    status = 'open',
    updated_at = NOW();
  
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql;

-- Função para marcar mensagens como lidas
CREATE OR REPLACE FUNCTION mark_messages_read(
  p_company_id UUID,
  p_reader TEXT -- 'company' ou 'admin'
)
RETURNS void AS $$
BEGIN
  -- Marcar mensagens como lidas
  IF p_reader = 'company' THEN
    UPDATE support_messages
    SET read_at = NOW()
    WHERE company_id = p_company_id
    AND direction = 'admin_to_company'
    AND read_at IS NULL;
    
    UPDATE support_conversations
    SET unread_by_company = 0, updated_at = NOW()
    WHERE company_id = p_company_id;
  ELSE
    UPDATE support_messages
    SET read_at = NOW()
    WHERE company_id = p_company_id
    AND direction = 'company_to_admin'
    AND read_at IS NULL;
    
    UPDATE support_conversations
    SET unread_by_admin = 0, updated_at = NOW()
    WHERE company_id = p_company_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar FAQ
CREATE OR REPLACE FUNCTION search_faq(p_query TEXT)
RETURNS TABLE (
  id UUID,
  category TEXT,
  question TEXT,
  answer TEXT,
  relevance FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.category,
    f.question,
    f.answer,
    (
      CASE WHEN f.question ILIKE '%' || p_query || '%' THEN 2.0 ELSE 0 END +
      CASE WHEN f.answer ILIKE '%' || p_query || '%' THEN 1.0 ELSE 0 END +
      CASE WHEN p_query = ANY(f.keywords) THEN 3.0 ELSE 0 END
    ) AS relevance
  FROM faq_articles f
  WHERE f.is_active = true
  AND (
    f.question ILIKE '%' || p_query || '%'
    OR f.answer ILIKE '%' || p_query || '%'
    OR p_query = ANY(f.keywords)
  )
  ORDER BY relevance DESC, f.sort_order ASC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. DADOS INICIAIS - FAQ
-- =====================================================
INSERT INTO faq_articles (category, question, answer, keywords, sort_order) VALUES
-- Primeiros Passos
('getting_started', 'Como começar a usar o Fast Cash Flow?', 
'Bem-vindo! Para começar:\n\n1. Complete seu perfil na aba Configurações\n2. Registre seu primeiro lançamento no Dashboard\n3. Configure suas categorias personalizadas\n4. Defina uma meta financeira mensal\n\nDica: Complete o checklist de onboarding para ganhar +7 dias de trial!',
ARRAY['começar', 'inicio', 'primeiro', 'tutorial'], 1),

('getting_started', 'O que é o período de trial?',
'O período de trial é um tempo gratuito para você testar todas as funcionalidades do Fast Cash Flow. Durante o trial você tem acesso completo ao sistema.\n\nAo final do período, você pode ativar sua assinatura para continuar usando.',
ARRAY['trial', 'teste', 'gratuito', 'período'], 2),

-- Lançamentos
('transactions', 'Como registrar uma entrada ou saída?',
'Para registrar um lançamento:\n\n1. Acesse o Dashboard\n2. Clique no botão + (Entrada) ou - (Saída)\n3. Preencha o valor e descrição\n4. Selecione a categoria\n5. Confirme o lançamento\n\nO saldo será atualizado automaticamente!',
ARRAY['lançamento', 'entrada', 'saída', 'registrar', 'adicionar'], 1),

('transactions', 'Como editar ou excluir um lançamento?',
'Para editar ou excluir:\n\n1. Acesse a aba Dia ou Mês\n2. Encontre o lançamento na lista\n3. Toque no lançamento para abrir opções\n4. Escolha Editar ou Excluir\n\nAtenção: Lançamentos excluídos não podem ser recuperados.',
ARRAY['editar', 'excluir', 'apagar', 'modificar', 'alterar'], 2),

-- Metas
('goals', 'Como funcionam as metas financeiras?',
'As metas ajudam você a controlar seus objetivos:\n\n1. Defina um valor alvo para o mês\n2. Acompanhe o progresso no Dashboard\n3. Receba alertas quando estiver perto de atingir\n\nDica: Metas realistas aumentam sua motivação!',
ARRAY['meta', 'objetivo', 'alvo', 'planejamento'], 1),

('goals', 'Posso ter mais de uma meta por mês?',
'Atualmente o sistema suporta uma meta principal por mês. Esta meta representa seu objetivo de saldo ou faturamento.\n\nEm breve teremos suporte para múltiplas metas por categoria!',
ARRAY['várias', 'múltiplas', 'metas'], 2),

-- Relatórios
('reports', 'Como gerar um relatório?',
'Para gerar relatórios:\n\n1. Acesse a aba Relatórios\n2. Selecione o período desejado\n3. Escolha o tipo de relatório\n4. Clique em Gerar PDF\n\nO relatório será baixado automaticamente.',
ARRAY['relatório', 'pdf', 'exportar', 'gerar'], 1),

('reports', 'Quais tipos de relatório estão disponíveis?',
'Temos os seguintes relatórios:\n\n• Resumo Mensal: Visão geral do mês\n• Por Categoria: Gastos agrupados\n• Fluxo de Caixa: Entradas e saídas diárias\n• Comparativo: Compare meses diferentes',
ARRAY['tipos', 'relatórios', 'disponíveis'], 2),

-- Sincronização
('sync', 'Meus dados não estão sincronizando. O que fazer?',
'Se seus dados não sincronizam:\n\n1. Verifique sua conexão com a internet\n2. Feche e abra o aplicativo novamente\n3. Vá em Configurações > Sincronizar Agora\n4. Se persistir, faça logout e login novamente\n\nSeus dados locais estão seguros!',
ARRAY['sincronizar', 'sincronização', 'não sincroniza', 'offline'], 1),

('sync', 'Posso usar o app offline?',
'Sim! O Fast Cash Flow funciona offline:\n\n• Seus lançamentos são salvos localmente\n• Quando voltar online, sincroniza automaticamente\n• Você pode forçar sincronização nas Configurações\n\nDica: Sincronize regularmente para backup na nuvem.',
ARRAY['offline', 'sem internet', 'local'], 2),

-- Pagamento
('payment', 'Quais são os planos disponíveis?',
'Oferecemos planos flexíveis:\n\n• Mensal: R$ 9,99/mês\n• Anual: R$ 99,90/ano (2 meses grátis!)\n\nTodos os planos incluem acesso completo a todas as funcionalidades.',
ARRAY['plano', 'preço', 'valor', 'assinatura', 'mensalidade'], 1),

('payment', 'Como ativar minha assinatura?',
'Para ativar sua assinatura:\n\n1. Clique no banner de upgrade no app\n2. Escolha seu plano (mensal ou anual)\n3. Entre em contato via WhatsApp\n4. Realize o pagamento\n5. Sua conta será ativada em até 24h\n\nDúvidas? Fale conosco pelo chat!',
ARRAY['ativar', 'assinar', 'pagar', 'upgrade'], 2)

ON CONFLICT DO NOTHING;

-- =====================================================
-- 8. DADOS INICIAIS - TUTORIAIS
-- =====================================================
INSERT INTO video_tutorials (tutorial_key, title, description, video_url, duration_seconds, screen_context, sort_order) VALUES
('quick_transaction', 'Como registrar entrada/saída rápida', 
'Aprenda a registrar seus lançamentos em segundos usando os botões de ação rápida.',
'https://www.youtube.com/watch?v=PLACEHOLDER1', 45, 'Dashboard', 1),

('dashboard_overview', 'Entendendo o Dashboard',
'Conheça todos os elementos do Dashboard e como interpretar seus dados financeiros.',
'https://www.youtube.com/watch?v=PLACEHOLDER2', 60, 'Dashboard', 2),

('custom_categories', 'Criando categorias personalizadas',
'Organize seus lançamentos com categorias que fazem sentido para seu negócio.',
'https://www.youtube.com/watch?v=PLACEHOLDER3', 40, 'Settings', 3),

('generate_report', 'Gerando relatório em PDF',
'Veja como exportar seus dados em relatórios profissionais para análise.',
'https://www.youtube.com/watch?v=PLACEHOLDER4', 50, 'Reports', 4),

('debt_installments', 'Cadastrando dívida parcelada',
'Aprenda a registrar compras parceladas e acompanhar os pagamentos.',
'https://www.youtube.com/watch?v=PLACEHOLDER5', 55, 'Debts', 5),

('financial_goals', 'Definindo metas financeiras',
'Configure metas mensais e acompanhe seu progresso em tempo real.',
'https://www.youtube.com/watch?v=PLACEHOLDER6', 45, 'Goals', 6)

ON CONFLICT (tutorial_key) DO NOTHING;

-- =====================================================
-- 9. VIEWS PARA RELATÓRIOS
-- =====================================================

-- View de conversas com empresas
CREATE OR REPLACE VIEW v_support_conversations AS
SELECT 
  c.id AS company_id,
  c.name AS company_name,
  c.status AS company_status,
  sc.total_messages,
  sc.unread_by_admin,
  sc.unread_by_company,
  sc.last_message_at,
  sc.last_message_preview,
  sc.last_message_direction,
  sc.status AS conversation_status
FROM companies c
LEFT JOIN support_conversations sc ON c.id = sc.company_id
WHERE c.deleted_at IS NULL
ORDER BY sc.last_message_at DESC NULLS LAST;

-- View de FAQ mais acessados
CREATE OR REPLACE VIEW v_faq_popular AS
SELECT 
  id,
  category,
  question,
  view_count,
  helpful_count,
  not_helpful_count,
  CASE 
    WHEN (helpful_count + not_helpful_count) > 0 
    THEN ROUND(helpful_count::NUMERIC / (helpful_count + not_helpful_count) * 100, 1)
    ELSE 0 
  END AS helpful_percent
FROM faq_articles
WHERE is_active = true
ORDER BY view_count DESC;

-- Comentários
COMMENT ON TABLE support_messages IS 'Mensagens de chat entre admin e empresas';
COMMENT ON TABLE support_conversations IS 'Resumo das conversas de suporte';
COMMENT ON TABLE faq_articles IS 'Artigos de FAQ para central de ajuda';
COMMENT ON TABLE video_tutorials IS 'Tutoriais em vídeo integrados';
COMMENT ON TABLE contextual_help IS 'Ajuda contextual por tela/elemento';
COMMENT ON FUNCTION send_support_message IS 'Envia mensagem de suporte e atualiza conversa';
COMMENT ON FUNCTION mark_messages_read IS 'Marca mensagens como lidas';
COMMENT ON FUNCTION search_faq IS 'Busca artigos de FAQ por texto';
