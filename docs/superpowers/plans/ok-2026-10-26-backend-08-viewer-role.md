# B8 · Read-only role "Observador" (`viewer`) — plan

Spec: `docs/superpowers/specs/2026-10-26-backend-08-viewer-role-design.md` · Branch: `feat/b8-viewer-role` (from `main` after A8 merged; also carries the split sign-in and the manual link) · Status: **approved 2026-10-26** (name: Observador) · Version: 0.17.0

Rules read first: `.claude/rules/sql.md`, `.claude/rules/tenancy.md`.

## Tasks (one commit each)

1. **Migration** `supabase/migrations/<ts>_viewer_role.sql`: widen both role check constraints to `('owner', 'reviewer', 'viewer')`; `private.require_role_value` accepts `viewer`; new `private.can_record(uuid)` (security definer, `search_path = ''`, revoke/grant like `is_member`); recreate the insert/update policies of `inspections`, `hive_events`, `photos` and `private.can_upload_photo` with `can_record` instead of `is_member`; `create_invite`, `set_member_role`, `admin_set_member_role`, `admin_add_member`, `admin_provision_member` accept `viewer`. `feat(db): viewer role reads, never writes`
2. **pgTAP** `supabase/tests/viewer_role.test.sql`: a viewer reads apiaries, hives, inspections, events, photos and members of its farm and nothing of another; insert/update on `inspections`, `hive_events`, `photos`, `apiaries`, `hives` and a storage upload are refused; `create_invite(org, 'viewer')` + `accept_invite` makes a viewer; `set_member_role` owner ↔ reviewer ↔ viewer; the admin RPCs accept it; last-owner rule unchanged. `test(db): viewer role`
3. **Edge Function** `supabase/functions/admin-create-user/index.ts` (+ `_shared/admin.ts` if the kind list lives there): kind `viewer` like `reviewer`. `feat(functions): admin creates viewers`
4. **Admin** `admin/src/lib/admin-api.ts` (`Role`, `isRole`), `lib/labels.ts` (`viewer: 'Observador'`), `lib/create-user.ts` (kind), `features/users/NewUserPage.tsx` (fourth kind), `features/users/UserPage.tsx` (role `Select` per membership with confirm; add-to-farm offers three roles), `features/organizations/OrganizationPage.tsx` badge tone; `pnpm db:types`. Vitest for `isRole` and the create-user validation. `feat(admin): Observador role`
5. **Docs**: `docs/api.md` (role enum, write refusals, `admin-create-user` kind, **BREAKING** note and deploy order), `.claude/rules/tenancy.md` table, `docs/ROADMAP.md` (B8 row, decision 2 overturned, M14 pointer), CHANGELOG `### Changed` with **BREAKING**. `docs: viewer role`
6. **Release** `chore(release): 0.17.0`.

## Checks

You run them: `pnpm db:migrate && pnpm check:quick` after task 2, then `pnpm ci:check`.

## How Iván tests it

1. Admin → Nuevo usuario → **Observador** of Finca Landak. Studio: the membership row has `role = viewer`.
2. As that user in Studio's SQL (`set request.jwt.claims`), or with the API: reading `inspections` returns Finca Landak's rows; inserting one returns `42501`.
3. Admin → the user → change the role with the select to Revisor and back; the farm page shows the "Observador" badge.
4. Do **not** sign that user into an installed APK until M14 ships (old apps cannot read the role).

## Integration review

- No new list or loop; one extra helper call per write policy (same cost as `is_member`).
- Free tier: no storage or egress change.

## Mobile

M14 in `beekeeper-mobile` (spec + plan there): role enum, label, hide write actions for viewers, three-role pickers. It must be released before any viewer exists on the remote project.
