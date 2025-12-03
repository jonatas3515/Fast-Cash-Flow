-- =====================================================
-- FAST CASH FLOW - ESTRUTURA COMPLETA DO BANCO DE DADOS
-- =====================================================
-- Execute este script no Supabase SQL Editor
-- Ordem: 1) Tabelas, 2) RLS Policies, 3) Functions, 4) Triggers

-- =====================================================
-- 1. TABELAS PRINCIPAIS
-- =====================================================

-- Tabela: companies (empresas cadastradas)
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  password_hash TEXT, -- Para futuro uso de hash próprio
  
  -- Status e planos
  status TEXT DEFAULT 'pending',
  plan_type TEXT,
  plan_price DECIMAL(10,2) DEFAULT 0,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  
  -- Trial e datas
  trial_days INTEGER DEFAULT 30,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  
  -- Dados adicionais
  address TEXT,
  cnpj TEXT,
  founded_on DATE,
  logo_url TEXT,
  blocked BOOLEAN DEFAULT false,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar colunas que podem não existir em tabelas antigas
DO $$ 
BEGIN
  -- Adicionar coluna status se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'companies' 
                 AND column_name = 'status') THEN
    ALTER TABLE public.companies ADD COLUMN status TEXT DEFAULT 'pending';
  END IF;
  
  -- Adicionar coluna plan_type se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'companies' 
                 AND column_name = 'plan_type') THEN
    ALTER TABLE public.companies ADD COLUMN plan_type TEXT;
  END IF;
  
  -- Adicionar coluna trial_start se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'companies' 
                 AND column_name = 'trial_start') THEN
    ALTER TABLE public.companies ADD COLUMN trial_start TIMESTAMPTZ;
  END IF;
  
  -- Adicionar coluna trial_end se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'companies' 
                 AND column_name = 'trial_end') THEN
    ALTER TABLE public.companies ADD COLUMN trial_end TIMESTAMPTZ;
  END IF;
  
  -- Adicionar coluna password_hash se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'companies' 
                 AND column_name = 'password_hash') THEN
    ALTER TABLE public.companies ADD COLUMN password_hash TEXT;
  END IF;
END $$;

-- Adicionar constraints após garantir que as colunas existem
DO $$
BEGIN
  -- Adicionar CHECK constraint para status
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'companies_status_check') THEN
    ALTER TABLE public.companies ADD CONSTRAINT companies_status_check 
      CHECK (status IN ('pending', 'trial', 'active', 'blocked', 'expired'));
  END IF;
  
  -- Adicionar CHECK constraint para plan_type
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'companies_plan_type_check') THEN
    ALTER TABLE public.companies ADD CONSTRAINT companies_plan_type_check 
      CHECK (plan_type IN ('monthly', 'yearly', 'trial', 'free'));
  END IF;
END $$;

-- Tabela: company_requests (solicitações de cadastro)
CREATE TABLE IF NOT EXISTS public.company_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  address TEXT,
  cnpj TEXT,
  founded_on DATE,
  
  -- Status de aprovação
  approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  approved_username TEXT,
  approved_temp_password TEXT,
  permanent_password TEXT,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: transactions (lançamentos financeiros)
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY, -- UUID gerado no cliente
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Dados da transação
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  date TEXT NOT NULL, -- YYYY-MM-DD
  time TEXT,
  datetime TEXT NOT NULL, -- ISO string
  description TEXT,
  category TEXT,
  amount_cents INTEGER NOT NULL,
  
  -- Sincronização
  source_device TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL, -- ISO string
  deleted_at TEXT, -- Soft delete
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_transactions_company ON public.transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_updated ON public.transactions(updated_at);
CREATE INDEX IF NOT EXISTS idx_transactions_deleted ON public.transactions(deleted_at);

-- Tabela: admin_users (usuários administrativos)
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'support')),
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: payments (histórico de pagamentos)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Dados do pagamento
  plan_type TEXT NOT NULL CHECK (plan_type IN ('monthly', 'yearly')),
  amount DECIMAL(10,2) NOT NULL,
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method TEXT CHECK (payment_method IN ('credit_card', 'debit_card', 'pix', 'boleto')),
  
  -- Referências externas (gateway de pagamento)
  transaction_id TEXT,
  gateway_response JSONB,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_company ON public.payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date);

-- =====================================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLICIES: companies
-- =====================================================

-- Admin pode ver todas as empresas
CREATE POLICY "Admin can view all companies"
  ON public.companies FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'admin@fastcashflow.com'
  );

-- Admin pode inserir empresas
CREATE POLICY "Admin can insert companies"
  ON public.companies FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'email' = 'admin@fastcashflow.com'
  );

-- Admin pode atualizar empresas
CREATE POLICY "Admin can update companies"
  ON public.companies FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'admin@fastcashflow.com'
  );

-- Admin pode deletar empresas (via RPC)
CREATE POLICY "Admin can delete companies"
  ON public.companies FOR DELETE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'admin@fastcashflow.com'
  );

-- Empresas podem ver apenas seus próprios dados
CREATE POLICY "Companies can view own data"
  ON public.companies FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT id FROM public.companies 
      WHERE username = (auth.jwt() ->> 'email')::text
      OR email = (auth.jwt() ->> 'email')::text
    )
  );

-- =====================================================
-- POLICIES: company_requests
-- =====================================================

-- Qualquer um pode inserir solicitação (anon)
CREATE POLICY "Anyone can submit company request"
  ON public.company_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Admin pode ver todas as solicitações
CREATE POLICY "Admin can view all requests"
  ON public.company_requests FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'admin@fastcashflow.com'
  );

-- Admin pode atualizar solicitações
CREATE POLICY "Admin can update requests"
  ON public.company_requests FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'admin@fastcashflow.com'
  );

-- Admin pode deletar solicitações
CREATE POLICY "Admin can delete requests"
  ON public.company_requests FOR DELETE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'admin@fastcashflow.com'
  );

-- Qualquer um pode criar solicitação (cadastro público) - SEM AUTENTICAÇÃO
CREATE POLICY "Public can create requests"
  ON public.company_requests FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- POLICIES: transactions
-- =====================================================

-- Empresas podem ver apenas suas transações
CREATE POLICY "Companies can view own transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM public.companies 
      WHERE username ILIKE (auth.jwt() ->> 'email')::text
      OR email ILIKE (auth.jwt() ->> 'email')::text
    )
  );

-- Empresas podem inserir suas transações
CREATE POLICY "Companies can insert own transactions"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT id FROM public.companies 
      WHERE username ILIKE (auth.jwt() ->> 'email')::text
      OR email ILIKE (auth.jwt() ->> 'email')::text
    )
  );

-- Empresas podem atualizar suas transações
CREATE POLICY "Companies can update own transactions"
  ON public.transactions FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM public.companies 
      WHERE username ILIKE (auth.jwt() ->> 'email')::text
      OR email ILIKE (auth.jwt() ->> 'email')::text
    )
  );

-- Empresas podem deletar (soft) suas transações
CREATE POLICY "Companies can delete own transactions"
  ON public.transactions FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM public.companies 
      WHERE username ILIKE (auth.jwt() ->> 'email')::text
      OR email ILIKE (auth.jwt() ->> 'email')::text
    )
  );

-- Admin pode ver todas as transações
CREATE POLICY "Admin can view all transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'admin@fastcashflow.com'
  );

-- =====================================================
-- POLICIES: payments
-- =====================================================

-- Empresas podem ver apenas seus pagamentos
CREATE POLICY "Companies can view own payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM public.companies 
      WHERE username ILIKE (auth.jwt() ->> 'email')::text
      OR email ILIKE (auth.jwt() ->> 'email')::text
    )
  );

-- Admin pode ver todos os pagamentos
CREATE POLICY "Admin can view all payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'admin@fastcashflow.com'
  );

-- Admin pode inserir pagamentos
CREATE POLICY "Admin can insert payments"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'email' = 'admin@fastcashflow.com'
  );

-- =====================================================
-- 3. FUNCTIONS E STORED PROCEDURES
-- =====================================================

-- Remover funções antigas se existirem (para evitar conflitos de parâmetros)
DROP FUNCTION IF EXISTS delete_company_cascade(uuid);
DROP FUNCTION IF EXISTS approve_company_request(uuid, text, text);
DROP FUNCTION IF EXISTS check_trial_status(uuid);
DROP FUNCTION IF EXISTS update_expired_trials();

-- Function: Deletar empresa e todos os dados relacionados
CREATE OR REPLACE FUNCTION delete_company_cascade(target_company_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se é admin
  IF auth.jwt() ->> 'email' != 'admin@fastcashflow.com' THEN
    RAISE EXCEPTION 'Unauthorized: Only admin can delete companies';
  END IF;
  
  -- Deletar transações (CASCADE já faz isso, mas explícito para clareza)
  DELETE FROM public.transactions WHERE company_id = target_company_id;
  
  -- Deletar pagamentos
  DELETE FROM public.payments WHERE company_id = target_company_id;
  
  -- Deletar solicitações relacionadas
  DELETE FROM public.company_requests 
  WHERE approved_username IN (
    SELECT username FROM public.companies WHERE id = target_company_id
  );
  
  -- Deletar a empresa
  DELETE FROM public.companies WHERE id = target_company_id;
END;
$$;

-- Function: Aprovar empresa e iniciar trial
CREATE OR REPLACE FUNCTION approve_company_request(
  request_id UUID,
  approved_user TEXT,
  temp_pass TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_company_id UUID;
  req RECORD;
BEGIN
  -- Verificar se é admin
  IF auth.jwt() ->> 'email' != 'admin@fastcashflow.com' THEN
    RAISE EXCEPTION 'Unauthorized: Only admin can approve requests';
  END IF;
  
  -- Buscar a solicitação
  SELECT * INTO req FROM public.company_requests WHERE id = request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  
  -- Criar a empresa com trial de 30 dias
  INSERT INTO public.companies (
    name,
    username,
    email,
    phone,
    address,
    cnpj,
    founded_on,
    status,
    plan_type,
    trial_days,
    trial_start,
    trial_end
  ) VALUES (
    req.company_name,
    approved_user,
    req.email,
    req.phone,
    req.address,
    req.cnpj,
    req.founded_on,
    'trial',
    'trial',
    30,
    NOW(),
    NOW() + INTERVAL '30 days'
  ) RETURNING id INTO new_company_id;
  
  -- Atualizar a solicitação
  UPDATE public.company_requests
  SET 
    approved = true,
    approved_at = NOW(),
    approved_by = auth.jwt() ->> 'email',
    approved_username = approved_user,
    approved_temp_password = temp_pass,
    updated_at = NOW()
  WHERE id = request_id;
  
  RETURN new_company_id;
END;
$$;

-- Function: Verificar status de trial
CREATE OR REPLACE FUNCTION check_trial_status(target_company_id UUID)
RETURNS TABLE (
  is_expired BOOLEAN,
  days_remaining INTEGER,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  company RECORD;
BEGIN
  SELECT * INTO company FROM public.companies WHERE id = target_company_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Company not found';
  END IF;
  
  -- Se não está em trial, retornar status atual
  IF company.status != 'trial' THEN
    RETURN QUERY SELECT false, 0, company.status;
    RETURN;
  END IF;
  
  -- Calcular dias restantes
  RETURN QUERY SELECT 
    (NOW() > company.trial_end) AS is_expired,
    GREATEST(0, EXTRACT(DAY FROM (company.trial_end - NOW()))::INTEGER) AS days_remaining,
    company.status;
END;
$$;

-- Function: Atualizar status de empresas expiradas (executar diariamente)
CREATE OR REPLACE FUNCTION update_expired_trials()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.companies
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'trial' 
    AND trial_end < NOW()
    AND status != 'expired';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- =====================================================
-- 4. TRIGGERS
-- =====================================================

-- Trigger: Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_requests_updated_at
  BEFORE UPDATE ON public.company_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. DADOS INICIAIS (SEED)
-- =====================================================

-- Inserir admin user (se não existir)
INSERT INTO public.admin_users (username, email, role)
VALUES ('jonatas', 'admin@fastcashflow.com', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Inserir empresa FastSavorys (se não existir)
INSERT INTO public.companies (
  name,
  username,
  email,
  phone,
  status,
  plan_type,
  trial_days,
  trial_start,
  trial_end
) VALUES (
  'FastSavorys',
  'fastsavorys',
  'contato@fastsavorys.com',
  '',
  'active',
  'free',
  30,
  NOW(),
  NOW() + INTERVAL '365 days'
)
ON CONFLICT (username) DO NOTHING;

-- =====================================================
-- 6. GRANTS E PERMISSÕES
-- =====================================================

-- Garantir que authenticated pode executar as functions
GRANT EXECUTE ON FUNCTION delete_company_cascade TO authenticated;
GRANT EXECUTE ON FUNCTION approve_company_request TO authenticated;
GRANT EXECUTE ON FUNCTION check_trial_status TO authenticated;
GRANT EXECUTE ON FUNCTION update_expired_trials TO authenticated;

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================

-- Para verificar se tudo foi criado corretamente:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public';
-- SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';
