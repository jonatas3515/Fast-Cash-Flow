-- ============================================================================
-- Migration: Fix RLS Security Issues
-- Date: 2025-12-31
-- Description: Enable RLS on all tables and fix SECURITY DEFINER views
-- ============================================================================

-- ============================================================================
-- PART 1: Enable RLS on tables that have policies but RLS is disabled
-- ============================================================================

-- Tables with policies but RLS disabled
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 2: Enable RLS on additional public tables without RLS
-- ============================================================================

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_tutorials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 3: Create basic RLS policies for tables that need them
-- ============================================================================

-- team_members policies (has company_id column)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'team_members' AND policyname = 'team_members_company_access') THEN
        CREATE POLICY team_members_company_access ON public.team_members
            FOR ALL
            USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND status = 'active'))
            WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND status = 'active'));
    END IF;
END $$;

-- trial_notifications policies (has company_id)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trial_notifications' AND policyname = 'trial_notifications_company_access') THEN
        CREATE POLICY trial_notifications_company_access ON public.trial_notifications
            FOR ALL
            USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND status = 'active'))
            WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND status = 'active'));
    END IF;
END $$;

-- user_sessions policies (has user_id column)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_sessions' AND policyname = 'user_sessions_own_access') THEN
        CREATE POLICY user_sessions_own_access ON public.user_sessions
            FOR ALL
            USING (user_id = auth.uid())
            WITH CHECK (user_id = auth.uid());
    END IF;
END $$;

-- product_ingredients policies (has product_id -> products.company_id)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_ingredients' AND policyname = 'product_ingredients_company_access') THEN
        CREATE POLICY product_ingredients_company_access ON public.product_ingredients
            FOR ALL
            USING (
                product_id IN (
                    SELECT p.id FROM public.products p
                    WHERE p.company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND status = 'active')
                )
            )
            WITH CHECK (
                product_id IN (
                    SELECT p.id FROM public.products p
                    WHERE p.company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND status = 'active')
                )
            );
    END IF;
END $$;

-- support_conversations policies (has company_id)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'support_conversations' AND policyname = 'support_conversations_company_access') THEN
        CREATE POLICY support_conversations_company_access ON public.support_conversations
            FOR ALL
            USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND status = 'active'))
            WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND status = 'active'));
    END IF;
END $$;

-- user_roles policies (all authenticated users can read roles, they are system definitions)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'user_roles_read_access') THEN
        CREATE POLICY user_roles_read_access ON public.user_roles
            FOR SELECT
            USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- trial_offers policies (has company_id)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trial_offers' AND policyname = 'trial_offers_company_access') THEN
        CREATE POLICY trial_offers_company_access ON public.trial_offers
            FOR ALL
            USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND status = 'active'))
            WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND status = 'active'));
    END IF;
END $$;

-- support_messages policies (has company_id directly!)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'support_messages' AND policyname = 'support_messages_company_access') THEN
        CREATE POLICY support_messages_company_access ON public.support_messages
            FOR ALL
            USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND status = 'active'))
            WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND status = 'active'));
    END IF;
END $$;

-- notification_templates policies (all authenticated users can read)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notification_templates' AND policyname = 'notification_templates_read_access') THEN
        CREATE POLICY notification_templates_read_access ON public.notification_templates
            FOR SELECT
            USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- webhooks policies (has company_id)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'webhooks' AND policyname = 'webhooks_company_access') THEN
        CREATE POLICY webhooks_company_access ON public.webhooks
            FOR ALL
            USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND status = 'active'))
            WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND status = 'active'));
    END IF;
END $$;

-- webhook_logs policies (has company_id directly)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'webhook_logs' AND policyname = 'webhook_logs_company_access') THEN
        CREATE POLICY webhook_logs_company_access ON public.webhook_logs
            FOR ALL
            USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND status = 'active'));
    END IF;
END $$;

-- video_tutorials policies (all authenticated users can read - public content)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'video_tutorials' AND policyname = 'video_tutorials_read_access') THEN
        CREATE POLICY video_tutorials_read_access ON public.video_tutorials
            FOR SELECT
            USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- security_alerts policies (has company_id, nullable)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'security_alerts' AND policyname = 'security_alerts_company_access') THEN
        CREATE POLICY security_alerts_company_access ON public.security_alerts
            FOR ALL
            USING (
                company_id IS NULL OR
                company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND status = 'active')
            )
            WITH CHECK (
                company_id IS NULL OR
                company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND status = 'active')
            );
    END IF;
END $$;

-- ============================================================================
-- PART 4: Fix SECURITY DEFINER views by setting SECURITY INVOKER
-- ============================================================================

ALTER VIEW public.v_pending_invites SET (security_invoker = on);
ALTER VIEW public.v_webhooks_stats SET (security_invoker = on);
ALTER VIEW public.v_recent_imports SET (security_invoker = on);
ALTER VIEW public.v_recent_activity SET (security_invoker = on);
ALTER VIEW public.v_pending_alerts SET (security_invoker = on);
ALTER VIEW public.v_active_offers SET (security_invoker = on);
ALTER VIEW public.v_company_members_detail SET (security_invoker = on);
ALTER VIEW public.v_onboarding_summary SET (security_invoker = on);
ALTER VIEW public.v_company_backups_summary SET (security_invoker = on);
ALTER VIEW public.v_faq_popular SET (security_invoker = on);
ALTER VIEW public.v_company_user_costs SET (security_invoker = on);
ALTER VIEW public.v_support_conversations SET (security_invoker = on);

-- ============================================================================
-- DONE! All RLS security issues should now be fixed.
-- ============================================================================
