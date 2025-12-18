-- Migração: adicionar segmento na tabela companies

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS segment TEXT;
