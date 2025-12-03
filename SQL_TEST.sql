-- ============================================================================
-- FAST CASH FLOW - SQL DE TESTE E VERIFICAÇÃO
-- ============================================================================

-- 1. Verificar se empresa administradora existe
SELECT 'Empresa Admin' as tipo, id, name, username, deleted_at 
FROM public.companies 
WHERE name = 'fastcashflow' OR username = 'fastcashflow';

-- 2. Verificar se tabelas foram criadas
SELECT 'Tabelas Criadas' as tipo, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('transactions', 'financial_goals', 'dashboard_settings')
ORDER BY table_name;

-- 3. Verificar se RLS está habilitado
SELECT 'RLS Status' as tipo, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('transactions', 'financial_goals', 'dashboard_settings');

-- 4. Inserir dados de teste (se não existirem)
DO $$
DECLARE
  v_company_id UUID;
  v_transactions_count INT;
BEGIN
  -- Obter ID da empresa admin
  SELECT id INTO v_company_id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Empresa administradora não encontrada!';
  END IF;
  
  -- Verificar se já há transações
  SELECT COUNT(*) INTO v_transactions_count 
  FROM public.transactions 
  WHERE company_id = v_company_id;
  
  -- Se não há transações, inserir dados de teste
  IF v_transactions_count = 0 THEN
    -- Inserir transações
    INSERT INTO public.transactions (company_id, type, description, amount_cents, category, date)
    VALUES 
      (v_company_id, 'entrada', 'Venda de produto A', 500000, 'vendas', CURRENT_DATE - INTERVAL '5 days'),
      (v_company_id, 'entrada', 'Venda de produto B', 750000, 'vendas', CURRENT_DATE - INTERVAL '3 days'),
      (v_company_id, 'entrada', 'Consultoria', 300000, 'serviços', CURRENT_DATE - INTERVAL '1 day'),
      (v_company_id, 'saída', 'Pagamento de fornecedor X', 200000, 'fornecedor', CURRENT_DATE - INTERVAL '4 days'),
      (v_company_id, 'saída', 'Aluguel do escritório', 150000, 'aluguel', CURRENT_DATE - INTERVAL '2 days'),
      (v_company_id, 'saída', 'Contas de luz', 80000, 'utilidades', CURRENT_DATE);
    
    RAISE NOTICE 'Transações de teste inseridas: 6 registros';
  ELSE
    RAISE NOTICE 'Já existem % transações na empresa admin', v_transactions_count;
  END IF;
  
  -- Inserir meta financeira (se não existir)
  INSERT INTO public.financial_goals (company_id, month, target_amount_cents, description)
  VALUES 
    (v_company_id, DATE_TRUNC('month', CURRENT_DATE)::DATE, 2000000, 'Meta de vendas para este mês')
  ON CONFLICT (company_id, month) DO NOTHING;
  
  -- Inserir configurações do dashboard (se não existirem)
  INSERT INTO public.dashboard_settings (company_id, default_period, alert_debt_threshold_cents, goal_alert_threshold_percent)
  VALUES 
    (v_company_id, 'month', 50000000, 50)
  ON CONFLICT (company_id) DO NOTHING;
  
END $$;

-- 5. Verificar dados inseridos
SELECT 'Transações Inseridas' as tipo, COUNT(*) as quantidade 
FROM public.transactions 
WHERE company_id = (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1)
AND deleted_at IS NULL;

SELECT 'Meta Financeira' as tipo, target_amount_cents, description 
FROM public.financial_goals 
WHERE company_id = (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1);

SELECT 'Configurações Dashboard' as tipo, default_period, alert_debt_threshold_cents, goal_alert_threshold_percent 
FROM public.dashboard_settings 
WHERE company_id = (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1);

-- 6. Testar funções de cálculo
SELECT 'Cálculo Saldo' as tipo, 
       calculate_balance(
         (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1),
         CURRENT_DATE - INTERVAL '30 days',
         CURRENT_DATE
       ) as saldo_em_centavos;

SELECT 'Cálculo Entradas' as tipo,
       calculate_total_income(
         (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1),
         CURRENT_DATE - INTERVAL '30 days',
         CURRENT_DATE
       ) as entradas_em_centavos;

SELECT 'Cálculo Saídas' as tipo,
       calculate_total_expenses(
         (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1),
         CURRENT_DATE - INTERVAL '30 days',
         CURRENT_DATE
       ) as saidas_em_centavos;

-- 7. Simular dados do dashboard (o que o app vai mostrar)
SELECT 'Dashboard - Resumo' as tipo,
       'Entradas' as metrica,
       SUM(CASE WHEN type = 'entrada' THEN amount_cents ELSE 0 END) as valor_centavos
FROM public.transactions 
WHERE company_id = (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1)
  AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
  AND deleted_at IS NULL
UNION ALL
SELECT 'Dashboard - Resumo' as tipo,
       'Saídas' as metrica,
       SUM(CASE WHEN type = 'saída' THEN amount_cents ELSE 0 END) as valor_centavos
FROM public.transactions 
WHERE company_id = (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1)
  AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
  AND deleted_at IS NULL
UNION ALL
SELECT 'Dashboard - Resumo' as tipo,
       'Saldo' as metrica,
       SUM(CASE WHEN type = 'entrada' THEN amount_cents ELSE -amount_cents END) as valor_centavos
FROM public.transactions 
WHERE company_id = (SELECT id FROM public.companies WHERE name = 'fastcashflow' LIMIT 1)
  AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
  AND deleted_at IS NULL;

-- 8. Verificar se as implementações (telas) estão visíveis no código
-- Isso é só para você verificar manualmente no projeto:
-- - src/screens/DashboardScreen.tsx deve existir
-- - src/repositories/financial_goals.ts deve existir  
-- - src/repositories/dashboard_settings.ts deve existir
-- - src/navigation/Tabs.tsx deve ter DashboardScreen importado
-- - src/navigation/AdminTabs.tsx deve ter DashboardScreen importado

-- Mensagem final
DO $$
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'TESTE E VERIFICAÇÃO CONCLUÍDO!';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '1. Verifique se empresa administradora foi encontrada';
  RAISE NOTICE '2. Verifique se todas as 3 tabelas foram criadas';
  RAISE NOTICE '3. Verifique se RLS está habilitado';
  RAISE NOTICE '4. Verifique se dados de teste foram inseridos';
  RAISE NOTICE '5. Verifique se funções de cálculo retornam valores';
  RAISE NOTICE '6. Verifique se dashboard mostra dados corretamente';
  RAISE NOTICE '============================================================================';
END $$;
