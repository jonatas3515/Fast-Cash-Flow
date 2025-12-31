-- ============================================================================
-- Migration: Fix Function Search Path Security Warnings
-- Date: 2025-12-31
-- Description: Set immutable search_path for all functions to prevent injection
-- ============================================================================

-- The search_path should be set to an empty string or specific schemas
-- to prevent potential search path injection attacks

-- ============================================================================
-- Fix all functions with mutable search_path
-- ============================================================================

-- Calculate functions
ALTER FUNCTION public.calculate_balance SET search_path = '';
ALTER FUNCTION public.calculate_total_income SET search_path = '';
ALTER FUNCTION public.calculate_total_expenses SET search_path = '';
ALTER FUNCTION public.calculate_goal_progress SET search_path = '';
ALTER FUNCTION public.calculate_remaining_value SET search_path = '';
ALTER FUNCTION public.calculate_additional_users_cost SET search_path = '';

-- Updated_at trigger functions
ALTER FUNCTION public.update_team_members_updated_at SET search_path = '';
ALTER FUNCTION public.update_company_settings_updated_at SET search_path = '';
ALTER FUNCTION public.update_notification_settings_timestamp SET search_path = '';
ALTER FUNCTION public.update_orders_updated_at SET search_path = '';
ALTER FUNCTION public.update_clients_updated_at SET search_path = '';
ALTER FUNCTION public.update_receipts_updated_at SET search_path = '';
ALTER FUNCTION public.update_products_updated_at SET search_path = '';
ALTER FUNCTION public.update_onboarding_updated_at SET search_path = '';
ALTER FUNCTION public.update_updated_at_column SET search_path = '';
ALTER FUNCTION public.set_updated_at SET search_path = '';

-- User/Company functions
ALTER FUNCTION public.get_user_company_id SET search_path = '';
ALTER FUNCTION public.create_company_policies SET search_path = '';
ALTER FUNCTION public.provision_company SET search_path = '';
ALTER FUNCTION public.soft_delete_company SET search_path = '';
ALTER FUNCTION public.reactivate_company SET search_path = '';
ALTER FUNCTION public.cleanup_old_deleted_companies SET search_path = '';
ALTER FUNCTION public.delete_company_cascade SET search_path = '';
ALTER FUNCTION public.approve_company_request SET search_path = '';

-- Member functions
ALTER FUNCTION public.is_member SET search_path = '';
ALTER FUNCTION public.invite_company_member SET search_path = '';
ALTER FUNCTION public.accept_company_invite SET search_path = '';
ALTER FUNCTION public.check_permission SET search_path = '';
ALTER FUNCTION public.get_company_members SET search_path = '';

-- Auth functions
ALTER FUNCTION public.auth_is_admin SET search_path = '';

-- Onboarding/Trial functions
ALTER FUNCTION public.generate_personalized_offer SET search_path = '';
ALTER FUNCTION public.check_and_send_trial_notifications SET search_path = '';
ALTER FUNCTION public.trigger_update_onboarding_on_transaction SET search_path = '';
ALTER FUNCTION public.trigger_update_onboarding_on_goal SET search_path = '';
ALTER FUNCTION public.trigger_update_onboarding_on_recurring SET search_path = '';
ALTER FUNCTION public.update_onboarding_progress SET search_path = '';
ALTER FUNCTION public.update_expired_trials SET search_path = '';
ALTER FUNCTION public.check_trial_status SET search_path = '';
ALTER FUNCTION public.add_free_trial SET search_path = '';

-- Support functions
ALTER FUNCTION public.send_support_message SET search_path = '';
ALTER FUNCTION public.mark_messages_read SET search_path = '';
ALTER FUNCTION public.search_faq SET search_path = '';

-- Backup/Audit functions
ALTER FUNCTION public.create_company_backup SET search_path = '';
ALTER FUNCTION public.restore_company_backup SET search_path = '';
ALTER FUNCTION public.log_audit SET search_path = '';
ALTER FUNCTION public.create_security_alert SET search_path = '';
ALTER FUNCTION public.audit_transaction_changes SET search_path = '';

-- Webhook functions
ALTER FUNCTION public.log_webhook_call SET search_path = '';
ALTER FUNCTION public.get_webhooks_for_event SET search_path = '';

-- ============================================================================
-- Move pg_net extension from public to extensions schema (if exists)
-- Note: This may require superuser privileges
-- ============================================================================

-- First, ensure the extensions schema exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- Try to move the extension (this might fail if you don't have superuser access)
-- In that case, you'll need to run this in the Supabase Dashboard under Database > Extensions
DO $$ 
BEGIN
    -- This is informational - moving extensions requires superuser
    RAISE NOTICE 'To move pg_net extension from public to extensions schema:';
    RAISE NOTICE '1. Go to Supabase Dashboard > Database > Extensions';
    RAISE NOTICE '2. Or run: ALTER EXTENSION pg_net SET SCHEMA extensions;';
    RAISE NOTICE '   (requires superuser privileges)';
END $$;

-- ============================================================================
-- NOTE: auth_leaked_password_protection
-- This setting needs to be enabled in the Supabase Dashboard:
-- 1. Go to Authentication > Settings
-- 2. Enable "Leaked Password Protection"
-- ============================================================================

-- ============================================================================
-- DONE! Function search_path warnings should now be fixed.
-- ============================================================================
