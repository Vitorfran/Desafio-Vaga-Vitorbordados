-- Adiciona a foto do candidato no Storage privado do Supabase.
ALTER TABLE public.candidate_profiles
  ADD COLUMN IF NOT EXISTS avatar_storage_key TEXT;

DROP POLICY IF EXISTS "candidato atualiza seus arquivos" ON storage.objects;
CREATE POLICY "candidato atualiza seus arquivos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'desafio-arquivos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'desafio-arquivos' AND (storage.foldername(name))[1] = auth.uid()::text);
