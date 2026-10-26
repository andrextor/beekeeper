# B5 · Photos — plan

Spec: `docs/superpowers/specs/2026-10-25-backend-05-photos-design.md` · Branch: `feat/b5-photos` · Status: **awaiting OK** (revised 2026-10-26)

1. **Photos table** — `<ts>_photos.sql`: table, `storage_path` check and unique index, indexes `(organization_id, updated_at)` and `(hive_id, taken_at desc, id desc)`, triggers `10`–`50` (reusing `set_timestamps`, `force_author`, `check_parent`, `check_not_future`), `delete_inspection_events` → `delete_inspection_children` (events + photos), RLS + grants.
2. **Bucket and policies** — `<ts>_hive_photos_bucket.sql`: `storage.buckets` row (private, 5 MB, `image/jpeg`), `private.path_org`, `private.path_hive`, `private.can_upload_photo`, three `storage.objects` policies (select, insert, update; no delete).
3. **Tests** — `supabase/tests/photos.test.sql` (row rules, RLS, inspection cascade), `supabase/tests/storage.test.sql` (path rules, other org, bad names, admin read-only, retry cannot move a file).
4. **Seed** — photo rows are not seeded (a row without its file would break the admin); files come with A5.
5. **Docs** — `docs/api.md` Photos section (path, sizes, upload order, signed URLs, thumbnail fallback, free-tier budget); `.claude/rules/sql.md` gains the `coalesce` rule for checks on optional JSON keys.
6. **Release** — `chore(release): 0.5.0`, CHANGELOG, ROADMAP.

## How Iván tests it

1. `pnpm ci:check` → green.
2. Studio → Storage: bucket `hive-photos` exists, private, 5 MB limit, JPEG only.
3. Studio → Storage → upload any file to `hive-photos` from the dashboard (service role, bypasses RLS) and open it without a signed URL → refused.
