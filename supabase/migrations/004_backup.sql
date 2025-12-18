-- =====================================================
-- BACKUP & AUDIT SYSTEM
-- =====================================================
-- Sistema de backup centralizado e auditoria
-- Inclui: Backups automáticos, logs de atividade, alertas de segurança

-- =====================================================
-- 1. TABELA DE BACKUPS
-- =====================================================
CREATE TABLE IF NOT EXISTS company_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Tipo de backup
  backup_type TEXT NOT NULL CHECK (backup_type IN (
    'automatic',    -- Backup automático diário
    'manual',       -- Backup manual pelo admin
    'pre_restore',  -- Backup antes de restauração
    'export'        -- Exportação solicitada pelo usuário
  )),
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',
    'in_progress',
    'completed',
    'failed'
  )),
  
  -- Armazenamento
  storage_path TEXT, -- Caminho no Supabase Storage
  file_size_bytes BIGINT DEFAULT 0,
  
  -- Conteúdo do backup (JSON)
  data_snapshot JSONB, -- Snapshot dos dados para restauração rápida
  
  -- Metadados
  tables_included TEXT[] DEFAULT ARRAY['transactions', 'categories', 'goals', 'debts', 'orders'],
  records_count JSONB, -- {"transactions": 150, "categories": 10, ...}
  
  -- Quem criou
  created_by UUID, -- Admin que criou (se manual)
  
  -- Datas
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days'),
  
  -- Notas
  notes TEXT
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_backups_company ON company_backups(company_id);
CREATE INDEX IF NOT EXISTS idx_backups_type ON company_backups(backup_type);
CREATE INDEX IF NOT EXISTS idx_backups_status ON company_backups(status);
CREATE INDEX IF NOT EXISTS idx_backups_created ON company_backups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backups_expires ON company_backups(expires_at);

-- =====================================================
-- 2. TABELA DE RESTAURAÇÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS backup_restorations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_id UUID NOT NULL REFERENCES company_backups(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',
    'in_progress',
    'completed',
    'failed',
    'rolled_back'
  )),
  
  -- Detalhes
  restored_tables TEXT[],
  records_restored JSONB,
  
  -- Quem restaurou
  restored_by UUID NOT NULL, -- Admin que restaurou
  
  -- Datas
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Erros
  error_message TEXT,
  
  -- Notas
  notes TEXT
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_restorations_backup ON backup_restorations(backup_id);
CREATE INDEX IF NOT EXISTS idx_restorations_company ON backup_restorations(company_id);

-- =====================================================
-- 3. TABELA DE LOG DE AUDITORIA
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID, -- Pode ser NULL para ações do sistema
  
  -- Ação
  action_type TEXT NOT NULL CHECK (action_type IN (
    -- Autenticação
    'login',
    'logout',
    'login_failed',
    'password_changed',
    'password_reset',
    
    -- Transações
    'transaction_created',
    'transaction_updated',
    'transaction_deleted',
    'transaction_bulk_deleted',
    
    -- Categorias
    'category_created',
    'category_updated',
    'category_deleted',
    
    -- Metas
    'goal_created',
    'goal_updated',
    'goal_deleted',
    'goal_achieved',
    
    -- Débitos
    'debt_created',
    'debt_updated',
    'debt_deleted',
    'debt_paid',
    
    -- Relatórios
    'report_generated',
    'report_exported',
    
    -- Configurações
    'settings_updated',
    'profile_updated',
    
    -- Usuários
    'user_invited',
    'user_removed',
    'user_role_changed',
    
    -- Backup
    'backup_created',
    'backup_restored',
    'data_exported',
    
    -- Assinatura
    'subscription_started',
    'subscription_cancelled',
    'payment_made',
    
    -- Sistema
    'system_action'
  )),
  
  -- Detalhes
  entity_type TEXT, -- 'transaction', 'category', etc.
  entity_id UUID,
  
  -- Dados da mudança
  old_data JSONB,
  new_data JSONB,
  
  -- Contexto
  ip_address TEXT,
  user_agent TEXT,
  device_info JSONB, -- {"type": "mobile", "os": "iOS", "browser": "Safari"}
  location JSONB, -- {"city": "São Paulo", "country": "BR"}
  
  -- Metadados
  metadata JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_audit_company ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_ip ON audit_logs(ip_address);

-- =====================================================
-- 4. TABELA DE ALERTAS DE SEGURANÇA
-- =====================================================
CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID,
  
  -- Tipo de alerta
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'new_device',           -- Login de novo dispositivo
    'new_location',         -- Login de nova localização
    'multiple_failed_logins', -- Múltiplas tentativas falhas
    'suspicious_activity',  -- Atividade suspeita
    'bulk_deletion',        -- Exclusão em massa
    'unusual_export',       -- Exportação incomum
    'permission_escalation' -- Tentativa de escalar permissões
  )),
  
  -- Severidade
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Detalhes
  title TEXT NOT NULL,
  description TEXT,
  
  -- Contexto
  ip_address TEXT,
  device_info JSONB,
  location JSONB,
  
  -- Status
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'resolved', 'false_positive')),
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  
  -- Ações tomadas
  actions_taken TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_alerts_company ON security_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON security_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON security_alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON security_alerts(created_at DESC);

-- =====================================================
-- 5. TABELA DE DISPOSITIVOS CONHECIDOS
-- =====================================================
CREATE TABLE IF NOT EXISTS known_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Identificação do dispositivo
  device_fingerprint TEXT NOT NULL,
  device_name TEXT, -- "iPhone de João"
  
  -- Informações
  device_type TEXT, -- 'mobile', 'desktop', 'tablet'
  os TEXT,
  browser TEXT,
  
  -- Status
  is_trusted BOOLEAN DEFAULT false,
  is_blocked BOOLEAN DEFAULT false,
  
  -- Último uso
  last_ip TEXT,
  last_location JSONB,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Datas
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, device_fingerprint)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_devices_user ON known_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_company ON known_devices(company_id);
CREATE INDEX IF NOT EXISTS idx_devices_fingerprint ON known_devices(device_fingerprint);

-- =====================================================
-- 6. FUNÇÕES DE BACKUP
-- =====================================================

-- Função para criar backup de uma empresa
CREATE OR REPLACE FUNCTION create_company_backup(
  p_company_id UUID,
  p_backup_type TEXT DEFAULT 'manual',
  p_created_by UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_backup_id UUID;
  v_data JSONB;
  v_counts JSONB;
BEGIN
  -- Coletar dados da empresa
  SELECT jsonb_build_object(
    'transactions', (SELECT COALESCE(jsonb_agg(t.*), '[]'::jsonb) FROM transactions t WHERE t.company_id = p_company_id AND t.deleted_at IS NULL),
    'categories', (SELECT COALESCE(jsonb_agg(c.*), '[]'::jsonb) FROM categories c WHERE c.company_id = p_company_id),
    'goals', (SELECT COALESCE(jsonb_agg(g.*), '[]'::jsonb) FROM goals g WHERE g.company_id = p_company_id),
    'debts', (SELECT COALESCE(jsonb_agg(d.*), '[]'::jsonb) FROM debts d WHERE d.company_id = p_company_id AND d.deleted_at IS NULL),
    'company_info', (SELECT row_to_json(c.*) FROM companies c WHERE c.id = p_company_id)
  ) INTO v_data;
  
  -- Contar registros
  SELECT jsonb_build_object(
    'transactions', (SELECT COUNT(*) FROM transactions WHERE company_id = p_company_id AND deleted_at IS NULL),
    'categories', (SELECT COUNT(*) FROM categories WHERE company_id = p_company_id),
    'goals', (SELECT COUNT(*) FROM goals WHERE company_id = p_company_id),
    'debts', (SELECT COUNT(*) FROM debts WHERE company_id = p_company_id AND deleted_at IS NULL)
  ) INTO v_counts;
  
  -- Criar registro de backup
  INSERT INTO company_backups (
    company_id,
    backup_type,
    status,
    data_snapshot,
    records_count,
    created_by,
    notes
  ) VALUES (
    p_company_id,
    p_backup_type,
    'completed',
    v_data,
    v_counts,
    p_created_by,
    p_notes
  ) RETURNING id INTO v_backup_id;
  
  -- Registrar no audit log
  INSERT INTO audit_logs (company_id, user_id, action_type, entity_type, entity_id, new_data)
  VALUES (p_company_id, p_created_by, 'backup_created', 'backup', v_backup_id, jsonb_build_object('backup_type', p_backup_type, 'records', v_counts));
  
  RETURN v_backup_id;
END;
$$ LANGUAGE plpgsql;

-- Função para restaurar backup
CREATE OR REPLACE FUNCTION restore_company_backup(
  p_backup_id UUID,
  p_restored_by UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_backup RECORD;
  v_restoration_id UUID;
  v_pre_backup_id UUID;
BEGIN
  -- Buscar backup
  SELECT * INTO v_backup FROM company_backups WHERE id = p_backup_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Backup não encontrado';
  END IF;
  
  -- Criar backup pré-restauração
  SELECT create_company_backup(v_backup.company_id, 'pre_restore', p_restored_by, 'Backup automático antes da restauração') INTO v_pre_backup_id;
  
  -- Criar registro de restauração
  INSERT INTO backup_restorations (backup_id, company_id, status, restored_by, notes)
  VALUES (p_backup_id, v_backup.company_id, 'in_progress', p_restored_by, p_notes)
  RETURNING id INTO v_restoration_id;
  
  -- Soft delete dos dados atuais
  UPDATE transactions SET deleted_at = NOW() WHERE company_id = v_backup.company_id AND deleted_at IS NULL;
  UPDATE debts SET deleted_at = NOW() WHERE company_id = v_backup.company_id AND deleted_at IS NULL;
  
  -- Restaurar transações
  INSERT INTO transactions (id, company_id, description, amount_cents, type, date, category_id, created_at, updated_at)
  SELECT 
    gen_random_uuid(),
    v_backup.company_id,
    (t->>'description')::TEXT,
    (t->>'amount_cents')::INTEGER,
    (t->>'type')::TEXT,
    (t->>'date')::DATE,
    (t->>'category_id')::UUID,
    NOW(),
    NOW()
  FROM jsonb_array_elements(v_backup.data_snapshot->'transactions') AS t;
  
  -- Atualizar status da restauração
  UPDATE backup_restorations 
  SET status = 'completed', completed_at = NOW(), records_restored = v_backup.records_count
  WHERE id = v_restoration_id;
  
  -- Registrar no audit log
  INSERT INTO audit_logs (company_id, user_id, action_type, entity_type, entity_id, metadata)
  VALUES (v_backup.company_id, p_restored_by, 'backup_restored', 'backup', p_backup_id, 
          jsonb_build_object('restoration_id', v_restoration_id, 'pre_backup_id', v_pre_backup_id));
  
  RETURN v_restoration_id;
END;
$$ LANGUAGE plpgsql;

-- Função para registrar log de auditoria
CREATE OR REPLACE FUNCTION log_audit(
  p_company_id UUID,
  p_user_id UUID,
  p_action_type TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_device_info JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    company_id, user_id, action_type, entity_type, entity_id,
    old_data, new_data, ip_address, user_agent, device_info, metadata
  ) VALUES (
    p_company_id, p_user_id, p_action_type, p_entity_type, p_entity_id,
    p_old_data, p_new_data, p_ip_address, p_user_agent, p_device_info, p_metadata
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Função para criar alerta de segurança
CREATE OR REPLACE FUNCTION create_security_alert(
  p_company_id UUID,
  p_user_id UUID,
  p_alert_type TEXT,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_severity TEXT DEFAULT 'medium',
  p_ip_address TEXT DEFAULT NULL,
  p_device_info JSONB DEFAULT NULL,
  p_location JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_alert_id UUID;
BEGIN
  INSERT INTO security_alerts (
    company_id, user_id, alert_type, title, description, severity,
    ip_address, device_info, location
  ) VALUES (
    p_company_id, p_user_id, p_alert_type, p_title, p_description, p_severity,
    p_ip_address, p_device_info, p_location
  ) RETURNING id INTO v_alert_id;
  
  RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. VIEWS
-- =====================================================

-- View de backups por empresa
CREATE OR REPLACE VIEW v_company_backups_summary AS
SELECT 
  c.id AS company_id,
  c.name AS company_name,
  COUNT(b.id) AS total_backups,
  MAX(b.created_at) AS last_backup_at,
  SUM(CASE WHEN b.backup_type = 'automatic' THEN 1 ELSE 0 END) AS automatic_backups,
  SUM(CASE WHEN b.backup_type = 'manual' THEN 1 ELSE 0 END) AS manual_backups
FROM companies c
LEFT JOIN company_backups b ON c.id = b.company_id
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.name;

-- View de atividade recente
CREATE OR REPLACE VIEW v_recent_activity AS
SELECT 
  al.id,
  al.company_id,
  c.name AS company_name,
  al.user_id,
  al.action_type,
  al.entity_type,
  al.ip_address,
  al.created_at
FROM audit_logs al
LEFT JOIN companies c ON al.company_id = c.id
ORDER BY al.created_at DESC
LIMIT 1000;

-- View de alertas pendentes
CREATE OR REPLACE VIEW v_pending_alerts AS
SELECT 
  sa.*,
  c.name AS company_name
FROM security_alerts sa
LEFT JOIN companies c ON sa.company_id = c.id
WHERE sa.status IN ('new', 'acknowledged')
ORDER BY 
  CASE sa.severity 
    WHEN 'critical' THEN 1 
    WHEN 'high' THEN 2 
    WHEN 'medium' THEN 3 
    ELSE 4 
  END,
  sa.created_at DESC;

-- =====================================================
-- 8. TRIGGERS PARA AUDITORIA AUTOMÁTICA
-- =====================================================

-- Trigger para auditar transações
CREATE OR REPLACE FUNCTION audit_transaction_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit(NEW.company_id, NULL, 'transaction_created', 'transaction', NEW.id, NULL, row_to_json(NEW)::JSONB);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
      PERFORM log_audit(NEW.company_id, NULL, 'transaction_deleted', 'transaction', NEW.id, row_to_json(OLD)::JSONB, NULL);
    ELSE
      PERFORM log_audit(NEW.company_id, NULL, 'transaction_updated', 'transaction', NEW.id, row_to_json(OLD)::JSONB, row_to_json(NEW)::JSONB);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger (comentado para não duplicar se já existir)
-- DROP TRIGGER IF EXISTS trg_audit_transactions ON transactions;
-- CREATE TRIGGER trg_audit_transactions
-- AFTER INSERT OR UPDATE ON transactions
-- FOR EACH ROW EXECUTE FUNCTION audit_transaction_changes();

-- Comentários
COMMENT ON TABLE company_backups IS 'Backups de dados das empresas';
COMMENT ON TABLE backup_restorations IS 'Histórico de restaurações de backup';
COMMENT ON TABLE audit_logs IS 'Log de auditoria de todas as ações';
COMMENT ON TABLE security_alerts IS 'Alertas de segurança';
COMMENT ON TABLE known_devices IS 'Dispositivos conhecidos por usuário';
COMMENT ON FUNCTION create_company_backup IS 'Cria um backup completo dos dados de uma empresa';
COMMENT ON FUNCTION restore_company_backup IS 'Restaura dados de um backup';
COMMENT ON FUNCTION log_audit IS 'Registra uma entrada no log de auditoria';
COMMENT ON FUNCTION create_security_alert IS 'Cria um alerta de segurança';
