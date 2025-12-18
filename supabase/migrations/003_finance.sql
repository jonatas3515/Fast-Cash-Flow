-- =====================================================
-- ADMIN FINANCE MANAGEMENT SYSTEM
-- =====================================================
-- Sistema de gestão financeira para o admin
-- Inclui: Previsão de Receita, Inadimplência, Cupons

-- =====================================================
-- 1. TABELA DE HISTÓRICO DE RECEITA (MRR)
-- =====================================================
CREATE TABLE IF NOT EXISTS mrr_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Período
  year_month TEXT NOT NULL, -- Formato: '2024-01'
  
  -- Métricas de MRR
  mrr_cents INTEGER DEFAULT 0, -- MRR em centavos
  active_companies INTEGER DEFAULT 0,
  trial_companies INTEGER DEFAULT 0,
  churned_companies INTEGER DEFAULT 0,
  new_companies INTEGER DEFAULT 0,
  
  -- Conversões
  trial_to_paid INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Churn
  churn_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Metadados
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(year_month)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_mrr_history_month ON mrr_history(year_month DESC);

-- =====================================================
-- 2. TABELA DE INADIMPLÊNCIA
-- =====================================================
CREATE TABLE IF NOT EXISTS delinquency_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Status de pagamento
  due_date DATE NOT NULL, -- Data de vencimento
  days_overdue INTEGER DEFAULT 0,
  
  -- Classificação automática
  status TEXT DEFAULT 'current' CHECK (status IN (
    'current',      -- Em dia
    'yellow',       -- 1-7 dias atrasado
    'orange',       -- 8-15 dias atrasado
    'red',          -- 16-30 dias atrasado
    'black'         -- 30+ dias atrasado
  )),
  
  -- Valor devido
  amount_due_cents INTEGER DEFAULT 0,
  
  -- Ações tomadas
  reminder_sent_at TIMESTAMPTZ,
  whatsapp_sent_at TIMESTAMPTZ,
  partial_block_at TIMESTAMPTZ,
  full_block_at TIMESTAMPTZ,
  
  -- Resolução
  resolved_at TIMESTAMPTZ,
  resolution_type TEXT, -- 'paid', 'cancelled', 'negotiated'
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_delinquency_company ON delinquency_records(company_id);
CREATE INDEX IF NOT EXISTS idx_delinquency_status ON delinquency_records(status);
CREATE INDEX IF NOT EXISTS idx_delinquency_days ON delinquency_records(days_overdue DESC);

-- =====================================================
-- 3. TABELA DE CUPONS DE DESCONTO
-- =====================================================
CREATE TABLE IF NOT EXISTS discount_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  code TEXT UNIQUE NOT NULL, -- Código do cupom (ex: NATAL2024)
  name TEXT NOT NULL, -- Nome descritivo
  description TEXT,
  
  -- Desconto
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value INTEGER NOT NULL, -- Porcentagem ou valor em centavos
  duration_months INTEGER DEFAULT 1, -- Quantos meses o desconto vale
  
  -- Validade
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  
  -- Limites
  max_uses INTEGER, -- NULL = ilimitado
  current_uses INTEGER DEFAULT 0,
  
  -- Aplicabilidade
  applicable_to TEXT DEFAULT 'all' CHECK (applicable_to IN (
    'all',           -- Todos
    'new_customers', -- Apenas novos clientes
    'renewals',      -- Apenas renovações
    'upgrades'       -- Apenas upgrades
  )),
  
  -- Planos aplicáveis
  applicable_plans TEXT[] DEFAULT ARRAY['monthly', 'yearly'],
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_coupons_code ON discount_coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON discount_coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_valid ON discount_coupons(valid_until);

-- =====================================================
-- 4. TABELA DE USO DE CUPONS
-- =====================================================
CREATE TABLE IF NOT EXISTS coupon_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES discount_coupons(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Detalhes do uso
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  original_amount_cents INTEGER NOT NULL,
  discount_amount_cents INTEGER NOT NULL,
  final_amount_cents INTEGER NOT NULL,
  
  -- Período de aplicação
  valid_until TIMESTAMPTZ, -- Até quando o desconto vale
  
  UNIQUE(coupon_id, company_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon ON coupon_usages(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_company ON coupon_usages(company_id);

-- =====================================================
-- 5. TABELA DE PAGAMENTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Detalhes do pagamento
  amount_cents INTEGER NOT NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('monthly', 'yearly')),
  
  -- Cupom aplicado
  coupon_id UUID REFERENCES discount_coupons(id),
  discount_cents INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',
    'paid',
    'failed',
    'refunded',
    'cancelled'
  )),
  
  -- Período coberto
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Metadados
  payment_method TEXT,
  external_id TEXT, -- ID do gateway de pagamento
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_payments_company ON payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_period ON payments(period_start, period_end);

-- =====================================================
-- 6. FUNÇÕES DE GESTÃO FINANCEIRA
-- =====================================================

-- Função para calcular MRR atual
CREATE OR REPLACE FUNCTION calculate_current_mrr()
RETURNS TABLE (
  mrr_cents INTEGER,
  active_count INTEGER,
  trial_count INTEGER,
  monthly_price INTEGER,
  yearly_price_monthly INTEGER
) AS $$
DECLARE
  v_monthly_price INTEGER := 999; -- R$ 9,99 em centavos
  v_yearly_price INTEGER := 9990; -- R$ 99,90 em centavos (por ano)
BEGIN
  RETURN QUERY
  SELECT 
    (COUNT(*) FILTER (WHERE c.status = 'active') * v_monthly_price)::INTEGER AS mrr_cents,
    COUNT(*) FILTER (WHERE c.status = 'active')::INTEGER AS active_count,
    COUNT(*) FILTER (WHERE c.status = 'trial')::INTEGER AS trial_count,
    v_monthly_price AS monthly_price,
    (v_yearly_price / 12)::INTEGER AS yearly_price_monthly
  FROM companies c
  WHERE c.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Função para projetar MRR futuro
CREATE OR REPLACE FUNCTION project_mrr(
  p_months_ahead INTEGER DEFAULT 3,
  p_conversion_rate DECIMAL DEFAULT 0.30, -- 30% de conversão de trial
  p_churn_rate DECIMAL DEFAULT 0.05 -- 5% de churn mensal
)
RETURNS TABLE (
  month_offset INTEGER,
  projected_mrr_cents INTEGER,
  projected_active INTEGER,
  projected_new INTEGER,
  projected_churn INTEGER
) AS $$
DECLARE
  v_current_mrr INTEGER;
  v_current_active INTEGER;
  v_current_trial INTEGER;
  v_monthly_price INTEGER := 999;
  v_active INTEGER;
  v_mrr INTEGER;
  i INTEGER;
BEGIN
  -- Obter valores atuais
  SELECT mrr.mrr_cents, mrr.active_count, mrr.trial_count
  INTO v_current_mrr, v_current_active, v_current_trial
  FROM calculate_current_mrr() mrr;
  
  v_active := v_current_active;
  v_mrr := v_current_mrr;
  
  FOR i IN 1..p_months_ahead LOOP
    DECLARE
      v_new INTEGER;
      v_churn INTEGER;
    BEGIN
      -- Calcular novos clientes (conversão de trial)
      v_new := FLOOR(v_current_trial * p_conversion_rate);
      
      -- Calcular churn
      v_churn := FLOOR(v_active * p_churn_rate);
      
      -- Atualizar ativos
      v_active := v_active + v_new - v_churn;
      v_mrr := v_active * v_monthly_price;
      
      month_offset := i;
      projected_mrr_cents := v_mrr;
      projected_active := v_active;
      projected_new := v_new;
      projected_churn := v_churn;
      
      RETURN NEXT;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar status de inadimplência
CREATE OR REPLACE FUNCTION update_delinquency_status()
RETURNS void AS $$
BEGIN
  -- Atualizar dias de atraso e status
  UPDATE delinquency_records
  SET 
    days_overdue = EXTRACT(DAY FROM NOW() - due_date)::INTEGER,
    status = CASE
      WHEN EXTRACT(DAY FROM NOW() - due_date) <= 0 THEN 'current'
      WHEN EXTRACT(DAY FROM NOW() - due_date) BETWEEN 1 AND 7 THEN 'yellow'
      WHEN EXTRACT(DAY FROM NOW() - due_date) BETWEEN 8 AND 15 THEN 'orange'
      WHEN EXTRACT(DAY FROM NOW() - due_date) BETWEEN 16 AND 30 THEN 'red'
      ELSE 'black'
    END,
    updated_at = NOW()
  WHERE resolved_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Função para aplicar cupom
CREATE OR REPLACE FUNCTION apply_coupon(
  p_company_id UUID,
  p_coupon_code TEXT,
  p_original_amount_cents INTEGER
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  discount_cents INTEGER,
  final_amount_cents INTEGER
) AS $$
DECLARE
  v_coupon RECORD;
  v_discount INTEGER;
  v_final INTEGER;
BEGIN
  -- Buscar cupom
  SELECT * INTO v_coupon
  FROM discount_coupons
  WHERE code = UPPER(p_coupon_code)
  AND is_active = true
  AND (valid_until IS NULL OR valid_until > NOW())
  AND (max_uses IS NULL OR current_uses < max_uses);
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Cupom inválido ou expirado'::TEXT, 0, p_original_amount_cents;
    RETURN;
  END IF;
  
  -- Verificar se já foi usado por esta empresa
  IF EXISTS (SELECT 1 FROM coupon_usages WHERE coupon_id = v_coupon.id AND company_id = p_company_id) THEN
    RETURN QUERY SELECT false, 'Cupom já utilizado por esta empresa'::TEXT, 0, p_original_amount_cents;
    RETURN;
  END IF;
  
  -- Calcular desconto
  IF v_coupon.discount_type = 'percentage' THEN
    v_discount := FLOOR(p_original_amount_cents * v_coupon.discount_value / 100);
  ELSE
    v_discount := v_coupon.discount_value;
  END IF;
  
  v_final := GREATEST(0, p_original_amount_cents - v_discount);
  
  -- Registrar uso
  INSERT INTO coupon_usages (coupon_id, company_id, original_amount_cents, discount_amount_cents, final_amount_cents, valid_until)
  VALUES (v_coupon.id, p_company_id, p_original_amount_cents, v_discount, v_final, 
          NOW() + (v_coupon.duration_months || ' months')::INTERVAL);
  
  -- Incrementar uso do cupom
  UPDATE discount_coupons SET current_uses = current_uses + 1, updated_at = NOW()
  WHERE id = v_coupon.id;
  
  RETURN QUERY SELECT true, 'Cupom aplicado com sucesso!'::TEXT, v_discount, v_final;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. VIEWS PARA RELATÓRIOS
-- =====================================================

-- View de resumo financeiro
CREATE OR REPLACE VIEW v_financial_summary AS
SELECT 
  (SELECT COUNT(*) FROM companies WHERE status = 'active' AND deleted_at IS NULL) AS active_companies,
  (SELECT COUNT(*) FROM companies WHERE status = 'trial' AND deleted_at IS NULL) AS trial_companies,
  (SELECT COUNT(*) FROM companies WHERE status IN ('expired', 'blocked') AND deleted_at IS NULL) AS inactive_companies,
  (SELECT COUNT(*) FROM companies WHERE status = 'active' AND deleted_at IS NULL) * 999 AS mrr_cents,
  (SELECT COUNT(*) FROM delinquency_records WHERE status != 'current' AND resolved_at IS NULL) AS delinquent_count,
  (SELECT COALESCE(SUM(amount_due_cents), 0) FROM delinquency_records WHERE status != 'current' AND resolved_at IS NULL) AS delinquent_amount_cents,
  (SELECT COUNT(*) FROM discount_coupons WHERE is_active = true) AS active_coupons;

-- View de inadimplentes
CREATE OR REPLACE VIEW v_delinquent_companies AS
SELECT 
  c.id AS company_id,
  c.name AS company_name,
  c.status AS company_status,
  d.due_date,
  d.days_overdue,
  d.status AS delinquency_status,
  d.amount_due_cents,
  d.reminder_sent_at,
  d.whatsapp_sent_at,
  d.partial_block_at,
  d.full_block_at,
  CASE d.status
    WHEN 'yellow' THEN 'Lembrete gentil'
    WHEN 'orange' THEN 'Bloqueio parcial'
    WHEN 'red' THEN 'Bloqueio total'
    WHEN 'black' THEN 'Exclusão iminente'
    ELSE 'Em dia'
  END AS action_required
FROM companies c
JOIN delinquency_records d ON c.id = d.company_id
WHERE d.resolved_at IS NULL
AND d.status != 'current'
ORDER BY d.days_overdue DESC;

-- View de performance de cupons
CREATE OR REPLACE VIEW v_coupon_performance AS
SELECT 
  dc.id,
  dc.code,
  dc.name,
  dc.discount_type,
  dc.discount_value,
  dc.max_uses,
  dc.current_uses,
  dc.valid_until,
  dc.is_active,
  COALESCE(SUM(cu.original_amount_cents), 0) AS total_original_cents,
  COALESCE(SUM(cu.discount_amount_cents), 0) AS total_discount_cents,
  COALESCE(SUM(cu.final_amount_cents), 0) AS total_revenue_cents
FROM discount_coupons dc
LEFT JOIN coupon_usages cu ON dc.id = cu.coupon_id
GROUP BY dc.id;

-- =====================================================
-- 8. DADOS INICIAIS - CUPONS DE EXEMPLO
-- =====================================================
INSERT INTO discount_coupons (code, name, description, discount_type, discount_value, duration_months, valid_until, max_uses, applicable_to) VALUES
('BEMVINDO', 'Boas-vindas', 'Desconto para novos clientes', 'percentage', 20, 1, '2025-12-31', 100, 'new_customers'),
('NATAL2024', 'Natal 2024', 'Promoção de Natal', 'percentage', 25, 3, '2024-12-31', 50, 'all'),
('ANUAL50', 'Anual 50% OFF', 'Desconto no plano anual', 'percentage', 50, 12, NULL, NULL, 'all'),
('FIDELIDADE', 'Cliente Fiel', 'Desconto para renovações', 'percentage', 15, 1, NULL, NULL, 'renewals')
ON CONFLICT (code) DO NOTHING;

-- Comentários
COMMENT ON TABLE mrr_history IS 'Histórico mensal de MRR e métricas de receita';
COMMENT ON TABLE delinquency_records IS 'Registro de inadimplência por empresa';
COMMENT ON TABLE discount_coupons IS 'Cupons de desconto disponíveis';
COMMENT ON TABLE coupon_usages IS 'Registro de uso de cupons por empresa';
COMMENT ON TABLE payments IS 'Histórico de pagamentos';
COMMENT ON FUNCTION calculate_current_mrr IS 'Calcula o MRR atual baseado em empresas ativas';
COMMENT ON FUNCTION project_mrr IS 'Projeta MRR futuro com base em taxas de conversão e churn';
COMMENT ON FUNCTION apply_coupon IS 'Aplica um cupom de desconto a uma empresa';
