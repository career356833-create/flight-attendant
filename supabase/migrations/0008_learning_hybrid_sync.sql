create table if not exists public.user_learning_profiles(
  user_id uuid primary key references auth.users(id) on delete cascade,
  onboarding_snapshot jsonb not null default '{}'::jsonb,
  target_airline_ids jsonb not null default '[]'::jsonb,
  learning_priorities jsonb not null default '[]'::jsonb,
  weekly_available_minutes integer,
  current_plan_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.weekly_plans add column if not exists plan_json jsonb not null default '{}'::jsonb;
alter table public.weekly_plans add column if not exists completion_json jsonb not null default '{}'::jsonb;
alter table public.weekly_plans add column if not exists progress_percent integer not null default 0;
alter table public.user_learning_profiles enable row level security;
drop policy if exists user_learning_profiles_select_own on public.user_learning_profiles;
drop policy if exists user_learning_profiles_insert_own on public.user_learning_profiles;
drop policy if exists user_learning_profiles_update_own on public.user_learning_profiles;
drop policy if exists user_learning_profiles_delete_own on public.user_learning_profiles;
create policy user_learning_profiles_select_own on public.user_learning_profiles for select to authenticated using(auth.uid()=user_id);
create policy user_learning_profiles_insert_own on public.user_learning_profiles for insert to authenticated with check(auth.uid()=user_id);
create policy user_learning_profiles_update_own on public.user_learning_profiles for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy user_learning_profiles_delete_own on public.user_learning_profiles for delete to authenticated using(auth.uid()=user_id);
drop trigger if exists set_user_learning_profiles_updated_at on public.user_learning_profiles;
create trigger set_user_learning_profiles_updated_at before update on public.user_learning_profiles for each row execute function public.set_updated_at();
