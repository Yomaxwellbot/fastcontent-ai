-- Token-based metering for $6/mo plan
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tokens_used_this_period bigint NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS token_limit bigint NOT NULL DEFAULT 1000000;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS period_started_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS period_ends_at timestamptz;

ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS tokens_used integer;

-- Atomic token increment function
CREATE OR REPLACE FUNCTION public.increment_tokens_used(p_user_id uuid, p_tokens bigint)
RETURNS void AS $$
  UPDATE public.profiles
  SET tokens_used_this_period = tokens_used_this_period + p_tokens,
      updated_at = now()
  WHERE id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER;
