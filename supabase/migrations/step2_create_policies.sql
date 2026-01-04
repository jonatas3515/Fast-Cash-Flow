-- =============================================
-- PASSO 2: Criar policies consolidadas e otimizadas
-- Execute DEPOIS do step1_drop_policies.sql
-- =============================================

-- 1. recurring_expenses (company_id é TEXT)
CREATE POLICY "recurring_expenses_policy" ON public.recurring_expenses
  FOR ALL TO authenticated
  USING (company_id::uuid IN (SELECT id FROM public.companies WHERE userid = (SELECT auth.uid())))
  WITH CHECK (company_id::uuid IN (SELECT id FROM public.companies WHERE userid = (SELECT auth.uid())));

-- 2. categories (company_id é TEXT)
CREATE POLICY "categories_policy" ON public.categories
  FOR ALL TO authenticated
  USING (company_id::uuid IN (SELECT id FROM public.companies WHERE userid = (SELECT auth.uid())))
  WITH CHECK (company_id::uuid IN (SELECT id FROM public.companies WHERE userid = (SELECT auth.uid())));

-- 3. onboarding_progress (company_id é TEXT)
CREATE POLICY "onboarding_progress_policy" ON public.onboarding_progress
  FOR ALL TO authenticated
  USING (company_id::uuid IN (SELECT id FROM public.companies WHERE userid = (SELECT auth.uid())))
  WITH CHECK (company_id::uuid IN (SELECT id FROM public.companies WHERE userid = (SELECT auth.uid())));

-- 4. admin_messages (company_id é UUID)
CREATE POLICY "admin_messages_policy" ON public.admin_messages
  FOR ALL TO authenticated
  USING (
    company_id IN (SELECT id FROM public.companies WHERE userid = (SELECT auth.uid()))
    OR is_broadcast = true
  )
  WITH CHECK (true);

-- 5. message_templates (todos podem ler)
CREATE POLICY "message_templates_policy" ON public.message_templates
  FOR SELECT TO authenticated
  USING (true);

-- 6. support_conversations (company_id é UUID)
CREATE POLICY "support_conversations_policy" ON public.support_conversations
  FOR ALL TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE userid = (SELECT auth.uid())))
  WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE userid = (SELECT auth.uid())));

-- 7. support_messages (company_id é UUID)
CREATE POLICY "support_messages_policy" ON public.support_messages
  FOR ALL TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE userid = (SELECT auth.uid())))
  WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE userid = (SELECT auth.uid())));

SELECT 'Policies criadas com sucesso!' AS resultado;
