-- =====================================================
-- FIX: Atualizar segmento das empresas existentes
-- =====================================================
-- Atualiza o campo segment nas empresas já cadastradas
-- FastSavory's -> Lanchonete
-- Neves & Costa -> Serviços  
-- Horadumdooce -> Doceria
-- =====================================================

-- Atualizar FastSavory's para Lanchonete
UPDATE public.companies 
SET segment = 'lanchonete' 
WHERE name ILIKE '%FastSavory%' OR username ILIKE '%fastsavory%';

-- Atualizar Neves & Costa para Serviços
UPDATE public.companies 
SET segment = 'servicos' 
WHERE name ILIKE '%Neves%' OR username ILIKE '%neves%';

-- Atualizar Horadumdooce para Doceria
UPDATE public.companies 
SET segment = 'doceria' 
WHERE name ILIKE '%Horadumdooce%' OR username ILIKE '%horadumdooce%';

-- Verificar as atualizações
SELECT 
    name,
    username,
    segment,
    updated_at
FROM public.companies 
WHERE name ILIKE '%FastSavory%' 
   OR name ILIKE '%Neves%' 
   OR name ILIKE '%Horadumdooce%'
ORDER BY name;

SELECT 'Segmentos das empresas atualizados com sucesso!' as status;
