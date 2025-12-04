-- Tabela de mensagens do admin para empresas
CREATE TABLE IF NOT EXISTS admin_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  is_broadcast BOOLEAN DEFAULT false,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'urgent', 'promotion', 'support')),
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_admin_messages_company_id ON admin_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_admin_messages_broadcast ON admin_messages(is_broadcast);
CREATE INDEX IF NOT EXISTS idx_admin_messages_read ON admin_messages(read);
CREATE INDEX IF NOT EXISTS idx_admin_messages_created ON admin_messages(created_at DESC);

-- Tabela de templates de mensagens
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS (Row Level Security)
ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

-- Políticas para admin_messages
CREATE POLICY "Users can view messages for their company"
  ON admin_messages FOR SELECT
  USING (
    -- Verificar se o usuário é admin (pode ver todas as mensagens)
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
    -- Ou se a mensagem é broadcast
    OR is_broadcast = true
  );

CREATE POLICY "Admins can insert messages"
  ON admin_messages FOR INSERT
  WITH CHECK (
    -- Apenas admins podem inserir mensagens
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Users can update read status"
  ON admin_messages FOR UPDATE
  USING (
    -- Apenas admins podem atualizar mensagens
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Políticas para templates (apenas admin pode gerenciar)
CREATE POLICY "Anyone can view templates"
  ON message_templates FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage templates"
  ON message_templates FOR ALL
  WITH CHECK (
    -- Apenas admins podem gerenciar templates
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Inserir templates padrão
INSERT INTO message_templates (name, title, message, type) VALUES
('trial_ending_3days', 'Seu Trial Está Terminando', 'Olá! Seu período de trial do Fast Cash Flow termina em 3 dias. Para continuar aproveitando todos os recursos, ative sua assinatura agora! Valor: R$ 9,99/mês ou R$ 99,99/ano.', 'warning'),
('trial_ending_1day', 'ÚLTIMO DIA de Trial', 'Atenção! Seu trial termina amanhã. Não perca o acesso ao Fast Cash Flow! Ative sua assinatura hoje mesmo e continue gerenciando suas finanças com facilidade.', 'urgent'),
('payment_reminder', 'Lembrete de Pagamento', 'Identificamos que sua assinatura está próxima do vencimento. Para manter o acesso ativo, realize o pagamento em dia. Dúvidas? Entre em contato conosco!', 'warning'),
('welcome_new_user', 'Bem-vindo ao Fast Cash Flow!', 'Seja bem-vindo! Estamos felizes em tê-lo conosco. Aproveite seu período de trial para explorar todas as funcionalidades. Se precisar de ajuda, estamos à disposição!', 'info'),
('system_update', 'Atualização do Sistema', 'Implementamos melhorias no Fast Cash Flow! Confira as novidades e continue aproveitando a melhor experiência em gestão financeira.', 'info'),
('scheduled_maintenance', 'Manutenção Programada', 'Informamos que o sistema passará por manutenção no dia XX/XX às XXh. O acesso ficará indisponível por aproximadamente 1 hora. Pedimos desculpas pelo transtorno.', 'warning'),
('feature_announcement', 'Nova Funcionalidade Disponível!', 'Temos novidades! Uma nova funcionalidade foi adicionada ao Fast Cash Flow. Confira no app e aproveite para melhorar ainda mais sua gestão financeira!', 'promotion');

COMMENT ON TABLE admin_messages IS 'Mensagens enviadas pelo administrador para empresas';
COMMENT ON TABLE message_templates IS 'Templates de mensagens reutilizáveis';
