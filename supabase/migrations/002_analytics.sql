-- =====================================================
-- COMPANY ANALYTICS - Sistema de Métricas por Empresa
-- =====================================================
-- Este script cria a estrutura para rastrear métricas de uso
-- e calcular Health Score das empresas clientes.

-- Tabela principal de analytics por empresa
CREATE TABLE IF NOT EXISTS company_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Métricas de Acesso
  last_access TIMESTAMPTZ,
  access_count_today INTEGER DEFAULT 0,
  access_count_week INTEGER DEFAULT 0,
  access_count_month INTEGER DEFAULT 0,
  avg_session_duration_seconds INTEGER DEFAULT 0,
  
  -- Métricas de Uso
  total_transactions INTEGER DEFAULT 0,
  transactions_this_week INTEGER DEFAULT 0,
  transactions_this_month INTEGER DEFAULT 0,
  
  total_debts INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  total_goals INTEGER DEFAULT 0,
  
  -- Recursos mais usados (JSON com contagem)
  feature_usage JSONB DEFAULT '{
    "dashboard": 0,
    "transactions": 0,
    "debts": 0,
    "orders": 0,
    "goals": 0,
    "reports": 0,
    "settings": 0
  }'::jsonb,
  
  -- Categorias mais usadas (JSON com contagem)
  top_categories JSONB DEFAULT '[]'::jsonb,
  
  -- Health Score (0-100)
  health_score INTEGER DEFAULT 50,
  health_status TEXT DEFAULT 'morno' CHECK (health_status IN ('saudavel', 'morno', 'risco')),
  
  -- Fatores do Health Score
  days_since_last_access INTEGER DEFAULT 0,
  profile_completion_percent INTEGER DEFAULT 0,
  uses_advanced_features BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_company_analytics_company_id ON company_analytics(company_id);
CREATE INDEX IF NOT EXISTS idx_company_analytics_health_score ON company_analytics(health_score);
CREATE INDEX IF NOT EXISTS idx_company_analytics_health_status ON company_analytics(health_status);
CREATE INDEX IF NOT EXISTS idx_company_analytics_last_access ON company_analytics(last_access);

-- Tabela de histórico de acessos (para análise temporal)
CREATE TABLE IF NOT EXISTS company_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  feature_accessed TEXT,
  session_duration_seconds INTEGER DEFAULT 0,
  platform TEXT DEFAULT 'web' CHECK (platform IN ('web', 'mobile', 'api'))
);

-- Índice para consultas por empresa e data
CREATE INDEX IF NOT EXISTS idx_company_access_log_company_date 
ON company_access_log(company_id, accessed_at DESC);

-- Função para atualizar analytics quando houver acesso
CREATE OR REPLACE FUNCTION update_company_analytics_on_access()
RETURNS TRIGGER AS $$
DECLARE
  v_days_since_access INTEGER;
  v_health_score INTEGER;
  v_health_status TEXT;
BEGIN
  -- Calcular dias desde último acesso
  SELECT COALESCE(
    EXTRACT(DAY FROM NOW() - last_access)::INTEGER,
    0
  ) INTO v_days_since_access
  FROM company_analytics
  WHERE company_id = NEW.company_id;
  
  -- Inserir ou atualizar analytics
  INSERT INTO company_analytics (
    company_id,
    last_access,
    access_count_today,
    access_count_week,
    access_count_month,
    days_since_last_access
  )
  VALUES (
    NEW.company_id,
    NOW(),
    1,
    1,
    1,
    0
  )
  ON CONFLICT (company_id) DO UPDATE SET
    last_access = NOW(),
    access_count_today = CASE 
      WHEN DATE(company_analytics.last_access) = CURRENT_DATE 
      THEN company_analytics.access_count_today + 1 
      ELSE 1 
    END,
    access_count_week = CASE 
      WHEN company_analytics.last_access >= NOW() - INTERVAL '7 days' 
      THEN company_analytics.access_count_week + 1 
      ELSE 1 
    END,
    access_count_month = CASE 
      WHEN company_analytics.last_access >= NOW() - INTERVAL '30 days' 
      THEN company_analytics.access_count_month + 1 
      ELSE 1 
    END,
    days_since_last_access = 0,
    updated_at = NOW();
  
  -- Atualizar feature_usage se especificado
  IF NEW.feature_accessed IS NOT NULL THEN
    UPDATE company_analytics
    SET feature_usage = jsonb_set(
      feature_usage,
      ARRAY[NEW.feature_accessed],
      to_jsonb(COALESCE((feature_usage->>NEW.feature_accessed)::INTEGER, 0) + 1)
    )
    WHERE company_id = NEW.company_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar analytics no acesso
DROP TRIGGER IF EXISTS trigger_update_analytics_on_access ON company_access_log;
CREATE TRIGGER trigger_update_analytics_on_access
AFTER INSERT ON company_access_log
FOR EACH ROW
EXECUTE FUNCTION update_company_analytics_on_access();

-- Função para calcular Health Score
CREATE OR REPLACE FUNCTION calculate_health_score(p_company_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 50;
  v_days_since_access INTEGER;
  v_transactions_week INTEGER;
  v_uses_advanced BOOLEAN;
  v_profile_complete INTEGER;
BEGIN
  -- Buscar métricas
  SELECT 
    days_since_last_access,
    transactions_this_week,
    uses_advanced_features,
    profile_completion_percent
  INTO 
    v_days_since_access,
    v_transactions_week,
    v_uses_advanced,
    v_profile_complete
  FROM company_analytics
  WHERE company_id = p_company_id;
  
  -- Se não encontrou, retorna score padrão
  IF NOT FOUND THEN
    RETURN 50;
  END IF;
  
  -- Calcular score baseado nos fatores
  
  -- Fator 1: Dias desde último acesso (máx 40 pontos)
  -- 0-1 dias = 40 pontos, 2-3 dias = 30, 4-7 dias = 20, 8-14 dias = 10, 15+ dias = 0
  v_score := CASE
    WHEN v_days_since_access <= 1 THEN 40
    WHEN v_days_since_access <= 3 THEN 30
    WHEN v_days_since_access <= 7 THEN 20
    WHEN v_days_since_access <= 14 THEN 10
    ELSE 0
  END;
  
  -- Fator 2: Lançamentos na semana (máx 30 pontos)
  -- 10+ = 30, 5-9 = 20, 1-4 = 10, 0 = 0
  v_score := v_score + CASE
    WHEN v_transactions_week >= 10 THEN 30
    WHEN v_transactions_week >= 5 THEN 20
    WHEN v_transactions_week >= 1 THEN 10
    ELSE 0
  END;
  
  -- Fator 3: Uso de recursos avançados (máx 15 pontos)
  IF v_uses_advanced THEN
    v_score := v_score + 15;
  END IF;
  
  -- Fator 4: Perfil completo (máx 15 pontos)
  v_score := v_score + (v_profile_complete * 15 / 100);
  
  -- Garantir que está entre 0 e 100
  v_score := GREATEST(0, LEAST(100, v_score));
  
  -- Atualizar o score na tabela
  UPDATE company_analytics
  SET 
    health_score = v_score,
    health_status = CASE
      WHEN v_score >= 80 THEN 'saudavel'
      WHEN v_score >= 50 THEN 'morno'
      ELSE 'risco'
    END,
    updated_at = NOW()
  WHERE company_id = p_company_id;
  
  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar métricas de transações
CREATE OR REPLACE FUNCTION update_company_transaction_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar contadores de transações
  INSERT INTO company_analytics (company_id, total_transactions, transactions_this_week, transactions_this_month)
  VALUES (NEW.company_id, 1, 1, 1)
  ON CONFLICT (company_id) DO UPDATE SET
    total_transactions = company_analytics.total_transactions + 1,
    transactions_this_week = company_analytics.transactions_this_week + 1,
    transactions_this_month = company_analytics.transactions_this_month + 1,
    updated_at = NOW();
  
  -- Recalcular health score
  PERFORM calculate_health_score(NEW.company_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar métricas quando transação é criada
DROP TRIGGER IF EXISTS trigger_update_transaction_metrics ON transactions;
CREATE TRIGGER trigger_update_transaction_metrics
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_company_transaction_metrics();

-- Job para resetar contadores diários/semanais/mensais (executar via cron)
CREATE OR REPLACE FUNCTION reset_analytics_counters()
RETURNS void AS $$
BEGIN
  -- Resetar contadores diários
  UPDATE company_analytics
  SET access_count_today = 0
  WHERE DATE(last_access) < CURRENT_DATE;
  
  -- Resetar contadores semanais (toda segunda-feira)
  IF EXTRACT(DOW FROM NOW()) = 1 THEN
    UPDATE company_analytics
    SET 
      access_count_week = 0,
      transactions_this_week = 0;
  END IF;
  
  -- Resetar contadores mensais (todo dia 1)
  IF EXTRACT(DAY FROM NOW()) = 1 THEN
    UPDATE company_analytics
    SET 
      access_count_month = 0,
      transactions_this_month = 0;
  END IF;
  
  -- Atualizar dias desde último acesso para todas as empresas
  UPDATE company_analytics
  SET 
    days_since_last_access = EXTRACT(DAY FROM NOW() - last_access)::INTEGER,
    updated_at = NOW()
  WHERE last_access IS NOT NULL;
  
  -- Recalcular health score para todas as empresas
  PERFORM calculate_health_score(company_id) FROM company_analytics;
END;
$$ LANGUAGE plpgsql;

-- View para relatório de analytics
CREATE OR REPLACE VIEW v_company_analytics_report AS
SELECT 
  c.id AS company_id,
  c.name AS company_name,
  c.status AS subscription_status,
  c.trial_end,
  ca.last_access,
  ca.days_since_last_access,
  ca.access_count_today,
  ca.access_count_week,
  ca.access_count_month,
  ca.total_transactions,
  ca.transactions_this_week,
  ca.health_score,
  ca.health_status,
  ca.feature_usage,
  ca.uses_advanced_features,
  ca.profile_completion_percent,
  CASE 
    WHEN ca.health_status = 'saudavel' THEN '🟢'
    WHEN ca.health_status = 'morno' THEN '🟡'
    ELSE '🔴'
  END AS health_indicator
FROM companies c
LEFT JOIN company_analytics ca ON c.id = ca.company_id
WHERE c.deleted_at IS NULL
ORDER BY ca.health_score ASC NULLS LAST;

-- Inicializar analytics para empresas existentes
INSERT INTO company_analytics (company_id, health_score, health_status)
SELECT id, 50, 'morno'
FROM companies
WHERE deleted_at IS NULL
AND id NOT IN (SELECT company_id FROM company_analytics)
ON CONFLICT (company_id) DO NOTHING;

-- Comentários
COMMENT ON TABLE company_analytics IS 'Métricas de uso e Health Score por empresa';
COMMENT ON TABLE company_access_log IS 'Log de acessos para análise temporal';
COMMENT ON FUNCTION calculate_health_score IS 'Calcula o Health Score (0-100) baseado em fatores de engajamento';
COMMENT ON FUNCTION reset_analytics_counters IS 'Reseta contadores periódicos - executar via cron diariamente';
