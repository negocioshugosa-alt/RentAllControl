-- ============================================================
-- RentAllControl — Atualizações de Contratos
-- Execute no SQL Editor do projeto RENTALLCONTROL
-- ============================================================

-- 1. Adicionar colunas novas na tabela contracts
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS contract_value DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS file_url TEXT;

-- 2. Atualizar o CHECK de payment_frequency para incluir 'unica'
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_payment_frequency_check;
ALTER TABLE contracts ADD CONSTRAINT contracts_payment_frequency_check
  CHECK (payment_frequency IN ('diario','semanal','quinzenal','mensal','unica'));

-- 3. Criar bucket para arquivos de contratos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contract-files',
  'contract-files',
  true,
  10485760,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- 4. Policies do bucket
CREATE POLICY IF NOT EXISTS "contract_files_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'contract-files' AND auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS "contract_files_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'contract-files');

CREATE POLICY IF NOT EXISTS "contract_files_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'contract-files' AND auth.uid() IS NOT NULL);

SELECT 'Contratos atualizado!' as status;
