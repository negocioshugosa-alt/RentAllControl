-- ============================================================
-- Criar bucket de storage para logos das empresas
-- Execute no SQL Editor do Supabase
-- ============================================================

-- Criar bucket público para logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos',
  'company-logos',
  true,
  2097152,  -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: usuário autenticado pode fazer upload na pasta da sua empresa
CREATE POLICY "company_logo_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'company-logos'
    AND auth.uid() IS NOT NULL
  );

-- Policy: leitura pública
CREATE POLICY "company_logo_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'company-logos');

-- Policy: usuário pode atualizar/deletar logo da sua empresa
CREATE POLICY "company_logo_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'company-logos'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "company_logo_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'company-logos'
    AND auth.uid() IS NOT NULL
  );

SELECT 'Storage configurado!' as status;
