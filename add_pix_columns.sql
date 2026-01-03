-- Migration: Adicionar colunas PIX à tabela companies
-- Execute este script no Supabase SQL Editor

-- Adicionar colunas para configuração PIX (se não existirem)
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS pix_key TEXT;

ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS pix_merchant_name VARCHAR(25);

ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS pix_merchant_city VARCHAR(15);

-- Comentários para documentação
COMMENT ON COLUMN companies.pix_key IS 'Chave PIX para recebimentos (CPF, CNPJ, email, telefone ou aleatória)';
COMMENT ON COLUMN companies.pix_merchant_name IS 'Nome do beneficiário para QR Code PIX (máx 25 chars)';
COMMENT ON COLUMN companies.pix_merchant_city IS 'Cidade do beneficiário para QR Code PIX (máx 15 chars)';
