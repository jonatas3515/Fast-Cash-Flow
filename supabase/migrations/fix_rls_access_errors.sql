-- ============================================================================
-- Migration: Fix RLS Policy Access Issues
-- Date: 2025-12-31
-- Description: Fix 401/406 errors by ensuring proper RLS policies allow access
-- ============================================================================

-- The problem: After enabling RLS, tables are blocking access because
-- the user may not have proper company_members association.
-- 
-- Solution: Create permissive policies that allow authenticated users
-- to access data for companies they own or are members of.

-- ============================================================================
-- PART 1: Fix company_settings policies
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Allow select for authenticated users" ON company_settings;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON company_settings;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON company_settings;
DROP POLICY IF EXISTS "company_settings_select" ON company_settings;
DROP POLICY IF EXISTS "company_settings_insert" ON company_settings;
DROP POLICY IF EXISTS "company_settings_update" ON company_settings;

-- Create new permissive policies
-- Users can access settings for companies they own OR are members of
CREATE POLICY "company_settings_select" ON company_settings
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
      UNION
      SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "company_settings_insert" ON company_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
      UNION
      SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "company_settings_update" ON company_settings
  FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
      UNION
      SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- ============================================================================
-- PART 2: Fix company_profile policies
-- ============================================================================

DROP POLICY IF EXISTS "company_profile_select" ON company_profile;
DROP POLICY IF EXISTS "company_profile_insert" ON company_profile;
DROP POLICY IF EXISTS "company_profile_update" ON company_profile;
DROP POLICY IF EXISTS "Allow select for authenticated users" ON company_profile;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON company_profile;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON company_profile;

CREATE POLICY "company_profile_select" ON company_profile
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
      UNION
      SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "company_profile_insert" ON company_profile
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
      UNION
      SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "company_profile_update" ON company_profile
  FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
      UNION
      SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active'
    )
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

CREATE POLICY "dashboard_settings_select" ON dashboard_settings
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
      UNION
      SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "dashboard_settings_insert" ON dashboard_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
      UNION
      SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "dashboard_settings_update" ON dashboard_settings
  FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
      UNION
      SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active'
    )
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

CREATE POLICY "onboarding_progress_select" ON onboarding_progress
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
      UNION
      SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "onboarding_progress_insert" ON onboarding_progress
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
      UNION
      SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "onboarding_progress_update" ON onboarding_progress
  FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
      UNION
      SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- ============================================================================
-- PART 5: Ensure company owner is automatically a member
-- This is the root cause - if owner is not in company_members, they can't access
-- ============================================================================

-- First, ensure 'owner' role exists (using DO block to avoid constraint issues)
DO $$
DECLARE
  v_owner_role_id UUID;
BEGIN
  -- Check if 'owner' role exists (by key, not name)
  SELECT id INTO v_owner_role_id FROM user_roles WHERE key = 'owner' LIMIT 1;
  
  -- If not, create it (key is required and unique)
  IF v_owner_role_id IS NULL THEN
    INSERT INTO user_roles (key, name, description, permissions, is_system_role)
    VALUES ('owner', 'Proprietário', 'Proprietário da empresa', '{"all": true}'::jsonb, true)
    RETURNING id INTO v_owner_role_id;
  END IF;
  
  -- Add owners to company_members if not already there
  -- Need to include email from auth.users and name from companies
  INSERT INTO company_members (company_id, user_id, role_id, status, email, name, invited_by, accepted_at)
  SELECT 
    c.id,
    c.owner_id,
    v_owner_role_id,
    'active',
    u.email,
    COALESCE(c.name, 'Proprietário'),
    c.owner_id,
    NOW()
  FROM companies c
  JOIN auth.users u ON u.id = c.owner_id
  WHERE c.owner_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM company_members cm 
    WHERE cm.company_id = c.id 
    AND cm.user_id = c.owner_id
  );
END $$;

-- ============================================================================
-- DONE! RLS policies should now allow proper access.
-- ============================================================================
