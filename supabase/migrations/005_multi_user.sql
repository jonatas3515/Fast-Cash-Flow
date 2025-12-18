-- =====================================================
-- MULTI-USER & PERMISSIONS SYSTEM
-- =====================================================
-- Sistema de múltiplos usuários por empresa com permissões
-- Inclui: Perfis de acesso, convites, gerenciamento de usuários

-- IMPORTANTE: Execute este script APÓS criar a tabela companies

-- =====================================================
-- 1. TABELA DE PERFIS/ROLES
-- =====================================================
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS company_invites CASCADE;
DROP TABLE IF EXISTS company_members CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  key TEXT UNIQUE NOT NULL, -- 'owner', 'manager', 'accountant', 'viewer'
  name TEXT NOT NULL,
  description TEXT,
  
  -- Permissões (JSONB para flexibilidade)
  permissions JSONB NOT NULL DEFAULT '{}'::JSONB,
  
  -- Configurações
  is_system_role BOOLEAN DEFAULT false, -- Roles do sistema não podem ser deletados
  can_be_assigned BOOLEAN DEFAULT true,
  
  -- Preço adicional (em centavos)
  additional_price_cents INTEGER DEFAULT 0,
  
  -- Ordenação
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_roles_key ON user_roles(key);

-- =====================================================
-- 2. TABELA DE MEMBROS DA EMPRESA
-- =====================================================
CREATE TABLE company_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- Referência ao auth.users
  
  -- Role
  role_id UUID NOT NULL REFERENCES user_roles(id),
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN (
    'pending',   -- Convite enviado
    'active',    -- Membro ativo
    'suspended', -- Suspenso temporariamente
    'removed'    -- Removido
  )),
  
  -- Informações do usuário
  email TEXT NOT NULL,
  name TEXT,
  
  -- Convite
  invited_by UUID,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  
  -- Último acesso
  last_access_at TIMESTAMPTZ,
  
  -- Datas
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, email)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_members_company ON company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_members_user ON company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_email ON company_members(email);
CREATE INDEX IF NOT EXISTS idx_members_status ON company_members(status);

-- =====================================================
-- 3. TABELA DE CONVITES
-- =====================================================
CREATE TABLE company_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Destinatário
  email TEXT NOT NULL,
  name TEXT,
  
  -- Role atribuído
  role_id UUID NOT NULL REFERENCES user_roles(id),
  
  -- Token de convite
  invite_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',
    'accepted',
    'expired',
    'cancelled'
  )),
  
  -- Quem convidou
  invited_by UUID NOT NULL,
  
  -- Validade
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  
  -- Mensagem personalizada
  message TEXT,
  
  -- Datas
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  
  UNIQUE(company_id, email, status)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_invites_company ON company_invites(company_id);
CREATE INDEX IF NOT EXISTS idx_invites_email ON company_invites(email);
CREATE INDEX IF NOT EXISTS idx_invites_token ON company_invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_invites_status ON company_invites(status);

-- =====================================================
-- 4. TABELA DE SESSÕES DE USUÁRIO
-- =====================================================
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Informações da sessão
  session_token TEXT UNIQUE NOT NULL,
  
  -- Dispositivo
  device_fingerprint TEXT,
  device_name TEXT,
  ip_address TEXT,
  user_agent TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Datas
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_company ON user_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON user_sessions(is_active);

-- =====================================================
-- 5. DADOS INICIAIS - ROLES DO SISTEMA
-- =====================================================
-- Inserir roles (sem ON CONFLICT pois tabela foi recriada)
INSERT INTO user_roles (key, name, description, permissions, is_system_role, additional_price_cents, sort_order) VALUES
(
  'owner',
  'Proprietário',
  'Acesso total à empresa. Pode gerenciar usuários e excluir a empresa.',
  '{
    "transactions": {"create": true, "read": true, "update": true, "delete": true},
    "categories": {"create": true, "read": true, "update": true, "delete": true},
    "goals": {"create": true, "read": true, "update": true, "delete": true},
    "debts": {"create": true, "read": true, "update": true, "delete": true},
    "orders": {"create": true, "read": true, "update": true, "delete": true},
    "reports": {"view": true, "export": true},
    "settings": {"view": true, "edit": true},
    "users": {"invite": true, "remove": true, "change_role": true},
    "company": {"edit": true, "delete": true},
    "subscription": {"view": true, "manage": true},
    "backup": {"create": true, "restore": true}
  }'::JSONB,
  true,
  0,
  1
),
(
  'manager',
  'Gerente',
  'Pode criar e editar lançamentos, gerar relatórios. Não pode excluir a empresa.',
  '{
    "transactions": {"create": true, "read": true, "update": true, "delete": true},
    "categories": {"create": true, "read": true, "update": true, "delete": false},
    "goals": {"create": true, "read": true, "update": true, "delete": false},
    "debts": {"create": true, "read": true, "update": true, "delete": true},
    "orders": {"create": true, "read": true, "update": true, "delete": true},
    "reports": {"view": true, "export": true},
    "settings": {"view": true, "edit": false},
    "users": {"invite": false, "remove": false, "change_role": false},
    "company": {"edit": false, "delete": false},
    "subscription": {"view": true, "manage": false},
    "backup": {"create": false, "restore": false}
  }'::JSONB,
  true,
  499, -- R$ 4,99
  2
),
(
  'accountant',
  'Contador',
  'Pode visualizar relatórios e exportar dados. Não pode criar ou editar lançamentos.',
  '{
    "transactions": {"create": false, "read": true, "update": false, "delete": false},
    "categories": {"create": false, "read": true, "update": false, "delete": false},
    "goals": {"create": false, "read": true, "update": false, "delete": false},
    "debts": {"create": false, "read": true, "update": false, "delete": false},
    "orders": {"create": false, "read": true, "update": false, "delete": false},
    "reports": {"view": true, "export": true},
    "settings": {"view": false, "edit": false},
    "users": {"invite": false, "remove": false, "change_role": false},
    "company": {"edit": false, "delete": false},
    "subscription": {"view": false, "manage": false},
    "backup": {"create": false, "restore": false}
  }'::JSONB,
  true,
  499, -- R$ 4,99
  3
),
(
  'viewer',
  'Visualizador',
  'Apenas visualização. Não pode criar, editar ou exportar nada.',
  '{
    "transactions": {"create": false, "read": true, "update": false, "delete": false},
    "categories": {"create": false, "read": true, "update": false, "delete": false},
    "goals": {"create": false, "read": true, "update": false, "delete": false},
    "debts": {"create": false, "read": true, "update": false, "delete": false},
    "orders": {"create": false, "read": true, "update": false, "delete": false},
    "reports": {"view": true, "export": false},
    "settings": {"view": false, "edit": false},
    "users": {"invite": false, "remove": false, "change_role": false},
    "company": {"edit": false, "delete": false},
    "subscription": {"view": false, "manage": false},
    "backup": {"create": false, "restore": false}
  }'::JSONB,
  true,
  299, -- R$ 2,99
  4
);

-- =====================================================
-- 6. FUNÇÕES DE GERENCIAMENTO DE USUÁRIOS
-- =====================================================

-- Função para convidar usuário
CREATE OR REPLACE FUNCTION invite_company_member(
  p_company_id UUID,
  p_email TEXT,
  p_name TEXT,
  p_role_key TEXT,
  p_invited_by UUID,
  p_message TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  invite_id UUID,
  invite_token TEXT
) AS $$
DECLARE
  v_role_id UUID;
  v_invite_id UUID;
  v_invite_token TEXT;
  v_existing_member RECORD;
  v_existing_invite RECORD;
BEGIN
  -- Buscar role
  SELECT id INTO v_role_id FROM user_roles WHERE key = p_role_key;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Perfil de acesso não encontrado'::TEXT, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Verificar se já é membro
  SELECT * INTO v_existing_member FROM company_members 
  WHERE company_id = p_company_id AND email = p_email AND status = 'active';
  IF FOUND THEN
    RETURN QUERY SELECT false, 'Este email já é membro da empresa'::TEXT, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Verificar se já tem convite pendente
  SELECT * INTO v_existing_invite FROM company_invites 
  WHERE company_id = p_company_id AND email = p_email AND status = 'pending';
  IF FOUND THEN
    RETURN QUERY SELECT false, 'Já existe um convite pendente para este email'::TEXT, v_existing_invite.id, v_existing_invite.invite_token;
    RETURN;
  END IF;
  
  -- Criar convite
  INSERT INTO company_invites (company_id, email, name, role_id, invited_by, message)
  VALUES (p_company_id, p_email, p_name, v_role_id, p_invited_by, p_message)
  RETURNING id, invite_token INTO v_invite_id, v_invite_token;
  
  RETURN QUERY SELECT true, 'Convite enviado com sucesso!'::TEXT, v_invite_id, v_invite_token;
END;
$$ LANGUAGE plpgsql;

-- Função para aceitar convite
CREATE OR REPLACE FUNCTION accept_company_invite(
  p_invite_token TEXT,
  p_user_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  company_id UUID,
  role_key TEXT
) AS $$
DECLARE
  v_invite RECORD;
  v_role RECORD;
BEGIN
  -- Buscar convite
  SELECT ci.*, ur.key AS role_key INTO v_invite
  FROM company_invites ci
  JOIN user_roles ur ON ci.role_id = ur.id
  WHERE ci.invite_token = p_invite_token AND ci.status = 'pending';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Convite não encontrado ou já utilizado'::TEXT, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Verificar validade
  IF v_invite.expires_at < NOW() THEN
    UPDATE company_invites SET status = 'expired' WHERE id = v_invite.id;
    RETURN QUERY SELECT false, 'Convite expirado'::TEXT, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Criar membro
  INSERT INTO company_members (company_id, user_id, role_id, email, name, invited_by, accepted_at, status)
  VALUES (v_invite.company_id, p_user_id, v_invite.role_id, v_invite.email, v_invite.name, v_invite.invited_by, NOW(), 'active')
  ON CONFLICT (company_id, email) DO UPDATE SET
    user_id = p_user_id,
    status = 'active',
    accepted_at = NOW();
  
  -- Atualizar convite
  UPDATE company_invites SET status = 'accepted', accepted_at = NOW() WHERE id = v_invite.id;
  
  RETURN QUERY SELECT true, 'Convite aceito com sucesso!'::TEXT, v_invite.company_id, v_invite.role_key;
END;
$$ LANGUAGE plpgsql;

-- Função para verificar permissão
CREATE OR REPLACE FUNCTION check_permission(
  p_user_id UUID,
  p_company_id UUID,
  p_resource TEXT,
  p_action TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_member RECORD;
  v_permissions JSONB;
BEGIN
  -- Buscar membro e suas permissões
  SELECT cm.*, ur.permissions INTO v_member
  FROM company_members cm
  JOIN user_roles ur ON cm.role_id = ur.id
  WHERE cm.user_id = p_user_id 
  AND cm.company_id = p_company_id 
  AND cm.status = 'active';
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  v_permissions := v_member.permissions;
  
  -- Verificar permissão específica
  RETURN COALESCE((v_permissions->p_resource->>p_action)::BOOLEAN, false);
END;
$$ LANGUAGE plpgsql;

-- Função para listar membros da empresa
CREATE OR REPLACE FUNCTION get_company_members(p_company_id UUID)
RETURNS TABLE (
  member_id UUID,
  user_id UUID,
  email TEXT,
  name TEXT,
  role_key TEXT,
  role_name TEXT,
  status TEXT,
  last_access_at TIMESTAMPTZ,
  invited_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.id AS member_id,
    cm.user_id,
    cm.email,
    cm.name,
    ur.key AS role_key,
    ur.name AS role_name,
    cm.status,
    cm.last_access_at,
    cm.invited_at
  FROM company_members cm
  JOIN user_roles ur ON cm.role_id = ur.id
  WHERE cm.company_id = p_company_id
  ORDER BY 
    CASE ur.key WHEN 'owner' THEN 1 WHEN 'manager' THEN 2 WHEN 'accountant' THEN 3 ELSE 4 END,
    cm.created_at;
END;
$$ LANGUAGE plpgsql;

-- Função para calcular custo adicional de usuários
CREATE OR REPLACE FUNCTION calculate_additional_users_cost(p_company_id UUID)
RETURNS TABLE (
  total_members INTEGER,
  paid_members INTEGER,
  additional_cost_cents INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER AS total_members,
    COUNT(*) FILTER (WHERE ur.additional_price_cents > 0)::INTEGER AS paid_members,
    COALESCE(SUM(ur.additional_price_cents), 0)::INTEGER AS additional_cost_cents
  FROM company_members cm
  JOIN user_roles ur ON cm.role_id = ur.id
  WHERE cm.company_id = p_company_id
  AND cm.status = 'active'
  AND ur.key != 'owner'; -- Owner não paga adicional
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. VIEWS
-- =====================================================

-- View de membros com detalhes
CREATE OR REPLACE VIEW v_company_members_detail AS
SELECT 
  cm.id AS member_id,
  cm.company_id,
  c.name AS company_name,
  cm.user_id,
  cm.email,
  cm.name AS member_name,
  ur.key AS role_key,
  ur.name AS role_name,
  ur.permissions,
  ur.additional_price_cents,
  cm.status,
  cm.last_access_at,
  cm.invited_at,
  cm.accepted_at
FROM company_members cm
JOIN companies c ON cm.company_id = c.id
JOIN user_roles ur ON cm.role_id = ur.id;

-- View de convites pendentes
CREATE OR REPLACE VIEW v_pending_invites AS
SELECT 
  ci.*,
  c.name AS company_name,
  ur.name AS role_name
FROM company_invites ci
JOIN companies c ON ci.company_id = c.id
JOIN user_roles ur ON ci.role_id = ur.id
WHERE ci.status = 'pending'
AND ci.expires_at > NOW();

-- View de custo por empresa
CREATE OR REPLACE VIEW v_company_user_costs AS
SELECT 
  c.id AS company_id,
  c.name AS company_name,
  COUNT(cm.id) AS total_members,
  COUNT(cm.id) FILTER (WHERE ur.key = 'owner') AS owners,
  COUNT(cm.id) FILTER (WHERE ur.key = 'manager') AS managers,
  COUNT(cm.id) FILTER (WHERE ur.key = 'accountant') AS accountants,
  COUNT(cm.id) FILTER (WHERE ur.key = 'viewer') AS viewers,
  COALESCE(SUM(ur.additional_price_cents) FILTER (WHERE ur.key != 'owner'), 0) AS additional_cost_cents
FROM companies c
LEFT JOIN company_members cm ON c.id = cm.company_id AND cm.status = 'active'
LEFT JOIN user_roles ur ON cm.role_id = ur.id
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.name;

-- Comentários
COMMENT ON TABLE user_roles IS 'Perfis de acesso disponíveis no sistema';
COMMENT ON TABLE company_members IS 'Membros de cada empresa com seus perfis';
COMMENT ON TABLE company_invites IS 'Convites pendentes para novos membros';
COMMENT ON TABLE user_sessions IS 'Sessões ativas de usuários';
COMMENT ON FUNCTION invite_company_member IS 'Convida um novo membro para a empresa';
COMMENT ON FUNCTION accept_company_invite IS 'Aceita um convite de membro';
COMMENT ON FUNCTION check_permission IS 'Verifica se usuário tem permissão para ação';
COMMENT ON FUNCTION get_company_members IS 'Lista membros de uma empresa';
COMMENT ON FUNCTION calculate_additional_users_cost IS 'Calcula custo adicional de usuários extras';
