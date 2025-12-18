-- =====================================================
-- FIX URGENTE: RECUPERAÇÃO NEVES & COSTA
-- =====================================================

DO $$ 
DECLARE
    v_company_id UUID;
    v_user_id UUID;
    v_email_guess TEXT := '%neves%'; -- Tentativa de match por email
BEGIN
    -- 1. IDENTIFICAR A EMPRESA
    -- Procura por nome ou username que pareça com Neves
    SELECT id INTO v_company_id
    FROM public.companies
    WHERE name ILIKE '%Neves%' OR username ILIKE '%neves%'
    ORDER BY created_at ASC -- Pega a mais antiga (provavelmente a original)
    LIMIT 1;

    IF v_company_id IS NULL THEN
        RAISE NOTICE '❌ Empresa Neves & Costa não encontrada no banco.';
        RETURN;
    END IF;

    RAISE NOTICE '✅ Empresa encontrada: ID %', v_company_id;

    -- 2. CORRIGIR NOME DE EXIBIÇÃO
    -- O usuário relatou que está "Nevescosta" (provavelmente pegou do username)
    UPDATE public.companies
    SET 
        name = 'Neves & Costa',
        username = 'nevesecosta', -- Username limpo
        updated_at = NOW()
    WHERE id = v_company_id;
    
    RAISE NOTICE '✅ Nome corrigido para "Neves & Costa".';

    -- 3. VINCULAR AO USUÁRIO (CRÍTICO PARA APARECER OS DADOS)
    -- Tenta encontrar um usuário no Auth que tenha "neves" no email
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email ILIKE v_email_guess
    LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        UPDATE public.companies
        SET owner_id = v_user_id
        WHERE id = v_company_id;
        RAISE NOTICE '✅ Owner vinculado automaticamente ao usuário ID: %', v_user_id;
    ELSE
        RAISE NOTICE '⚠️ Não foi possível encontrar um usuário com email contendo "neves" para vincular automaticamente.';
        RAISE NOTICE '⚠️ Execute manualmente: UPDATE companies SET owner_id = ''ID_DO_USUARIO'' WHERE id = ''%''', v_company_id;
    END IF;

    -- 4. DIAGNÓSTICO FINAL
    RAISE NOTICE '--- STATUS ATUAL ---';
    PERFORM id, name, owner_id FROM public.companies WHERE id = v_company_id;
    
END $$;
