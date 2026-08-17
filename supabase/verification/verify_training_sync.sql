-- Run in Supabase SQL Editor after selecting the target user in the Dashboard.
-- Replace :target_user_id in the editor UI; do not put email, transcript, path, or tokens here.
with target as (select cast(:target_user_id as uuid) as id)
select
  (select count(*) from public.interview_attempts i join target t on t.id=i.user_id where i.deleted_at is null) as interview_attempt_count,
  (select count(*) from public.self_introduction_attempts s join target t on t.id=s.user_id where s.deleted_at is null) as self_introduction_attempt_count,
  (select count(*) from public.interview_attempts i join target t on t.id=i.user_id where i.deleted_at is null and i.audio_path is not null) as interview_audio_path_count,
  (select count(*) from public.self_introduction_attempts s join target t on t.id=s.user_id where s.deleted_at is null and s.audio_path is not null) as self_introduction_audio_path_count,
  (select count(*) from public.user_audio_files a join target t on t.id=a.user_id where a.deleted_at is null) as audio_metadata_count;
