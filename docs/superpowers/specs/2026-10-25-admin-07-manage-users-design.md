# A7 · Platform admin manages accounts; my account — spec

Date: 2026-10-25 · Branch: `feat/a7-manage-users` · Status: **approved 2026-10-25** · Version: 0.15.0

## Problem

After A6 the admin can create accounts but not fix them: a typo in a name or email, a forgotten password, a reviewer who should be an owner, someone who leaves the pilot. And the admin cannot change their own name or password. Iván asked (2026-10-25) for: my account; editing others (name, email, role in a farm); resetting someone's password from the panel; removing admin, deactivating and deleting accounts.

Owners keep inviting reviewers with codes from the app (B2, confirmed by Iván 2026-10-25); nothing here changes the app's own flows.

## Decision

Same split as A6: what needs the Auth admin API (email, password, block sign-in) goes through an Edge Function with the secret key; everything else is SQL RPCs that check `private.require_platform_admin()` and run under the organization lock. **Only platform admins** use any of it.

### 1. Mi cuenta (every admin, about themselves)

- The email in the sidebar becomes a link to `/mi-cuenta`.
- **Nombre**: plain update of `profiles.display_name` for their own row (already granted and allowed by `profiles_update_own`). No new SQL.
- **Contraseña**: current password + new password (≥ 8 characters, ≤ 72 bytes) + repeat. The panel first checks the current one with `signInWithPassword` (so a borrowed open session cannot change it), then `auth.updateUser({ password })`. No function: a user may always change their own password.
- Their email is changed by another admin (section 2); changing one's own email without a mailer would skip any confirmation, so it is not offered here.

### 2. A user's page (`/usuarios/:id`)

Each row in Usuarios links here. Breadcrumbs Usuarios › <email>. Sections:

**Datos**
- Name → RPC `admin_set_display_name(p_user_id, p_display_name)` (1–80).
- Email → function action `set_email`: `auth.admin.updateUserById(id, { email, email_confirm: true })`; the existing `sync_profile_email` trigger updates `profiles.email`. Taken → `email_taken`.

**Contraseña**
- **Nueva contraseña** (typed or **Generar**) → function action `set_password`: `updateUserById(id, { password })`. Shown once with a copy button, like A6. Replaces `scripts/reset-password.sh` for daily use; the script stays as the fallback when the panel is down.
- Sessions the person already has stay open until they expire (Supabase does not end them on a password change); `docs/deploy.md` says so.

**Fincas** (memberships, from `organization_members` + `organizations`)
- **Rol**: owner ↔ reviewer → RPC `admin_set_member_role(p_organization_id, p_user_id, p_role)`: lock the organization first, then admin check, refuse the last owner going to reviewer (`last_owner`), refuse a deleted farm.
- **Quitar de la finca** → RPC `admin_remove_member(p_organization_id, p_user_id)`: same lock and `last_owner` rule.
- **Agregar a una finca** (picker of live farms from A6, role owner or reviewer) → RPC `admin_add_member(p_organization_id, p_user_id, p_role)`: lock, deleted farm refused, already a member → `already_member`.

**Acceso**
- **Administrador** on/off → RPC `admin_set_platform_admin(p_user_id, p_value)`. Refuses turning off one's own flag (`own_admin`) and leaving zero admins (`last_admin`; the admin rows are locked `for update` before counting).
- **Desactivar / Reactivar** → function actions `deactivate` / `reactivate`:
  - `updateUserById(id, { ban_duration: '876000h' })` (100 years) or `'none'`: Auth refuses their sign-in (`user_banned`) and their refresh, so an open session ends within the hour its token lives.
  - `profiles.deactivated_at` (new column, set by the function through `admin_set_deactivated`, `service_role` only) so lists can show it without reading `auth.users`.
  - Refuses deactivating oneself (`own_account`) and the last active admin (`last_admin`).

### 3. No hard delete

"Borrar" is **Desactivar**. Every inspection, event, photo, hive and apiary keeps `created_by` / `inspected_by` pointing at the profile, and the project rule is that history is never hard-deleted. Deleting the Auth user would either fail on those references or erase who did the work. A deactivated account cannot sign in, shows "Desactivado" everywhere, and its history keeps its name. If the person must disappear entirely (a legal request), that is a manual SQL task documented in `docs/deploy.md`, not a button.

### Lists

- `admin_list_users` adds `deactivated_at`; Usuarios shows a "Desactivado" badge.
- `admin_organization_summary` members add `deactivated_at`; Personas shows the badge.
- A6's farm picker and "Agregar a una finca" list only live farms.

### The function: `admin-update-user`

`POST /functions/v1/admin-update-user` `{ action, user_id, email? | password? }`. Same gateway setting, key source, CORS, admin check, error shape and logging rules as `admin-create-user`. The shared parts (CORS, `respond`, `isRecord`, secret key, caller check) move to `supabase/functions/_shared/admin.ts`, used by both functions (the second copy is the extraction).

| Action | Body | Errors |
|--------|------|--------|
| `set_email` | `email` | `invalid_email`, `email_taken`, `user_not_found` |
| `set_password` | `password` | `invalid_password`, `user_not_found` |
| `deactivate` | — | `own_account`, `last_admin`, `user_not_found` |
| `reactivate` | — | `user_not_found` |

Answers `200 { ok: true }`. Plus the common `invalid_body`, `invalid_action`, `not_signed_in`, `not_platform_admin`, `server_error`.

`deactivate` order: SQL first (`admin_set_deactivated`, which locks admin rows, checks `own_account` / `last_admin` and sets `deactivated_at`), then the ban; if the ban fails, SQL is reverted (`admin_set_deactivated(…, false)`) and the function answers `server_error`. `reactivate`: lift the ban, then clear `deactivated_at`.

### SQL (one migration)

- `profiles.deactivated_at timestamptz` (no client update grant: `update (display_name)` stays the only one).
- `admin_set_display_name`, `admin_set_member_role`, `admin_add_member`, `admin_remove_member`, `admin_set_platform_admin`: `security definer`, `search_path = ''`, `execute` to `authenticated`, each calls `private.require_platform_admin()` **after** taking its lock.
- `admin_set_deactivated(p_actor_id, p_user_id, p_value)`: `service_role` only, like `admin_provision_member`.
- `admin_list_users` and `admin_organization_summary` re-created with `deactivated_at`.
- Errors in house style (`P0001` + Spanish message + detail code).

### Panel copy (Spanish, never technical)

| Code | Message |
|------|---------|
| `last_owner` | La finca debe tener al menos un dueño. |
| `last_admin` | Debe quedar al menos un administrador activo. |
| `own_admin` | No puedes quitarte tu propio permiso de administrador. |
| `own_account` | No puedes desactivar tu propia cuenta. |
| `already_member` | Ya pertenece a esa finca. |
| `email_taken` | Ya existe una cuenta con ese correo. |
| wrong current password (Mi cuenta) | La contraseña actual no es correcta. |
| `user_banned` (sign-in) | Esta cuenta está desactivada. |

Every action that changes access (role, remove, admin off, deactivate) asks in a native `<dialog>` first: "¿Quitar a Ana de Finca Landak?" with Cancelar / the action.

## Alternatives rejected

- **Hard delete**: breaks history (above).
- **Everything in the Edge Function**: role and admin changes are plain SQL; keeping them in RPCs puts the rules where pgTAP tests them.
- **Changing one's own email**: without a mailer it skips confirmation; another admin does it.

## Security constraints

- Every endpoint checks the platform admin flag server-side; membership RPCs lock before checking.
- An admin cannot remove their own flag, deactivate themselves, or leave the platform with no active admin.
- Passwords are never logged or echoed by the server; the panel shows a new password once.
- A deactivated user's existing access token works until it expires (≤ 1 h). Accepted: RLS does not read `deactivated_at`. A `ponytail:` comment in `admin-update-user` names the upgrade (an RLS check on `deactivated_at`) if that hour ever matters.

## Impact on the mobile contract

- `docs/api.md`: sign-in can fail with Auth `user_banned` → the app shows "Esta cuenta está desactivada." (the app adds it in M-series sign-in).
- `profiles.deactivated_at` is readable like the rest of `profiles`; the app may show it in Personas.
- Memberships can now change from outside the app (role, removal): the app already re-reads memberships on sync; nothing new.

## Free tier

A few function calls a week; nothing measurable.

## Out of scope

Audit log of admin actions, ending a user's open sessions immediately, changing one's own email, bulk actions, hard delete.
