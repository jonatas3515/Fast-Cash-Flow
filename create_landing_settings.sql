-- Landing Settings Table
-- Run this SQL in Supabase SQL Editor

-- Create the landing_settings table
CREATE TABLE IF NOT EXISTS landing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Version control
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  
  -- Hero Section
  hero_title TEXT DEFAULT 'Gestão financeira para pequenos negócios',
  hero_subtitle TEXT DEFAULT 'Controle seu fluxo de caixa sem complicação. Dashboard intuitivo, relatórios prontos e alertas automáticos.',
  hero_cta_text TEXT DEFAULT 'Começar grátis',
  trial_days INTEGER DEFAULT 7,
  
  -- Features (Como o sistema ajuda)
  -- Array of: {icon, title, description, benefit, highlight}
  features JSONB DEFAULT '[
    {"icon": "📊", "title": "Dashboard em tempo real", "description": "Veja entradas, saídas e saldo projetado.", "benefit": "Reduza 50% do tempo de fechamento", "highlight": true},
    {"icon": "📋", "title": "Contas a pagar e receber", "description": "Organize boletos, parcelas e vencimentos.", "benefit": "Evite multas e juros por atraso", "highlight": false},
    {"icon": "📈", "title": "Relatórios inteligentes", "description": "Análises prontas para decisões e contador.", "benefit": "Exporte em segundos", "highlight": false},
    {"icon": "🏷️", "title": "Gestão completa", "description": "Clientes, produtos e precificação.", "benefit": "Aumente sua margem de lucro", "highlight": false}
  ]'::jsonb,
  
  -- Target Audience (Feito para)
  -- Array of: {icon, label, benefit}
  target_audience JSONB DEFAULT '[
    {"icon": "🛒", "label": "Comércios", "benefit": "Vendas diárias organizadas"},
    {"icon": "🔧", "label": "Serviços", "benefit": "Contratos e recorrências"},
    {"icon": "🏥", "label": "Clínicas", "benefit": "Convênios e particulares"},
    {"icon": "🏭", "label": "Indústrias", "benefit": "Custos de produção"},
    {"icon": "📱", "label": "Delivery", "benefit": "Integração com apps"}
  ]'::jsonb,
  
  -- Screenshots/Carousel
  -- Array of: {title, subtitle, image_url}
  screenshots JSONB DEFAULT '[
    {"title": "Visão geral do caixa", "subtitle": "Entradas, saídas e saldo projetado", "image_url": "/Dashboard.jpg"},
    {"title": "Relatórios para o contador", "subtitle": "Exportações organizadas", "image_url": "/Relatórios.jpg"}
  ]'::jsonb,
  
  -- Social Proof (Números que crescem)
  -- Object: {companies, transactions, satisfaction}
  social_proof JSONB DEFAULT '{"companies": "+150", "transactions": "+10.000", "satisfaction": "98%"}'::jsonb,
  
  -- Plans
  -- Array of: {name, description, monthlyPrice, yearlyPrice, features[], recommended, savingsBadge}
  plans JSONB DEFAULT '[
    {"name": "Essencial", "description": "MEI e pequenos negócios", "monthlyPrice": 9.99, "yearlyPrice": 99.99, "features": ["Dashboard de fluxo de caixa", "Lançamentos diários", "Contas a pagar e receber", "Relatórios principais", "1 usuário"], "recommended": false, "savingsBadge": null},
    {"name": "Profissional", "description": "Crescimento e gestão avançada", "monthlyPrice": 15.99, "yearlyPrice": 159.90, "features": ["Tudo do Essencial", "Despesas recorrentes", "Metas financeiras", "Diagnóstico financeiro", "Notificações automáticas", "3 usuários"], "recommended": true, "savingsBadge": "Economize 17%"},
    {"name": "Avançado", "description": "Múltiplas empresas e equipe", "monthlyPrice": 29.99, "yearlyPrice": 299.90, "features": ["Tudo do Profissional", "Multiempresa", "Relatórios detalhados", "Gestão de equipe", "Usuários ilimitados"], "recommended": false, "savingsBadge": null}
  ]'::jsonb,
  
  -- Security Badges
  -- Array of: {icon, label}
  security_badges JSONB DEFAULT '[
    {"icon": "🛡️", "label": "Dados protegidos"},
    {"icon": "☁️", "label": "Backup automático"},
    {"icon": "🔐", "label": "Acesso seguro"}
  ]'::jsonb,
  
  -- Evolution Section (Em constante evolução)
  evolution_title TEXT DEFAULT 'Em constante evolução',
  evolution_subtitle TEXT DEFAULT 'Investimos continuamente para entregar a melhor experiência',
  -- Array of strings
  evolution_points JSONB DEFAULT '["Atualizações frequentes", "Backup automático", "Equipe de suporte dedicada"]'::jsonb,
  
  -- Final CTA
  final_cta_title TEXT DEFAULT 'Pronto para organizar suas finanças?',
  final_cta_subtitle TEXT DEFAULT 'Comece agora mesmo, sem compromisso.',
  
  -- Footer
  footer_year INTEGER DEFAULT 2025,
  footer_company_text TEXT DEFAULT 'Mais um produto do grupo JNC.',
  
  -- Navigation items
  nav_items JSONB DEFAULT '[
    {"label": "Como funciona", "ref": "features"},
    {"label": "Planos", "ref": "plans"},
    {"label": "Para quem", "ref": "audience"}
  ]'::jsonb,
  
  -- Metadata
  published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create RLS policies
ALTER TABLE landing_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read published settings (for landing page)
CREATE POLICY "Allow public read published" ON landing_settings
  FOR SELECT
  USING (status = 'published');

-- Allow authenticated users to manage settings (admin check done in app layer)
CREATE POLICY "Allow authenticated manage" ON landing_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create a default published record so the landing page works immediately
INSERT INTO landing_settings (status, published_at)
VALUES ('published', now())
ON CONFLICT DO NOTHING;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_landing_settings_status ON landing_settings(status);

-- Grant permissions
GRANT SELECT ON landing_settings TO anon;
GRANT ALL ON landing_settings TO authenticated;

-- Comment
COMMENT ON TABLE landing_settings IS 'Stores customizable content for the landing page CMS';
