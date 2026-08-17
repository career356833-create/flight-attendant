# Supabase setup

The app remains fully usable in local-only mode. Cloud mode is opt-in and never needs a service-role key in browser code.

1. Create a Supabase project and copy its Project URL and anon/publishable key.
2. Add `NEXT_PUBLIC_SUPABASE_ENABLED=true`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local` and the deployment environment.
3. Apply all SQL files in `supabase/migrations` in filename order, including `0004_experience_sync_support.sql` (`supabase db push` when the CLI is linked, or through the SQL editor).
4. In Authentication, enable Email and choose whether confirmation is required. Add local and production URLs to Site URL/Redirect URLs, including `http://localhost:3000/**` and the production origin.
5. Confirm that `cabin-training-audio` exists as a private bucket. Verify all four `storage.objects` owner policies.
6. Verify RLS with two test users: each user must only select, insert, update, and delete rows whose `user_id` equals `auth.uid()`.
7. Generate authoritative database types only after linking the real project:
   `supabase gen types typescript --linked --schema public > lib/supabase/database.types.ts`
8. Start with `pnpm dev`. Set `NEXT_PUBLIC_SUPABASE_ENABLED=false` (or remove any required value) to return safely to local-only mode.

The development-only diagnostic in My > Account checks configuration, Auth reachability, the `profiles` and `career_experiences` columns, the private Storage bucket, and migration compatibility without displaying the key or full endpoint.

## Account deletion

`POST /api/account/delete` intentionally returns `not_configured`. Deleting an Auth user requires a separately protected server function with privileged credentials. Do not expose a service-role key through a `NEXT_PUBLIC_` variable. Configure that server-only function before presenting deletion as completed.

## Audio

Audio paths use `{user_id}/{entity_type}/{entity_id}/{file_name}`. The client keeps the IndexedDB recording first, uploads only after consent, and should use authenticated downloads or five-minute signed URLs. The bucket limit in the migration is 25 MB.
