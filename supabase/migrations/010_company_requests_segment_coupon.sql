-- Migração: adicionar segmento e cupom de desconto na tabela company_requests

ALTER TABLE public.company_requests
  ADD COLUMN IF NOT EXISTS segment TEXT,
  ADD COLUMN IF NOT EXISTS discount_coupon_code TEXT;
