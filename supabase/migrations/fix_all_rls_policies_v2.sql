-- ============================================================================
-- Migration: Fix ALL RLS Policy Access Issues - V2 (Complete Fix)
-- Date: 2025-12-31
-- Description: Remove ALL existing policies and create new ones based on owner_id
-- ============================================================================

-- The problem: Multiple conflicting policies exist on tables.
-- Some policies use username/email checks, others use company_members.
-- This script removes ALL policies and creates simple, working ones.

-- ============================================================================
-- PART 1: Fix company_profile policies
-- ============================================================================

-- Drop ALL existing policies on company_profile
DROP POLICY IF EXISTS "Admin can view all company profiles" ON company_profile;
DROP POLICY IF EXISTS "Admin can insert company profiles" ON company_profile;
DROP POLICY IF EXISTS "Admin can update company profiles" ON company_profile;
DROP POLICY IF EXISTS "Admin can delete company profiles" ON company_profile;
DROP POLICY IF EXISTS "Companies can view own profile" ON company_profile;
DROP POLICY IF EXISTS "Companies can insert own profile" ON company_profile;
DROP POLICY IF EXISTS "Companies can update own profile" ON company_profile;
DROP POLICY IF EXISTS "Companies can delete own profile" ON company_profile;
DROP POLICY IF EXISTS "company_profile_select" ON company_profile;
DROP POLICY IF EXISTS "company_profile_insert" ON company_profile;
DROP POLICY IF EXISTS "company_profile_update" ON company_profile;
DROP POLICY IF EXISTS "Allow select for authenticated users" ON company_profile;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON company_profile;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON company_profile;

-- Create simple policies based on company ownership
CREATE POLICY "company_profile_access" ON company_profile
  FOR ALL TO authenticated
  USING (
    company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  );

-- ============================================================================
-- PART 2: Fix company_settings policies
-- ============================================================================

DROP POLICY IF EXISTS "Allow select for authenticated users" ON company_settings;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON company_settings;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON company_settings;
DROP POLICY IF EXISTS "company_settings_select" ON company_settings;
DROP POLICY IF EXISTS "company_settings_insert" ON company_settings;
DROP POLICY IF EXISTS "company_settings_update" ON company_settings;
DROP POLICY IF EXISTS "Users can view their own company settings" ON company_settings;
DROP POLICY IF EXISTS "Users can update their own company settings" ON company_settings;
DROP POLICY IF EXISTS "Users can insert their own company settings" ON company_settings;

CREATE POLICY "company_settings_access" ON company_settings
  FOR ALL TO authenticated
  USING (
    company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  );

-- ============================================================================
-- PART 3: Fix dashboard_settings policies
-- ============================================================================

DROP POLICY IF EXISTS "Allow all for dashboard_settings" ON dashboard_settings;
DROP POLICY IF EXISTS "Users can view their own dashboard settings" ON dashboard_settings;
DROP POLICY IF EXISTS "Users can insert their own dashboard settings" ON dashboard_settings;
DROP POLICY IF EXISTS "Users can update their own dashboard settings" ON dashboard_settings;
DROP POLICY IF EXISTS "dashboard_settings_select" ON dashboard_settings;
DROP POLICY IF EXISTS "dashboard_settings_insert" ON dashboard_settings;
DROP POLICY IF EXISTS "dashboard_settings_update" ON dashboard_settings;

CREATE POLICY "dashboard_settings_access" ON dashboard_settings
  FOR ALL TO authenticated
  USING (
    company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  );

-- ============================================================================
-- PART 4: Fix onboarding_progress policies
-- ============================================================================

DROP POLICY IF EXISTS "onboarding_select_policy" ON onboarding_progress;
DROP POLICY IF EXISTS "onboarding_insert_policy" ON onboarding_progress;
DROP POLICY IF EXISTS "onboarding_update_policy" ON onboarding_progress;
DROP POLICY IF EXISTS "onboarding_delete_policy" ON onboarding_progress;
DROP POLICY IF EXISTS "onboarding_progress_select" ON onboarding_progress;
DROP POLICY IF EXISTS "onboarding_progress_insert" ON onboarding_progress;
DROP POLICY IF EXISTS "onboarding_progress_update" ON onboarding_progress;

CREATE POLICY "onboarding_progress_access" ON onboarding_progress
  FOR ALL TO authenticated
  USING (
    company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  );

-- ============================================================================
-- DONE! All policies now use simple owner_id check from companies table
-- ============================================================================
