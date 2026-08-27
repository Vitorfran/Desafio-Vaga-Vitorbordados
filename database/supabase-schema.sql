-- Banco do portal usando o Supabase Auth.
-- Execute no SQL Editor do Supabase antes de testar o cadastro/perfil.

CREATE TABLE IF NOT EXISTS public.candidate_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone VARCHAR(40),
  city VARCHAR(100),
  state VARCHAR(2),
  wilcom_experience VARCHAR(80),
  wilcom_level VARCHAR(30),
  language VARCHAR(50),
  professional_description TEXT,
  portfolio_url TEXT,
  consent_at TIMESTAMPTZ,
  profile_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  accepted_extensions JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_file_size_bytes BIGINT NOT NULL DEFAULT 104857600,
  opens_at TIMESTAMPTZ,
  closes_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED')),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE RESTRICT,
  version_number INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ENVIADO',
  candidate_notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(candidate_id, challenge_id, version_number)
);

CREATE TABLE IF NOT EXISTS public.submission_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  size_bytes BIGINT NOT NULL,
  sha256 CHAR(64),
  is_preview BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.challenge_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  size_bytes BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.candidate_statuses (
  candidate_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'AGUARDANDO_ENVIO' CHECK (status IN ('AGUARDANDO_ENVIO', 'ENVIADO', 'EM_ANALISE', 'APROVADO', 'DESCLASSIFICADO')),
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
  status VARCHAR(20) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'SENT', 'FAILED')),
  provider_message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_email_events_status ON public.email_events(status, created_at);

ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "candidato le proprio perfil" ON public.candidate_profiles;
CREATE POLICY "candidato le proprio perfil" ON public.candidate_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "candidato cria proprio perfil" ON public.candidate_profiles;
CREATE POLICY "candidato cria proprio perfil" ON public.candidate_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "candidato atualiza proprio perfil" ON public.candidate_profiles;
CREATE POLICY "candidato atualiza proprio perfil" ON public.candidate_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "candidatos veem desafios publicados" ON public.challenges;
CREATE POLICY "candidatos veem desafios publicados" ON public.challenges FOR SELECT TO authenticated USING (status = 'PUBLISHED' AND (opens_at IS NULL OR opens_at <= NOW()) AND (closes_at IS NULL OR closes_at >= NOW()));

DROP POLICY IF EXISTS "candidato le suas submissões" ON public.submissions;
CREATE POLICY "candidato le suas submissões" ON public.submissions FOR SELECT TO authenticated USING (auth.uid() = candidate_id);
DROP POLICY IF EXISTS "candidato cria suas submissões" ON public.submissions;
CREATE POLICY "candidato cria suas submissões" ON public.submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = candidate_id);

DROP POLICY IF EXISTS "candidato le seus arquivos" ON public.submission_files;
CREATE POLICY "candidato le seus arquivos" ON public.submission_files FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = submission_id AND s.candidate_id = auth.uid()));
DROP POLICY IF EXISTS "candidato cria seus arquivos" ON public.submission_files;
CREATE POLICY "candidato cria seus arquivos" ON public.submission_files FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = submission_id AND s.candidate_id = auth.uid()));

DROP POLICY IF EXISTS "candidato le arquivos do desafio" ON public.challenge_files;
CREATE POLICY "candidato le arquivos do desafio" ON public.challenge_files FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_id AND c.status = 'PUBLISHED'));
DROP POLICY IF EXISTS "admin cria arquivos do desafio" ON public.challenge_files;
CREATE POLICY "admin cria arquivos do desafio" ON public.challenge_files FOR INSERT TO authenticated WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN');
DROP POLICY IF EXISTS "admin le arquivos do desafio" ON public.challenge_files;
CREATE POLICY "admin le arquivos do desafio" ON public.challenge_files FOR SELECT TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN');

INSERT INTO storage.buckets (id, name, public)
VALUES ('desafio-arquivos', 'desafio-arquivos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "candidato envia seus arquivos" ON storage.objects;
CREATE POLICY "candidato envia seus arquivos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'desafio-arquivos' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "candidato le seus arquivos storage" ON storage.objects;
CREATE POLICY "candidato le seus arquivos storage" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'desafio-arquivos' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "candidato baixa referencias publicadas" ON storage.objects;
CREATE POLICY "candidato baixa referencias publicadas" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'desafio-arquivos'
  AND (storage.foldername(name))[1] = 'desafios'
  AND EXISTS (
    SELECT 1 FROM public.challenge_files cf
    JOIN public.challenges c ON c.id = cf.challenge_id
    WHERE cf.storage_key = name AND c.status = 'PUBLISHED'
  )
);
DROP POLICY IF EXISTS "admin envia arquivos do desafio" ON storage.objects;
CREATE POLICY "admin envia arquivos do desafio" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'desafio-arquivos' AND (storage.foldername(name))[1] = 'desafios' AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN');
DROP POLICY IF EXISTS "admin le arquivos do desafio" ON storage.objects;
CREATE POLICY "admin le arquivos do desafio" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'desafio-arquivos' AND (storage.foldername(name))[1] = 'desafios' AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN');
DROP POLICY IF EXISTS "admin baixa entregas" ON storage.objects;
CREATE POLICY "admin baixa entregas" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'desafio-arquivos' AND (storage.foldername(name))[1] <> 'desafios' AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN');

-- O painel administrativo deve usar o backend com a chave secreta após validar a role.

-- Migração para projetos que executaram o schema antigo com referências em public.users.
-- O usuário autenticado pelo Supabase Auth sempre existe em auth.users.
ALTER TABLE IF EXISTS public.candidate_profiles DROP CONSTRAINT IF EXISTS candidate_profiles_user_id_fkey;
ALTER TABLE IF EXISTS public.candidate_profiles
  ADD CONSTRAINT candidate_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.submissions DROP CONSTRAINT IF EXISTS submissions_candidate_id_fkey;
ALTER TABLE IF EXISTS public.submissions
  ADD CONSTRAINT submissions_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.evaluations DROP CONSTRAINT IF EXISTS evaluations_evaluator_id_fkey;
ALTER TABLE IF EXISTS public.evaluations
  ADD CONSTRAINT evaluations_evaluator_id_fkey FOREIGN KEY (evaluator_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

ALTER TABLE IF EXISTS public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_actor_id_fkey;
ALTER TABLE IF EXISTS public.audit_logs
  ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Funções administrativas: o frontend usa a chave pública, mas estas funções
-- só executam quando o JWT possui app_metadata.role = ADMIN.
CREATE OR REPLACE FUNCTION public.admin_list_candidates()
RETURNS TABLE (
  id UUID,
  nome TEXT,
  email TEXT,
  cidade TEXT,
  wilcom TEXT,
  nivel TEXT,
  status TEXT,
  nota NUMERIC,
  atualizado_em TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') <> 'ADMIN' THEN
    RAISE EXCEPTION 'Acesso administrativo negado';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    COALESCE(u.raw_user_meta_data ->> 'nome', u.email)::TEXT,
    u.email::TEXT,
    NULLIF(CONCAT_WS(', ', p.city, p.state), '')::TEXT,
    p.wilcom_experience::TEXT,
    p.wilcom_level::TEXT,
    COALESCE(cs.status, s.status, 'AGUARDANDO_ENVIO')::TEXT,
    e.average_score,
    COALESCE(s.submitted_at, u.created_at)
  FROM auth.users u
  LEFT JOIN public.candidate_profiles p ON p.user_id = u.id
  LEFT JOIN LATERAL (
    SELECT s1.status, s1.submitted_at, s1.id
    FROM public.submissions s1
    WHERE s1.candidate_id = u.id
    ORDER BY s1.submitted_at DESC
    LIMIT 1
  ) s ON TRUE
  LEFT JOIN public.evaluations e ON e.submission_id = s.id
  LEFT JOIN public.candidate_statuses cs ON cs.candidate_id = u.id
  WHERE COALESCE(u.raw_app_meta_data ->> 'role', 'CANDIDATE') <> 'ADMIN'
  ORDER BY COALESCE(s.submitted_at, u.created_at) DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_challenges()
RETURNS SETOF public.challenges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') <> 'ADMIN' THEN
    RAISE EXCEPTION 'Acesso administrativo negado';
  END IF;
  RETURN QUERY SELECT * FROM public.challenges ORDER BY created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_challenge(
  p_title TEXT,
  p_description TEXT,
  p_requirements JSONB DEFAULT '[]'::JSONB,
  p_accepted_extensions JSONB DEFAULT '[]'::JSONB,
  p_opens_at TIMESTAMPTZ DEFAULT NULL,
  p_closes_at TIMESTAMPTZ DEFAULT NULL,
  p_status TEXT DEFAULT 'DRAFT'
)
RETURNS public.challenges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  novo public.challenges;
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') <> 'ADMIN' THEN
    RAISE EXCEPTION 'Acesso administrativo negado';
  END IF;
  IF NULLIF(BTRIM(p_title), '') IS NULL OR NULLIF(BTRIM(p_description), '') IS NULL THEN
    RAISE EXCEPTION 'Título e descrição são obrigatórios';
  END IF;
  IF p_status NOT IN ('DRAFT', 'PUBLISHED') THEN
    RAISE EXCEPTION 'Status inválido';
  END IF;

  INSERT INTO public.challenges (title, description, requirements, accepted_extensions, opens_at, closes_at, status)
  VALUES (BTRIM(p_title), BTRIM(p_description), COALESCE(p_requirements, '[]'::JSONB), COALESCE(p_accepted_extensions, '[]'::JSONB), p_opens_at, p_closes_at, p_status)
  RETURNING * INTO novo;
  RETURN novo;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_challenge_status(p_id UUID, p_status TEXT)
RETURNS public.challenges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  atualizado public.challenges;
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') <> 'ADMIN' THEN
    RAISE EXCEPTION 'Acesso administrativo negado';
  END IF;
  IF p_status NOT IN ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED') THEN
    RAISE EXCEPTION 'Status inválido';
  END IF;
  UPDATE public.challenges SET status = p_status, updated_at = NOW() WHERE id = p_id RETURNING * INTO atualizado;
  IF atualizado.id IS NULL THEN RAISE EXCEPTION 'Desafio não encontrado'; END IF;
  RETURN atualizado;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_candidates() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_challenges() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_create_challenge(TEXT, TEXT, JSONB, JSONB, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_challenge_status(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_candidates() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_challenges() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_challenge(TEXT, TEXT, JSONB, JSONB, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_challenge_status(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_candidate_detail(p_candidate_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE resultado JSONB;
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') <> 'ADMIN' THEN RAISE EXCEPTION 'Acesso administrativo negado'; END IF;
  SELECT jsonb_build_object(
    'id', u.id,
    'nome', COALESCE(u.raw_user_meta_data ->> 'nome', u.email),
    'email', u.email,
    'criado_em', u.created_at,
    'perfil', to_jsonb(p),
    'status', COALESCE(cs.status, 'AGUARDANDO_ENVIO'),
    'submissoes', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', s.id, 'status', s.status, 'version_number', s.version_number, 'submitted_at', s.submitted_at,
      'candidate_notes', s.candidate_notes,
      'arquivos', COALESCE((SELECT jsonb_agg(to_jsonb(sf)) FROM public.submission_files sf WHERE sf.submission_id = s.id), '[]'::jsonb),
      'avaliacao', (SELECT to_jsonb(e) FROM public.evaluations e WHERE e.submission_id = s.id)
    ) ORDER BY s.submitted_at DESC) FROM public.submissions s WHERE s.candidate_id = u.id), '[]'::jsonb)
  ) INTO resultado
  FROM auth.users u
  LEFT JOIN public.candidate_profiles p ON p.user_id = u.id
  LEFT JOIN public.candidate_statuses cs ON cs.candidate_id = u.id
  WHERE u.id = p_candidate_id;
  IF resultado IS NULL THEN RAISE EXCEPTION 'Candidato não encontrado'; END IF;
  RETURN resultado;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_candidate_status(p_candidate_id UUID, p_status TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE candidato RECORD; resultado JSONB; assunto TEXT; corpo TEXT; evento TEXT;
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') <> 'ADMIN' THEN RAISE EXCEPTION 'Acesso administrativo negado'; END IF;
  IF p_status NOT IN ('AGUARDANDO_ENVIO', 'ENVIADO', 'EM_ANALISE', 'APROVADO', 'DESCLASSIFICADO') THEN RAISE EXCEPTION 'Status inválido'; END IF;
  SELECT id, email, COALESCE(raw_user_meta_data ->> 'nome', 'candidato') AS nome INTO candidato FROM auth.users WHERE id = p_candidate_id;
  IF candidato.id IS NULL THEN RAISE EXCEPTION 'Candidato não encontrado'; END IF;
  INSERT INTO public.candidate_statuses (candidate_id, status, updated_by) VALUES (p_candidate_id, p_status, auth.uid())
  ON CONFLICT (candidate_id) DO UPDATE SET status = EXCLUDED.status, updated_by = EXCLUDED.updated_by, updated_at = NOW();
  UPDATE public.submissions SET status = CASE WHEN p_status = 'DESCLASSIFICADO' THEN 'DESCLASSIFICADO' WHEN p_status = 'APROVADO' THEN 'APROVADO' WHEN p_status = 'EM_ANALISE' THEN 'EM_ANALISE' ELSE status END WHERE id = (SELECT s.id FROM public.submissions s WHERE s.candidate_id = p_candidate_id ORDER BY submitted_at DESC LIMIT 1);
  IF p_status IN ('APROVADO', 'DESCLASSIFICADO') THEN
    evento := CASE WHEN p_status = 'APROVADO' THEN 'CANDIDATO_APROVADO' ELSE 'CANDIDATO_DESCLASSIFICADO' END;
    assunto := CASE WHEN p_status = 'APROVADO' THEN 'Resultado do processo seletivo - Vitor Bordados' ELSE 'Agradecimento pela sua participação - Vitor Bordados' END;
    corpo := CASE WHEN p_status = 'APROVADO' THEN format('Olá, %s. Temos uma ótima notícia: você foi aprovado(a) nesta etapa do processo seletivo da Vitor Bordados. Em breve entraremos em contato com os próximos passos.', candidato.nome) ELSE format('Olá, %s. Agradecemos muito sua participação e o cuidado dedicado ao desafio. Neste momento, seguiremos com outros candidatos, mas ficamos felizes em conhecer seu trabalho. Desejamos sucesso na sua jornada profissional.', candidato.nome) END;
    INSERT INTO public.email_events (candidate_id, event_type, recipient_email, subject, body)
    SELECT p_candidate_id, evento, candidato.email, assunto, corpo
    WHERE NOT EXISTS (SELECT 1 FROM public.email_events ee WHERE ee.candidate_id = p_candidate_id AND ee.event_type = evento AND ee.status IN ('QUEUED', 'SENT'));
  END IF;
  SELECT public.admin_get_candidate_detail(p_candidate_id) INTO resultado;
  RETURN resultado;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_save_evaluation(p_submission_id UUID, p_average_score NUMERIC, p_recommendation TEXT, p_internal_comment TEXT, p_candidate_comment TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE avaliacao public.evaluations;
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') <> 'ADMIN' THEN RAISE EXCEPTION 'Acesso administrativo negado'; END IF;
  INSERT INTO public.evaluations (submission_id, evaluator_id, average_score, recommendation, internal_comment, candidate_comment)
  VALUES (p_submission_id, auth.uid(), p_average_score, p_recommendation, p_internal_comment, p_candidate_comment)
  ON CONFLICT (submission_id) DO UPDATE SET evaluator_id = EXCLUDED.evaluator_id, average_score = EXCLUDED.average_score, recommendation = EXCLUDED.recommendation, internal_comment = EXCLUDED.internal_comment, candidate_comment = EXCLUDED.candidate_comment, updated_at = NOW()
  RETURNING * INTO avaliacao;
  RETURN to_jsonb(avaliacao);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_candidate_detail(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_update_candidate_status(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_save_evaluation(UUID, NUMERIC, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_candidate_detail(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_candidate_status(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_evaluation(UUID, NUMERIC, TEXT, TEXT, TEXT) TO authenticated;

-- Atualização de status sem envio automático de e-mails.
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
