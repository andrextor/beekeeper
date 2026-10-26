# B5 · Photos: table and private bucket — spec

Date: 2026-10-25 · Branch: `feat/b5-photos` · Status: **awaiting OK** (revised 2026-10-26 with B4 lessons) · Version: 0.5.0

## Problem

The beekeeper photographs frames, brood and pests during an inspection, often without signal. Photos must upload later, be visible only inside the organization (and to the platform admin), and fit the free tier.

## Decisions

### Storage: Supabase Storage now, Cloudflare R2 later

- Private bucket `hive-photos`, `file_size_limit` 5 MB, `allowed_mime_types = ['image/jpeg']`.
- The app uploads **two files per photo**: `<id>.jpg` (long side 1600 px, JPEG q≈0.7, ~250 KB) and `<id>.thumb.jpg` (320 px, ~20 KB). Image transformations are not in the free plan, so thumbnails are made on the phone; the admin grid and the timeline load only thumbnails, which keeps egress low.
- Budget: ~270 KB per photo → ~3,700 photos in the free 1 GB. `admin_stats()` (B6) reports the bytes used.
- R2 (10 GB free, no egress fees) replaces it when storage passes ~700 MB: a new spec for an Edge Function that checks membership and signs URLs; `photos.storage_path` and the app's queue stay the same.
- Rejected now: R2 from day one. It adds a function, a second account and a secret before there is a single photo.

### Path

`{organization_id}/{hive_id}/{photo_id}.jpg` and `{organization_id}/{hive_id}/{photo_id}.thumb.jpg`. The path is the authorization key for storage policies, so it is checked against the row.

### `photos` table

Common columns (B3) plus:

| Column | Type | Rule |
|--------|------|------|
| `hive_id` | uuid → hives | same organization |
| `inspection_id` | uuid → inspections | nullable, same hive and not deleted (`check_parent('inspections', 'inspection_id', 'hive_id')`) |
| `storage_path` | text | equals `organization_id || '/' || hive_id || '/' || id || '.jpg'` (check constraint), unique |
| `taken_at` | timestamptz | not null, ≤ now + 1 day (`check_not_future`) |
| `width`, `height` | integer | 1..10000 |
| `bytes` | integer | 1..5242880 (main file) |
| `caption` | text | ≤ 300 |

Upload order in the app: main file → thumbnail → `photos` upsert. A crash between steps leaves an orphan file, never a row pointing at nothing (the row is written last; retries overwrite the file with `upsert: true`). Orphan cleanup is a later job (`ponytail:` note in the migration).

The thumbnail has no column: its path is `storage_path` with `.jpg` replaced by `.thumb.jpg`. Nothing guarantees it exists (a phone could fail between the two uploads and still write the row on a later retry of the main file only, if the thumbnail step is skipped by a bug), so every client falls back to the main file's signed URL when the thumbnail returns 400/404.

### Storage policies (`storage.objects`, bucket `hive-photos`)

Object names must match `^<uuid>/<uuid>/<uuid>(\.thumb)?\.jpg$` (checked in the insert policy), so nothing else can be stored in the bucket.

`private.path_org(name text) returns uuid`: first folder as uuid, `null` if it is not a uuid (no cast error). `private.path_hive(name)`: second folder likewise. `private.can_upload_photo(name)` (security definer): the name matches the pattern, the caller is a member of `path_org`, and `path_hive` is a non-deleted hive of that organization; used by both insert and update policies.

| Operation | Allowed when |
|-----------|--------------|
| select (download, signed URL) | `private.path_org(name) in (select private.my_organization_ids()) or (select private.is_platform_admin())` |
| insert | `private.is_member(path_org(name))` and the hive `path_hive(name)` exists in that organization and is not deleted |
| update (re-upload on retry) | `owner_id = auth.uid()::text` and still a member; `with check` repeats the insert rule, so a retry cannot move the file to another path |
| delete | none: history is never hard-deleted by the app. A purge of soft-deleted photos is a later owner action with its own spec |

### Table RLS

Same as inspections: read by membership or platform admin, insert `is_member`, update by owner or author. Soft delete keeps the file (history); a hard purge is a later owner action.

Triggers (B3/B4 order): `photos_10_set_timestamps`, `20_force_author`, `30_check_hive`, `40_check_inspection` (`check_parent` with match column `hive_id`), `50_check_date`. `hive_id` cannot change (the path depends on it; enforced by the `storage_path` check). Soft-deleting an inspection soft-deletes its linked photos too: `private.delete_inspection_events()` becomes `private.delete_inspection_children()` and covers `hive_events` and `photos`.

### Reading photos

Clients call `storage.from('hive-photos').createSignedUrls(paths, 3600)` in one request per screen (up to 100 paths), thumbnails first. No public URLs.

## Tests

`photos.test.sql`: row with a mismatching `storage_path` refused; reviewer inserts a photo row; other organization cannot select it. `storage.test.sql`: insert into `storage.objects` as a member of org A with a path of org B → refused; path whose first folder is not a uuid → refused without an exception; hive of another organization in the path → refused; platform admin can select, cannot insert.

## Out of scope

R2, orphan cleanup job, photo annotation, video, hard delete. Seed photo files (JPEGs + an upload script) are left to A5, when the admin first shows photos.

## Mobile impact

M9 (photos): resize, thumbnail, queue, upload order.
