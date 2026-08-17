do $$ begin
  create type public.application_status as enum ('planning','drafting','ready','submitted','screening','interview','offer','rejected','withdrawn','archived');
exception when duplicate_object then null; end $$;

create table if not exists public.airline_applications(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  legacy_id text,
  airline_id text,
  airline_name_snapshot text not null default '',
  position_title text not null default '',
  status public.application_status not null default 'planning',
  deadline_at timestamptz,
  submitted_at timestamptz,
  interview_at timestamptz,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(user_id,legacy_id)
);

create table if not exists public.application_drafts(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null references public.airline_applications(id) on delete cascade,
  legacy_id text,
  title text not null default '',
  version_number integer not null default 1 check(version_number > 0),
  content_json jsonb not null default '{}'::jsonb,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(user_id,legacy_id),
  unique(application_id,version_number)
);

create table if not exists public.application_activity_logs(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null references public.airline_applications(id) on delete cascade,
  activity_type text not null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.application_answers add column if not exists application_id uuid references public.airline_applications(id) on delete set null;
alter table public.application_answers add column if not exists question_key text;
alter table public.application_answers add column if not exists question_text_snapshot text;
alter table public.application_answers add column if not exists answer_text text;
alter table public.application_answers add column if not exists answer_order integer not null default 0;

create index if not exists airline_applications_user_updated on public.airline_applications(user_id,updated_at desc);
create index if not exists airline_applications_user_status on public.airline_applications(user_id,status);
create index if not exists application_drafts_user_application on public.application_drafts(user_id,application_id,updated_at desc);
create index if not exists application_activity_logs_user_application on public.application_activity_logs(user_id,application_id,occurred_at desc);
create index if not exists application_answers_application_updated on public.application_answers(user_id,application_id,updated_at desc);

alter table public.airline_applications enable row level security;
alter table public.application_drafts enable row level security;
alter table public.application_activity_logs enable row level security;
do $$ declare t text; begin foreach t in array array['airline_applications','application_drafts','application_activity_logs'] loop
  execute format('drop policy if exists %I_select_own on public.%I',t,t);
  execute format('create policy %I_select_own on public.%I for select to authenticated using(auth.uid()=user_id)',t,t);
  execute format('drop policy if exists %I_insert_own on public.%I',t,t);
  execute format('create policy %I_insert_own on public.%I for insert to authenticated with check(auth.uid()=user_id)',t,t);
  execute format('drop policy if exists %I_update_own on public.%I',t,t);
  execute format('create policy %I_update_own on public.%I for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id)',t,t);
  execute format('drop policy if exists %I_delete_own on public.%I',t,t);
  execute format('create policy %I_delete_own on public.%I for delete to authenticated using(auth.uid()=user_id)',t,t);
end loop; end $$;

drop trigger if exists set_airline_applications_updated_at on public.airline_applications;
create trigger set_airline_applications_updated_at before update on public.airline_applications for each row execute function public.set_updated_at();
drop trigger if exists set_application_drafts_updated_at on public.application_drafts;
create trigger set_application_drafts_updated_at before update on public.application_drafts for each row execute function public.set_updated_at();
