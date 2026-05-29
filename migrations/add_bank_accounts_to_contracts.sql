-- ============================================================
-- RentAllControl — Migração para Contratos & Contas Bancárias
-- Execute este arquivo no SQL Editor do Supabase
-- ============================================================

-- 1. Adiciona a coluna is_active na tabela de Contas Bancárias
ALTER TABLE public.bank_accounts 
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 2. Adiciona a coluna bank_account_id na tabela de Contratos (Contracts)
ALTER TABLE public.contracts 
  ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL;

-- 3. Cria o índice para a coluna de relacionamento na tabela de Contratos
CREATE INDEX IF NOT EXISTS idx_contracts_bank_account ON public.contracts(bank_account_id);
