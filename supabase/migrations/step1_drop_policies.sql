-- =============================================
-- PASSO 1: Dropar policies duplicadas
-- Execute este script PRIMEIRO no Supabase SQL Editor
-- =============================================

-- recurring_expenses
DROP POLICY IF EXISTS "allow_authenticated_all" ON public.recurring_expenses;
DROP POLICY IF EXISTS "recurring_expenses_access" ON public.recurring_expenses;
DROP POLICY IF EXISTS "recurring_expenses_all" ON public.recurring_expenses;
DROP POLICY IF EXISTS "recurring_expenses_policy" ON public.recurring_expenses;

-- categories
DROP POLICY IF EXISTS "allow_authenticated_all" ON public.categories;
DROP POLICY IF EXISTS "categories_access" ON public.categories;
DROP POLICY IF EXISTS "categories_policy" ON public.categories;

-- onboarding_progress
DROP POLICY IF EXISTS "allow_authenticated_all" ON public.onboarding_progress;
DROP POLICY IF EXISTS "onboarding_progress_full_access" ON public.onboarding_progress;
DROP POLICY IF EXISTS "onboarding_progress_policy" ON public.onboarding_progress;

-- admin_messages
DROP POLICY IF EXISTS "admin_messages_access" ON public.admin_messages;
DROP POLICY IF EXISTS "admin_messages_insert" ON public.admin_messages;
DROP POLICY IF EXISTS "admin_messages_select" ON public.admin_messages;
DROP POLICY IF EXISTS "admin_messages_update" ON public.admin_messages;
DROP POLICY IF EXISTS "admin_messages_policy" ON public.admin_messages;

-- message_templates
DROP POLICY IF EXISTS "message_templates_access" ON public.message_templates;
DROP POLICY IF EXISTS "message_templates_select" ON public.message_templates;
DROP POLICY IF EXISTS "message_templates_policy" ON public.message_templates;

-- support_conversations
DROP POLICY IF EXISTS "support_conversations_all" ON public.support_conversations;
DROP POLICY IF EXISTS "support_conversations_company_access" ON public.support_conversations;
DROP POLICY IF EXISTS "support_conversations_select" ON public.support_conversations;
DROP POLICY IF EXISTS "support_conversations_policy" ON public.support_conversations;

-- support_messages
DROP POLICY IF EXISTS "support_messages_company_access" ON public.support_messages;
DROP POLICY IF EXISTS "support_messages_insert" ON public.support_messages;
DROP POLICY IF EXISTS "support_messages_select" ON public.support_messages;
DROP POLICY IF EXISTS "support_messages_update" ON public.support_messages;
DROP POLICY IF EXISTS "support_messages_policy" ON public.support_messages;

SELECT 'Policies duplicadas removidas com sucesso!' AS resultado;
