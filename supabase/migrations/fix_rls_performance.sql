-- =============================================
-- Fix RLS Performance Issues
-- Consolidates duplicate policies and optimizes auth function calls
-- Execute in Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. FIX: recurring_expenses - auth_rls_initplan + multiple policies
-- recurring_expenses.company_id is TEXT
-- =============================================

-- Drop duplicate policies
DROP POLICY IF EXISTS "allow_authenticated_all" ON public.recurring_expenses;
DROP POLICY IF EXISTS "recurring_expenses_access" ON public.recurring_expenses;
DROP POLICY IF EXISTS "recurring_expenses_all" ON public.recurring_expenses;

-- Create single optimized policy using (select auth.uid()) pattern
CREATE POLICY "recurring_expenses_policy" ON public.recurring_expenses
  FOR ALL
  TO authenticated
  USING (company_id IN (
    SELECT id::text FROM public.companies WHERE userid = (SELECT auth.uid()::text)
  ))
  WITH CHECK (company_id IN (
    SELECT id::text FROM public.companies WHERE userid = (SELECT auth.uid()::text)
  ));

-- =============================================
-- 2. FIX: categories - multiple policies
-- categories.company_id is TEXT
-- =============================================

DROP POLICY IF EXISTS "allow_authenticated_all" ON public.categories;
DROP POLICY IF EXISTS "categories_access" ON public.categories;

CREATE POLICY "categories_policy" ON public.categories
  FOR ALL
  TO authenticated
  USING (company_id IN (
    SELECT id::text FROM public.companies WHERE userid = (SELECT auth.uid()::text)
  ))
  WITH CHECK (company_id IN (
    SELECT id::text FROM public.companies WHERE userid = (SELECT auth.uid()::text)
  ));

-- =============================================
-- 3. FIX: onboarding_progress - multiple policies
-- onboarding_progress.company_id is TEXT
-- =============================================

DROP POLICY IF EXISTS "allow_authenticated_all" ON public.onboarding_progress;
DROP POLICY IF EXISTS "onboarding_progress_full_access" ON public.onboarding_progress;

CREATE POLICY "onboarding_progress_policy" ON public.onboarding_progress
  FOR ALL
  TO authenticated
  USING (company_id IN (
    SELECT id::text FROM public.companies WHERE userid = (SELECT auth.uid()::text)
  ))
  WITH CHECK (company_id IN (
    SELECT id::text FROM public.companies WHERE userid = (SELECT auth.uid()::text)
  ));

-- =============================================
-- 4. FIX: admin_messages - multiple policies
-- admin_messages.target_company_id is TEXT (based on context)
-- =============================================

DROP POLICY IF EXISTS "admin_messages_access" ON public.admin_messages;
DROP POLICY IF EXISTS "admin_messages_insert" ON public.admin_messages;
DROP POLICY IF EXISTS "admin_messages_select" ON public.admin_messages;
DROP POLICY IF EXISTS "admin_messages_update" ON public.admin_messages;

-- Admin messages: Admin pode tudo, empresa vê suas próprias mensagens
CREATE POLICY "admin_messages_policy" ON public.admin_messages
  FOR ALL
  TO authenticated
  USING (
    -- Admin (quem possui empresa com nome especial)
    EXISTS (SELECT 1 FROM public.companies WHERE userid = (SELECT auth.uid()::text) AND name ILIKE '%fastsavorys%')
    OR
    -- Company sees its own messages  
    company_id IN (SELECT id FROM public.companies WHERE userid = (SELECT auth.uid()::text))
    OR
    is_broadcast = true
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.companies WHERE userid = (SELECT auth.uid()::text) AND name ILIKE '%fastsavorys%')
  );

-- =============================================
-- 5. FIX: message_templates - multiple policies
-- =============================================

DROP POLICY IF EXISTS "message_templates_access" ON public.message_templates;
DROP POLICY IF EXISTS "message_templates_select" ON public.message_templates;

CREATE POLICY "message_templates_policy" ON public.message_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- =============================================
-- 6. FIX: support_conversations - multiple policies
-- support_conversations.company_id is UUID (per create_support_system.sql)
-- =============================================

DROP POLICY IF EXISTS "support_conversations_all" ON public.support_conversations;
DROP POLICY IF EXISTS "support_conversations_company_access" ON public.support_conversations;
DROP POLICY IF EXISTS "support_conversations_select" ON public.support_conversations;

CREATE POLICY "support_conversations_policy" ON public.support_conversations
  FOR ALL
  TO authenticated
  USING (
    company_id IN (SELECT id FROM public.companies WHERE userid = (SELECT auth.uid()::text))
    OR
    EXISTS (SELECT 1 FROM public.companies WHERE userid = (SELECT auth.uid()::text) AND name ILIKE '%fastsavorys%')
  )
  WITH CHECK (
    company_id IN (SELECT id FROM public.companies WHERE userid = (SELECT auth.uid()::text))
    OR
    EXISTS (SELECT 1 FROM public.companies WHERE userid = (SELECT auth.uid()::text) AND name ILIKE '%fastsavorys%')
  );

-- =============================================
-- 7. FIX: support_messages - multiple policies
-- support_messages.company_id is UUID (per create_support_system.sql)
-- =============================================

DROP POLICY IF EXISTS "support_messages_company_access" ON public.support_messages;
DROP POLICY IF EXISTS "support_messages_insert" ON public.support_messages;
DROP POLICY IF EXISTS "support_messages_select" ON public.support_messages;
DROP POLICY IF EXISTS "support_messages_update" ON public.support_messages;

CREATE POLICY "support_messages_policy" ON public.support_messages
  FOR ALL
  TO authenticated
  USING (
    company_id IN (SELECT id FROM public.companies WHERE userid = (SELECT auth.uid()::text))
    OR
    EXISTS (SELECT 1 FROM public.companies WHERE userid = (SELECT auth.uid()::text) AND name ILIKE '%fastsavorys%')
  )
  WITH CHECK (
    company_id IN (SELECT id FROM public.companies WHERE userid = (SELECT auth.uid()::text))
    OR
    EXISTS (SELECT 1 FROM public.companies WHERE userid = (SELECT auth.uid()::text) AND name ILIKE '%fastsavorys%')
  );

-- =============================================
-- DONE - All policies consolidated and optimized
-- =============================================
