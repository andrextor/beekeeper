# A7 · Manage accounts, my account — plan

Spec: `docs/superpowers/specs/2026-10-25-admin-07-manage-users-design.md` · Branch: `feat/a7-manage-users` · Status: **approved 2026-10-25**

## 1. SQL

- Migration `<ts>_admin_manage_users.sql`: `profiles.deactivated_at`; `admin_set_display_name`, `admin_set_member_role`, `admin_add_member`, `admin_remove_member`, `admin_set_platform_admin` (authenticated, admin check after the lock); `admin_set_deactivated` (service_role only); `admin_list_users` and `admin_organization_summary` with `deactivated_at`.
- `supabase/tests/admin_manage.test.sql`: each RPC refuses a non-admin; name set and trimmed; role change; `last_owner` on demote and remove; add, `already_member`, deleted farm refused; admin on/off, `own_admin`, `last_admin`; `admin_set_deactivated` not callable by `authenticated`, `own_account`, `last_admin`, sets and clears; the two lists return `deactivated_at`. `admin_api.test.sql` updated for the new column.
- `pnpm db:types` (Iván if the stack is down).

## 2. Edge Functions

- `supabase/functions/_shared/admin.ts`: CORS, `respond`, `isRecord`, `secretKey`, `adminClient`, `requirePlatformAdmin(request)` → actor id or a `Response`.
- `admin-create-user/index.ts` uses it (no behaviour change).
- `admin-update-user/index.ts`: the four actions, with the deactivate order and revert from the spec. `supabase/config.toml` entry with `verify_jwt = false`.

## 3. Panel

- `admin/src/lib/manage-user.ts` (+ test): calls for the RPCs and the function, error codes → Spanish; reuses A6's `generatePassword` and validation.
- `features/account/AccountPage.tsx` (`/mi-cuenta`), sidebar email links to it.
- `features/users/UserPage.tsx` (`/usuarios/:id`): Datos, Contraseña, Fincas, Acceso; `components/ui/ConfirmDialog.tsx` (native `<dialog>`).
- Usuarios rows link to the page; "Desactivado" badge in Usuarios and Personas; sign-in maps `user_banned`.
- `pnpm admin:check`.

## 4. Docs

`docs/api.md` (RPCs, function, `user_banned`, `deactivated_at`), `docs/deploy.md` (deploy `admin-update-user`, sessions survive a password change, manual erase for legal requests), CLAUDE.md / AGENTS.md / `.claude/rules/tenancy.md` (admin writes: accounts and memberships, never history).

## 5. Release — `chore(release): 0.15.0`

## How Iván tests it

1. `pnpm db:migrate && pnpm check:quick`, then `pnpm ci:check` before merging.
2. Local, as `admin@landak.test`:
   1. Mi cuenta: change name (sidebar shows it); change password with a wrong current one → error; with the right one → sign out and in with the new one.
   2. Usuarios → `reviewer@landak.test`: rename; change email; new password → sign in with it in a private window.
   3. Fincas: make them owner of Finca Landak, then try to demote `owner@landak.test` too → works while two owners exist; demote the last owner → "La finca debe tener al menos un propietario."; remove and add back.
   4. Acceso: make another account admin, remove it; try removing your own → refused.
   5. Desactivar the reviewer → badge everywhere; signing in with it → "Esta cuenta está desactivada."; Reactivar → signs in again.
3. Remote after merge: `db push --linked`, `functions deploy admin-create-user` and `functions deploy admin-update-user`, repeat 2.2–2.5 on Vercel.
