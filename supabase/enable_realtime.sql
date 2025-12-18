-- ============================================
-- HABILITAR REALTIME PARA SINCRONIZAÇÃO AUTOMÁTICA
-- Execute este script no Supabase SQL Editor
-- ============================================

-- Função auxiliar para adicionar tabela ao Realtime apenas se não existir
DO $$
DECLARE
    table_name TEXT;
    tables_to_add TEXT[] := ARRAY['transactions', 'debts', 'orders', 'recurring_expenses', 'financial_goals', 'companies'];
BEGIN
    FOREACH table_name IN ARRAY tables_to_add
    LOOP
        -- Verificar se a tabela já está na publicação
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND tablename = table_name
        ) THEN
            -- Adicionar tabela à publicação
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', table_name);
            RAISE NOTICE 'Tabela % adicionada ao Realtime', table_name;
        ELSE
            RAISE NOTICE 'Tabela % já está no Realtime (ignorando)', table_name;
        END IF;
    END LOOP;
END $$;

-- ============================================
-- VERIFICAR SE O REALTIME ESTÁ HABILITADO
-- ============================================
-- Execute esta query para verificar quais tabelas têm Realtime habilitado:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- ============================================
-- CONFIGURAR RLS (Row Level Security) SE NECESSÁRIO
-- ============================================
-- O Realtime respeita as políticas RLS. Certifique-se de que as políticas
-- estão configuradas corretamente para permitir que os usuários vejam
-- apenas os dados de suas próprias empresas.

-- Exemplo de política RLS para transactions (se ainda não existir):
-- CREATE POLICY "Users can view own company transactions"
-- ON transactions FOR SELECT
-- USING (company_id IN (
--   SELECT company_id FROM users WHERE id = auth.uid()
-- ));

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 1. Após executar este script, o Realtime estará habilitado para todas as tabelas listadas
-- 2. Mudanças (INSERT, UPDATE, DELETE) serão propagadas automaticamente para todos os clientes conectados
-- 3. O filtro por company_id é aplicado no cliente para garantir que cada empresa veja apenas seus dados
-- 4. Se você receber erro "relation already member of publication", a tabela já está habilitada
