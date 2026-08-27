-- Adiciona o idioma informado pelo candidato ao perfil profissional.
ALTER TABLE public.candidate_profiles
  ADD COLUMN IF NOT EXISTS language VARCHAR(50);
