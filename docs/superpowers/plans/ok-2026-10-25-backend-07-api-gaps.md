# B7 · Contract gaps found by the mobile specs — plan

Spec: `docs/superpowers/specs/2026-10-25-backend-07-api-gaps-design.md` · Branch: `fix/b7-api-gaps` (on top of `docs/mobile-copy`) · Status: **approved 2026-10-25**

## 1. SQL

- Migration `20261029110000_contract_gaps.sql`:
  - `private.check_parent()`: a soft-deleted parent is accepted when `new.deleted_at is not null`; the matched column is still compared.
  - `private.my_organization_ids()`, `private.is_member()`, `private.has_role()`: join `public.organizations` with `deleted_at is null`.
  - `private.require_owner()`: `organization_deleted` first (caller is an owner of that deleted organization), then `not_owner`.
- `supabase/tests/contract_gaps.test.sql`:
  - a reviewer soft-deletes a photo, an event and an inspection of a deleted hive → passes; the same live edit → `parent_mismatch`; restoring it → `parent_mismatch`; a tombstone pointing at another organization's hive → `parent_mismatch`;
  - the owner soft-deletes the organization as `authenticated` → passes; afterwards owner and reviewer read 0 apiaries, hives, inspections, events and photos of it; inserting an apiary → refused (`42501`); `create_invite` → `organization_deleted`; the platform admin still reads them.

## 2. Docs

- `docs/api.md`: `deactivated_at` in `profiles`; Sync push (re-check on every upsert, order, tombstones under a deleted parent pass, live edits are dropped on `parent_mismatch`); `parent_mismatch` row; Organizations (a deleted organization returns nothing to its members and refuses their writes with `42501`; handled like a lost membership).
- `.claude/rules/tenancy.md`: membership helpers ignore deleted organizations. `.claude/rules/sql.md`: BEFORE INSERT fires on upsert.
- `docs/ROADMAP.md`: B7 row. `CHANGELOG.md` under Unreleased.

## 3. Release — `chore(release): 0.15.1`

## How Iván tests it

1. `pnpm db:migrate && pnpm check:quick`, then `pnpm ci:check` before merging (`docs/mobile-copy` merges first, or with this branch).
2. Remote after merge: `pnpm exec supabase db push --linked`. Nothing to deploy for the functions.
3. Panel on Vercel: a deleted farm still shows in Fincas with its apiaries and hives (admin reads everything).
