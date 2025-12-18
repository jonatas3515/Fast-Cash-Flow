-- =====================================================
-- INTEGRATIONS & WEBHOOKS SYSTEM
-- =====================================================
-- Sistema de integrações e webhooks para notificações
-- Inclui: Webhooks, importações, notificações externas

-- IMPORTANTE: Dropar tabelas existentes para recriar com estrutura correta
DROP TABLE IF EXISTS webhook_logs CASCADE;
DROP TABLE IF EXISTS webhooks CASCADE;
DROP TABLE IF EXISTS notification_templates CASCADE;
DROP TABLE IF EXISTS import_logs CASCADE;
DROP TABLE IF EXISTS integration_settings CASCADE;

-- =====================================================
-- 1. TABELA DE WEBHOOKS CONFIGURADOS
-- =====================================================
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Identificação
  name TEXT NOT NULL,
  description TEXT,
  
  -- Configuração
  url TEXT NOT NULL,
  method TEXT DEFAULT 'POST' CHECK (method IN ('POST', 'GET', 'PUT')),
  headers JSONB DEFAULT '{}'::JSONB,
  
  -- Eventos que disparam o webhook
  events TEXT[] NOT NULL DEFAULT ARRAY['transaction_created'],
  -- Eventos disponíveis:
  -- transaction_created, transaction_updated, transaction_deleted
  -- goal_achieved, goal_created
  -- debt_created, debt_paid
  -- daily_summary, weekly_summary, monthly_summary
  -- alert_negative_balance, alert_debt_threshold
  
  -- Filtros (opcional)
  filters JSONB DEFAULT '{}'::JSONB,
  -- Ex: {"min_amount": 10000, "type": "expense"}
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Estatísticas
  total_calls INTEGER DEFAULT 0,
  successful_calls INTEGER DEFAULT 0,
  failed_calls INTEGER DEFAULT 0,
  last_called_at TIMESTAMPTZ,
  last_error TEXT,
  
  -- Datas
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_webhooks_company ON webhooks(company_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active);
CREATE INDEX IF NOT EXISTS idx_webhooks_events ON webhooks USING GIN(events);

-- =====================================================
-- 2. TABELA DE LOG DE WEBHOOKS
-- =====================================================
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Evento
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  
  -- Requisição
  request_url TEXT NOT NULL,
  request_method TEXT NOT NULL,
  request_headers JSONB,
  request_body JSONB,
  
  -- Resposta
  response_status INTEGER,
  response_body TEXT,
  response_time_ms INTEGER,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'retrying')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook ON webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_company ON webhook_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON webhook_logs(created_at DESC);

-- =====================================================
-- 3. TABELA DE TEMPLATES DE NOTIFICAÇÃO
-- =====================================================
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Conteúdo
  title_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  -- Variáveis disponíveis: {{company_name}}, {{amount}}, {{description}}, {{date}}, {{balance}}, etc.
  
  -- Canais
  channels TEXT[] DEFAULT ARRAY['push', 'email'],
  
  -- Configurações
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. TABELA DE IMPORTAÇÕES
-- =====================================================
CREATE TABLE import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Tipo de importação
  import_type TEXT NOT NULL CHECK (import_type IN (
    'bank_statement',
    'csv_transactions',
    'ofx_file',
    'excel_file'
  )),
  
  -- Fonte
  source_bank TEXT, -- 'nubank', 'inter', 'caixa', etc.
  file_name TEXT,
  file_size_bytes INTEGER,
  
  -- Resultado
  status TEXT DEFAULT 'processing' CHECK (status IN (
    'processing',
    'completed',
    'failed',
    'partial'
  )),
  
  -- Estatísticas
  total_rows INTEGER DEFAULT 0,
  imported_rows INTEGER DEFAULT 0,
  skipped_rows INTEGER DEFAULT 0,
  error_rows INTEGER DEFAULT 0,
  
  -- Valores
  total_income_cents BIGINT DEFAULT 0,
  total_expense_cents BIGINT DEFAULT 0,
  
  -- Erros
  errors JSONB DEFAULT '[]'::JSONB,
  
  -- Quem importou
  imported_by UUID,
  
  -- Datas
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_imports_company ON import_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_imports_status ON import_logs(status);
CREATE INDEX IF NOT EXISTS idx_imports_type ON import_logs(import_type);

-- =====================================================
-- 5. TABELA DE CONFIGURAÇÕES DE INTEGRAÇÃO
-- =====================================================
CREATE TABLE integration_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  
  -- WhatsApp
  whatsapp_enabled BOOLEAN DEFAULT false,
  whatsapp_number TEXT,
  whatsapp_notifications JSONB DEFAULT '{
    "daily_summary": false,
    "transaction_alerts": false,
    "goal_achieved": true,
    "negative_balance": true
  }'::JSONB,
  
  -- Email
  email_enabled BOOLEAN DEFAULT true,
  email_notifications JSONB DEFAULT '{
    "daily_summary": false,
    "weekly_summary": true,
    "monthly_report": true,
    "transaction_alerts": false
  }'::JSONB,
  
  -- Push
  push_enabled BOOLEAN DEFAULT true,
  push_token TEXT,
  
  -- Importação automática
  auto_import_enabled BOOLEAN DEFAULT false,
  auto_import_bank TEXT,
  auto_import_frequency TEXT DEFAULT 'daily',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_integration_company ON integration_settings(company_id);

-- =====================================================
-- 6. FUNÇÕES DE WEBHOOK
-- =====================================================

-- Função para registrar chamada de webhook
CREATE OR REPLACE FUNCTION log_webhook_call(
  p_webhook_id UUID,
  p_event_type TEXT,
  p_event_data JSONB,
  p_response_status INTEGER DEFAULT NULL,
  p_response_body TEXT DEFAULT NULL,
  p_response_time_ms INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_webhook RECORD;
  v_log_id UUID;
  v_status TEXT;
BEGIN
  -- Buscar webhook
  SELECT * INTO v_webhook FROM webhooks WHERE id = p_webhook_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Webhook não encontrado';
  END IF;
  
  -- Determinar status
  IF p_response_status IS NOT NULL AND p_response_status >= 200 AND p_response_status < 300 THEN
    v_status := 'success';
  ELSIF p_error_message IS NOT NULL THEN
    v_status := 'failed';
  ELSE
    v_status := 'pending';
  END IF;
  
  -- Criar log
  INSERT INTO webhook_logs (
    webhook_id, company_id, event_type, event_data,
    request_url, request_method, request_headers, request_body,
    response_status, response_body, response_time_ms,
    status, error_message
  ) VALUES (
    p_webhook_id, v_webhook.company_id, p_event_type, p_event_data,
    v_webhook.url, v_webhook.method, v_webhook.headers, p_event_data,
    p_response_status, p_response_body, p_response_time_ms,
    v_status, p_error_message
  ) RETURNING id INTO v_log_id;
  
  -- Atualizar estatísticas do webhook
  UPDATE webhooks SET
    total_calls = total_calls + 1,
    successful_calls = successful_calls + CASE WHEN v_status = 'success' THEN 1 ELSE 0 END,
    failed_calls = failed_calls + CASE WHEN v_status = 'failed' THEN 1 ELSE 0 END,
    last_called_at = NOW(),
    last_error = CASE WHEN v_status = 'failed' THEN p_error_message ELSE last_error END,
    updated_at = NOW()
  WHERE id = p_webhook_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar webhooks por evento
CREATE OR REPLACE FUNCTION get_webhooks_for_event(
  p_company_id UUID,
  p_event_type TEXT
)
RETURNS TABLE (
  webhook_id UUID,
  webhook_name TEXT,
  url TEXT,
  method TEXT,
  headers JSONB,
  filters JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id AS webhook_id,
    w.name AS webhook_name,
    w.url,
    w.method,
    w.headers,
    w.filters
  FROM webhooks w
  WHERE w.company_id = p_company_id
  AND w.is_active = true
  AND p_event_type = ANY(w.events);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. DADOS INICIAIS - TEMPLATES DE NOTIFICAÇÃO
-- =====================================================
INSERT INTO notification_templates (key, name, description, title_template, body_template, channels) VALUES
(
  'transaction_created',
  'Nova Transação',
  'Notificação quando uma transação é criada',
  '{{type_emoji}} Nova {{type_label}}',
  '{{description}}: {{amount}} em {{date}}',
  ARRAY['push']
),
(
  'goal_achieved',
  'Meta Atingida',
  'Notificação quando uma meta é atingida',
  '🎯 Meta Atingida!',
  'Parabéns! Você atingiu a meta "{{goal_name}}" de {{target_amount}}',
  ARRAY['push', 'email']
),
(
  'negative_balance',
  'Saldo Negativo',
  'Alerta de saldo negativo',
  '⚠️ Atenção: Saldo Negativo',
  'Seu saldo está negativo em {{balance}}. Revise suas finanças.',
  ARRAY['push', 'whatsapp']
),
(
  'daily_summary',
  'Resumo Diário',
  'Resumo das transações do dia',
  '📊 Resumo do Dia',
  'Entradas: {{income}} | Saídas: {{expense}} | Saldo: {{balance}}',
  ARRAY['push', 'whatsapp']
),
(
  'weekly_summary',
  'Resumo Semanal',
  'Resumo das transações da semana',
  '📈 Resumo da Semana',
  'Esta semana: {{transactions_count}} transações. Entradas: {{income}} | Saídas: {{expense}}',
  ARRAY['email']
),
(
  'debt_reminder',
  'Lembrete de Dívida',
  'Lembrete de dívida próxima do vencimento',
  '💳 Dívida Próxima do Vencimento',
  'A dívida "{{debt_name}}" de {{amount}} vence em {{days_until}} dias.',
  ARRAY['push', 'whatsapp']
)
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 8. VIEWS
-- =====================================================

-- View de webhooks com estatísticas
CREATE OR REPLACE VIEW v_webhooks_stats AS
SELECT 
  w.*,
  CASE 
    WHEN w.total_calls = 0 THEN 0
    ELSE ROUND((w.successful_calls::DECIMAL / w.total_calls) * 100, 1)
  END AS success_rate,
  (SELECT COUNT(*) FROM webhook_logs wl WHERE wl.webhook_id = w.id AND wl.created_at > NOW() - INTERVAL '24 hours') AS calls_last_24h
FROM webhooks w;

-- View de importações recentes
CREATE OR REPLACE VIEW v_recent_imports AS
SELECT 
  il.*,
  c.name AS company_name
FROM import_logs il
JOIN companies c ON il.company_id = c.id
ORDER BY il.started_at DESC
LIMIT 100;

-- Comentários
COMMENT ON TABLE webhooks IS 'Webhooks configurados por empresa';
COMMENT ON TABLE webhook_logs IS 'Log de chamadas de webhooks';
COMMENT ON TABLE notification_templates IS 'Templates de notificação do sistema';
COMMENT ON TABLE import_logs IS 'Log de importações de arquivos';
COMMENT ON TABLE integration_settings IS 'Configurações de integração por empresa';
COMMENT ON FUNCTION log_webhook_call IS 'Registra uma chamada de webhook';
COMMENT ON FUNCTION get_webhooks_for_event IS 'Busca webhooks ativos para um evento';
