-- ============================================================================
-- RESTAURAÇÃO DE TRANSAÇÕES - FastSavorys
-- Período: 01/10/2025 a 31/12/2025
-- Total Entradas: R$ 16.947,87 | Total Saídas: R$ 9.097,01 | Saldo: R$ 7.850,86
-- ============================================================================

-- Company ID da FastSavorys
-- (SELECT id FROM companies WHERE name ILIKE '%FastSavory%' OR name ILIKE '%Fast Savory%')
DO $$
DECLARE
  v_company_id UUID := '1f855ad8-6335-487a-868d-6b05cb5ae940';
BEGIN
  -- Verificar se a empresa existe
  IF NOT EXISTS (SELECT 1 FROM companies WHERE id = v_company_id) THEN
    RAISE EXCEPTION 'Empresa FastSavorys não encontrada com ID %', v_company_id;
  END IF;
  
  RAISE NOTICE 'Iniciando restauração de transações para FastSavorys (%)...', v_company_id;
END $$;

-- ============================================================================
-- PÁGINA 1 - 31/12/2025
-- ============================================================================

INSERT INTO transactions (id, company_id, type, date, time, datetime, description, category, amount_cents, version, updated_at, deleted_at)
VALUES
  -- 2025-12-31
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-31', '21:26', '2025-12-31T21:26:00Z', 'Salgados * Eronildes', 'Salgados', 8000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-31', '21:25', '2025-12-31T21:25:00Z', 'Salgados * Daniel', 'Salgados', 2000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-31', '21:25', '2025-12-31T21:25:01Z', 'Salgados * Sol', 'Salgados', 4100, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-31', '21:25', '2025-12-31T21:25:02Z', 'Salgados * Daise', 'Salgados', 8000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-31', '20:36', '2025-12-31T20:36:00Z', 'Parcela 4/10 - Panela Mexedora', 'Dívidas', 9590, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-31', '20:36', '2025-12-31T20:36:01Z', 'Parcela 2/12 - Celular', 'Dívidas', 12908, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-31', '20:34', '2025-12-31T20:34:00Z', 'Parcela 2/2 - Colmeia Cartão de Crédito', 'Dívidas', 6015, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-31', '20:33', '2025-12-31T20:33:00Z', 'Parcela 1/1 - Reposição Compre Bem', 'Dívidas', 2890, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-31', '20:32', '2025-12-31T20:32:00Z', 'Parcela 1/1 - Gasolina cartão de crédito', 'Dívidas', 6000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-31', '20:31', '2025-12-31T20:31:00Z', 'Parcela 1/1 - Reposição Crédito C. Grande + Mineirão', 'Dívidas', 123274, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-31', '20:30', '2025-12-31T20:30:00Z', 'Parcela 1/1 - Atacadão das Embalagens', 'Dívidas', 9806, 1, NOW(), NULL),

  -- 2025-12-30
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-30', '20:22', '2025-12-30T20:22:00Z', 'Insumos (trigo, carnes, queijos) - Côco', 'Insumos (trigo, carnes, queijos)', 2000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-30', '20:05', '2025-12-30T20:05:00Z', 'Salgados', 'Salgados', 10000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-30', '20:04', '2025-12-30T20:04:00Z', 'Salgados', 'Salgados', 8000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-30', '20:04', '2025-12-30T20:04:01Z', 'Salgados', 'Salgados', 4500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-30', '20:03', '2025-12-30T20:03:00Z', 'Salgados', 'Salgados', 2700, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-30', '20:03', '2025-12-30T20:03:01Z', 'Salgados', 'Salgados', 3000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-30', '20:03', '2025-12-30T20:03:02Z', 'Kit Festa (P/G)', 'Kit Festa (P/G)', 13500, 1, NOW(), NULL),

  -- 2025-12-28
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-28', '20:02', '2025-12-28T20:02:00Z', 'Salgados', 'Salgados', 4500, 1, NOW(), NULL),

  -- 2025-12-27
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-27', '20:01', '2025-12-27T20:01:00Z', 'Salgados', 'Salgados', 2300, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-27', '20:01', '2025-12-27T20:01:01Z', 'Salgados', 'Salgados', 8000, 1, NOW(), NULL),

  -- 2025-12-26
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-26', '17:42', '2025-12-26T17:42:00Z', 'Insumos (trigo, carnes, queijos) - Da praça', 'Insumos (trigo, carnes, queijos)', 6575, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-26', '17:40', '2025-12-26T17:40:00Z', '50 salgados * Michele cunhada', 'Recebimento Fiado', 4500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-26', '17:40', '2025-12-26T17:40:01Z', 'Salgados * Brunella', 'Salgados', 2500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-26', '17:40', '2025-12-26T17:40:02Z', 'Salgados * Treninha', 'Salgados', 2000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-26', '07:36', '2025-12-26T07:36:00Z', 'Encomenda - Fabiana (1 cento misto)', 'Encomenda', 8000, 1, NOW(), NULL),

  -- 2025-12-24
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-24', '19:53', '2025-12-24T19:53:00Z', 'Retirada Sócio - Leite para pirão', 'Retirada Sócio', 1600, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-24', '19:53', '2025-12-24T19:53:01Z', 'Insumos (trigo, carnes, queijos) - Leite', 'Insumos (trigo, carnes, queijos)', 800, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-24', '19:52', '2025-12-24T19:52:00Z', 'Retirada Sócio - Farmácia', 'Retirada Sócio', 2000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-24', '19:51', '2025-12-24T19:51:00Z', 'Insumos (trigo, carnes, queijos) - Refrigerante', 'Insumos (trigo, carnes, queijos)', 900, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-24', '19:50', '2025-12-24T19:50:00Z', 'Insumos (trigo, carnes, queijos) - Gil', 'Insumos (trigo, carnes, queijos)', 13189, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-24', '19:50', '2025-12-24T19:50:01Z', 'Retirada Sócio - Gil', 'Retirada Sócio', 2098, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-24', '18:46', '2025-12-24T18:46:00Z', 'Salgados * Jamile adiantamento', 'Salgados', 8000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-24', '18:46', '2025-12-24T18:46:01Z', 'Bolos (Vulcão/Mini) * Danila', 'Bolos (Vulcão/Mini)', 14000, 1, NOW(), NULL),

  -- 2025-12-23
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-23', '17:21', '2025-12-23T17:21:00Z', 'Salgados * Sol', 'Salgados', 4100, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-23', '17:07', '2025-12-23T17:07:00Z', 'Outros - Leite condensado', 'Outros', 3294, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-23', '17:04', '2025-12-23T17:04:00Z', 'Salgados * Jeane', 'Salgados', 1800, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-23', '17:04', '2025-12-23T17:04:01Z', 'Salgados * Joyce', 'Salgados', 1800, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-23', '17:04', '2025-12-23T17:04:02Z', 'Salgados * Alessandra baixa fria', 'Salgados', 8000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-23', '12:50', '2025-12-23T12:50:00Z', 'Retirada Sócio - Cabelo João Pedro', 'Retirada Sócio', 2500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-23', '12:17', '2025-12-23T12:17:00Z', 'Bolos (Vulcão/Mini) * Anny Lais', 'Bolos (Vulcão/Mini)', 1500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-23', '08:35', '2025-12-23T08:35:00Z', 'Bolos (Vulcão/Mini) * Gisele', 'Bolos (Vulcão/Mini)', 13500, 1, NOW(), NULL),

  -- 2025-12-22
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-22', '19:13', '2025-12-22T19:13:00Z', 'Retirada Sócio - Panetone', 'Retirada Sócio', 12000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-22', '19:12', '2025-12-22T19:12:00Z', 'Insumos (trigo, carnes, queijos) - Mercado cidade baixa', 'Insumos (trigo, carnes, queijos)', 4310, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-22', '19:12', '2025-12-22T19:12:01Z', 'Salgados * Ayala', 'Salgados', 1500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-22', '19:11', '2025-12-22T19:11:00Z', 'Salgados * Cida Ibirá 25', 'Salgados', 4900, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-22', '19:11', '2025-12-22T19:11:01Z', 'Salgados * Ana Maria', 'Salgados', 1700, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-22', '15:19', '2025-12-22T15:19:00Z', 'Salgados * Márcia', 'Salgados', 4500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-22', '15:19', '2025-12-22T15:19:01Z', 'Salgados * Thiago', 'Salgados', 2700, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-22', '13:11', '2025-12-22T13:11:00Z', 'Salgados * Lucélio', 'Salgados', 8000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-22', '09:13', '2025-12-22T09:13:00Z', 'Retirada Sócio - Cartão PIC Pay', 'Retirada Sócio', 41632, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-22', '08:54', '2025-12-22T08:54:00Z', 'Parcela 2/10 - Armário de Cozinha', 'Dívidas', 17082, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-22', '08:54', '2025-12-22T08:54:01Z', 'Parcela 1/1 - Atacadão das Embalagens', 'Dívidas', 9806, 1, NOW(), NULL),

  -- 2025-12-21
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-21', '09:52', '2025-12-21T09:52:00Z', '1 cento misto * Danila', 'Recebimento Fiado', 8000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-21', '11:47', '2025-12-21T11:47:00Z', 'Encomenda - Nathy (50 salgados)', 'Encomenda', 4500, 1, NOW(), NULL),

  -- 2025-12-20
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-20', '19:34', '2025-12-20T19:34:00Z', 'Conta de Luz', 'Despesa Recorrente', 30473, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-20', '19:25', '2025-12-20T19:25:00Z', 'Insumos (trigo, carnes, queijos) - Casa grande', 'Insumos (trigo, carnes, queijos)', 14236, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-20', '19:24', '2025-12-20T19:24:00Z', 'Funcionários - Pessoal', 'Funcionários', 1947, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-20', '19:23', '2025-12-20T19:23:00Z', 'Insumos (trigo, carnes, queijos) - Danila', 'Insumos (trigo, carnes, queijos)', 6747, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-20', '19:13', '2025-12-20T19:13:00Z', 'Salgados * Treninha', 'Salgados', 1500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-20', '19:13', '2025-12-20T19:13:01Z', 'Salgados * Aline', 'Salgados', 3000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-20', '18:12', '2025-12-20T18:12:00Z', 'Salgados * Thiago', 'Salgados', 1800, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-20', '18:12', '2025-12-20T18:12:01Z', 'Salgados * Jéssica Lima', 'Salgados', 2000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-20', '18:12', '2025-12-20T18:12:02Z', 'Salgados * By', 'Salgados', 3700, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-20', '18:11', '2025-12-20T18:11:00Z', 'Kit Festa (P/G) * Lia', 'Kit Festa (P/G)', 13500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-20', '16:56', '2025-12-20T16:56:00Z', 'Salgados * Carine', 'Salgados', 4500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-20', '16:56', '2025-12-20T16:56:01Z', 'Outros * Mãe', 'Outros', 15000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-20', '16:55', '2025-12-20T16:55:00Z', 'Kit Festa (P/G) * Patrícia', 'Kit Festa (P/G)', 13500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-20', '14:22', '2025-12-20T14:22:00Z', 'Outros * Renilde Topper do bolo', 'Outros', 1000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-20', '14:22', '2025-12-20T14:22:01Z', 'Salgados * Nixx', 'Salgados', 6700, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-20', '17:20', '2025-12-20T17:20:00Z', 'Encomenda - Renilde (1 kit festa (P) mulher)', 'Encomenda', 13500, 1, NOW(), NULL),

  -- 2025-12-18
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-18', '08:30', '2025-12-18T08:30:00Z', 'Conta de Água', 'Despesa Recorrente', 13368, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-18', '08:22', '2025-12-18T08:22:00Z', 'Salgados * Treninha', 'Salgados', 4500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-18', '07:42', '2025-12-18T07:42:00Z', 'Salgados * Jamile oliveira', 'Salgados', 2700, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-18', '00:12', '2025-12-18T00:12:00Z', 'Insumos (trigo, carnes, queijos) - Mineirão', 'Insumos (trigo, carnes, queijos)', 10175, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-18', '00:11', '2025-12-18T00:11:00Z', 'Insumos (trigo, carnes, queijos) - Mercado danila', 'Insumos (trigo, carnes, queijos)', 5600, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-18', '00:10', '2025-12-18T00:10:00Z', 'Insumos (trigo, carnes, queijos) - Atacadão das embalagens', 'Insumos (trigo, carnes, queijos)', 6127, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-18', '00:07', '2025-12-18T00:07:00Z', 'Kit Festa (P/G) * Fernanda', 'Kit Festa (P/G)', 4400, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-18', '00:06', '2025-12-18T00:06:00Z', 'Salgados * Lucineide', 'Salgados', 5000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-18', '00:06', '2025-12-18T00:06:01Z', 'Salgados * Edmilson', 'Salgados', 4300, 1, NOW(), NULL),

  -- 2025-12-17
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-17', '22:18', '2025-12-17T22:18:00Z', 'Outros - Gasolina', 'Outros', 3000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-17', '22:18', '2025-12-17T22:18:01Z', 'Reposição - Refrigerante', 'Reposição', 600, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-17', '20:31', '2025-12-17T20:31:00Z', 'Salgados * Raissa', 'Salgados', 1600, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-17', '20:30', '2025-12-17T20:30:00Z', 'Bolo * Patrícia professora', 'Bolo', 5500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-17', '21:02', '2025-12-17T21:02:00Z', 'Entrada de Encomenda de Fernanda', 'Encomenda', 9000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-17', '09:26', '2025-12-17T09:26:00Z', 'Salgados * Isabelle Loyola', 'Salgados', 3600, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-17', '08:40', '2025-12-17T08:40:00Z', 'DAS MEI', 'Despesa Recorrente', 8190, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-17', '08:40', '2025-12-17T08:40:01Z', 'Salgados * Chaw', 'Salgados', 2700, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-17', '07:02', '2025-12-17T07:02:00Z', 'Salgados * Edmilson', 'Salgados', 8000, 1, NOW(), NULL),

  -- 2025-12-16 (continuação página 6)
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-16', '19:05', '2025-12-16T19:05:00Z', 'Reposição - Corante', 'Reposição', 2500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-16', '18:57', '2025-12-16T18:57:00Z', 'Reposição - Refrigerante', 'Reposição', 4300, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-16', '18:09', '2025-12-16T18:09:00Z', 'Salgados * Joyce', 'Salgados', 800, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-16', '20:37', '2025-12-16T20:37:00Z', 'Entrada de Encomenda de Raiane Vizinha de Luciana', 'Encomenda', 8000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-16', '18:30', '2025-12-16T18:30:00Z', 'Encomenda - Rhaí (1 kit (P) mulher)', 'Encomenda', 13500, 1, NOW(), NULL),

  -- 2025-12-15
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-15', '20:12', '2025-12-15T20:12:00Z', 'Bolo * Lucineide', 'Bolo', 1500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-15', '20:11', '2025-12-15T20:11:00Z', 'Salgados * Parente dona Maria', 'Salgados', 4000, 1, NOW(), NULL),

  -- 2025-12-14
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-14', '17:05', '2025-12-14T17:05:00Z', 'Salgados * Rhay', 'Salgados', 2000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-14', '17:04', '2025-12-14T17:04:00Z', 'Refrigerante * Ayala', 'Refrigerante', 700, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-14', '17:04', '2025-12-14T17:04:01Z', 'Salgados * Ayala', 'Salgados', 2100, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-14', '17:03', '2025-12-14T17:03:00Z', 'Bolo * Aline', 'Bolo', 1500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-14', '13:41', '2025-12-14T13:41:00Z', 'Refrigerante * Aline', 'Refrigerante', 600, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-14', '13:14', '2025-12-14T13:14:00Z', 'Salgados * Bela vista', 'Salgados', 4500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-14', '13:13', '2025-12-14T13:13:00Z', 'Bolo * Tay Cristo', 'Bolo', 4800, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-14', '11:56', '2025-12-14T11:56:00Z', 'Salgados * Alcione bela VISTA', 'Salgados', 4500, 1, NOW(), NULL),

  -- 2025-12-13
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-13', '18:48', '2025-12-13T18:48:00Z', 'Reposição - Matheus', 'Reposição', 4175, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-13', '11:55', '2025-12-13T11:55:00Z', 'Retirada de Sócio - Festa', 'Retirada de Sócio', 1200, 1, NOW(), NULL),

  -- 2025-12-12
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-12', '12:09', '2025-12-12T12:09:00Z', 'Bolo * Geci', 'Bolo', 1500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-12', '11:33', '2025-12-12T11:33:00Z', 'Encomenda * Acerto de Caixa', 'Encomenda', 6500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-12', '09:46', '2025-12-12T09:46:00Z', 'Reposição - Atacadão das embalagem', 'Reposição', 9354, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-12', '09:45', '2025-12-12T09:45:00Z', 'Reposição - Nutri center', 'Reposição', 2873, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-12', '09:38', '2025-12-12T09:38:00Z', 'Reposição - Mineirão', 'Reposição', 12264, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-12', '12:37', '2025-12-12T12:37:00Z', 'Encomenda - Lucinei (30 quibes)', 'Encomenda', 2700, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-12', '08:38', '2025-12-12T08:38:00Z', 'Salgados * Jéssica', 'Salgados', 1200, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-12', '08:34', '2025-12-12T08:34:00Z', 'Reposição - Carne moída', 'Reposição', 6192, 1, NOW(), NULL),

  -- 2025-12-11
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-11', '19:02', '2025-12-11T19:02:00Z', 'Salgados * Danila', 'Salgados', 2400, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-11', '18:09', '2025-12-11T18:09:00Z', 'Salgados * Geci', 'Salgados', 2700, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-11', '18:08', '2025-12-11T18:08:00Z', 'Salgados * Deta', 'Salgados', 1000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-11', '14:18', '2025-12-11T14:18:00Z', 'Reposição - Leite', 'Reposição', 1290, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-11', '13:23', '2025-12-11T13:23:00Z', 'Salgados * Aline', 'Salgados', 3600, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-11', '13:22', '2025-12-11T13:22:00Z', 'Salgados * Katinha', 'Salgados', 1800, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-11', '13:22', '2025-12-11T13:22:01Z', 'Refrigerante * Aline', 'Refrigerante', 600, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-11', '14:43', '2025-12-11T14:43:00Z', 'Encomenda - Carla creche (1 bolo vulcão (M) alunos)', 'Encomenda', 6500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-11', '09:37', '2025-12-11T09:37:00Z', 'Delivery * Elizângela', 'Delivery', 300, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-11', '12:36', '2025-12-11T12:36:00Z', 'Encomenda - Elizângela (30 mini coxinhas)', 'Encomenda', 2700, 1, NOW(), NULL),

  -- 2025-12-10
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-10', '19:46', '2025-12-10T19:46:00Z', 'Reposição', 'Reposição', 800, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-10', '19:44', '2025-12-10T19:44:00Z', 'Retirada * Deis', 'Retirada', 1800, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-10', '19:44', '2025-12-10T19:44:01Z', 'Retirada * Bota fogo', 'Retirada', 1800, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-10', '19:43', '2025-12-10T19:43:00Z', 'Delivery * Treninha', 'Delivery', 1000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-10', '13:11', '2025-12-10T13:11:00Z', 'Salgados * Rayla', 'Salgados', 8000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-10', '13:11', '2025-12-10T13:11:01Z', 'Reposição', 'Reposição', 1200, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-10', '13:10', '2025-12-10T13:10:00Z', 'Delivery * Liliane', 'Delivery', 3600, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-10', '13:00', '2025-12-10T13:00:00Z', 'Encomenda Entregue - Alcione (20 salgados mini)', 'Encomenda', 1800, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-10', '08:01', '2025-12-10T08:01:00Z', 'Telefone', 'Despesa Recorrente', 4160, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-10', '10:56', '2025-12-10T10:56:00Z', 'Encomenda Entregue - Eliete (1 kit (P) homem)', 'Encomenda', 13500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-10', '07:55', '2025-12-10T07:55:00Z', 'Outros', 'Outros', 2673, 1, NOW(), NULL),

  -- 2025-12-09
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-09', '21:55', '2025-12-09T21:55:00Z', 'Entrada de Encomenda de Patricia', 'Encomenda', 5500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-09', '15:31', '2025-12-09T15:31:00Z', 'Refrigerante * Aline', 'Refrigerante', 1200, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-09', '15:31', '2025-12-09T15:31:01Z', 'Delivery * Ju do Cristo', 'Delivery', 5200, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-09', '11:27', '2025-12-09T11:27:00Z', 'Salgados * Rayla', 'Salgados', 4500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-09', '07:04', '2025-12-09T07:04:00Z', 'Delivery * Maicon Uruçuca', 'Delivery', 1100, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-09', '07:02', '2025-12-09T07:02:00Z', 'Salgados * Valéria', 'Salgados', 2700, 1, NOW(), NULL),

  -- 2025-12-08
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-08', '00:43', '2025-12-08T00:43:00Z', 'Entrada de Encomenda de Tarcila', 'Encomenda', 3600, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-08', '00:35', '2025-12-08T00:35:00Z', 'Encomenda Entregue - Camila igreja (30 salgados mini)', 'Encomenda', 2700, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-08', '01:28', '2025-12-08T01:28:00Z', 'Delivery * Liz', 'Delivery', 2700, 1, NOW(), NULL),

  -- 2025-12-06
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-06', '19:44', '2025-12-06T19:44:00Z', 'Reposição', 'Reposição', 2546, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-06', '19:44', '2025-12-06T19:44:01Z', 'Delivery * Brunella', 'Delivery', 2700, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-06', '19:44', '2025-12-06T19:44:02Z', 'Delivery * Aline Cristo', 'Delivery', 5100, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-06', '17:43', '2025-12-06T17:43:00Z', 'Reposição', 'Reposição', 6257, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-06', '17:40', '2025-12-06T17:40:00Z', 'Salgados * Tielly', 'Salgados', 2000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-06', '17:39', '2025-12-06T17:39:00Z', 'Bolo Vulcão Mini * Tielly', 'Bolo', 1500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-06', '17:35', '2025-12-06T17:35:00Z', 'Delivery * Bruna', 'Delivery', 3300, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-06', '13:21', '2025-12-06T13:21:00Z', 'Bolo * Renata', 'Bolo', 9000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-06', '13:18', '2025-12-06T13:18:00Z', 'Salgados * Jéssica', 'Salgados', 12500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-06', '10:18', '2025-12-06T10:18:00Z', 'Conta de Energia', 'Despesa Recorrente', 32992, 1, NOW(), NULL),

  -- 2025-12-05
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-05', '16:00', '2025-12-05T16:00:00Z', 'Bolo', 'Bolo', 1500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-05', '16:00', '2025-12-05T16:00:01Z', 'Kit Festa', 'Kit Festa', 13500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-05', '15:58', '2025-12-05T15:58:00Z', 'Retirada', 'Retirada', 2400, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-05', '15:58', '2025-12-05T15:58:01Z', 'Pizzas', 'Pizzas', 17500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-05', '15:58', '2025-12-05T15:58:02Z', 'Retirada', 'Retirada', 1200, 1, NOW(), NULL),

  -- 2025-12-04
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-04', '13:45', '2025-12-04T13:45:00Z', 'Reposição', 'Reposição', 3374, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-04', '13:04', '2025-12-04T13:04:00Z', 'Encomenda', 'Encomenda', 4500, 1, NOW(), NULL),

  -- 2025-12-03
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-03', '17:24', '2025-12-03T17:24:00Z', 'Delivery', 'Delivery', 1200, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-03', '10:23', '2025-12-03T10:23:00Z', 'Reposição', 'Reposição', 4213, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-03', '10:23', '2025-12-03T10:23:01Z', 'Pessoal', 'Pessoal', 1615, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-03', '10:22', '2025-12-03T10:22:00Z', 'Reposição', 'Reposição', 1518, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-03', '08:46', '2025-12-03T08:46:00Z', 'Pizzas', 'Pizzas', 17500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-03', '08:45', '2025-12-03T08:45:00Z', 'Retirada', 'Retirada', 1800, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-03', '08:42', '2025-12-03T08:42:00Z', 'Delivery', 'Delivery', 1400, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-03', '08:42', '2025-12-03T08:42:01Z', 'Retirada', 'Retirada', 800, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-03', '08:41', '2025-12-03T08:41:00Z', 'Delivery', 'Delivery', 5600, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-12-03', '08:33', '2025-12-03T08:33:00Z', 'Reposição', 'Reposição', 5600, 1, NOW(), NULL),

  -- 2025-12-01
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-01', '17:28', '2025-12-01T17:28:00Z', 'Kit Festa', 'Kit Festa', 4000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-01', '14:04', '2025-12-01T14:04:00Z', 'Delivery', 'Delivery', 2700, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-12-01', '14:03', '2025-12-01T14:03:00Z', 'Encomenda', 'Encomenda', 12000, 1, NOW(), NULL),

  -- 2025-11-30
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-30', '21:05', '2025-11-30T21:05:00Z', 'Kit festa', 'Kit Festa', 13500, 1, NOW(), NULL),

  -- 2025-11-29
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-29', '22:58', '2025-11-29T22:58:00Z', 'Encomenda', 'Encomenda', 4000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-29', '22:10', '2025-11-29T22:10:00Z', 'Delivery', 'Delivery', 3600, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-29', '21:48', '2025-11-29T21:48:00Z', 'Pessoal', 'Pessoal', 1350, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-29', '21:48', '2025-11-29T21:48:01Z', 'Pessoal', 'Pessoal', 2500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-29', '21:02', '2025-11-29T21:02:00Z', 'Delivery', 'Delivery', 4500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-29', '21:02', '2025-11-29T21:02:01Z', 'Delivery', 'Delivery', 2400, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-29', '21:02', '2025-11-29T21:02:02Z', 'Delivery', 'Delivery', 2000, 1, NOW(), NULL),

  -- 2025-11-28
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-28', '22:57', '2025-11-28T22:57:00Z', 'Vulcão mini', 'Vulcão Mini', 1500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-28', '21:52', '2025-11-28T21:52:00Z', 'Pessoal', 'Pessoal', 1100, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-28', '21:52', '2025-11-28T21:52:01Z', 'Pessoal', 'Pessoal', 1600, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-28', '19:28', '2025-11-28T19:28:00Z', 'Pessoal', 'Pessoal', 8000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-28', '19:27', '2025-11-28T19:27:00Z', 'Reposição', 'Reposição', 2300, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-28', '19:27', '2025-11-28T19:27:01Z', 'Pessoal', 'Pessoal', 2200, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-28', '19:09', '2025-11-28T19:09:00Z', 'Vulcão mini', 'Vulcão Mini', 1500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-28', '19:08', '2025-11-28T19:08:00Z', 'Vulcão mini', 'Vulcão Mini', 1500, 1, NOW(), NULL),
  
  -- 2025-11-28 (continuação página 11)
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-28', '19:08', '2025-11-28T19:08:01Z', 'Delivery', 'Delivery', 4500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-28', '19:08', '2025-11-28T19:08:02Z', 'Delivery', 'Delivery', 3100, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-28', '19:08', '2025-11-28T19:08:03Z', 'Delivery', 'Delivery', 4500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-28', '19:07', '2025-11-28T19:07:00Z', 'Kit vulcão', 'Kit', 8000, 1, NOW(), NULL),

  -- 2025-11-27
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-27', '16:49', '2025-11-27T16:49:00Z', 'Delivery', 'Delivery', 4100, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-27', '16:17', '2025-11-27T16:17:00Z', 'Refrigerante', 'Refrigerante', 4900, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-27', '16:17', '2025-11-27T16:17:01Z', 'Delivery', 'Delivery', 4200, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-27', '16:17', '2025-11-27T16:17:02Z', 'Delivery', 'Delivery', 1800, 1, NOW(), NULL),

  -- 2025-11-26
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-26', '23:17', '2025-11-26T23:17:00Z', 'Pessoal', 'Pessoal', 500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-26', '15:12', '2025-11-26T15:12:00Z', 'Encomenda', 'Encomenda', 2700, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-26', '15:11', '2025-11-26T15:11:00Z', 'Vulcão mini', 'Vulcão Mini', 3000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-26', '15:11', '2025-11-26T15:11:01Z', 'Vulcão Mini', 'Vulcão Mini', 1500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-26', '15:11', '2025-11-26T15:11:02Z', 'Vulcão mini', 'Vulcão Mini', 1500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-26', '15:10', '2025-11-26T15:10:00Z', 'Delivery', 'Delivery', 800, 1, NOW(), NULL),

  -- 2025-11-25
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-25', '23:21', '2025-11-25T23:21:00Z', 'Reposição', 'Reposição', 14621, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-25', '23:15', '2025-11-25T23:15:00Z', 'Delivery', 'Delivery', 1800, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-25', '17:05', '2025-11-25T17:05:00Z', 'Delivery', 'Delivery', 1800, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-25', '17:04', '2025-11-25T17:04:00Z', 'Encomenda', 'Encomenda', 4500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-25', '17:04', '2025-11-25T17:04:01Z', 'Vulcão mini', 'Vulcão Mini', 3000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-25', '17:04', '2025-11-25T17:04:02Z', 'Vulcão mini', 'Vulcão Mini', 1500, 1, NOW(), NULL),

  -- 2025-11-24
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-24', '12:07', '2025-11-24T12:07:00Z', 'Pessoal', 'Pessoal', 2000, 1, NOW(), NULL),

  -- 2025-11-22
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-22', '22:45', '2025-11-22T22:45:00Z', 'Encomenda', 'Encomenda', 3500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-22', '22:15', '2025-11-22T22:15:00Z', 'Pessoal', 'Pessoal', 10000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-22', '22:04', '2025-11-22T22:04:00Z', 'Pessoal', 'Pessoal', 1550, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-22', '15:09', '2025-11-22T15:09:00Z', 'Delivery', 'Delivery', 4700, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-22', '09:57', '2025-11-22T09:57:00Z', 'Limpeza trabalho', 'Limpeza', 2497, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-22', '09:57', '2025-11-22T09:57:01Z', 'Reposição', 'Reposição', 3500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-22', '07:54', '2025-11-22T07:54:00Z', 'Pessoal', 'Pessoal', 11000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-22', '07:10', '2025-11-22T07:10:00Z', 'Kit', 'Kit', 13500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-22', '07:10', '2025-11-22T07:10:01Z', 'Kit', 'Kit', 13500, 1, NOW(), NULL),

  -- 2025-11-21
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-21', '22:00', '2025-11-21T22:00:00Z', 'Reposição', 'Reposição', 6269, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-21', '22:00', '2025-11-21T22:00:01Z', 'Reposição', 'Reposição', 4792, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-21', '21:58', '2025-11-21T21:58:00Z', 'Kit festa', 'Kit Festa', 4000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-21', '21:58', '2025-11-21T21:58:01Z', 'Delivery', 'Delivery', 5400, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-21', '21:57', '2025-11-21T21:57:00Z', 'Delivery', 'Delivery', 2800, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-21', '21:57', '2025-11-21T21:57:01Z', 'Delivery', 'Delivery', 3200, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-21', '21:56', '2025-11-21T21:56:00Z', 'Encomenda', 'Encomenda', 4500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-21', '16:26', '2025-11-21T16:26:00Z', 'Reposição', 'Reposição', 1337, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-21', '16:26', '2025-11-21T16:26:01Z', 'Pessoal', 'Pessoal', 1205, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-21', '09:55', '2025-11-21T09:55:00Z', 'Reposição', 'Reposição', 3606, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-21', '09:54', '2025-11-21T09:54:00Z', 'Pessoal', 'Pessoal', 13500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-21', '09:54', '2025-11-21T09:54:01Z', 'Pessoal', 'Pessoal', 1500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-21', '09:54', '2025-11-21T09:54:02Z', 'Fitas', 'Fitas', 1500, 1, NOW(), NULL),

  -- 2025-11-20
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-20', '19:09', '2025-11-20T19:09:00Z', 'Vulcão mini', 'Vulcão Mini', 1500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-20', '17:27', '2025-11-20T17:27:00Z', 'Delivery', 'Delivery', 2700, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-20', '17:27', '2025-11-20T17:27:01Z', 'Delivery', 'Delivery', 2500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-20', '13:45', '2025-11-20T13:45:00Z', 'Vulcão mini', 'Vulcão Mini', 1500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-20', '13:09', '2025-11-20T13:09:00Z', 'Vulcão Mini', 'Vulcão Mini', 2000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-20', '12:37', '2025-11-20T12:37:00Z', 'Vulcão mini', 'Vulcão Mini', 1500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-20', '12:34', '2025-11-20T12:34:00Z', 'Vulcão mini', 'Vulcão Mini', 3000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-20', '10:49', '2025-11-20T10:49:00Z', 'Encomenda', 'Encomenda', 5000, 1, NOW(), NULL),

  -- 2025-11-19
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-19', '23:22', '2025-11-19T23:22:00Z', 'Reposição embalagem', 'Reposição', 10878, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-19', '15:40', '2025-11-19T15:40:00Z', 'F.I', 'F.I', 18756, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-19', '15:35', '2025-11-19T15:35:00Z', 'Delivery', 'Delivery', 1600, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-19', '15:35', '2025-11-19T15:35:01Z', 'Delivery', 'Delivery', 4500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-19', '10:49', '2025-11-19T10:49:00Z', 'Delivery', 'Delivery', 1400, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-19', '10:39', '2025-11-19T10:39:00Z', 'Delivery', 'Delivery', 1600, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-19', '10:39', '2025-11-19T10:39:01Z', 'Encomenda', 'Encomenda', 4500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-19', '10:39', '2025-11-19T10:39:02Z', 'Encomenda', 'Encomenda', 8000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-19', '10:37', '2025-11-19T10:37:00Z', 'Pessoal', 'Pessoal', 2500, 1, NOW(), NULL),

  -- 2025-11-18
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-18', '10:40', '2025-11-18T10:40:00Z', 'Delivery', 'Delivery', 3600, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-18', '10:37', '2025-11-18T10:37:00Z', 'Reposição', 'Reposição', 22159, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-18', '10:37', '2025-11-18T10:37:01Z', 'Reposição', 'Reposição', 10942, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-18', '10:35', '2025-11-18T10:35:00Z', 'Reposição', 'Reposição', 10460, 1, NOW(), NULL),

  -- 2025-11-17
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-17', '21:21', '2025-11-17T21:21:00Z', 'Pagamento Mei', 'Despesa Recorrente', 8190, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-17', '21:20', '2025-11-17T21:20:00Z', 'Encomenda', 'Encomenda', 8000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-17', '21:19', '2025-11-17T21:19:00Z', 'Delivery', 'Delivery', 5800, 1, NOW(), NULL),

  -- 2025-11-16
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-16', '21:22', '2025-11-16T21:22:00Z', 'Pessoal', 'Pessoal', 1000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-16', '17:28', '2025-11-16T17:28:00Z', 'Kit', 'Kit', 13500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-16', '17:27', '2025-11-16T17:27:00Z', 'Delivery', 'Delivery', 2400, 1, NOW(), NULL),

  -- 2025-11-15
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-15', '17:27', '2025-11-15T17:27:00Z', 'Kit', 'Kit', 23500, 1, NOW(), NULL),

  -- 2025-11-14
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-14', '17:31', '2025-11-14T17:31:00Z', 'Reposição', 'Reposição', 14800, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-14', '17:30', '2025-11-14T17:30:00Z', 'Pessoal', 'Pessoal', 2405, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-14', '17:30', '2025-11-14T17:30:01Z', 'Reposição', 'Reposição', 6148, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-14', '17:29', '2025-11-14T17:29:00Z', 'Encomenda', 'Encomenda', 4500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-14', '17:29', '2025-11-14T17:29:01Z', 'Encomenda', 'Encomenda', 10000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-14', '17:28', '2025-11-14T17:28:00Z', 'Delivery', 'Delivery', 1500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-14', '17:28', '2025-11-14T17:28:01Z', 'Delivery', 'Delivery', 1200, 1, NOW(), NULL),

  -- 2025-11-13
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-13', '21:17', '2025-11-13T21:17:00Z', 'Talão de Água', 'Despesa Recorrente', 13368, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-13', '21:15', '2025-11-13T21:15:00Z', 'Reposição', 'Reposição', 14681, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-13', '21:15', '2025-11-13T21:15:01Z', 'Delivery', 'Delivery', 2400, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-13', '16:41', '2025-11-13T16:41:00Z', 'Encomenda', 'Encomenda', 4500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-13', '12:34', '2025-11-13T12:34:00Z', 'Encomenda', 'Encomenda', 4500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-13', '12:32', '2025-11-13T12:32:00Z', 'Encomenda', 'Encomenda', 8000, 1, NOW(), NULL),

  -- 2025-11-12
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-12', '21:42', '2025-11-12T21:42:00Z', 'Pessoal', 'Pessoal', 4182, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-12', '21:24', '2025-11-12T21:24:00Z', 'Reposição cartão', 'Reposição', 20115, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-12', '21:20', '2025-11-12T21:20:00Z', 'Delivery', 'Delivery', 1600, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-12', '09:26', '2025-11-12T09:26:00Z', 'Encomenda kit', 'Encomenda', 23500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-12', '09:26', '2025-11-12T09:26:01Z', 'Encomenda kit', 'Encomenda', 13500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-12', '09:26', '2025-11-12T09:26:02Z', 'Encomenda', 'Encomenda', 8000, 1, NOW(), NULL),

  -- 2025-11-11
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-11', '18:54', '2025-11-11T18:54:00Z', 'Encomenda', 'Encomenda', 4900, 1, NOW(), NULL),

  -- 2025-11-10
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-10', '18:55', '2025-11-10T18:55:00Z', 'Delivery', 'Delivery', 500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-10', '18:03', '2025-11-10T18:03:00Z', 'Pessoal', 'Pessoal', 548, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-10', '18:00', '2025-11-10T18:00:00Z', 'Delivery', 'Delivery', 1800, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-10', '16:19', '2025-11-10T16:19:00Z', 'Delivery', 'Delivery', 4500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-10', '16:19', '2025-11-10T16:19:01Z', 'Delivery', 'Delivery', 2800, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-10', '15:00', '2025-11-10T15:00:00Z', 'Embalagens', 'Embalagens', 6725, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-10', '13:51', '2025-11-10T13:51:00Z', 'Delivery', 'Delivery', 1700, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-10', '13:46', '2025-11-10T13:46:00Z', 'Reposição', 'Reposição', 15803, 1, NOW(), NULL),

  -- 2025-11-09
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-09', '13:48', '2025-11-09T13:48:00Z', 'Encomenda', 'Encomenda', 16500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-09', '10:47', '2025-11-09T10:47:00Z', 'Delivery', 'Delivery', 200, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-09', '10:40', '2025-11-09T10:40:00Z', 'Encomenda', 'Encomenda', 12000, 1, NOW(), NULL),

  -- 2025-11-08
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-08', '13:48', '2025-11-08T13:48:00Z', 'Refrigerante', 'Refrigerante', 4900, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-08', '13:47', '2025-11-08T13:47:00Z', 'Delivery', 'Delivery', 8100, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-08', '10:43', '2025-11-08T10:43:00Z', 'Pessoal', 'Pessoal', 2800, 1, NOW(), NULL),

  -- 2025-11-07
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-07', '20:53', '2025-11-07T20:53:00Z', 'Pessoal', 'Pessoal', 1000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-07', '20:51', '2025-11-07T20:51:00Z', 'Delivery', 'Delivery', 3700, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-07', '20:51', '2025-11-07T20:51:01Z', 'Delivery', 'Delivery', 800, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-07', '20:51', '2025-11-07T20:51:02Z', 'Delivery', 'Delivery', 2700, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-07', '20:50', '2025-11-07T20:50:00Z', 'Kit vulcão', 'Kit', 7001, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-07', '16:10', '2025-11-07T16:10:00Z', 'Moto táxi', 'Moto táxi', 300, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-07', '16:09', '2025-11-07T16:09:00Z', 'Delivery com moto', 'Delivery', 3600, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-07', '10:55', '2025-11-07T10:55:00Z', 'Delivery', 'Delivery', 2700, 1, NOW(), NULL),

  -- 2025-11-06
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-06', '18:44', '2025-11-06T18:44:00Z', 'Delivery', 'Delivery', 2400, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-06', '18:43', '2025-11-06T18:43:00Z', 'Reposição', 'Reposição', 8248, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-06', '13:31', '2025-11-06T13:31:00Z', 'M', 'Outros', 419, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-06', '13:30', '2025-11-06T13:30:00Z', 'Kit adiantamento', 'Kit', 5500, 1, NOW(), NULL),

  -- 2025-11-05
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-05', '21:30', '2025-11-05T21:30:00Z', 'Delivery', 'Delivery', 600, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-05', '20:31', '2025-11-05T20:31:00Z', 'Delivery', 'Delivery', 2400, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-05', '14:09', '2025-11-05T14:09:00Z', 'Encomenda', 'Encomenda', 4500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-05', '13:58', '2025-11-05T13:58:00Z', 'Leite', 'Leite', 1836, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-05', '09:51', '2025-11-05T09:51:00Z', 'Kit', 'Kit', 13500, 1, NOW(), NULL),

  -- 2025-11-04
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-04', '23:48', '2025-11-04T23:48:00Z', 'Delivery', 'Delivery', 800, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-04', '23:43', '2025-11-04T23:43:00Z', 'Parcela panela 2/10', 'Dívidas', 11800, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-04', '23:41', '2025-11-04T23:41:00Z', 'Carne moida', 'Reposição', 8000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-11-04', '23:41', '2025-11-04T23:41:01Z', 'Leite', 'Leite', 550, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-04', '23:40', '2025-11-04T23:40:00Z', 'Encomenda', 'Encomenda', 8000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-04', '23:40', '2025-11-04T23:40:01Z', 'Delivery', 'Delivery', 600, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-04', '23:39', '2025-11-04T23:39:00Z', 'Delivery', 'Delivery', 4000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-04', '23:39', '2025-11-04T23:39:01Z', 'Delivery', 'Delivery', 800, 1, NOW(), NULL),

  -- 2025-11-03
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-03', '16:10', '2025-11-03T16:10:00Z', 'Delivery', 'Delivery', 1800, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-03', '10:36', '2025-11-03T10:36:00Z', 'Delivery', 'Delivery', 600, 1, NOW(), NULL),

  -- 2025-11-02
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-02', '23:39', '2025-11-02T23:39:00Z', 'Encomenda', 'Encomenda', 4500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-02', '23:39', '2025-11-02T23:39:01Z', 'Bolo', 'Bolo', 9000, 1, NOW(), NULL),

  -- 2025-11-01
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-01', '18:58', '2025-11-01T18:58:00Z', 'Delivery', 'Delivery', 500, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-11-01', '17:58', '2025-11-01T17:58:00Z', 'Dinheiro para troco fixo', 'Outros', 8000, 1, NOW(), NULL),

  -- 2025-10-31
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-10-31', '19:56', '2025-10-31T19:56:00Z', 'Delivery', 'Delivery', 3600, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-10-31', '19:55', '2025-10-31T19:55:00Z', 'Delivery', 'Delivery', 2500, 1, NOW(), NULL),

  -- 2025-10-30
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-10-30', '15:30', '2025-10-30T15:30:00Z', 'Reposição', 'Reposição', 2800, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-10-30', '15:21', '2025-10-30T15:21:00Z', 'Delivery', 'Delivery', 2700, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-10-30', '15:21', '2025-10-30T15:21:01Z', 'Kut', 'Kit', 13500, 1, NOW(), NULL),

  -- 2025-10-29
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-10-29', '22:00', '2025-10-29T22:00:00Z', 'Reposição', 'Reposição', 2363, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-10-29', '22:00', '2025-10-29T22:00:01Z', 'Reposição', 'Reposição', 3900, 1, NOW(), NULL),

  -- 2025-10-28
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-10-28', '20:28', '2025-10-28T20:28:00Z', 'Delivery', 'Delivery', 3900, 1, NOW(), NULL),

  -- 2025-10-27
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-10-27', '11:28', '2025-10-27T11:28:00Z', 'Kit', 'Kit', 15000, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-10-27', '11:23', '2025-10-27T11:23:00Z', 'Reposição', 'Reposição', 1778, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-10-27', '11:18', '2025-10-27T11:18:00Z', 'Cartão f.p.', 'Cartão', 13328, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-10-27', '11:17', '2025-10-27T11:17:00Z', 'Reposição a vista', 'Reposição', 7659, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-10-27', '11:16', '2025-10-27T11:16:00Z', 'Encomenda', 'Encomenda', 4500, 1, NOW(), NULL),

  -- 2025-10-20
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'expense', '2025-10-20', '09:26', '2025-10-20T09:26:00Z', '20/26', 'Reposição', 67961, 1, NOW(), NULL),

  -- 2025-10-14
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-10-14', '09:14', '2025-10-14T09:14:00Z', '21/26', 'Salgados', 123480, 1, NOW(), NULL),

  -- 2025-10-01
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-10-01', '09:14', '2025-10-01T09:14:00Z', '27/31', 'Salgados', 47700, 1, NOW(), NULL),
  (gen_random_uuid(), '1f855ad8-6335-487a-868d-6b05cb5ae940', 'income', '2025-10-01', '09:13', '2025-10-01T09:13:00Z', '1 a 20', 'Salgados', 413450, 1, NOW(), NULL)
;

-- ============================================================================
-- RESTAURAÇÃO COMPLETA!
-- Total de transações: ~350 registros
-- Período: 01/10/2025 a 31/12/2025
-- ============================================================================

-- Verificar contagem após inserção
SELECT 
  'Transações restauradas (parcial)' as status,
  COUNT(*) as total,
  SUM(CASE WHEN type = 'income' THEN amount_cents ELSE 0 END) / 100.0 as total_entradas,
  SUM(CASE WHEN type = 'expense' THEN amount_cents ELSE 0 END) / 100.0 as total_saidas
FROM transactions 
WHERE company_id = '1f855ad8-6335-487a-868d-6b05cb5ae940';
