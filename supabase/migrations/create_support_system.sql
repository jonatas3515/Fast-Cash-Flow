-- =====================================================
-- TABELAS E FUNÇÕES PARA SUPORTE E BROADCAST
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. Tabela de mensagens de suporte
CREATE TABLE IF NOT EXISTS support_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('admin_to_company', 'company_to_admin')),
    message TEXT NOT NULL,
    sender_name TEXT,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de conversas agregadas (view materializada)
CREATE TABLE IF NOT EXISTS support_conversations (
    company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
    total_messages INTEGER DEFAULT 0,
    unread_by_admin INTEGER DEFAULT 0,
    unread_by_company INTEGER DEFAULT 0,
    last_message_at TIMESTAMPTZ,
    last_message_preview TEXT,
    last_message_direction TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de templates de mensagem
CREATE TABLE IF NOT EXISTS message_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de mensagens admin (broadcast)
CREATE TABLE IF NOT EXISTS admin_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_user_id UUID NOT NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    is_broadcast BOOLEAN DEFAULT FALSE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    priority TEXT DEFAULT 'normal',
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- POLÍTICAS RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS nas tabelas
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "support_messages_select" ON support_messages;
DROP POLICY IF EXISTS "support_messages_insert" ON support_messages;
DROP POLICY IF EXISTS "support_messages_update" ON support_messages;
DROP POLICY IF EXISTS "support_conversations_select" ON support_conversations;
DROP POLICY IF EXISTS "support_conversations_all" ON support_conversations;
DROP POLICY IF EXISTS "message_templates_select" ON message_templates;
DROP POLICY IF EXISTS "admin_messages_select" ON admin_messages;
DROP POLICY IF EXISTS "admin_messages_insert" ON admin_messages;
DROP POLICY IF EXISTS "admin_messages_update" ON admin_messages;

-- SUPPORT_MESSAGES policies
CREATE POLICY "support_messages_select"
ON support_messages FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "support_messages_insert"
ON support_messages FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "support_messages_update"
ON support_messages FOR UPDATE
TO authenticated
USING (true);

-- SUPPORT_CONVERSATIONS policies
CREATE POLICY "support_conversations_select"
ON support_conversations FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "support_conversations_all"
ON support_conversations FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- MESSAGE_TEMPLATES policies (read-only para todos)
CREATE POLICY "message_templates_select"
ON message_templates FOR SELECT
TO authenticated
USING (true);

-- ADMIN_MESSAGES policies
CREATE POLICY "admin_messages_select"
ON admin_messages FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "admin_messages_insert"
ON admin_messages FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "admin_messages_update"
ON admin_messages FOR UPDATE
TO authenticated
USING (true);

-- =====================================================
-- FUNÇÕES RPC
-- =====================================================

-- Função para marcar mensagens como lidas
CREATE OR REPLACE FUNCTION mark_messages_read(
    p_company_id UUID,
    p_reader TEXT -- 'admin' ou 'company'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_reader = 'admin' THEN
        -- Admin lendo mensagens da empresa
        UPDATE support_messages
        SET read_at = NOW()
        WHERE company_id = p_company_id
          AND direction = 'company_to_admin'
          AND read_at IS NULL;
          
        -- Atualizar contador de conversas
        UPDATE support_conversations
        SET unread_by_admin = 0,
            updated_at = NOW()
        WHERE company_id = p_company_id;
    ELSE
        -- Empresa lendo mensagens do admin
        UPDATE support_messages
        SET read_at = NOW()
        WHERE company_id = p_company_id
          AND direction = 'admin_to_company'
          AND read_at IS NULL;
          
        UPDATE support_conversations
        SET unread_by_company = 0,
            updated_at = NOW()
        WHERE company_id = p_company_id;
    END IF;
END;
$$;

-- Função para enviar mensagem de suporte
CREATE OR REPLACE FUNCTION send_support_message(
    p_company_id UUID,
    p_direction TEXT,
    p_message TEXT,
    p_sender_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_message_id UUID;
    v_preview TEXT;
BEGIN
    -- Inserir mensagem
    INSERT INTO support_messages (company_id, direction, message, sender_name)
    VALUES (p_company_id, p_direction, p_message, p_sender_name)
    RETURNING id INTO v_message_id;
    
    -- Preparar preview (primeiros 100 caracteres)
    v_preview := LEFT(p_message, 100);
    
    -- Atualizar ou inserir conversa
    INSERT INTO support_conversations (
        company_id,
        total_messages,
        unread_by_admin,
        unread_by_company,
        last_message_at,
        last_message_preview,
        last_message_direction
    )
    VALUES (
        p_company_id,
        1,
        CASE WHEN p_direction = 'company_to_admin' THEN 1 ELSE 0 END,
        CASE WHEN p_direction = 'admin_to_company' THEN 1 ELSE 0 END,
        NOW(),
        v_preview,
        p_direction
    )
    ON CONFLICT (company_id) DO UPDATE SET
        total_messages = support_conversations.total_messages + 1,
        unread_by_admin = support_conversations.unread_by_admin + 
            CASE WHEN p_direction = 'company_to_admin' THEN 1 ELSE 0 END,
        unread_by_company = support_conversations.unread_by_company + 
            CASE WHEN p_direction = 'admin_to_company' THEN 1 ELSE 0 END,
        last_message_at = NOW(),
        last_message_preview = v_preview,
        last_message_direction = p_direction,
        updated_at = NOW();
    
    RETURN v_message_id;
END;
$$;

-- =====================================================
-- DADOS INICIAIS (Templates)
-- =====================================================

INSERT INTO message_templates (name, title, message, type)
VALUES 
    ('Boas-vindas', 'Bem-vindo ao Fast Cash Flow!', 'Olá! Seja muito bem-vindo ao Fast Cash Flow. Estamos aqui para ajudá-lo a organizar suas finanças e alcançar seus objetivos. Qualquer dúvida, entre em contato!', 'info'),
    ('Trial Expirando', 'Seu período de teste está acabando', 'Olá! Notamos que seu período de teste está chegando ao fim. Que tal aproveitar e assinar o plano que mais combina com você? Temos ótimas condições!', 'warning'),
    ('Promoção Especial', '🎁 Oferta Especial para Você!', 'Temos uma oferta exclusiva para você! Por tempo limitado, assine com desconto especial. Não perca essa oportunidade!', 'promotion'),
    ('Suporte Técnico', 'Estamos aqui para ajudar', 'Olá! Vimos que você pode estar com dificuldades. Nossa equipe de suporte está pronta para ajudá-lo. Responda esta mensagem com sua dúvida!', 'support'),
    ('Atualização', '📢 Novidades no Fast Cash Flow', 'Temos novidades! Atualizamos o sistema com novas funcionalidades. Acesse e confira todas as melhorias que preparamos para você!', 'info')
ON CONFLICT DO NOTHING;

-- =====================================================
-- GRANT para funções anônimas (se necessário)
-- =====================================================
GRANT EXECUTE ON FUNCTION mark_messages_read(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION send_support_message(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- =====================================================
-- Concluído! 
-- =====================================================
SELECT 'Tabelas, políticas e funções criadas com sucesso!' AS resultado;
