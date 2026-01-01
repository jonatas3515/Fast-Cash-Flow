-- ============================================================================
-- URGENT FIX: Recursion in company_members RLS Policy
-- Date: 2026-01-01
-- Description: Fix infinite recursion in company_members policy
-- ============================================================================

-- The previous migration created a policy that referenced company_members
-- from within company_members, causing infinite recursion.

-- DROP the problematic policy
DROP POLICY IF EXISTS company_members_access ON company_members;

-- CREATE a fixed policy that doesn't self-reference
-- For company_members, users should be able to:
-- 1. See their own membership records (user_id = auth.uid())
-- 2. See other members in the same company (but we need a different approach to avoid recursion)

-- The trick is to NOT query company_members from within company_members policy
-- Instead, use a simple direct check on user_id

CREATE POLICY company_members_access ON company_members
  FOR ALL
  USING (
    -- User can see/manage their own membership record
    user_id = (select auth.uid())
    OR
    -- User can see other members from companies they belong to
    -- We use a subquery that gets company_id directly from the row being accessed
    -- and checks if the current user is a member of that company
    company_id IN (
      SELECT cm.company_id 
      FROM company_members cm 
      WHERE cm.user_id = (select auth.uid()) 
        AND cm.status = 'active'
    )
  )
  WITH CHECK (
    -- User can only modify their own membership
    user_id = (select auth.uid())
    OR
    -- Or they can manage members if they're in the same company
    company_id IN (
      SELECT cm.company_id 
      FROM company_members cm 
      WHERE cm.user_id = (select auth.uid()) 
        AND cm.status = 'active'
    )
  );

-- IMPORTANT: The above still has recursion because it queries company_members from company_members.
-- We need a completely different approach.

-- DROP it again
DROP POLICY IF EXISTS company_members_access ON company_members;

-- The correct approach: Use SECURITY DEFINER functions or a simpler policy
-- Since this is a self-referencing table, we need to either:
-- 1. Use a security definer function that bypasses RLS
-- 2. Use a simpler policy that doesn't require looking up company membership

-- SOLUTION: Create a helper function with SECURITY DEFINER that bypasses RLS
CREATE OR REPLACE FUNCTION get_user_company_ids(p_user_id UUID)
RETURNS TABLE(company_id UUID)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT company_id FROM company_members WHERE user_id = p_user_id AND status = 'active';
$$;

-- Now create the policy using this function
CREATE POLICY company_members_access ON company_members
  FOR ALL
  USING (
    -- User can see their own records
    user_id = (select auth.uid())
    OR
    -- User can see records from companies they belong to (using the function that bypasses RLS)
    company_id IN (SELECT company_id FROM get_user_company_ids((select auth.uid())))
  )
  WITH CHECK (
    user_id = (select auth.uid())
    OR
    company_id IN (SELECT company_id FROM get_user_company_ids((select auth.uid())))
  );

-- ============================================================================
-- Also fix other policies that depend on company_members to avoid similar issues
-- ============================================================================

-- Recreate helper function for use in all other policies
CREATE OR REPLACE FUNCTION get_user_companies()
RETURNS TABLE(company_id UUID)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active';
$$;

-- Check if admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT (auth.jwt() ->> 'email') = 'admin@fastcashflow.com';
$$;

-- Now update all problematic policies to use these functions instead
-- This avoids the recursion issue

-- Fix categories_access
DROP POLICY IF EXISTS categories_access ON categories;
CREATE POLICY categories_access ON categories
  FOR ALL
  USING (is_admin() OR company_id IN (SELECT company_id FROM get_user_companies()))
  WITH CHECK (is_admin() OR company_id IN (SELECT company_id FROM get_user_companies()));

-- Fix clients_access
DROP POLICY IF EXISTS clients_access ON clients;
CREATE POLICY clients_access ON clients
  FOR ALL
  USING (is_admin() OR company_id IN (SELECT company_id FROM get_user_companies()))
  WITH CHECK (is_admin() OR company_id IN (SELECT company_id FROM get_user_companies()));

-- Fix products_access
DROP POLICY IF EXISTS products_access ON products;
CREATE POLICY products_access ON products
  FOR ALL
  USING (is_admin() OR company_id IN (SELECT company_id FROM get_user_companies()))
  WITH CHECK (is_admin() OR company_id IN (SELECT company_id FROM get_user_companies()));

-- Fix orders_access
DROP POLICY IF EXISTS orders_access ON orders;
CREATE POLICY orders_access ON orders
  FOR ALL
  USING (is_admin() OR company_id IN (SELECT company_id FROM get_user_companies()))
  WITH CHECK (is_admin() OR company_id IN (SELECT company_id FROM get_user_companies()));

-- Fix debts_access
DROP POLICY IF EXISTS debts_access ON debts;
CREATE POLICY debts_access ON debts
  FOR ALL
  USING (is_admin() OR company_id IN (SELECT company_id FROM get_user_companies()))
  WITH CHECK (is_admin() OR company_id IN (SELECT company_id FROM get_user_companies()));

-- Fix recurring_expenses_access
DROP POLICY IF EXISTS recurring_expenses_access ON recurring_expenses;
CREATE POLICY recurring_expenses_access ON recurring_expenses
  FOR ALL
  USING (is_admin() OR company_id IN (SELECT company_id FROM get_user_companies()))
  WITH CHECK (is_admin() OR company_id IN (SELECT company_id FROM get_user_companies()));

-- Fix payments_access
DROP POLICY IF EXISTS payments_access ON payments;
CREATE POLICY payments_access ON payments
  FOR ALL
  USING (is_admin() OR company_id IN (SELECT company_id FROM get_user_companies()))
  WITH CHECK (is_admin() OR company_id IN (SELECT company_id FROM get_user_companies()));

-- Fix company_settings_access
DROP POLICY IF EXISTS company_settings_access ON company_settings;
CREATE POLICY company_settings_access ON company_settings
  FOR ALL
  USING (is_admin() OR company_id IN (SELECT company_id FROM get_user_companies()))
  WITH CHECK (is_admin() OR company_id IN (SELECT company_id FROM get_user_companies()));

-- Fix notification_logs_access
DROP POLICY IF EXISTS notification_logs_access ON notification_logs;
CREATE POLICY notification_logs_access ON notification_logs
  FOR ALL
  USING (is_admin() OR company_id IN (SELECT company_id FROM get_user_companies()));

-- Fix notification_settings_access
DROP POLICY IF EXISTS notification_settings_access ON notification_settings;
CREATE POLICY notification_settings_access ON notification_settings
  FOR ALL
  USING (is_admin() OR company_id IN (SELECT company_id FROM get_user_companies()))
  WITH CHECK (is_admin() OR company_id IN (SELECT company_id FROM get_user_companies()));

-- Fix company_backups_access
DROP POLICY IF EXISTS company_backups_access ON company_backups;
CREATE POLICY company_backups_access ON company_backups
  FOR ALL
  USING (is_admin() OR company_id IN (SELECT company_id FROM get_user_companies()))
  WITH CHECK (is_admin() OR company_id IN (SELECT company_id FROM get_user_companies()));

-- Fix company_invites_access
DROP POLICY IF EXISTS company_invites_access ON company_invites;
CREATE POLICY company_invites_access ON company_invites
  FOR ALL
  USING (
    company_id IN (SELECT company_id FROM get_user_companies())
    OR email = (select auth.jwt()) ->> 'email'
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM get_user_companies())
  );

-- Fix automation_rules_access
DROP POLICY IF EXISTS automation_rules_access ON automation_rules;
CREATE POLICY automation_rules_access ON automation_rules
  FOR ALL
  USING (company_id IN (SELECT company_id FROM get_user_companies()))
  WITH CHECK (company_id IN (SELECT company_id FROM get_user_companies()));

-- Fix import_logs_access
DROP POLICY IF EXISTS import_logs_access ON import_logs;
CREATE POLICY import_logs_access ON import_logs
  FOR ALL
  USING (company_id IN (SELECT company_id FROM get_user_companies()))
  WITH CHECK (company_id IN (SELECT company_id FROM get_user_companies()));

-- Fix integration_settings_access
DROP POLICY IF EXISTS integration_settings_access ON integration_settings;
CREATE POLICY integration_settings_access ON integration_settings
  FOR ALL
  USING (company_id IN (SELECT company_id FROM get_user_companies()))
  WITH CHECK (company_id IN (SELECT company_id FROM get_user_companies()));

-- Fix admin_messages_access
DROP POLICY IF EXISTS admin_messages_access ON admin_messages;
CREATE POLICY admin_messages_access ON admin_messages
  FOR ALL
  USING (
    is_admin()
    OR company_id IN (SELECT company_id FROM get_user_companies())
    OR is_broadcast = true
  )
  WITH CHECK (
    is_admin()
    OR company_id IN (SELECT company_id FROM get_user_companies())
  );

-- Fix team_members policies
DROP POLICY IF EXISTS team_members_company_access ON team_members;
CREATE POLICY team_members_company_access ON team_members
  FOR ALL
  USING (company_id IN (SELECT company_id FROM get_user_companies()))
  WITH CHECK (company_id IN (SELECT company_id FROM get_user_companies()));

-- Fix trial_notifications policies
DROP POLICY IF EXISTS trial_notifications_company_access ON trial_notifications;
CREATE POLICY trial_notifications_company_access ON trial_notifications
  FOR ALL
  USING (company_id IN (SELECT company_id FROM get_user_companies()))
  WITH CHECK (company_id IN (SELECT company_id FROM get_user_companies()));

-- Fix trial_offers policies
DROP POLICY IF EXISTS trial_offers_company_access ON trial_offers;
CREATE POLICY trial_offers_company_access ON trial_offers
  FOR ALL
  USING (company_id IN (SELECT company_id FROM get_user_companies()))
  WITH CHECK (company_id IN (SELECT company_id FROM get_user_companies()));

-- Fix support_conversations policies
DROP POLICY IF EXISTS support_conversations_company_access ON support_conversations;
CREATE POLICY support_conversations_company_access ON support_conversations
  FOR ALL
  USING (company_id IN (SELECT company_id FROM get_user_companies()))
  WITH CHECK (company_id IN (SELECT company_id FROM get_user_companies()));

-- Fix support_messages policies  
DROP POLICY IF EXISTS support_messages_company_access ON support_messages;
CREATE POLICY support_messages_company_access ON support_messages
  FOR ALL
  USING (company_id IN (SELECT company_id FROM get_user_companies()))
  WITH CHECK (company_id IN (SELECT company_id FROM get_user_companies()));

-- Fix webhooks policies
DROP POLICY IF EXISTS webhooks_company_access ON webhooks;
CREATE POLICY webhooks_company_access ON webhooks
  FOR ALL
  USING (company_id IN (SELECT company_id FROM get_user_companies()))
  WITH CHECK (company_id IN (SELECT company_id FROM get_user_companies()));

-- Fix webhook_logs policies
DROP POLICY IF EXISTS webhook_logs_company_access ON webhook_logs;
CREATE POLICY webhook_logs_company_access ON webhook_logs
  FOR ALL
  USING (company_id IN (SELECT company_id FROM get_user_companies()));

-- Fix security_alerts policies
DROP POLICY IF EXISTS security_alerts_company_access ON security_alerts;
CREATE POLICY security_alerts_company_access ON security_alerts
  FOR ALL
  USING (
    company_id IS NULL OR
    company_id IN (SELECT company_id FROM get_user_companies())
  )
  WITH CHECK (
    company_id IS NULL OR
    company_id IN (SELECT company_id FROM get_user_companies())
  );

-- Fix product_ingredients policies
DROP POLICY IF EXISTS product_ingredients_company_access ON product_ingredients;
CREATE POLICY product_ingredients_company_access ON product_ingredients
  FOR ALL
  USING (
    product_id IN (
      SELECT p.id FROM products p
      WHERE p.company_id IN (SELECT company_id FROM get_user_companies())
    )
  )
  WITH CHECK (
    product_id IN (
      SELECT p.id FROM products p
      WHERE p.company_id IN (SELECT company_id FROM get_user_companies())
    )
  );

-- ============================================================================
-- DONE! All recursion issues should now be fixed.
-- ============================================================================

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION get_user_company_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_companies() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
