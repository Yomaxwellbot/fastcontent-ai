-- FastContent AI - Initial Schema
-- Run this in Supabase SQL Editor

-- ===========================================
-- PROFILES (extends auth.users)
-- ===========================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  stripe_customer_id text unique,
  subscription_status text not null default 'free',
  subscription_id text,
  price_id text,
  current_period_end timestamptz,
  generations_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ===========================================
-- GENERATIONS (content repurposing history)
-- ===========================================
create table public.generations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  input_text text not null,
  output_types text[] not null,
  results jsonb,
  created_at timestamptz not null default now()
);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================
alter table public.profiles enable row level security;
alter table public.generations enable row level security;

-- Profiles: users can read/update own row
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Generations: users can read/insert own rows
create policy "Users can read own generations"
  on public.generations for select
  using (auth.uid() = user_id);

create policy "Users can insert own generations"
  on public.generations for insert
  with check (auth.uid() = user_id);

-- ===========================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ===========================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ===========================================
-- INDEX FOR FAST LOOKUPS
-- ===========================================
create index idx_generations_user_id on public.generations(user_id);
create index idx_profiles_stripe_customer on public.profiles(stripe_customer_id);
