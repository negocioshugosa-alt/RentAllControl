-- ============================================================
-- RentAllControl — Migração para Contas Bancárias
-- Execute este arquivo no SQL Editor do Supabase
-- ============================================================

-- 1. Cria a tabela de Contas Bancárias
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  bank_name VARCHAR(255),
  agency VARCHAR(50),
  account_number VARCHAR(50),
  type VARCHAR(20) DEFAULT 'corrente' CHECK (type IN ('corrente', 'poupanca', 'outra')),
  balance DECIMAL(12,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilita RLS (Row Level Security)
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- 3. Cria a política de segurança RLS para as Contas Bancárias
DROP POLICY IF EXISTS "bank_accounts_all" ON public.bank_accounts;
CREATE POLICY "bank_accounts_all" ON public.bank_accounts 
  FOR ALL USING (company_id = get_user_company_id());

-- 4. Adiciona a coluna bank_account_id na tabela de Transações (Transactions)
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL;

-- 5. Cria o índice para a coluna de relacionamento na tabela de Transações
CREATE INDEX IF NOT EXISTS idx_transactions_bank_account ON public.transactions(bank_account_id);

-- 6. Cria o trigger de updated_at para a tabela de Contas Bancárias
DROP TRIGGER IF EXISTS bank_accounts_updated_at ON public.bank_accounts;
CREATE TRIGGER bank_accounts_updated_at 
  BEFORE UPDATE ON public.bank_accounts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 7. Grant de acesso
GRANT ALL ON public.bank_accounts TO authenticated;
GRANT ALL ON public.bank_accounts TO service_role;
