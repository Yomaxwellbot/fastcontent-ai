-- Rate limiting table for unauthenticated endpoints (magic link, etc.)
-- Keyed by IP + action, counts attempts in a rolling window

create table public.rate_limits (
  id uuid default gen_random_uuid() primary key,
  key text not null,          -- e.g. "magic_link:1.2.3.4"
  action text not null,       -- e.g. "magic_link"
  count integer not null default 1,
  window_start timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index idx_rate_limits_key on public.rate_limits(key);
create index idx_rate_limits_window on public.rate_limits(key, window_start);

-- No RLS needed — only accessed via service role key server-side
-- Service role bypasses RLS by default
