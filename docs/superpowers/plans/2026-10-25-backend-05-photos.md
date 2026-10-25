# B5 · Photos — plan

Spec: `docs/superpowers/specs/2026-10-25-backend-05-photos-design.md` · Branch: `feat/b5-photos` · Status: **awaiting OK**

1. **Photos table** — `<ts>_photos.sql`: table, `storage_path` check and unique index, triggers (`set_updated_at`, `force_author`, `check_parent_org`, inspection-same-hive check reused from B4), indexes, RLS + grants.
2. **Bucket and policies** — `<ts>_hive_photos_bucket.sql`: insert into `storage.buckets` (private, 5 MB, jpeg), `private.path_org`, `private.path_hive`, the four `storage.objects` policies.
3. **Tests** — `supabase/tests/photos.test.sql`, `supabase/tests/storage.test.sql`.
4. **Seed** — `supabase/seed/photos/` with two small sample JPEGs + thumbnails and `scripts/seed-photos.sh` that uploads them through the local Storage API after `db reset` (Storage files are not part of SQL seeds), exposed as `pnpm seed:photos`; rows for them in `seed.sql`.
5. **Docs** — `docs/api.md` Photos section: path rule, upload order, signed URLs, sizes.
6. **Release** — `chore(release): 0.5.0`. Check: `pnpm ci:check`.

## How Iván tests it

1. `pnpm db:reset && pnpm seed:photos && pnpm test:db` → green.
2. Studio → Storage → `hive-photos`: folders by organization id, two photos with thumbnails.
3. Studio → Storage: the bucket shows as private; opening a file without a signed URL fails.
