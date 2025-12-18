-- =====================================================
-- GAMIFICATION & ENGAGEMENT SYSTEM
-- =====================================================
-- Sistema de gamificação para engajamento de usuários
-- Inclui: Conquistas (Badges), Ranking, Recompensas

-- =====================================================
-- 1. TABELA DE DEFINIÇÃO DE CONQUISTAS
-- =====================================================
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  key TEXT UNIQUE NOT NULL, -- Ex: 'first_transaction', 'streak_30'
  
  -- Conteúdo
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL, -- Emoji ou URL do ícone
  
  -- Categoria
  category TEXT NOT NULL CHECK (category IN (
    'beginner',      -- Iniciante
    'intermediate',  -- Intermediário
    'advanced',      -- Avançado
    'master',        -- Mestre
    'special'        -- Especial/Sazonal
  )),
  
  -- Requisitos
  requirement_type TEXT NOT NULL CHECK (requirement_type IN (
    'transaction_count',    -- Número de lançamentos
    'goal_achieved',        -- Metas atingidas
    'streak_days',          -- Dias consecutivos
    'category_count',       -- Categorias criadas
    'report_generated',     -- Relatórios gerados
    'usage_months',         -- Meses de uso
    'first_action',         -- Primeira ação
    'custom'                -- Customizado
  )),
  requirement_value INTEGER DEFAULT 1,
  
  -- Recompensa
  reward_type TEXT CHECK (reward_type IN (
    'badge_only',           -- Apenas badge
    'trial_days',           -- Dias extras de trial
    'discount_percent',     -- Desconto percentual
    'feature_unlock',       -- Desbloqueia recurso
    'premium_month'         -- Mês premium grátis
  )),
  reward_value INTEGER DEFAULT 0,
  
  -- Ordenação e visibilidade
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_secret BOOLEAN DEFAULT false, -- Conquista secreta
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_achievements_key ON achievements(key);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievements_active ON achievements(is_active);

-- =====================================================
-- 2. TABELA DE CONQUISTAS DESBLOQUEADAS
-- =====================================================
CREATE TABLE IF NOT EXISTS company_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  
  -- Progresso
  current_progress INTEGER DEFAULT 0,
  target_progress INTEGER NOT NULL,
  
  -- Status
  unlocked_at TIMESTAMPTZ,
  is_unlocked BOOLEAN DEFAULT false,
  
  -- Recompensa
  reward_claimed BOOLEAN DEFAULT false,
  reward_claimed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, achievement_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_company_achievements_company ON company_achievements(company_id);
CREATE INDEX IF NOT EXISTS idx_company_achievements_unlocked ON company_achievements(is_unlocked);

-- =====================================================
-- 3. TABELA DE ESTATÍSTICAS DE ENGAJAMENTO
-- =====================================================
CREATE TABLE IF NOT EXISTS engagement_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  
  -- Contadores totais
  total_transactions INTEGER DEFAULT 0,
  total_income_transactions INTEGER DEFAULT 0,
  total_expense_transactions INTEGER DEFAULT 0,
  total_goals_set INTEGER DEFAULT 0,
  total_goals_achieved INTEGER DEFAULT 0,
  total_reports_generated INTEGER DEFAULT 0,
  total_categories_created INTEGER DEFAULT 0,
  
  -- Streaks
  current_streak_days INTEGER DEFAULT 0,
  longest_streak_days INTEGER DEFAULT 0,
  last_activity_date DATE,
  
  -- Período
  first_activity_at TIMESTAMPTZ,
  months_active INTEGER DEFAULT 0,
  
  -- Pontuação
  total_points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  
  -- Ranking
  monthly_transactions INTEGER DEFAULT 0,
  monthly_rank INTEGER,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_engagement_company ON engagement_stats(company_id);
CREATE INDEX IF NOT EXISTS idx_engagement_points ON engagement_stats(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_monthly ON engagement_stats(monthly_transactions DESC);

-- =====================================================
-- 4. TABELA DE HISTÓRICO DE RANKING
-- =====================================================
CREATE TABLE IF NOT EXISTS ranking_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Período
  year_month TEXT NOT NULL, -- Formato: '2024-01'
  
  -- Empresa
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  
  -- Posição
  rank_position INTEGER NOT NULL,
  transaction_count INTEGER NOT NULL,
  
  -- Prêmio
  prize_type TEXT,
  prize_claimed BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(year_month, company_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ranking_month ON ranking_history(year_month DESC);
CREATE INDEX IF NOT EXISTS idx_ranking_position ON ranking_history(rank_position);

-- =====================================================
-- 5. FUNÇÕES DE GAMIFICAÇÃO
-- =====================================================

-- Função para atualizar estatísticas de engajamento
CREATE OR REPLACE FUNCTION update_engagement_stats(p_company_id UUID)
RETURNS void AS $$
DECLARE
  v_transactions INTEGER;
  v_goals_achieved INTEGER;
  v_categories INTEGER;
  v_last_date DATE;
  v_current_streak INTEGER;
BEGIN
  -- Contar transações
  SELECT COUNT(*) INTO v_transactions
  FROM transactions
  WHERE company_id = p_company_id AND deleted_at IS NULL;
  
  -- Contar metas atingidas (simplificado)
  SELECT COUNT(*) INTO v_goals_achieved
  FROM goals
  WHERE company_id = p_company_id AND achieved = true;
  
  -- Contar categorias
  SELECT COUNT(*) INTO v_categories
  FROM categories
  WHERE company_id = p_company_id;
  
  -- Atualizar ou criar registro
  INSERT INTO engagement_stats (
    company_id,
    total_transactions,
    total_goals_achieved,
    total_categories_created,
    last_activity_date,
    updated_at
  ) VALUES (
    p_company_id,
    v_transactions,
    COALESCE(v_goals_achieved, 0),
    COALESCE(v_categories, 0),
    CURRENT_DATE,
    NOW()
  )
  ON CONFLICT (company_id) DO UPDATE SET
    total_transactions = v_transactions,
    total_goals_achieved = COALESCE(v_goals_achieved, 0),
    total_categories_created = COALESCE(v_categories, 0),
    last_activity_date = CURRENT_DATE,
    current_streak_days = CASE
      WHEN engagement_stats.last_activity_date = CURRENT_DATE - 1 
      THEN engagement_stats.current_streak_days + 1
      WHEN engagement_stats.last_activity_date = CURRENT_DATE 
      THEN engagement_stats.current_streak_days
      ELSE 1
    END,
    longest_streak_days = GREATEST(
      engagement_stats.longest_streak_days,
      CASE
        WHEN engagement_stats.last_activity_date = CURRENT_DATE - 1 
        THEN engagement_stats.current_streak_days + 1
        ELSE 1
      END
    ),
    total_points = v_transactions * 10 + COALESCE(v_goals_achieved, 0) * 50 + COALESCE(v_categories, 0) * 5,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Função para verificar e desbloquear conquistas
CREATE OR REPLACE FUNCTION check_achievements(p_company_id UUID)
RETURNS TABLE (
  achievement_key TEXT,
  achievement_name TEXT,
  just_unlocked BOOLEAN
) AS $$
DECLARE
  v_stats RECORD;
  v_achievement RECORD;
BEGIN
  -- Buscar estatísticas da empresa
  SELECT * INTO v_stats FROM engagement_stats WHERE company_id = p_company_id;
  
  IF NOT FOUND THEN
    PERFORM update_engagement_stats(p_company_id);
    SELECT * INTO v_stats FROM engagement_stats WHERE company_id = p_company_id;
  END IF;
  
  -- Verificar cada conquista
  FOR v_achievement IN 
    SELECT a.* FROM achievements a WHERE a.is_active = true
  LOOP
    DECLARE
      v_progress INTEGER := 0;
      v_target INTEGER := v_achievement.requirement_value;
      v_unlocked BOOLEAN := false;
    BEGIN
      -- Calcular progresso baseado no tipo
      CASE v_achievement.requirement_type
        WHEN 'transaction_count' THEN
          v_progress := COALESCE(v_stats.total_transactions, 0);
        WHEN 'goal_achieved' THEN
          v_progress := COALESCE(v_stats.total_goals_achieved, 0);
        WHEN 'streak_days' THEN
          v_progress := COALESCE(v_stats.current_streak_days, 0);
        WHEN 'category_count' THEN
          v_progress := COALESCE(v_stats.total_categories_created, 0);
        WHEN 'first_action' THEN
          v_progress := CASE WHEN COALESCE(v_stats.total_transactions, 0) > 0 THEN 1 ELSE 0 END;
        ELSE
          v_progress := 0;
      END CASE;
      
      v_unlocked := v_progress >= v_target;
      
      -- Atualizar ou criar registro de conquista
      INSERT INTO company_achievements (
        company_id, achievement_id, current_progress, target_progress, 
        is_unlocked, unlocked_at
      ) VALUES (
        p_company_id, v_achievement.id, v_progress, v_target,
        v_unlocked, CASE WHEN v_unlocked THEN NOW() ELSE NULL END
      )
      ON CONFLICT (company_id, achievement_id) DO UPDATE SET
        current_progress = v_progress,
        is_unlocked = v_unlocked,
        unlocked_at = CASE 
          WHEN v_unlocked AND company_achievements.unlocked_at IS NULL THEN NOW()
          ELSE company_achievements.unlocked_at
        END,
        updated_at = NOW();
      
      -- Retornar conquistas recém-desbloqueadas
      IF v_unlocked THEN
        achievement_key := v_achievement.key;
        achievement_name := v_achievement.name;
        just_unlocked := (SELECT unlocked_at FROM company_achievements 
                          WHERE company_id = p_company_id AND achievement_id = v_achievement.id) 
                          > NOW() - INTERVAL '1 minute';
        RETURN NEXT;
      END IF;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Função para calcular ranking mensal
CREATE OR REPLACE FUNCTION calculate_monthly_ranking(p_year_month TEXT DEFAULT NULL)
RETURNS void AS $$
DECLARE
  v_month TEXT := COALESCE(p_year_month, TO_CHAR(NOW(), 'YYYY-MM'));
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  v_start_date := (v_month || '-01')::DATE;
  v_end_date := (v_start_date + INTERVAL '1 month')::DATE;
  
  -- Limpar ranking anterior do mês
  DELETE FROM ranking_history WHERE year_month = v_month;
  
  -- Inserir novo ranking
  INSERT INTO ranking_history (year_month, company_id, company_name, rank_position, transaction_count)
  SELECT 
    v_month,
    c.id,
    c.name,
    ROW_NUMBER() OVER (ORDER BY COUNT(t.id) DESC),
    COUNT(t.id)
  FROM companies c
  LEFT JOIN transactions t ON c.id = t.company_id 
    AND t.date >= v_start_date 
    AND t.date < v_end_date
    AND t.deleted_at IS NULL
  WHERE c.deleted_at IS NULL
  AND c.status IN ('active', 'trial')
  GROUP BY c.id, c.name
  HAVING COUNT(t.id) > 0
  ORDER BY COUNT(t.id) DESC
  LIMIT 100;
  
  -- Atualizar estatísticas mensais
  UPDATE engagement_stats es
  SET 
    monthly_transactions = rh.transaction_count,
    monthly_rank = rh.rank_position
  FROM ranking_history rh
  WHERE es.company_id = rh.company_id
  AND rh.year_month = v_month;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. VIEWS PARA GAMIFICAÇÃO
-- =====================================================

-- View de conquistas por empresa
CREATE OR REPLACE VIEW v_company_achievements_detail AS
SELECT 
  ca.company_id,
  a.key AS achievement_key,
  a.name AS achievement_name,
  a.description,
  a.icon,
  a.category,
  ca.current_progress,
  ca.target_progress,
  ROUND((ca.current_progress::DECIMAL / ca.target_progress) * 100, 1) AS progress_percent,
  ca.is_unlocked,
  ca.unlocked_at,
  a.reward_type,
  a.reward_value,
  ca.reward_claimed
FROM company_achievements ca
JOIN achievements a ON ca.achievement_id = a.id
WHERE a.is_active = true
ORDER BY a.sort_order;

-- View de ranking atual
CREATE OR REPLACE VIEW v_current_ranking AS
SELECT 
  c.id AS company_id,
  c.name AS company_name,
  es.monthly_transactions,
  es.total_transactions,
  es.total_points,
  es.level,
  es.current_streak_days,
  ROW_NUMBER() OVER (ORDER BY es.monthly_transactions DESC) AS current_rank
FROM companies c
JOIN engagement_stats es ON c.id = es.company_id
WHERE c.deleted_at IS NULL
AND c.status IN ('active', 'trial')
AND es.monthly_transactions > 0
ORDER BY es.monthly_transactions DESC
LIMIT 100;

-- View de top 3 do mês
CREATE OR REPLACE VIEW v_top_3_monthly AS
SELECT * FROM v_current_ranking WHERE current_rank <= 3;

-- =====================================================
-- 7. DADOS INICIAIS - CONQUISTAS
-- =====================================================
INSERT INTO achievements (key, name, description, icon, category, requirement_type, requirement_value, reward_type, reward_value, sort_order) VALUES
-- Iniciante
('first_transaction', 'Primeiro Lançamento', 'Registre seu primeiro lançamento no sistema', '🎯', 'beginner', 'first_action', 1, 'badge_only', 0, 1),
('first_goal', 'Primeira Meta', 'Defina sua primeira meta financeira', '🎯', 'beginner', 'goal_achieved', 1, 'badge_only', 0, 2),
('ten_transactions', '10 Lançamentos', 'Registre 10 lançamentos', '📝', 'beginner', 'transaction_count', 10, 'badge_only', 0, 3),
('first_category', 'Organizador', 'Crie sua primeira categoria personalizada', '🏷️', 'beginner', 'category_count', 1, 'badge_only', 0, 4),

-- Intermediário
('hundred_transactions', 'Centenário', 'Registre 100 lançamentos', '💯', 'intermediate', 'transaction_count', 100, 'trial_days', 3, 10),
('three_goals', 'Focado', 'Atinja 3 metas financeiras', '🎯', 'intermediate', 'goal_achieved', 3, 'trial_days', 5, 11),
('streak_7', 'Semana Perfeita', 'Use o app por 7 dias seguidos', '🔥', 'intermediate', 'streak_days', 7, 'badge_only', 0, 12),
('streak_30', 'Mês Dedicado', 'Use o app por 30 dias seguidos', '🔥', 'intermediate', 'streak_days', 30, 'trial_days', 7, 13),
('five_categories', 'Super Organizado', 'Crie 5 categorias personalizadas', '🏷️', 'intermediate', 'category_count', 5, 'badge_only', 0, 14),

-- Avançado
('five_hundred_transactions', 'Veterano', 'Registre 500 lançamentos', '⭐', 'advanced', 'transaction_count', 500, 'discount_percent', 10, 20),
('thousand_transactions', 'Mestre Financeiro', 'Registre 1000 lançamentos', '👑', 'advanced', 'transaction_count', 1000, 'discount_percent', 20, 21),
('ten_goals', 'Conquistador', 'Atinja 10 metas financeiras', '🏆', 'advanced', 'goal_achieved', 10, 'discount_percent', 15, 22),
('streak_90', 'Trimestre de Ouro', 'Use o app por 90 dias seguidos', '💎', 'advanced', 'streak_days', 90, 'premium_month', 1, 23),
('ten_categories', 'Arquiteto Financeiro', 'Crie 10 categorias personalizadas', '🏗️', 'advanced', 'category_count', 10, 'badge_only', 0, 24),

-- Mestre
('streak_365', 'Lenda', 'Use o app por 1 ano seguido', '🌟', 'master', 'streak_days', 365, 'premium_month', 3, 30),
('five_thousand_transactions', 'Elite', 'Registre 5000 lançamentos', '💫', 'master', 'transaction_count', 5000, 'discount_percent', 30, 31)

ON CONFLICT (key) DO NOTHING;

-- Comentários
COMMENT ON TABLE achievements IS 'Definição de conquistas disponíveis no sistema';
COMMENT ON TABLE company_achievements IS 'Progresso e conquistas desbloqueadas por empresa';
COMMENT ON TABLE engagement_stats IS 'Estatísticas de engajamento por empresa';
COMMENT ON TABLE ranking_history IS 'Histórico de ranking mensal';
COMMENT ON FUNCTION update_engagement_stats IS 'Atualiza estatísticas de engajamento de uma empresa';
COMMENT ON FUNCTION check_achievements IS 'Verifica e desbloqueia conquistas para uma empresa';
COMMENT ON FUNCTION calculate_monthly_ranking IS 'Calcula o ranking mensal de empresas';
