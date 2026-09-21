-- Expande a listagem administrativa com o desafio realizado e a indicação de entrega.
DROP FUNCTION IF EXISTS public.admin_list_candidates();

CREATE FUNCTION public.admin_list_candidates()
RETURNS TABLE (
  id UUID,
  nome TEXT,
  email TEXT,
  cidade TEXT,
  wilcom TEXT,
  nivel TEXT,
  status TEXT,
  nota NUMERIC,
  atualizado_em TIMESTAMPTZ,
  desafio_titulo TEXT,
  tem_entrega BOOLEAN
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
    COALESCE(s.submitted_at, u.created_at),
    c.title::TEXT,
    (s.id IS NOT NULL)
  FROM auth.users u
  LEFT JOIN public.candidate_profiles p ON p.user_id = u.id
  LEFT JOIN LATERAL (
    SELECT s1.status, s1.submitted_at, s1.id, s1.challenge_id
    FROM public.submissions s1
    WHERE s1.candidate_id = u.id
    ORDER BY s1.submitted_at DESC
    LIMIT 1
  ) s ON TRUE
  LEFT JOIN public.evaluations e ON e.submission_id = s.id
  LEFT JOIN public.challenges c ON c.id = s.challenge_id
  LEFT JOIN public.candidate_statuses cs ON cs.candidate_id = u.id
  WHERE COALESCE(u.raw_app_meta_data ->> 'role', 'CANDIDATE') <> 'ADMIN'
  ORDER BY COALESCE(s.submitted_at, u.created_at) DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_candidates() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_candidates() TO authenticated;
