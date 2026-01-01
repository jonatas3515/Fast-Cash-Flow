-- ============================================================================
-- FIX: Problemas de Performance do Supabase Linter
-- Execute no SQL Editor do Supabase
-- ============================================================================

-- PARTE 1: Corrigir company_settings policy (usar SELECT para auth.uid())
-- ============================================================================

-- Drop a policy antiga
DROP POLICY IF EXISTS "company_settings_all_access" ON public.company_settings;

-- Criar nova policy OTIMIZADA com (select auth.uid()) em vez de auth.uid()
CREATE POLICY "company_settings_all_access"
ON public.company_settings
FOR ALL
TO authenticated
USING (
  company_id IN (
    SELECT cm.company_id 
    FROM public.company_members cm 
    WHERE cm.user_id = (SELECT auth.uid()) AND cm.status = 'active'
  )
)
WITH CHECK (
  company_id IN (
    SELECT cm.company_id 
    FROM public.company_members cm 
    WHERE cm.user_id = (SELECT auth.uid()) AND cm.status = 'active'
  )
);

-- PARTE 2: Remover índices não utilizados (opcional, mas recomendado)
-- ============================================================================
-- AVISO: Execute apenas se você tem certeza que esses índices não são necessários
-- Se preferir, pode executar em partes

-- team_members
DROP INDEX IF EXISTS idx_team_members_email;
DROP INDEX IF EXISTS idx_team_members_status;

-- companies
DROP INDEX IF EXISTS idx_companies_deleted_at;
DROP INDEX IF EXISTS idx_companies_userid;

-- support_messages / conversations
DROP INDEX IF EXISTS idx_support_messages_created;
DROP INDEX IF EXISTS idx_support_conv_unread;
DROP INDEX IF EXISTS idx_support_conv_last;

-- company_requests
DROP INDEX IF EXISTS idx_company_requests_approved_at;
DROP INDEX IF EXISTS idx_company_requests_approved_created;
DROP INDEX IF EXISTS idx_company_requests_rejected_at;

-- admin_messages
DROP INDEX IF EXISTS idx_admin_messages_company_id;
DROP INDEX IF EXISTS idx_admin_messages_broadcast;
DROP INDEX IF EXISTS idx_admin_messages_read;
DROP INDEX IF EXISTS idx_admin_messages_created;
DROP INDEX IF EXISTS idx_admin_messages_admin_user_id;

-- receipts / receipt_items
DROP INDEX IF EXISTS idx_receipts_number;
DROP INDEX IF EXISTS idx_receipts_client;
DROP INDEX IF EXISTS idx_receipts_status;
DROP INDEX IF EXISTS idx_receipts_created;
DROP INDEX IF EXISTS idx_receipts_deleted;
DROP INDEX IF EXISTS idx_receipt_items_product;

-- onboarding_progress
DROP INDEX IF EXISTS idx_onboarding_completion;
DROP INDEX IF EXISTS idx_onboarding_completed;

-- trial_notifications / trial_offers
DROP INDEX IF EXISTS idx_trial_notif_company;
DROP INDEX IF EXISTS idx_trial_notif_type;
DROP INDEX IF EXISTS idx_trial_notif_sent;
DROP INDEX IF EXISTS idx_trial_offers_type;
DROP INDEX IF EXISTS idx_trial_offers_valid;

-- landing_settings
DROP INDEX IF EXISTS idx_landing_settings_status;

-- debts
DROP INDEX IF EXISTS idx_debts_date;

-- orders
DROP INDEX IF EXISTS idx_orders_delivery_date;
DROP INDEX IF EXISTS idx_orders_company;
DROP INDEX IF EXISTS idx_orders_deleted;

-- receivables / payables / payments
DROP INDEX IF EXISTS idx_receivables_due_date;
DROP INDEX IF EXISTS idx_payables_due_date;
DROP INDEX IF EXISTS idx_payments_date;

-- categories
DROP INDEX IF EXISTS idx_categories_type;

-- recurring_expenses
DROP INDEX IF EXISTS idx_recurring_expenses_start_date;

-- products
DROP INDEX IF EXISTS idx_products_company;
DROP INDEX IF EXISTS idx_products_name;
DROP INDEX IF EXISTS idx_products_code;
DROP INDEX IF EXISTS idx_products_barcode;
DROP INDEX IF EXISTS idx_products_status;
DROP INDEX IF EXISTS idx_products_deleted;
DROP INDEX IF EXISTS idx_products_production_date;
DROP INDEX IF EXISTS idx_products_category;

-- company_invites
DROP INDEX IF EXISTS idx_invites_email;
DROP INDEX IF EXISTS idx_invites_token;
DROP INDEX IF EXISTS idx_invites_status;
DROP INDEX IF EXISTS idx_invites_company;
DROP INDEX IF EXISTS idx_company_invites_role_id;

-- faq_articles
DROP INDEX IF EXISTS idx_faq_category;
DROP INDEX IF EXISTS idx_faq_active;
DROP INDEX IF EXISTS idx_faq_keywords;

-- video_tutorials
DROP INDEX IF EXISTS idx_tutorials_key;
DROP INDEX IF EXISTS idx_tutorials_screen;

-- contextual_help
DROP INDEX IF EXISTS idx_contextual_screen;
DROP INDEX IF EXISTS idx_contextual_active;
DROP INDEX IF EXISTS idx_contextual_help_faq_article_id;
DROP INDEX IF EXISTS idx_contextual_help_video_tutorial_id;

-- company_backups / backup_restorations
DROP INDEX IF EXISTS idx_backups_company;
DROP INDEX IF EXISTS idx_backups_type;
DROP INDEX IF EXISTS idx_backups_status;
DROP INDEX IF EXISTS idx_backups_created;
DROP INDEX IF EXISTS idx_backups_expires;
DROP INDEX IF EXISTS idx_restorations_backup;
DROP INDEX IF EXISTS idx_restorations_company;

-- audit_logs
DROP INDEX IF EXISTS idx_audit_company;
DROP INDEX IF EXISTS idx_audit_user;
DROP INDEX IF EXISTS idx_audit_action;
DROP INDEX IF EXISTS idx_audit_entity;
DROP INDEX IF EXISTS idx_audit_ip;

-- security_alerts
DROP INDEX IF EXISTS idx_alerts_company;
DROP INDEX IF EXISTS idx_alerts_type;
DROP INDEX IF EXISTS idx_alerts_severity;
DROP INDEX IF EXISTS idx_alerts_status;
DROP INDEX IF EXISTS idx_alerts_created;

-- known_devices
DROP INDEX IF EXISTS idx_devices_user;
DROP INDEX IF EXISTS idx_devices_company;
DROP INDEX IF EXISTS idx_devices_fingerprint;

-- company_members
DROP INDEX IF EXISTS idx_members_company;
DROP INDEX IF EXISTS idx_members_email;
DROP INDEX IF EXISTS idx_company_members_role_id;

-- user_sessions
DROP INDEX IF EXISTS idx_sessions_user;
DROP INDEX IF EXISTS idx_sessions_company;
DROP INDEX IF EXISTS idx_sessions_token;
DROP INDEX IF EXISTS idx_sessions_active;

-- notification_logs / scheduled_notifications
DROP INDEX IF EXISTS idx_notification_logs_company;
DROP INDEX IF EXISTS idx_notification_logs_created;
DROP INDEX IF EXISTS idx_scheduled_notifications_pending;
DROP INDEX IF EXISTS idx_scheduled_notifications_company;

-- webhooks / webhook_logs
DROP INDEX IF EXISTS idx_webhooks_company;
DROP INDEX IF EXISTS idx_webhooks_active;
DROP INDEX IF EXISTS idx_webhooks_events;
DROP INDEX IF EXISTS idx_webhook_logs_webhook;
DROP INDEX IF EXISTS idx_webhook_logs_company;
DROP INDEX IF EXISTS idx_webhook_logs_status;
DROP INDEX IF EXISTS idx_webhook_logs_created;

-- import_logs
DROP INDEX IF EXISTS idx_imports_company;
DROP INDEX IF EXISTS idx_imports_status;
DROP INDEX IF EXISTS idx_imports_type;

-- integration_settings
DROP INDEX IF EXISTS idx_integration_company;

-- automation_rules
DROP INDEX IF EXISTS idx_automation_rules_trigger;

-- clients
DROP INDEX IF EXISTS idx_clients_name;
DROP INDEX IF EXISTS idx_clients_cpf_cnpj;
DROP INDEX IF EXISTS idx_clients_deleted;

-- Verificação final
SELECT 'Performance fixes aplicados com sucesso!' as resultado;
