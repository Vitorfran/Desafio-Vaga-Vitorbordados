-- Respostas da segunda etapa, preenchida somente por candidatos aprovados.
CREATE TABLE IF NOT EXISTS public.candidate_second_stage_responses (
  candidate_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  embroidery_experience TEXT,
  availability TEXT,
  average_production TEXT,
  can_issue_invoice BOOLEAN,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.candidate_second_stage_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "candidato le suas respostas da segunda etapa" ON public.candidate_second_stage_responses;
CREATE POLICY "candidato le suas respostas da segunda etapa" ON public.candidate_second_stage_responses FOR SELECT TO authenticated USING (auth.uid() = candidate_id);
DROP POLICY IF EXISTS "candidato cria suas respostas da segunda etapa" ON public.candidate_second_stage_responses;
CREATE POLICY "candidato cria suas respostas da segunda etapa" ON public.candidate_second_stage_responses FOR INSERT TO authenticated WITH CHECK (auth.uid() = candidate_id);
DROP POLICY IF EXISTS "candidato atualiza suas respostas da segunda etapa" ON public.candidate_second_stage_responses;
CREATE POLICY "candidato atualiza suas respostas da segunda etapa" ON public.candidate_second_stage_responses FOR UPDATE TO authenticated USING (auth.uid() = candidate_id) WITH CHECK (auth.uid() = candidate_id);
DROP POLICY IF EXISTS "admin le respostas da segunda etapa" ON public.candidate_second_stage_responses;
CREATE POLICY "admin le respostas da segunda etapa" ON public.candidate_second_stage_responses FOR SELECT TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN');
