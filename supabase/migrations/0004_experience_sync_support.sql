alter table public.career_experiences add column if not exists role_connection text not null default '';
alter table public.career_experiences add column if not exists device_id text;
create index if not exists career_experiences_user_client_updated on public.career_experiences(user_id,client_updated_at desc) where deleted_at is null;
comment on column public.career_experiences.legacy_id is 'Stable local ID used for idempotent local-to-cloud merges.';
comment on column public.career_experiences.client_updated_at is 'Client edit timestamp used for conflict detection; server updated_at remains trigger-managed.';
