-- ============================================================================
-- Migration: Fix Supabase Performance Issues
-- Date: 2026-01-01
-- Description: Optimize RLS policies, remove duplicate indexes, fix function security
-- ============================================================================

-- ============================================================================
-- PART 1: FIX UPDATE_UPDATED_AT_COLUMN FUNCTION (Security - search_path)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- PART 2: DROP DUPLICATE INDEXES
-- ============================================================================

-- Note: Using IF EXISTS for safety
DROP INDEX IF EXISTS idx_debts_company_id;  -- Keep idx_debts_company
DROP INDEX IF EXISTS idx_debts_dates;       -- Keep idx_debts_date  
DROP INDEX IF EXISTS idx_orders_company_id; -- Keep idx_orders_company
DROP INDEX IF EXISTS idx_products_company_id; -- Keep idx_products_company

-- ============================================================================
-- PART 3: ADD MISSING FK INDEXES (optional - INFO level)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_admin_messages_admin_user_id ON admin_messages(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_company_invites_role_id ON company_invites(role_id);
CREATE INDEX IF NOT EXISTS idx_company_members_role_id ON company_members(role_id);
CREATE INDEX IF NOT EXISTS idx_contextual_help_faq_article_id ON contextual_help(faq_article_id);
CREATE INDEX IF NOT EXISTS idx_contextual_help_video_tutorial_id ON contextual_help(video_tutorial_id);

-- ============================================================================
-- PART 4: OPTIMIZE RLS POLICIES - Replace auth.uid() with (select auth.uid())
-- ============================================================================
-- This prevents per-row re-evaluation of auth functions

-- ---------------------------------------------------------------------------
-- 4.1 team_members optimized policy
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS team_members_company_access ON team_members;
CREATE POLICY team_members_company_access ON team_members
  FOR ALL
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active'))
  WITH CHECK (company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active'));

-- ---------------------------------------------------------------------------
-- 4.2 trial_notifications optimized policy
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS trial_notifications_company_access ON trial_notifications;
CREATE POLICY trial_notifications_company_access ON trial_notifications
  FOR ALL
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active'))
  WITH CHECK (company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active'));

-- ---------------------------------------------------------------------------
-- 4.3 user_sessions optimized policy
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS user_sessions_own_access ON user_sessions;
CREATE POLICY user_sessions_own_access ON user_sessions
  FOR ALL
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 4.4 product_ingredients optimized policy
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS product_ingredients_company_access ON product_ingredients;
CREATE POLICY product_ingredients_company_access ON product_ingredients
  FOR ALL
  USING (
    product_id IN (
      SELECT p.id FROM products p
      WHERE p.company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active')
    )
  )
  WITH CHECK (
    product_id IN (
      SELECT p.id FROM products p
      WHERE p.company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active')
    )
  );

-- ---------------------------------------------------------------------------
-- 4.5 support_conversations optimized policy
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS support_conversations_company_access ON support_conversations;
CREATE POLICY support_conversations_company_access ON support_conversations
  FOR ALL
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active'))
  WITH CHECK (company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active'));

-- ---------------------------------------------------------------------------
-- 4.6 user_roles optimized policy
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS user_roles_read_access ON user_roles;
CREATE POLICY user_roles_read_access ON user_roles
  FOR SELECT
  USING ((select auth.role()) = 'authenticated');

-- ---------------------------------------------------------------------------
-- 4.7 trial_offers optimized policy
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS trial_offers_company_access ON trial_offers;
CREATE POLICY trial_offers_company_access ON trial_offers
  FOR ALL
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active'))
  WITH CHECK (company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active'));

-- ---------------------------------------------------------------------------
-- 4.8 support_messages optimized policy
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS support_messages_company_access ON support_messages;
CREATE POLICY support_messages_company_access ON support_messages
  FOR ALL
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active'))
  WITH CHECK (company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active'));

-- ---------------------------------------------------------------------------
-- 4.9 notification_templates optimized policy
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS notification_templates_read_access ON notification_templates;
CREATE POLICY notification_templates_read_access ON notification_templates
  FOR SELECT
  USING ((select auth.role()) = 'authenticated');

-- ---------------------------------------------------------------------------
-- 4.10 webhooks optimized policy
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS webhooks_company_access ON webhooks;
CREATE POLICY webhooks_company_access ON webhooks
  FOR ALL
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active'))
  WITH CHECK (company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active'));

-- ---------------------------------------------------------------------------
-- 4.11 webhook_logs optimized policy
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS webhook_logs_company_access ON webhook_logs;
CREATE POLICY webhook_logs_company_access ON webhook_logs
  FOR ALL
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active'));

-- ---------------------------------------------------------------------------
-- 4.12 video_tutorials optimized policy
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS video_tutorials_read_access ON video_tutorials;
CREATE POLICY video_tutorials_read_access ON video_tutorials
  FOR SELECT
  USING ((select auth.role()) = 'authenticated');

-- ---------------------------------------------------------------------------
-- 4.13 security_alerts optimized policy
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS security_alerts_company_access ON security_alerts;
CREATE POLICY security_alerts_company_access ON security_alerts
  FOR ALL
  USING (
    company_id IS NULL OR
    company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active')
  )
  WITH CHECK (
    company_id IS NULL OR
    company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active')
  );

-- ============================================================================
-- PART 5: CONSOLIDATE MULTIPLE PERMISSIVE POLICIES
-- ============================================================================
-- Merge admin + user policies into single optimized policies

-- ---------------------------------------------------------------------------
-- 5.1 payments - consolidate policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Companies can view own payments" ON payments;
DROP POLICY IF EXISTS "Admin can view all payments" ON payments;
DROP POLICY IF EXISTS "Admin can insert payments" ON payments;

CREATE POLICY payments_access ON payments
  FOR ALL
  USING (
    -- Admin access (check email from JWT)
    (select auth.jwt()) ->> 'email' = 'admin@fastcashflow.com'
    OR
    -- Company member access
    company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active')
  )
  WITH CHECK (
    (select auth.jwt()) ->> 'email' = 'admin@fastcashflow.com'
    OR
    company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active')
  );

-- ---------------------------------------------------------------------------
-- 5.2 recurring_expenses - consolidate policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their company recurring_expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can insert their company recurring_expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can update their company recurring_expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can delete their company recurring_expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Admin full access recurring_expenses" ON recurring_expenses;

CREATE POLICY recurring_expenses_access ON recurring_expenses
  FOR ALL
  USING (
    (select auth.jwt()) ->> 'email' = 'admin@fastcashflow.com'
    OR
    company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active')
  )
  WITH CHECK (
    (select auth.jwt()) ->> 'email' = 'admin@fastcashflow.com'
    OR
    company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active')
  );

-- ---------------------------------------------------------------------------
-- 5.3 debts - consolidate policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their company debts" ON debts;
DROP POLICY IF EXISTS "Users can insert their company debts" ON debts;
DROP POLICY IF EXISTS "Users can update their company debts" ON debts;
DROP POLICY IF EXISTS "Users can delete their company debts" ON debts;
DROP POLICY IF EXISTS "Admin full access debts" ON debts;

CREATE POLICY debts_access ON debts
  FOR ALL
  USING (
    (select auth.jwt()) ->> 'email' = 'admin@fastcashflow.com'
    OR
    company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active')
  )
  WITH CHECK (
    (select auth.jwt()) ->> 'email' = 'admin@fastcashflow.com'
    OR
    company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active')
  );

-- ---------------------------------------------------------------------------
-- 5.4 orders - consolidate policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their company orders" ON orders;
DROP POLICY IF EXISTS "Users can insert their company orders" ON orders;
DROP POLICY IF EXISTS "Users can update their company orders" ON orders;
DROP POLICY IF EXISTS "Users can delete their company orders" ON orders;
DROP POLICY IF EXISTS "Admin full access orders" ON orders;

CREATE POLICY orders_access ON orders
  FOR ALL
  USING (
    (select auth.jwt()) ->> 'email' = 'admin@fastcashflow.com'
    OR
    company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active')
  )
  WITH CHECK (
    (select auth.jwt()) ->> 'email' = 'admin@fastcashflow.com'
    OR
    company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active')
  );

-- ---------------------------------------------------------------------------
-- 5.5 products - consolidate policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their company products" ON products;
DROP POLICY IF EXISTS "Users can insert their company products" ON products;
DROP POLICY IF EXISTS "Users can update their company products" ON products;
DROP POLICY IF EXISTS "Users can delete their company products" ON products;
DROP POLICY IF EXISTS "Admin full access products" ON products;

CREATE POLICY products_access ON products
  FOR ALL
  USING (
    (select auth.jwt()) ->> 'email' = 'admin@fastcashflow.com'
    OR
    company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active')
  )
  WITH CHECK (
    (select auth.jwt()) ->> 'email' = 'admin@fastcashflow.com'
    OR
    company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active')
  );

-- ---------------------------------------------------------------------------
-- 5.6 clients - consolidate policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their company clients" ON clients;
DROP POLICY IF EXISTS "Users can insert their company clients" ON clients;
DROP POLICY IF EXISTS "Users can update their company clients" ON clients;
DROP POLICY IF EXISTS "Users can delete their company clients" ON clients;
DROP POLICY IF EXISTS "Admin full access clients" ON clients;

CREATE POLICY clients_access ON clients
  FOR ALL
  USING (
    (select auth.jwt()) ->> 'email' = 'admin@fastcashflow.com'
    OR
    company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active')
  )
  WITH CHECK (
    (select auth.jwt()) ->> 'email' = 'admin@fastcashflow.com'
    OR
    company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active')
  );

-- ---------------------------------------------------------------------------
-- 5.7 categories - consolidate policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their company categories" ON categories;
DROP POLICY IF EXISTS "Users can insert their company categories" ON categories;
DROP POLICY IF EXISTS "Users can update their company categories" ON categories;
DROP POLICY IF EXISTS "Users can delete their company categories" ON categories;
DROP POLICY IF EXISTS "Admin full access categories" ON categories;

CREATE POLICY categories_access ON categories
  FOR ALL
  USING (
    (select auth.jwt()) ->> 'email' = 'admin@fastcashflow.com'
    OR
    company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active')
  )
  WITH CHECK (
    (select auth.jwt()) ->> 'email' = 'admin@fastcashflow.com'
    OR
    company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active')
  );

-- ---------------------------------------------------------------------------
-- 5.8 admin_messages - consolidate policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view messages for their company" ON admin_messages;
DROP POLICY IF EXISTS "Admins can insert messages" ON admin_messages;
DROP POLICY IF EXISTS "Users can update read status" ON admin_messages;

CREATE POLICY admin_messages_access ON admin_messages
  FOR ALL
  USING (
    (select auth.jwt()) ->> 'email' = 'admin@fastcashflow.com'
    OR
    company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active')
    OR
    is_broadcast = true
  )
  WITH CHECK (
    (select auth.jwt()) ->> 'email' = 'admin@fastcashflow.com'
    OR
    company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active')
  );

-- ---------------------------------------------------------------------------
-- 5.9 message_templates - consolidate policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage templates" ON message_templates;
DROP POLICY IF EXISTS "Anyone can view templates" ON message_templates;

CREATE POLICY message_templates_access ON message_templates
  FOR ALL
  USING (true)  -- Anyone can read
  WITH CHECK ((select auth.jwt()) ->> 'email' = 'admin@fastcashflow.com'); -- Only admin can write

-- ---------------------------------------------------------------------------
-- 5.10 company_requests - consolidate policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS admin_policy_company_requests ON company_requests;
DROP POLICY IF EXISTS public_insert_company_requests ON company_requests;
DROP POLICY IF EXISTS "Allow public read for approved requests" ON company_requests;

CREATE POLICY company_requests_access ON company_requests
  FOR ALL
  USING (
    (select auth.jwt()) ->> 'email' = 'admin@fastcashflow.com'
    OR approved = true
  )
  WITH CHECK (true); -- Anyone can submit requests

-- ---------------------------------------------------------------------------
-- 5.11 company_settings - consolidate policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS company_settings_full_access ON company_settings;
DROP POLICY IF EXISTS company_settings_policy ON company_settings;

CREATE POLICY company_settings_access ON company_settings
  FOR ALL
  USING (
    (select auth.jwt()) ->> 'email' = 'admin@fastcashflow.com'
    OR
    company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active')
  )
  WITH CHECK (
    (select auth.jwt()) ->> 'email' = 'admin@fastcashflow.com'
    OR
    company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active')
  );

-- ---------------------------------------------------------------------------
-- 5.12 contextual_help - consolidate policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin can manage contextual_help" ON contextual_help;
DROP POLICY IF EXISTS "Anyone can view contextual_help" ON contextual_help;

CREATE POLICY contextual_help_access ON contextual_help
  FOR ALL
  USING (true) -- Anyone can read
  WITH CHECK ((select auth.jwt()) ->> 'email' = 'admin@fastcashflow.com'); -- Only admin can write

-- ---------------------------------------------------------------------------
-- 5.13 faq_articles - consolidate policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin can manage faq_articles" ON faq_articles;
DROP POLICY IF EXISTS "Anyone can view faq_articles" ON faq_articles;

CREATE POLICY faq_articles_access ON faq_articles
  FOR ALL
  USING (true) -- Anyone can read
  WITH CHECK ((select auth.jwt()) ->> 'email' = 'admin@fastcashflow.com'); -- Only admin can write

-- ---------------------------------------------------------------------------
-- 5.14 landing_settings - consolidate policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated manage" ON landing_settings;
DROP POLICY IF EXISTS "Allow public read published" ON landing_settings;

CREATE POLICY landing_settings_access ON landing_settings
  FOR ALL
  USING (true)
  WITH CHECK ((select auth.jwt()) ->> 'email' = 'admin@fastcashflow.com');

-- ---------------------------------------------------------------------------
-- 5.15 notification_logs - consolidate policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow all for authenticated on notification_logs" ON notification_logs;
DROP POLICY IF EXISTS "Users can view own company logs" ON notification_logs;

CREATE POLICY notification_logs_access ON notification_logs
  FOR ALL
  USING (
    (select auth.jwt()) ->> 'email' = 'admin@fastcashflow.com'
    OR
    company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active')
  );

-- ---------------------------------------------------------------------------
-- 5.16 notification_settings - consolidate policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow all for authenticated on notification_settings" ON notification_settings;
DROP POLICY IF EXISTS notification_settings_policy ON notification_settings;

CREATE POLICY notification_settings_access ON notification_settings
  FOR ALL
  USING (
    (select auth.jwt()) ->> 'email' = 'admin@fastcashflow.com'
    OR
    company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active')
  )
  WITH CHECK (
    (select auth.jwt()) ->> 'email' = 'admin@fastcashflow.com'
    OR
    company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active')
  );

-- ---------------------------------------------------------------------------
-- 5.17 company_backups - consolidate policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin can manage company_backups" ON company_backups;
DROP POLICY IF EXISTS "Users can view own company_backups" ON company_backups;

CREATE POLICY company_backups_access ON company_backups
  FOR ALL
  USING (
    (select auth.jwt()) ->> 'email' = 'admin@fastcashflow.com'
    OR
    company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active')
  )
  WITH CHECK (
    (select auth.jwt()) ->> 'email' = 'admin@fastcashflow.com'
    OR
    company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active')
  );

-- ---------------------------------------------------------------------------
-- 5.18 company_invites - consolidate policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own company_invites" ON company_invites;
DROP POLICY IF EXISTS "Users can view own company_invites" ON company_invites;

CREATE POLICY company_invites_access ON company_invites
  FOR ALL
  USING (
    company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active')
    OR email = (select auth.jwt()) ->> 'email'
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active')
  );

-- ---------------------------------------------------------------------------
-- 5.19 company_members - consolidate policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own company_members" ON company_members;
DROP POLICY IF EXISTS "Users can view own company_members" ON company_members;

CREATE POLICY company_members_access ON company_members
  FOR ALL
  USING (
    company_id IN (SELECT company_id FROM company_members cm2 WHERE cm2.user_id = (select auth.uid()) AND cm2.status = 'active')
    OR user_id = (select auth.uid())
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM company_members cm2 WHERE cm2.user_id = (select auth.uid()) AND cm2.status = 'active')
  );

-- ---------------------------------------------------------------------------
-- 5.20 automation_rules - consolidate policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own company rules" ON automation_rules;
DROP POLICY IF EXISTS "Users can insert own company rules" ON automation_rules;
DROP POLICY IF EXISTS "Users can update own company rules" ON automation_rules;
DROP POLICY IF EXISTS "Users can delete own company rules" ON automation_rules;

CREATE POLICY automation_rules_access ON automation_rules
  FOR ALL
  USING (
    company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active')
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active')
  );

-- ---------------------------------------------------------------------------
-- 5.21 backup_restorations - consolidate policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin can manage backup_restorations" ON backup_restorations;

CREATE POLICY backup_restorations_access ON backup_restorations
  FOR ALL
  USING ((select auth.jwt()) ->> 'email' = 'admin@fastcashflow.com')
  WITH CHECK ((select auth.jwt()) ->> 'email' = 'admin@fastcashflow.com');

-- ---------------------------------------------------------------------------
-- 5.22 import_logs - consolidate policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own import_logs" ON import_logs;
DROP POLICY IF EXISTS "Users can insert own import_logs" ON import_logs;

CREATE POLICY import_logs_access ON import_logs
  FOR ALL
  USING (
    company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active')
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active')
  );

-- ---------------------------------------------------------------------------
-- 5.23 integration_settings - consolidate policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own integration_settings" ON integration_settings;

CREATE POLICY integration_settings_access ON integration_settings
  FOR ALL
  USING (
    company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active')
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND status = 'active')
  );

-- ---------------------------------------------------------------------------
-- 5.24 known_devices - consolidate policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own known_devices" ON known_devices;

CREATE POLICY known_devices_access ON known_devices
  FOR ALL
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 5.25 admin_users - consolidate policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin can manage admin_users" ON admin_users;

CREATE POLICY admin_users_access ON admin_users
  FOR ALL
  USING ((select auth.jwt()) ->> 'email' = 'admin@fastcashflow.com')
  WITH CHECK ((select auth.jwt()) ->> 'email' = 'admin@fastcashflow.com');

-- ---------------------------------------------------------------------------
-- 5.26 audit_logs - consolidate policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin can view audit_logs" ON audit_logs;

CREATE POLICY audit_logs_access ON audit_logs
  FOR SELECT
  USING ((select auth.jwt()) ->> 'email' = 'admin@fastcashflow.com');

-- ============================================================================
-- DONE! All performance issues should now be fixed.
-- ============================================================================

-- Verification query (run after migration):
-- SELECT policyname, tablename FROM pg_policies 
-- WHERE schemaname = 'public' 
--   AND (qual::text LIKE '%auth.uid()%' OR qual::text LIKE '%auth.jwt()%')
--   AND qual::text NOT LIKE '%(select auth.uid())%'
--   AND qual::text NOT LIKE '%(select auth.jwt())%';
-- Should return 0 rows
