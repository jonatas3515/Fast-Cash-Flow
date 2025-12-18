-- =====================================================
-- FIX: RLS Policies for companies table to support company_requests authentication
-- =====================================================
-- This fix updates the RLS policies to allow companies to access their own data
-- when authenticated via company_requests.email (the app's authentication method)
-- =====================================================

-- Drop existing company policies
DROP POLICY IF EXISTS "Admin can view all companies" ON public.companies;
DROP POLICY IF EXISTS "Admin can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Admin can update companies" ON public.companies;
DROP POLICY IF EXISTS "Admin can delete companies" ON public.companies;
DROP POLICY IF EXISTS "Companies can view own data" ON public.companies;

-- Recreate policies with proper company_requests authentication support

-- Admin can view all companies
CREATE POLICY "Admin can view all companies"
  ON public.companies FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'admin@fastcashflow.com'
  );

-- Admin can insert companies
CREATE POLICY "Admin can insert companies"
  ON public.companies FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'email' = 'admin@fastcashflow.com'
  );

-- Admin can update companies
CREATE POLICY "Admin can update companies"
  ON public.companies FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'admin@fastcashflow.com'
  );

-- Admin can delete companies (via RPC)
CREATE POLICY "Admin can delete companies"
  ON public.companies FOR DELETE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'admin@fastcashflow.com'
  );

-- Companies can view their own data (supports both direct email match and company_requests authentication)
CREATE POLICY "Companies can view own data"
  ON public.companies FOR SELECT
  TO authenticated
  USING (
    -- Direct match with companies.email or companies.username
    id IN (
      SELECT id FROM public.companies 
      WHERE username = (auth.jwt() ->> 'email')::text
      OR email = (auth.jwt() ->> 'email')::text
    )
    OR
    -- Match via company_requests (app's authentication method)
    id IN (
      SELECT approved_company_id FROM public.company_requests 
      WHERE email = (auth.jwt() ->> 'email')::text
      AND approved = true
      AND approved_company_id IS NOT NULL
    )
  );

-- Companies can update their own data (supports both direct email match and company_requests authentication)
CREATE POLICY "Companies can update own data"
  ON public.companies FOR UPDATE
  TO authenticated
  WITH CHECK (
    -- Direct match with companies.email or companies.username
    id IN (
      SELECT id FROM public.companies 
      WHERE username = (auth.jwt() ->> 'email')::text
      OR email = (auth.jwt() ->> 'email')::text
    )
    OR
    -- Match via company_requests (app's authentication method)
    id IN (
      SELECT approved_company_id FROM public.company_requests 
      WHERE email = (auth.jwt() ->> 'email')::text
      AND approved = true
      AND approved_company_id IS NOT NULL
    )
  );

SELECT 'RLS policies updated to support company_requests authentication' as status;
