# Supabase integration test checklist

Only mark items complete after connecting a real test project. Never paste credentials, access tokens, or passwords into logs or reports.

## Execution record — 2026-07-20

Environment: `D:\Projects\flight-attendant`, Next.js 16.2.6.

| Area | Result | Evidence / reason |
| --- | --- | --- |
| Code validation | PASS | Hybrid repository, queue, conflict model, diagnostic UI, and migrations `0001`–`0004` are present. |
| Local fallback | PASS | Missing runtime configuration selects `LocalExperienceRepository`; TypeScript and production build passed. |
| Hybrid browser simulation | SKIPPED | The development-only 9-scenario runner is present, but no browser automation dependency is installed in this project. |
| Supabase connection | SKIPPED | `NEXT_PUBLIC_SUPABASE_ENABLED`, URL, and anon key are not configured. |
| Auth / profile | SKIPPED | No real Supabase project configuration or dedicated test accounts were supplied. |
| Experience server CRUD | SKIPPED | Requires authenticated disposable test accounts. |
| RLS A/B isolation | SKIPPED | Test-user A/B credentials are not configured. |
| Local experience merge | SKIPPED | Cloud merge requires an authenticated test project; existing user data was not uploaded automatically. |
| Other-browser restore | SKIPPED | Requires a real authenticated cloud session. |
| Offline queue against server | SKIPPED | Local queue code was validated statically; live retry requires a configured project. |
| Conflict resolution against server | SKIPPED | Local conflict implementation exists; a live two-browser conflict requires test accounts. |
| Storage bucket | SKIPPED | Bucket access cannot be checked without Supabase configuration. |
| Audio upload | SKIPPED | Explicitly outside this phase. |
| TypeScript | PASS | `node_modules\\.bin\\tsc.cmd --noEmit`. |
| Production build | PASS | `npm run build`; 12 routes generated successfully. |
| Lint | SKIPPED | The `lint` script exists, but ESLint is not installed in `devDependencies`. |

No migration was applied and no remote or existing user data was created, changed, or deleted during this run.

### Re-run confirmation — 2026-07-20

The requested live verification was attempted again. Only `.env.example` is present; Supabase remains disabled, URL/anon key are empty, and both dedicated A/B test accounts are absent. Per the stop condition, live Auth, RLS, CRUD, multi-browser, queue-to-server, conflict, and Storage checks remain `SKIPPED`. TypeScript and the 12-route production build passed again. No remote data or migration was changed.

## Setup

- [ ] Set `NEXT_PUBLIC_SUPABASE_ENABLED=true`, Project URL, and anon/publishable key in `.env.local`.
- [ ] Apply migrations `0001` through `0004` in order.
- [ ] Configure Email Auth and decide whether confirmation is required.
- [ ] Add `http://localhost:3000/**`, the actual local port, and production origin to Redirect URLs.
- [ ] Open My > Supabase connection diagnostic; confirm Auth, DB, Storage, and migration checks.

## Authentication and profile

- [ ] Sign up with a dedicated test email; confirm the UI shows verification pending when required.
- [ ] Verify the email and sign in; reload and confirm the session is restored.
- [ ] Confirm exactly one `profiles` row exists with `id = auth.users.id` and no duplicated email column.
- [ ] Delete only the profile row in a disposable project, sign in again, and confirm `ensureUserProfile()` recreates it.
- [ ] Request a password-reset email and verify the redirect reaches `?auth=reset`.
- [ ] Sign out and confirm experience CRUD continues in local-only repository mode.

## Experience CRUD and merge

- [ ] While signed out, create and edit two experiences, duplicate one, delete the copy, and verify search/filter and STAR+L autosave.
- [ ] Sign in and choose “모두 계정에 연결”; verify per-item progress and ID mappings in `cabin-experience-id-map-v1`.
- [ ] Confirm `career_experiences` preserves timestamps, tags, usage count, status, legacy ID, and role connection.
- [ ] Create, update, duplicate, and delete an experience while online; confirm local UI changes before the network response.
- [ ] Enable browser offline mode, edit and delete separate experiences, and verify pending queue items remain.
- [ ] Restore the network; verify only experience queue items retry and completed items disappear.
- [ ] Make different STAR+L edits on two browsers, sync both, and resolve with keep local, keep server, keep both, and field merge.

## RLS isolation — two dedicated users

- [ ] User A creates an experience and records its UUID.
- [ ] User A can select, update, and soft-delete that row.
- [ ] User B creates and reads their own experience.
- [ ] As User B, direct-select User A’s UUID: expect no row or permission denial.
- [ ] As User B, attempt update and delete for User A’s UUID: expect zero affected rows or denial.
- [ ] As User B, attempt insert with `user_id = User A`: expect RLS denial.
- [ ] Confirm `profiles` only allows `auth.uid() = id`.

## Other-browser restoration

- [ ] Browser A signs in, creates an experience, and reaches “계정에 저장됨”.
- [ ] Browser B/private window signs into the same account and pulls identical content.
- [ ] Browser B edits the item; Browser A pulls again and receives the update or an explicit conflict.
- [ ] A server soft-deleted experience does not return in a fresh browser.

## Troubleshooting

- `not_configured`: check enabled flag, HTTPS Project URL, and anon key.
- Auth works but DB fails: apply migrations and inspect RLS policies.
- `role_connection` missing: apply `0004_experience_sync_support.sql`.
- Upload diagnostic fails: confirm `cabin-training-audio` is private and storage policies exist.
- Repeated queue failure: inspect the item’s error; RLS/JWT failures intentionally do not retry forever.
