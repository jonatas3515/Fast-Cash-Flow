-- =====================================================
-- ONBOARDING & TRIAL CONVERSION SYSTEM
-- =====================================================
-- Sistema completo para aumentar conversão Trial → Pago
-- Inclui: Checklist, Notificações, Ofertas Personalizadas

-- =====================================================
-- 1. TABELA DE PROGRESSO DO ONBOARDING
-- =====================================================
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Checklist de Primeiros Passos
  profile_completed BOOLEAN DEFAULT false,
  first_transactions BOOLEAN DEFAULT false,  -- 5+ lançamentos
  categories_configured BOOLEAN DEFAULT false,
  first_goal_created BOOLEAN DEFAULT false,
  recurring_expense_added BOOLEAN DEFAULT false,
  first_report_generated BOOLEAN DEFAULT false,
  
  -- Progresso geral
  completed_steps INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 6,
  completion_percent INTEGER DEFAULT 0,
  
  -- Recompensas
  bonus_days_earned INTEGER DEFAULT 0,
  bonus_applied BOOLEAN DEFAULT false,
  
  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  last_step_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_onboarding_company ON onboarding_progress(company_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_completion ON onboarding_progress(completion_percent);

-- =====================================================
-- 2. TABELA DE NOTIFICAÇÕES DE TRIAL
-- =====================================================
CREATE TABLE IF NOT EXISTS trial_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Tipo de notificação
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'welcome',           -- Dia 1: Boas-vindas
    'mid_trial',         -- Dia 7: Meio do trial
    'five_days_left',    -- Dia 25: 5 dias restantes
    'two_days_left',     -- Dia 28: 2 dias restantes
    'trial_expired',     -- Dia 30: Trial expirou
    'reactivation',      -- Pós-expiração: Reativação
    'bonus_earned',      -- Bônus ganho
    'special_offer'      -- Oferta especial
  )),
  
  -- Conteúdo
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  action_label TEXT,
  
  -- Status
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  
  -- Metadados
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_trial_notif_company ON trial_notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_trial_notif_type ON trial_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_trial_notif_sent ON trial_notifications(sent_at);

-- =====================================================
-- 3. TABELA DE OFERTAS PERSONALIZADAS
-- =====================================================
CREATE TABLE IF NOT EXISTS trial_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Tipo de oferta
  offer_type TEXT NOT NULL CHECK (offer_type IN (
    'extra_trial_days',    -- Dias extras de trial
    'first_month_discount', -- Desconto no primeiro mês
    'lifetime_discount',    -- Desconto vitalício
    'free_month'           -- Mês grátis
  )),
  
  -- Detalhes da oferta
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  discount_percent INTEGER DEFAULT 0,
  bonus_days INTEGER DEFAULT 0,
  
  -- Condições
  condition_type TEXT CHECK (condition_type IN (
    'inactive_user',       -- Usuário inativo
    'active_user',         -- Usuário ativo
    'incomplete_profile',  -- Perfil incompleto
    'complete_onboarding', -- Completou onboarding
    'expiring_soon',       -- Trial expirando
    'expired'              -- Trial expirado
  )),
  
  -- Validade
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  
  -- Status
  shown_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  
  -- Código promocional (se aplicável)
  promo_code TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_trial_offers_company ON trial_offers(company_id);
CREATE INDEX IF NOT EXISTS idx_trial_offers_type ON trial_offers(offer_type);
CREATE INDEX IF NOT EXISTS idx_trial_offers_valid ON trial_offers(valid_until);

-- =====================================================
-- 4. CONFIGURAÇÕES DE NOTIFICAÇÕES (ADMIN)
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificador
  template_key TEXT UNIQUE NOT NULL,
  
  -- Conteúdo
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_label TEXT,
  action_url TEXT,
  
  -- Configurações
  enabled BOOLEAN DEFAULT true,
  send_email BOOLEAN DEFAULT true,
  send_push BOOLEAN DEFAULT true,
  send_in_app BOOLEAN DEFAULT true,
  
  -- Timing (dias desde início do trial)
  trigger_day INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir templates padrão
INSERT INTO notification_templates (template_key, title, message, action_label, action_url, trigger_day) VALUES
('welcome', '🎉 Bem-vindo ao Fast Cash Flow!', 'Comece registrando seu primeiro lançamento e veja a mágica acontecer!', 'Começar Agora', '/dashboard', 1),
('mid_trial', '📊 Você está indo muito bem!', 'Você já tem {transaction_count} lançamentos! Veja seu relatório completo e descubra insights sobre suas finanças.', 'Ver Relatório', '/reports', 7),
('five_days_left', '⏰ Seu trial termina em 5 dias!', 'Não perca acesso aos seus dados financeiros. Ative agora por apenas R$ 9,99/mês e continue no controle!', 'Ativar Agora', '/upgrade', 25),
('two_days_left', '🚨 URGENTE: Apenas 2 dias restantes!', 'Seu período de teste está acabando. Garanta seu acesso e não perca todo o histórico que você construiu!', 'Garantir Acesso', '/upgrade', 28),
('trial_expired', '❌ Seu trial expirou', 'Sentimos sua falta! Reative agora e volte de onde parou. Seus dados estão seguros esperando por você.', 'Reativar Conta', '/upgrade', 30)
ON CONFLICT (template_key) DO NOTHING;

-- =====================================================
-- 5. FUNÇÕES DE ATUALIZAÇÃO DO ONBOARDING
-- =====================================================

-- Função para atualizar progresso do onboarding
CREATE OR REPLACE FUNCTION update_onboarding_progress(p_company_id UUID)
RETURNS void AS $$
DECLARE
  v_profile_completed BOOLEAN := false;
  v_first_transactions BOOLEAN := false;
  v_categories_configured BOOLEAN := false;
  v_first_goal_created BOOLEAN := false;
  v_recurring_expense_added BOOLEAN := false;
  v_first_report_generated BOOLEAN := false;
  v_completed_steps INTEGER := 0;
  v_transaction_count INTEGER;
  v_category_count INTEGER;
  v_goal_count INTEGER;
  v_recurring_count INTEGER;
BEGIN
  -- Verificar perfil completo (tem nome e logo)
  SELECT EXISTS(
    SELECT 1 FROM companies 
    WHERE id = p_company_id 
    AND name IS NOT NULL 
    AND name != ''
  ) INTO v_profile_completed;
  
  -- Verificar 5+ transações
  SELECT COUNT(*) INTO v_transaction_count
  FROM transactions WHERE company_id = p_company_id;
  v_first_transactions := v_transaction_count >= 5;
  
  -- Verificar categorias configuradas (pelo menos 3 personalizadas)
  SELECT COUNT(*) INTO v_category_count
  FROM categories WHERE company_id = p_company_id;
  v_categories_configured := v_category_count >= 3;
  
  -- Verificar meta criada
  SELECT COUNT(*) INTO v_goal_count
  FROM financial_goals WHERE company_id = p_company_id;
  v_first_goal_created := v_goal_count >= 1;
  
  -- Verificar despesa recorrente
  SELECT COUNT(*) INTO v_recurring_count
  FROM recurring_expenses WHERE company_id = p_company_id;
  v_recurring_expense_added := v_recurring_count >= 1;
  
  -- Calcular steps completados
  v_completed_steps := 0;
  IF v_profile_completed THEN v_completed_steps := v_completed_steps + 1; END IF;
  IF v_first_transactions THEN v_completed_steps := v_completed_steps + 1; END IF;
  IF v_categories_configured THEN v_completed_steps := v_completed_steps + 1; END IF;
  IF v_first_goal_created THEN v_completed_steps := v_completed_steps + 1; END IF;
  IF v_recurring_expense_added THEN v_completed_steps := v_completed_steps + 1; END IF;
  IF v_first_report_generated THEN v_completed_steps := v_completed_steps + 1; END IF;
  
  -- Inserir ou atualizar progresso
  INSERT INTO onboarding_progress (
    company_id,
    profile_completed,
    first_transactions,
    categories_configured,
    first_goal_created,
    recurring_expense_added,
    first_report_generated,
    completed_steps,
    completion_percent,
    last_step_completed_at,
    completed_at
  ) VALUES (
    p_company_id,
    v_profile_completed,
    v_first_transactions,
    v_categories_configured,
    v_first_goal_created,
    v_recurring_expense_added,
    v_first_report_generated,
    v_completed_steps,
    (v_completed_steps * 100 / 6),
    CASE WHEN v_completed_steps > 0 THEN NOW() ELSE NULL END,
    CASE WHEN v_completed_steps = 6 THEN NOW() ELSE NULL END
  )
  ON CONFLICT (company_id) DO UPDATE SET
    profile_completed = v_profile_completed,
    first_transactions = v_first_transactions,
    categories_configured = v_categories_configured,
    first_goal_created = v_first_goal_created,
    recurring_expense_added = v_recurring_expense_added,
    completed_steps = v_completed_steps,
    completion_percent = (v_completed_steps * 100 / 6),
    last_step_completed_at = CASE WHEN v_completed_steps > onboarding_progress.completed_steps THEN NOW() ELSE onboarding_progress.last_step_completed_at END,
    completed_at = CASE WHEN v_completed_steps = 6 AND onboarding_progress.completed_at IS NULL THEN NOW() ELSE onboarding_progress.completed_at END,
    updated_at = NOW();
    
  -- Se completou tudo e ainda não ganhou bônus, dar 7 dias extras
  IF v_completed_steps = 6 THEN
    UPDATE onboarding_progress
    SET bonus_days_earned = 7
    WHERE company_id = p_company_id
    AND bonus_days_earned = 0;
    
    -- Aplicar bônus ao trial_end se ainda não foi aplicado
    UPDATE companies
    SET trial_end = trial_end + INTERVAL '7 days'
    WHERE id = p_company_id
    AND status = 'trial'
    AND id IN (
      SELECT company_id FROM onboarding_progress 
      WHERE company_id = p_company_id 
      AND bonus_days_earned = 7 
      AND bonus_applied = false
    );
    
    UPDATE onboarding_progress
    SET bonus_applied = true
    WHERE company_id = p_company_id
    AND bonus_days_earned = 7
    AND bonus_applied = false;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. FUNÇÃO PARA GERAR OFERTAS PERSONALIZADAS
-- =====================================================
CREATE OR REPLACE FUNCTION generate_personalized_offer(p_company_id UUID)
RETURNS UUID AS $$
DECLARE
  v_offer_id UUID;
  v_company_status TEXT;
  v_trial_end DATE;
  v_transaction_count INTEGER;
  v_onboarding_percent INTEGER;
  v_days_until_expiry INTEGER;
  v_offer_type TEXT;
  v_condition_type TEXT;
  v_title TEXT;
  v_description TEXT;
  v_discount INTEGER := 0;
  v_bonus_days INTEGER := 0;
BEGIN
  -- Buscar dados da empresa
  SELECT status, trial_end::DATE INTO v_company_status, v_trial_end
  FROM companies WHERE id = p_company_id;
  
  -- Contar transações
  SELECT COUNT(*) INTO v_transaction_count
  FROM transactions WHERE company_id = p_company_id;
  
  -- Buscar progresso do onboarding
  SELECT COALESCE(completion_percent, 0) INTO v_onboarding_percent
  FROM onboarding_progress WHERE company_id = p_company_id;
  
  -- Calcular dias até expiração
  v_days_until_expiry := v_trial_end - CURRENT_DATE;
  
  -- Determinar tipo de oferta baseado no perfil
  
  -- Caso 1: Empresa INATIVA (poucos lançamentos)
  IF v_transaction_count < 5 THEN
    v_offer_type := 'extra_trial_days';
    v_condition_type := 'inactive_user';
    v_title := '🎁 Ganhe +7 dias grátis!';
    v_description := 'Vejo que você ainda não usou muito o sistema. Que tal mais 7 dias para testar todas as funcionalidades?';
    v_bonus_days := 7;
    
  -- Caso 2: Empresa ATIVA (muitos lançamentos)
  ELSIF v_transaction_count >= 20 THEN
    v_offer_type := 'first_month_discount';
    v_condition_type := 'active_user';
    v_title := '🚀 Você está arrasando! 20% OFF';
    v_description := 'Com ' || v_transaction_count || ' lançamentos, você já dominou o sistema! Garanta 20% de desconto no primeiro mês ativando AGORA!';
    v_discount := 20;
    
  -- Caso 3: Onboarding incompleto
  ELSIF v_onboarding_percent < 100 THEN
    v_offer_type := 'lifetime_discount';
    v_condition_type := 'incomplete_profile';
    v_title := '✨ Complete seu perfil e ganhe 15% OFF';
    v_description := 'Você está a ' || (100 - v_onboarding_percent) || '% de completar o onboarding. Termine e ganhe 15% de desconto VITALÍCIO!';
    v_discount := 15;
    
  -- Caso 4: Trial expirando em breve
  ELSIF v_days_until_expiry <= 5 AND v_days_until_expiry > 0 THEN
    v_offer_type := 'first_month_discount';
    v_condition_type := 'expiring_soon';
    v_title := '⏰ Últimos ' || v_days_until_expiry || ' dias! 25% OFF';
    v_description := 'Seu trial está acabando! Ative agora com 25% de desconto e não perca seus dados.';
    v_discount := 25;
    
  -- Caso 5: Trial expirado
  ELSIF v_company_status IN ('expired', 'blocked') THEN
    v_offer_type := 'first_month_discount';
    v_condition_type := 'expired';
    v_title := '💔 Sentimos sua falta! 30% OFF';
    v_description := 'Volte para o Fast Cash Flow com 30% de desconto no primeiro mês. Seus dados estão esperando!';
    v_discount := 30;
    
  -- Caso padrão
  ELSE
    v_offer_type := 'first_month_discount';
    v_condition_type := 'active_user';
    v_title := '🎉 Oferta especial para você!';
    v_description := 'Ative sua assinatura agora e ganhe 10% de desconto no primeiro mês!';
    v_discount := 10;
  END IF;
  
  -- Criar oferta
  INSERT INTO trial_offers (
    company_id,
    offer_type,
    title,
    description,
    discount_percent,
    bonus_days,
    condition_type,
    valid_until
  ) VALUES (
    p_company_id,
    v_offer_type,
    v_title,
    v_description,
    v_discount,
    v_bonus_days,
    v_condition_type,
    NOW() + INTERVAL '7 days'
  )
  RETURNING id INTO v_offer_id;
  
  RETURN v_offer_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. FUNÇÃO PARA ENVIAR NOTIFICAÇÕES DE TRIAL
-- =====================================================
CREATE OR REPLACE FUNCTION check_and_send_trial_notifications()
RETURNS void AS $$
DECLARE
  v_company RECORD;
  v_template RECORD;
  v_days_in_trial INTEGER;
  v_transaction_count INTEGER;
BEGIN
  -- Para cada empresa em trial
  FOR v_company IN 
    SELECT id, name, trial_end, created_at
    FROM companies
    WHERE status = 'trial'
    AND deleted_at IS NULL
  LOOP
    -- Calcular dias no trial
    v_days_in_trial := EXTRACT(DAY FROM NOW() - v_company.created_at)::INTEGER + 1;
    
    -- Contar transações
    SELECT COUNT(*) INTO v_transaction_count
    FROM transactions WHERE company_id = v_company.id;
    
    -- Verificar cada template
    FOR v_template IN 
      SELECT * FROM notification_templates 
      WHERE enabled = true 
      AND trigger_day = v_days_in_trial
    LOOP
      -- Verificar se já foi enviada
      IF NOT EXISTS (
        SELECT 1 FROM trial_notifications
        WHERE company_id = v_company.id
        AND notification_type = v_template.template_key
        AND sent_at IS NOT NULL
      ) THEN
        -- Criar notificação
        INSERT INTO trial_notifications (
          company_id,
          notification_type,
          title,
          message,
          action_url,
          action_label,
          sent_at,
          metadata
        ) VALUES (
          v_company.id,
          v_template.template_key,
          v_template.title,
          REPLACE(v_template.message, '{transaction_count}', v_transaction_count::TEXT),
          v_template.action_url,
          v_template.action_label,
          NOW(),
          jsonb_build_object(
            'days_in_trial', v_days_in_trial,
            'transaction_count', v_transaction_count,
            'trial_end', v_company.trial_end
          )
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
-- =====================================================

-- Trigger para atualizar onboarding quando transação é criada
CREATE OR REPLACE FUNCTION trigger_update_onboarding_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_onboarding_progress(NEW.company_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_onboarding_transaction ON transactions;
CREATE TRIGGER trg_onboarding_transaction
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION trigger_update_onboarding_on_transaction();

-- Trigger para atualizar onboarding quando meta é criada
CREATE OR REPLACE FUNCTION trigger_update_onboarding_on_goal()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_onboarding_progress(NEW.company_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_onboarding_goal ON financial_goals;
CREATE TRIGGER trg_onboarding_goal
AFTER INSERT ON financial_goals
FOR EACH ROW
EXECUTE FUNCTION trigger_update_onboarding_on_goal();

-- Trigger para atualizar onboarding quando despesa recorrente é criada
CREATE OR REPLACE FUNCTION trigger_update_onboarding_on_recurring()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_onboarding_progress(NEW.company_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_onboarding_recurring ON recurring_expenses;
CREATE TRIGGER trg_onboarding_recurring
AFTER INSERT ON recurring_expenses
FOR EACH ROW
EXECUTE FUNCTION trigger_update_onboarding_on_recurring();

-- =====================================================
-- 9. VIEWS PARA RELATÓRIOS
-- =====================================================

-- View de progresso do onboarding
CREATE OR REPLACE VIEW v_onboarding_summary AS
SELECT 
  c.id AS company_id,
  c.name AS company_name,
  c.status,
  c.trial_end,
  COALESCE(op.completed_steps, 0) AS completed_steps,
  COALESCE(op.completion_percent, 0) AS completion_percent,
  COALESCE(op.bonus_days_earned, 0) AS bonus_days_earned,
  op.completed_at,
  CASE 
    WHEN op.completion_percent = 100 THEN '✅ Completo'
    WHEN op.completion_percent >= 50 THEN '🔄 Em progresso'
    ELSE '⚠️ Iniciante'
  END AS status_label
FROM companies c
LEFT JOIN onboarding_progress op ON c.id = op.company_id
WHERE c.deleted_at IS NULL
ORDER BY op.completion_percent DESC NULLS LAST;

-- View de ofertas ativas
CREATE OR REPLACE VIEW v_active_offers AS
SELECT 
  c.id AS company_id,
  c.name AS company_name,
  c.status AS company_status,
  o.offer_type,
  o.title,
  o.description,
  o.discount_percent,
  o.bonus_days,
  o.condition_type,
  o.valid_until,
  o.shown_at,
  o.accepted_at
FROM companies c
JOIN trial_offers o ON c.id = o.company_id
WHERE c.deleted_at IS NULL
AND o.valid_until > NOW()
AND o.accepted_at IS NULL
AND o.rejected_at IS NULL
ORDER BY o.valid_until ASC;

-- Inicializar onboarding para empresas existentes
INSERT INTO onboarding_progress (company_id)
SELECT id FROM companies
WHERE deleted_at IS NULL
AND id NOT IN (SELECT company_id FROM onboarding_progress)
ON CONFLICT (company_id) DO NOTHING;

-- Atualizar progresso para todas as empresas
DO $$
DECLARE
  v_company_id UUID;
BEGIN
  FOR v_company_id IN SELECT id FROM companies WHERE deleted_at IS NULL
  LOOP
    PERFORM update_onboarding_progress(v_company_id);
  END LOOP;
END $$;

-- Comentários
COMMENT ON TABLE onboarding_progress IS 'Progresso do checklist de onboarding por empresa';
COMMENT ON TABLE trial_notifications IS 'Notificações enviadas durante o período de trial';
COMMENT ON TABLE trial_offers IS 'Ofertas personalizadas para conversão';
COMMENT ON TABLE notification_templates IS 'Templates de notificações configuráveis pelo admin';
COMMENT ON FUNCTION update_onboarding_progress IS 'Atualiza o progresso do onboarding baseado nas ações da empresa';
COMMENT ON FUNCTION generate_personalized_offer IS 'Gera uma oferta personalizada baseada no perfil de uso';
COMMENT ON FUNCTION check_and_send_trial_notifications IS 'Verifica e envia notificações de trial - executar via cron diariamente';
