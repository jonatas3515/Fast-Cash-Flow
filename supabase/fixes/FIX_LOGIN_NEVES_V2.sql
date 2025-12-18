-- =====================================================
-- FIX DE LOGIN URGENTE - NEVES & COSTA (V2 - FINAL)
-- =====================================================
-- Data: 2024-12-11
-- Versão: 2.0 (Nomes de colunas corrigidos)
-- =====================================================

DO $$ 
DECLARE
    v_company_id UUID;
    v_target_username TEXT := 'nevescosta';
    v_target_password TEXT := 'nevescosta';
BEGIN
    -- 1. Identificar a empresa correta
    SELECT id INTO v_company_id
    FROM public.companies
    WHERE name ILIKE '%Neves%' OR username ILIKE '%neves%'
    LIMIT 1;

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION '❌ Empresa Neves & Costa não encontrada!';
    END IF;

    -- 2. Corrigir o Username na tabela COMPANIES
    UPDATE public.companies
    SET username = v_target_username
    WHERE id = v_company_id;
    
    RAISE NOTICE '✅ Companies: Username corrigido para "%"', v_target_username;

    -- 3. Corrigir/Criar registro de Login na tabela COMPANY_REQUESTS
    -- Limpar duplicatas anteriores para evitar conflito
    DELETE FROM public.company_requests 
    WHERE approved_username ILIKE v_target_username AND approved_company_id != v_company_id;

    IF EXISTS (SELECT 1 FROM public.company_requests WHERE approved_company_id = v_company_id) THEN
        UPDATE public.company_requests
        SET 
            approved_username = v_target_username,
            permanent_password = v_target_password,
            temp_password = NULL,
            status = 'approved',
            approved = true,
            approved_at = NOW()
        WHERE approved_company_id = v_company_id;
        RAISE NOTICE '✅ Login atualizado para ID %', v_company_id;
    ELSE
        INSERT INTO public.company_requests (
            company_name,      -- CORRIGIDO (era companyname)
            owner_name,        -- CAMPO OBRIGATÓRIO (adicionado)
            email, 
            phone, 
            status, 
            approved, 
            approved_username, 
            permanent_password, 
            approved_company_id,
            created_at,        -- CORRIGIDO (era request_date)
            approved_at        -- CORRIGIDO (era approvedat)
        ) VALUES (
            'Neves & Costa',
            'Proprietário Neves',
            'nevesecosta@fastcashflow.com',
            '00000000000', 
            'approved', 
            true, 
            v_target_username, 
            v_target_password, 
            v_company_id,
            NOW(),
            NOW()
        );
        RAISE NOTICE '✅ Login criado para ID %', v_company_id;
    END IF;

    RAISE NOTICE '--- PRONTO ---';
    RAISE NOTICE 'Usuário: %', v_target_username;
    RAISE NOTICE 'Senha:   %', v_target_password;

END $$;
