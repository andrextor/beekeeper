# B6 · Platform admin read API — spec

Date: 2026-10-25 · Branch: `feat/b6-admin-api` · Status: **awaiting OK** (revised 2026-10-26 with B2–B5 lessons) · Version: 0.6.0

## Problem

The platform admin sees every beekeeper. Lists with counts (members, apiaries, hives, last inspection) would need several queries per row from the browser. One RPC per screen keeps it to one round trip and bounded pages.

## Decisions

All RPCs are `plpgsql`, `security invoker` (RLS already lets the admin read everything; invoker means a bug cannot expose more than RLS allows), `stable`, `set search_path = ''`, and start with `if not private.is_platform_admin()` → `raise 'Solo administradores de la plataforma.'` (`P0001`, `not_platform_admin`).

| RPC | Returns |
|-----|---------|
| `admin_stats()` | `jsonb`: `organizations`, `users`, `apiaries`, `hives_active`, `hives_total`, `inspections_30d`, `events_30d`, `photos`, `storage_bytes`, `reviewers`. Counts skip soft-deleted rows. `storage_bytes` sums `storage.objects.metadata->>'size'` of bucket `hive-photos` (main files, thumbnails and orphans: what the free tier actually counts), not `photos.bytes` |
| `admin_list_organizations(p_search text default null, p_limit int default 25, p_offset int default 0)` | table: `id`, `name`, `deleted_at`, `owner_emails text[]`, `members int`, `apiaries int`, `hives_active int`, `inspections_30d int`, `last_inspection_at`, `created_at`, `total_count bigint` (window count). `p_search` matches name or owner email (`ilike`, trimmed, ≤ 80 chars). `p_limit` clamped to 1..100. Order: `last_inspection_at desc nulls last, name, id`. Offset paging is fine here: one admin, tens of organizations (`ponytail:` note, keyset if it ever reaches thousands). `%` and `_` in the search are escaped |
| `admin_organization_summary(p_organization_id uuid)` | `jsonb`: organization, members (`user_id`, `email`, `display_name`, `role`), pending invites (explicit columns: `code_hash` is never granted), apiaries with `hives_active`/`hives_total`/`last_inspection_at` |
| `admin_list_users(p_search text default null, p_limit int default 25, p_offset int default 0)` | table: `id`, `email`, `display_name`, `is_platform_admin`, `organizations jsonb` (`id`, `name`, `role`), `created_at`, `total_count` |

Org → apiary → hive → timeline screens beyond the summary use plain selects (`hives where apiary_id = …`) and `hive_timeline` (B4) under RLS; no extra RPC.

Index needed by the counts: `inspections (organization_id, inspected_at desc) where deleted_at is null`. `organization_members (user_id)` already exists (B2).

## Security constraints

- Read only: no RPC here writes. The admin role cannot write anything anywhere (B2–B5 policies give the flag only `select`).
- Emails are visible to the platform admin by design (support). They are not visible across organizations to anyone else (`profiles` policy, B2).

## Tests

`admin_api.test.sql`: an owner calling any admin RPC → `not_platform_admin`; admin gets correct counts against the seed; search by owner email finds the organization; `p_limit = 1000` returns at most 100; `total_count` matches the unpaged count; a search with `%` matches only a literal `%`; soft-deleted hives are not counted as active; a reviewer gets `not_platform_admin` too. Tests build their own data (the helpers truncate tenancy), never the seed.

## Out of scope

Exports (CSV/Sheets), charts over time, impersonation, disabling users (Studio covers it for now).

## Admin impact

A3 (dashboard + list), A4 (organization detail), A5 (hive timeline).
