-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can view messages for their company" ON admin_messages;
DROP POLICY IF EXISTS "Admins can insert messages" ON admin_messages;
DROP POLICY IF EXISTS "Users can update read status" ON admin_messages;
DROP POLICY IF EXISTS "Anyone can view templates" ON message_templates;
DROP POLICY IF EXISTS "Admins can manage templates" ON message_templates;

-- Recriar políticas corretas
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

-- Inserir templates padrão (verificando se não existem)
INSERT INTO message_templates (name, title, message, type) 
SELECT 
  'trial_ending_3days', 'Seu Trial Está Terminando', 'Olá! Seu período de trial do Fast Cash Flow termina em 3 dias. Para continuar aproveitando todos os recursos, ative sua assinatura agora! Valor: R$ 9,99/mês ou R$ 99,99/ano.', 'warning'
WHERE NOT EXISTS (SELECT 1 FROM message_templates WHERE name = 'trial_ending_3days');

INSERT INTO message_templates (name, title, message, type) 
SELECT 
  'trial_ending_1day', 'ÚLTIMO DIA de Trial', 'Atenção! Seu trial termina amanhã. Não perca o acesso ao Fast Cash Flow! Ative sua assinatura hoje mesmo e continue gerenciando suas finanças com facilidade.', 'urgent'
WHERE NOT EXISTS (SELECT 1 FROM message_templates WHERE name = 'trial_ending_1day');

INSERT INTO message_templates (name, title, message, type) 
SELECT 
  'payment_reminder', 'Lembrete de Pagamento', 'Identificamos que sua assinatura está próxima do vencimento. Para manter o acesso ativo, realize o pagamento em dia. Dúvidas? Entre em contato conosco!', 'warning'
WHERE NOT EXISTS (SELECT 1 FROM message_templates WHERE name = 'payment_reminder');

INSERT INTO message_templates (name, title, message, type) 
SELECT 
  'welcome_new_user', 'Bem-vindo ao Fast Cash Flow!', 'Seja bem-vindo! Estamos felizes em tê-lo conosco. Aproveite seu período de trial para explorar todas as funcionalidades. Se precisar de ajuda, estamos à disposição!', 'info'
WHERE NOT EXISTS (SELECT 1 FROM message_templates WHERE name = 'welcome_new_user');

INSERT INTO message_templates (name, title, message, type) 
SELECT 
  'system_update', 'Atualização do Sistema', 'Implementamos melhorias no Fast Cash Flow! Confira as novidades e continue aproveitando a melhor experiência em gestão financeira.', 'info'
WHERE NOT EXISTS (SELECT 1 FROM message_templates WHERE name = 'system_update');

INSERT INTO message_templates (name, title, message, type) 
SELECT 
  'scheduled_maintenance', 'Manutenção Programada', 'Informamos que o sistema passará por manutenção no dia XX/XX às XXh. O acesso ficará indisponível por aproximadamente 1 hora. Pedimos desculpas pelo transtorno.', 'warning'
WHERE NOT EXISTS (SELECT 1 FROM message_templates WHERE name = 'scheduled_maintenance');

INSERT INTO message_templates (name, title, message, type) 
SELECT 
  'feature_announcement', 'Nova Funcionalidade Disponível!', 'Temos novidades! Uma nova funcionalidade foi adicionada ao Fast Cash Flow. Confira no app e aproveite para melhorar ainda mais sua gestão financeira!', 'promotion'
WHERE NOT EXISTS (SELECT 1 FROM message_templates WHERE name = 'feature_announcement');

COMMENT ON TABLE admin_messages IS 'Mensagens enviadas pelo administrador para empresas';
COMMENT ON TABLE message_templates IS 'Templates de mensagens reutilizáveis';
