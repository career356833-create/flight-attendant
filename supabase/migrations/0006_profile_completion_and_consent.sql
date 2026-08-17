alter table public.profiles
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists birth_date date,
  add column if not exists kakao_id text,
  add column if not exists profile_completed boolean not null default false,
  add column if not exists required_terms_version text,
  add column if not exists privacy_consent_version text,
  add column if not exists required_terms_agreed_at timestamptz,
  add column if not exists privacy_consent_agreed_at timestamptz,
  add column if not exists marketing_consent boolean not null default false,
  add column if not exists marketing_consent_at timestamptz,
  add column if not exists kakao_contact_consent boolean not null default false,
  add column if not exists kakao_contact_consent_at timestamptz,
  add column if not exists sms_notification_consent boolean not null default false,
  add column if not exists sms_notification_consent_at timestamptz,
  add column if not exists age_verified_at timestamptz,
  add column if not exists is_under_14 boolean,
  add column if not exists phone_verified boolean not null default false,
  add column if not exists phone_verified_at timestamptz;

comment on column public.profiles.birth_date is
  'Used only for age-gate/legal-consent flow and profile display. Never use for recommendations, readiness, learning analytics, or AI.';

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check(auth.uid()=id);
