-- Funções administrativas para avaliação, status e gatilhos de e-mail.
-- Execute este arquivo no SQL Editor do Supabase.

CREATE TABLE IF NOT EXISTS public.candidate_statuses (
  candidate_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'AGUARDANDO_ENVIO',
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'QUEUED',
  provider_message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

CREATE OR REPLACE FUNCTION public.admin_update_candidate_status(
  p_candidate_id UUID,
  p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  candidato RECORD;
  submissao_id UUID;
  assunto TEXT;
  corpo TEXT;
  evento TEXT;
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') <> 'ADMIN' THEN
    RAISE EXCEPTION 'Acesso administrativo negado';
  END IF;
  IF p_status NOT IN ('AGUARDANDO_ENVIO', 'ENVIADO', 'EM_ANALISE', 'APROVADO', 'DESCLASSIFICADO') THEN
    RAISE EXCEPTION 'Status inválido';
  END IF;

  SELECT id, email, COALESCE(raw_user_meta_data ->> 'nome', 'candidato') AS nome
  INTO candidato FROM auth.users WHERE id = p_candidate_id;
  IF candidato.id IS NULL THEN RAISE EXCEPTION 'Candidato não encontrado'; END IF;

  INSERT INTO public.candidate_statuses (candidate_id, status, updated_by)
  VALUES (p_candidate_id, p_status, auth.uid())
  ON CONFLICT (candidate_id) DO UPDATE SET status = EXCLUDED.status, updated_by = EXCLUDED.updated_by, updated_at = NOW();

  SELECT id INTO submissao_id FROM public.submissions
  WHERE candidate_id = p_candidate_id ORDER BY submitted_at DESC LIMIT 1;
  IF submissao_id IS NOT NULL AND p_status IN ('ENVIADO', 'EM_ANALISE', 'APROVADO', 'DESCLASSIFICADO') THEN
    UPDATE public.submissions SET status = p_status WHERE id = submissao_id;
  END IF;

  IF p_status IN ('APROVADO', 'DESCLASSIFICADO') THEN
    evento := CASE WHEN p_status = 'APROVADO' THEN 'CANDIDATO_APROVADO' ELSE 'CANDIDATO_DESCLASSIFICADO' END;
    assunto := CASE WHEN p_status = 'APROVADO' THEN 'Resultado do processo seletivo - Vitor Bordados' ELSE 'Agradecimento pela sua participação - Vitor Bordados' END;
    corpo := CASE WHEN p_status = 'APROVADO' THEN format('Olá, %s. Temos uma ótima notícia: você foi aprovado(a) nesta etapa do processo seletivo da Vitor Bordados. Em breve entraremos em contato com os próximos passos.', candidato.nome) ELSE format('Olá, %s. Agradecemos sua participação e o cuidado dedicado ao desafio. Neste momento, seguiremos com outros candidatos, mas ficamos felizes em conhecer seu trabalho. Desejamos sucesso na sua jornada profissional.', candidato.nome) END;
    INSERT INTO public.email_events (candidate_id, event_type, recipient_email, subject, body)
    SELECT p_candidate_id, evento, candidato.email, assunto, corpo
    WHERE NOT EXISTS (SELECT 1 FROM public.email_events WHERE candidate_id = p_candidate_id AND event_type = evento AND status IN ('QUEUED', 'SENT'));
  END IF;

  RETURN jsonb_build_object('candidate_id', p_candidate_id, 'status', p_status);
END;
$$;

-- Versão sem notificações: neste momento a mudança de status apenas persiste no painel.
CREATE OR REPLACE FUNCTION public.admin_update_candidate_status(p_candidate_id UUID, p_status TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE existe BOOLEAN;
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') <> 'ADMIN' THEN RAISE EXCEPTION 'Acesso administrativo negado'; END IF;
  IF p_status NOT IN ('AGUARDANDO_ENVIO', 'ENVIADO', 'EM_ANALISE', 'APROVADO', 'DESCLASSIFICADO') THEN RAISE EXCEPTION 'Status inválido'; END IF;
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE id = p_candidate_id) INTO existe;
  IF NOT existe THEN RAISE EXCEPTION 'Candidato não encontrado'; END IF;
  INSERT INTO public.candidate_statuses (candidate_id, status, updated_by)
  VALUES (p_candidate_id, p_status, auth.uid())
  ON CONFLICT (candidate_id) DO UPDATE SET status = EXCLUDED.status, updated_by = EXCLUDED.updated_by, updated_at = NOW();
  RETURN jsonb_build_object('candidate_id', p_candidate_id, 'status', p_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_save_evaluation(
  p_submission_id UUID,
  p_average_score NUMERIC,
  p_recommendation TEXT,
  p_internal_comment TEXT,
  p_candidate_comment TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE avaliacao RECORD;
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') <> 'ADMIN' THEN
    RAISE EXCEPTION 'Acesso administrativo negado';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.submissions WHERE id = p_submission_id) THEN
    RAISE EXCEPTION 'Entrega não encontrada';
  END IF;

  INSERT INTO public.evaluations (submission_id, evaluator_id, average_score, recommendation, internal_comment, candidate_comment)
  VALUES (p_submission_id, auth.uid(), p_average_score, p_recommendation, p_internal_comment, p_candidate_comment)
  ON CONFLICT (submission_id) DO UPDATE SET
    evaluator_id = EXCLUDED.evaluator_id,
    average_score = EXCLUDED.average_score,
    recommendation = EXCLUDED.recommendation,
    internal_comment = EXCLUDED.internal_comment,
    candidate_comment = EXCLUDED.candidate_comment,
    updated_at = NOW()
  RETURNING * INTO avaliacao;
  RETURN to_jsonb(avaliacao);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_candidate_status(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_save_evaluation(UUID, NUMERIC, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_candidate_status(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_evaluation(UUID, NUMERIC, TEXT, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
