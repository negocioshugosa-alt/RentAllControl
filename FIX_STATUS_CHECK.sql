-- ============================================================
-- RentAllControl — Correção de Constraint de Status
-- Execute esta query no SQL Editor do seu painel do Supabase
-- ============================================================

-- 1. Remove a restrição antiga se existir
ALTER TABLE equipment DROP CONSTRAINT IF EXISTS equipment_status_check;

-- 2. Adiciona a nova restrição incluindo o status 'vendido'
ALTER TABLE equipment ADD CONSTRAINT equipment_status_check 
  CHECK (status IN ('disponivel', 'alugado', 'manutencao', 'inativo', 'vendido'));
