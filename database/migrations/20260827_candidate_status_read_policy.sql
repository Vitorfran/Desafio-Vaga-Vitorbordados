-- Permite que cada candidato consulte somente o próprio status administrativo.
ALTER TABLE public.candidate_statuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "candidato le seu status" ON public.candidate_statuses;
CREATE POLICY "candidato le seu status" ON public.candidate_statuses
  FOR SELECT TO authenticated
  USING (auth.uid() = candidate_id);
