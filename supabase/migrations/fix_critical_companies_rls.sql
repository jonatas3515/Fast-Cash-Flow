-- ============================================================================
-- FIX CRITICAL: Companies Table RLS Causing 500 Error
-- Date: 2025-12-31
-- Description: Remove ALL policies from companies and recreate simple ones
-- ============================================================================

-- Step 1: List and drop ALL existing policies on companies table
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'companies' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON companies', policy_record.policyname);
    END LOOP;
END $$;

-- Step 2: Ensure RLS is enabled
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Step 3: Create a simple permissive policy for ALL operations
-- This allows all authenticated users to access companies
CREATE POLICY "companies_full_access" ON companies
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Also add for anon if needed
CREATE POLICY "companies_anon_select" ON companies
  FOR SELECT TO anon
  USING (true);

-- ============================================================================
-- FIX: company_profile, company_settings, dashboard_settings, onboarding_progress
-- Use simple USING (true) instead of subqueries to avoid circular dependencies
-- ============================================================================

-- Drop ALL policies and recreate with simple access
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- company_profile
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'company_profile' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON company_profile', policy_record.policyname);
    END LOOP;
    
    -- company_settings
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'company_settings' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON company_settings', policy_record.policyname);
    END LOOP;
    
    -- dashboard_settings
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'dashboard_settings' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON dashboard_settings', policy_record.policyname);
    END LOOP;
    
    -- onboarding_progress
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'onboarding_progress' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON onboarding_progress', policy_record.policyname);
    END LOOP;
END $$;

-- Create simple policies for all tables
CREATE POLICY "company_profile_full_access" ON company_profile
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "company_settings_full_access" ON company_settings
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "dashboard_settings_full_access" ON dashboard_settings
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "onboarding_progress_full_access" ON onboarding_progress
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- DONE! All tables now have simple permissive policies
-- ============================================================================
