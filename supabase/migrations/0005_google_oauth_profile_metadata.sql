alter table public.profiles
  add column if not exists avatar_url text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  insert into public.profiles(id, display_name, avatar_url)
  values(
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict(id) do update
  set
    display_name=coalesce(public.profiles.display_name, excluded.display_name),
    avatar_url=coalesce(public.profiles.avatar_url, excluded.avatar_url);
  return new;
end
$$;
