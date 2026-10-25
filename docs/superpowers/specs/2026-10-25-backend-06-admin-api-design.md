# B6 · Platform admin read API — spec

Date: 2026-10-25 · Branch: `feat/b6-admin-api` · Status: **awaiting OK** · Version: 0.6.0

## Problem

The platform admin sees every beekeeper. Lists with counts (members, apiaries, hives, last inspection) would need several queries per row from the browser. One RPC per screen keeps it to one round trip and bounded pages.

## Decisions

All RPCs are `security invoker` (RLS already lets the admin read everything; invoker means a bug cannot expose more than RLS allows), `stable`, and start with `if not private.is_platform_admin() then raise … 'not_platform_admin'`.

| RPC | Returns |
|-----|---------|
| `admin_stats()` | `jsonb`: `organizations`, `users`, `apiaries`, `hives_active`, `hives_total`, `inspections_30d`, `events_30d`, `photos`, `photo_bytes`, `reviewers` |
| `admin_list_organizations(p_search text default null, p_limit int default 25, p_offset int default 0)` | table: `id`, `name`, `owner_emails text[]`, `members int`, `apiaries int`, `hives_active int`, `inspections_30d int`, `last_inspection_at`, `created_at`, `total_count bigint` (window count). `p_search` matches name or owner email (`ilike`, trimmed, ≤ 80 chars). `p_limit` clamped to 1..100. Order: `last_inspection_at desc nulls last, name` |
| `admin_organization_summary(p_organization_id uuid)` | `jsonb`: organization, members (`user_id`, `email`, `display_name`, `role`), pending invites, apiaries with `hives_active`/`hives_total`/`last_inspection_at` |
| `admin_list_users(p_search text default null, p_limit int default 25, p_offset int default 0)` | table: `id`, `email`, `display_name`, `is_platform_admin`, `organizations jsonb` (`id`, `name`, `role`), `created_at`, `total_count` |

Org → apiary → hive → timeline screens beyond the summary use plain selects (`hives where apiary_id = …`) and `hive_timeline` (B4) under RLS; no extra RPC.

Indexes needed by the counts: `inspections (organization_id, inspected_at desc)`, `organization_members (user_id)`.

## Security constraints

- Read only: no RPC here writes. The admin role cannot write anything anywhere (B2–B5 policies give the flag only `select`).
- Emails are visible to the platform admin by design (support). They are not visible across organizations to anyone else (`profiles` policy, B2).

## Tests

`admin_api.test.sql`: an owner calling any admin RPC → `not_platform_admin`; admin gets correct counts against the seed; search by owner email finds the organization; `p_limit = 1000` returns at most 100; `total_count` matches the unpaged count.

## Out of scope

Exports (CSV/Sheets), charts over time, impersonation, disabling users (Studio covers it for now).

## Admin impact

A3 (dashboard + list), A4 (organization detail), A5 (hive timeline).
