-- Tabela para configurações de notificações por empresa
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- WhatsApp
  whatsapp_enabled BOOLEAN DEFAULT false,
  whatsapp_number TEXT, -- Número com código do país (ex: 5511999999999)
  
  -- Configurações de notificações
  notify_order_delivery BOOLEAN DEFAULT true, -- 3h antes da entrega
  notify_daily_summary BOOLEAN DEFAULT true, -- Resumo às 20h
  notify_debt_reminder BOOLEAN DEFAULT true, -- Dívidas próximas de vencer
  
  -- Horários personalizados
  daily_summary_time TIME DEFAULT '20:00',
  debt_reminder_time TIME DEFAULT '12:00',
  order_reminder_hours INTEGER DEFAULT 3, -- Horas antes da entrega
  
  -- API WhatsApp (Z-API, Twilio, etc)
  whatsapp_api_url TEXT,
  whatsapp_api_token TEXT,
  whatsapp_instance_id TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(company_id)
);

-- Tabela para log de notificações enviadas
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'order_delivery', 'daily_summary', 'debt_reminder'
  recipient TEXT NOT NULL, -- Número ou email
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para agendamento de notificações
CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  reference_id TEXT, -- ID da encomenda ou dívida relacionada
  reference_type TEXT, -- 'order', 'debt'
  payload JSONB,
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_notification_settings_company ON notification_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_company ON notification_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created ON notification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_pending ON scheduled_notifications(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_company ON scheduled_notifications(company_id);

-- RLS
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Allow all for authenticated on notification_settings" ON notification_settings;
CREATE POLICY "Allow all for authenticated on notification_settings" ON notification_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated on notification_logs" ON notification_logs;
CREATE POLICY "Allow all for authenticated on notification_logs" ON notification_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated on scheduled_notifications" ON scheduled_notifications;
CREATE POLICY "Allow all for authenticated on scheduled_notifications" ON scheduled_notifications
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_notification_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_notification_settings_timestamp ON notification_settings;
CREATE TRIGGER update_notification_settings_timestamp
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_settings_timestamp();
