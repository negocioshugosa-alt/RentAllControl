-- Alter check constraint on payment_frequency to support 'unica'
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_payment_frequency_check;
ALTER TABLE contracts ADD CONSTRAINT contracts_payment_frequency_check CHECK (payment_frequency IN ('diario','semanal','quinzenal','mensal','unica'));

-- Add contract_value column to contracts table
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_value DECIMAL(12,2);
