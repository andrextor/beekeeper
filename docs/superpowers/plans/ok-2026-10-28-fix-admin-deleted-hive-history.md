# Fix · Admin counts skip the history of deleted hives — plan

Trivial fix (no spec): finding R6 of `docs/superpowers/audits/2026-10-28-a4-code-review.md`. Branch: `fix/admin-deleted-hive-history` · Status: **approved 2026-10-28** · Version: 0.11.1

## Problem

Deleting a hive keeps its inspections and events (history), and clients hide the children of a deleted hive (`docs/api.md` → Photos). The admin RPCs do not: an apiary card's "Última revisión", the beekeeper list's last inspection and 30-day count, and the dashboard's 30-day inspections and events still count rows of deleted hives. The apiary page then shows a recent inspection on no hive.

## Decision

Every admin count of inspections and events also requires its hive to be live (`hives.deleted_at is null`), in all three RPCs, so the dashboard, the list and the beekeeper page agree. Photos and `storage_bytes` stay as they are: they measure what the free tier stores.

## Tasks

1. **Migration** `supabase/migrations/<timestamp>_admin_skip_deleted_hives.sql`: `create or replace` `admin_stats`, `admin_list_organizations` and `admin_organization_summary` with the hive check on `inspections_30d`, `events_30d` and `last_inspection_at`. Signatures, grants and the rest of the bodies unchanged.
2. **Tests** in `supabase/tests/admin_api.test.sql`: soft-delete a hive that has the latest inspection → the three RPCs stop counting it.
3. **Docs**: `docs/api.md` Admin ("counts skip soft-deleted rows and the history of deleted hives"); audit R6 → Fixed; CHANGELOG `### Fixed`.
4. **Release** `chore(release): 0.11.1`. Check: `pnpm db:migrate && pnpm check:quick`, then `pnpm ci:check`.

## How Iván tests it

In Studio, soft-delete C-01 (`update hives set deleted_at = now() where name = 'C-01'`), reload the panel: Vallecito 1 no longer shows "Última revisión hace 2 días", and the dashboard's "Revisiones · 30 días" drops by 3. `pnpm db:reset` puts it back.

## Impact on the mobile contract

None: admin RPCs only.
